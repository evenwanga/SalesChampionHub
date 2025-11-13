package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/cache"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/google/uuid"
)

var (
	ErrUnauthorized     = errors.New("unauthorized access")
	ErrPermissionDenied = errors.New("permission denied")
	ErrKBLimitExceeded  = errors.New("knowledge base limit exceeded")
	ErrInvalidInput     = errors.New("invalid input")
)

// KBService provides business logic for knowledge base operations
type KBService struct {
	kbRepo    repository.KBRepositoryInterface
	mountRepo repository.MountRepositoryInterface
	docRepo   repository.DocumentRepositoryInterface
	cache     cache.KBCacheInterface
	maxKBs    int
}

// NewKBService creates a new KB service
func NewKBService(
	kbRepo repository.KBRepositoryInterface,
	mountRepo repository.MountRepositoryInterface,
	docRepo repository.DocumentRepositoryInterface,
	cache cache.KBCacheInterface,
	maxKBs int,
) *KBService {
	return &KBService{
		kbRepo:    kbRepo,
		mountRepo: mountRepo,
		docRepo:   docRepo,
		cache:     cache,
		maxKBs:    maxKBs,
	}
}

// CreateKB creates a new knowledge base
func (s *KBService) CreateKB(ctx context.Context, req *CreateKBRequest) (*models.KnowledgeBase, error) {
	// Validate input
	if req.Name == "" {
		return nil, fmt.Errorf("%w: name is required", ErrInvalidInput)
	}
	if req.OwnerID == "" {
		return nil, fmt.Errorf("%w: owner_id is required", ErrInvalidInput)
	}
	if req.OwnerType == "" {
		return nil, fmt.Errorf("%w: owner_type is required", ErrInvalidInput)
	}
	// Validate owner_type
	if req.OwnerType != "tenant" && req.OwnerType != "organization" && req.OwnerType != "user" {
		return nil, fmt.Errorf("%w: owner_type must be 'tenant', 'organization', or 'user'", ErrInvalidInput)
	}

	// Generate KB ID
	kbID := "kb_" + uuid.New().String()

	// Create KB
	kb := &models.KnowledgeBase{
		ID:          kbID,
		Name:        req.Name,
		Description: req.Description,
		OwnerID:     req.OwnerID,
		Visibility:  req.Visibility,
		Tags:        req.Tags,
		Settings:    req.Settings,
		IsActive:    true, // Default to active
	}

	if err := s.kbRepo.Create(ctx, kb); err != nil {
		return nil, fmt.Errorf("failed to create KB: %w", err)
	}

	// Create mount record to grant owner access
	permissions := models.JSONMap{
		"can_read":   true,
		"can_write":  true,
		"can_delete": true,
		"can_share":  true,
	}

	var mount *models.KnowledgeBaseMount
	var err error

	// Call the appropriate mount method based on owner type
	switch req.OwnerType {
	case "tenant":
		mount, err = s.mountRepo.MountToTenant(ctx, kbID, req.OwnerID, req.OwnerID, permissions)
	case "organization":
		mount, err = s.mountRepo.MountToOrganization(ctx, kbID, req.TenantID, req.OwnerID, req.OwnerID, permissions)
	case "user":
		orgID := &req.OrganizationID
		if req.OrganizationID == "" {
			orgID = nil
		}
		mount, err = s.mountRepo.MountToUser(ctx, kbID, req.TenantID, req.OwnerID, req.OwnerID, orgID, permissions)
	default:
		// This should never happen due to validation above
		_ = s.kbRepo.Delete(ctx, kbID)
		return nil, fmt.Errorf("%w: invalid owner_type", ErrInvalidInput)
	}

	if err != nil {
		// Rollback KB creation if mount fails
		_ = s.kbRepo.Delete(ctx, kbID)
		return nil, fmt.Errorf("failed to create mount record: %w", err)
	}

	// Invalidate cache for accessible KBs
	if mount != nil {
		_ = s.cache.InvalidateUserKBAccess(ctx, req.TenantID, req.OrganizationID, req.OwnerID)
	}

	// Cache the KB metadata
	_ = s.cache.SetKBMetadata(ctx, kb, 0)

	return kb, nil
}

// GetKB retrieves a knowledge base by ID
func (s *KBService) GetKB(ctx context.Context, kbID string) (*models.KnowledgeBase, error) {
	// Try cache first
	kb, err := s.cache.GetKBMetadata(ctx, kbID)
	if err == nil && kb != nil {
		return kb, nil
	}

	// Cache miss - get from database
	kb, err = s.kbRepo.GetByID(ctx, kbID)
	if err != nil {
		return nil, err
	}

	// Cache for next time
	_ = s.cache.SetKBMetadata(ctx, kb, 0)

	return kb, nil
}

// UpdateKB updates a knowledge base
func (s *KBService) UpdateKB(ctx context.Context, kbID string, req *UpdateKBRequest) (*models.KnowledgeBase, error) {
	// Get existing KB to verify access
	kb, err := s.kbRepo.GetByID(ctx, kbID)
	if err != nil {
		return nil, err
	}

	// Update fields
	if req.Name != nil {
		kb.Name = *req.Name
	}
	if req.Description != nil {
		kb.Description = *req.Description
	}
	if req.Visibility != nil {
		kb.Visibility = *req.Visibility
	}
	if req.IsActive != nil {
		kb.IsActive = *req.IsActive
	}
	if req.Tags != nil {
		kb.Tags = req.Tags
	}
	if req.Settings != nil {
		kb.Settings = req.Settings
	}

	// Update in database
	if err := s.kbRepo.Update(ctx, kb); err != nil {
		return nil, fmt.Errorf("failed to update KB: %w", err)
	}

	// Invalidate cache
	_ = s.cache.InvalidateKBMetadata(ctx, kbID)
	_ = s.cache.InvalidateKBStats(ctx, kbID)

	return kb, nil
}

// DeleteKB deletes a knowledge base
func (s *KBService) DeleteKB(ctx context.Context, kbID string) error {
	// Delete from database (soft delete)
	if err := s.kbRepo.Delete(ctx, kbID); err != nil {
		return fmt.Errorf("failed to delete KB: %w", err)
	}

	// Invalidate all caches for this KB
	_ = s.cache.InvalidateAllKBData(ctx, kbID)

	return nil
}

// ListKBs lists knowledge bases with pagination
func (s *KBService) ListKBs(ctx context.Context, options repository.ListOptions) ([]*models.KnowledgeBase, int64, error) {
	return s.kbRepo.List(ctx, options)
}

// GetUserAccessibleKBs retrieves all KBs accessible to a user
func (s *KBService) GetUserAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string) ([]*models.KnowledgeBase, error) {
	// Try cache first
	kbs, err := s.cache.GetAccessibleKBs(ctx, tenantID, organizationID, userID)
	if err == nil && kbs != nil {
		return kbs, nil
	}

	// Cache miss - get from database using helper function
	kbs, err = s.kbRepo.GetUserAccessibleKBs(ctx, tenantID, organizationID, userID, s.maxKBs)
	if err != nil {
		return nil, err
	}

	// Cache for next time
	_ = s.cache.SetAccessibleKBs(ctx, tenantID, organizationID, userID, kbs, 0)

	return kbs, nil
}

// MountKBToTenant mounts a KB to a tenant
func (s *KBService) MountKBToTenant(ctx context.Context, req *MountKBRequest) (*models.KnowledgeBaseMount, error) {
	if req.KBID == "" || req.TenantID == "" {
		return nil, fmt.Errorf("%w: kb_id and tenant_id are required", ErrInvalidInput)
	}

	// Default permissions if not provided
	permissions := req.Permissions
	if permissions == nil {
		permissions = models.JSONMap{
			"can_read":   true,
			"can_write":  false,
			"can_delete": false,
		}
	}

	mount, err := s.mountRepo.MountToTenant(ctx, req.KBID, req.TenantID, req.MountedBy, permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to mount KB to tenant: %w", err)
	}

	// Invalidate affected caches
	// Note: We invalidate all users in this tenant
	_ = s.cache.InvalidateAllKBData(ctx, req.KBID)

	return mount, nil
}

// MountKBToOrganization mounts a KB to an organization
func (s *KBService) MountKBToOrganization(ctx context.Context, req *MountKBRequest) (*models.KnowledgeBaseMount, error) {
	if req.KBID == "" || req.TenantID == "" || req.OrganizationID == "" {
		return nil, fmt.Errorf("%w: kb_id, tenant_id, and organization_id are required", ErrInvalidInput)
	}

	permissions := req.Permissions
	if permissions == nil {
		permissions = models.JSONMap{
			"can_read":   true,
			"can_write":  false,
			"can_delete": false,
		}
	}

	mount, err := s.mountRepo.MountToOrganization(ctx, req.KBID, req.TenantID, req.OrganizationID, req.MountedBy, permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to mount KB to organization: %w", err)
	}

	_ = s.cache.InvalidateAllKBData(ctx, req.KBID)

	return mount, nil
}

// MountKBToUser mounts a KB to a specific user
func (s *KBService) MountKBToUser(ctx context.Context, req *MountKBRequest) (*models.KnowledgeBaseMount, error) {
	if req.KBID == "" || req.TenantID == "" || req.UserID == "" {
		return nil, fmt.Errorf("%w: kb_id, tenant_id, and user_id are required", ErrInvalidInput)
	}

	permissions := req.Permissions
	if permissions == nil {
		permissions = models.JSONMap{
			"can_read":   true,
			"can_write":  false,
			"can_delete": false,
		}
	}

	var orgID *string
	if req.OrganizationID != "" {
		orgID = &req.OrganizationID
	}

	mount, err := s.mountRepo.MountToUser(ctx, req.KBID, req.TenantID, req.UserID, req.MountedBy, orgID, permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to mount KB to user: %w", err)
	}

	// Invalidate this specific user's caches
	orgIDForCache := req.OrganizationID
	if orgIDForCache == "" {
		orgIDForCache = ""
	}
	_ = s.cache.InvalidateUserKBAccess(ctx, req.TenantID, orgIDForCache, req.UserID)

	return mount, nil
}

// Unmount deactivates a mount
func (s *KBService) Unmount(ctx context.Context, mountID int64) error {
	// Get mount to know what to invalidate
	mount, err := s.mountRepo.GetMount(ctx, mountID)
	if err != nil {
		return err
	}

	// Unmount
	if err := s.mountRepo.Unmount(ctx, mountID); err != nil {
		return fmt.Errorf("failed to unmount: %w", err)
	}

	// Invalidate caches based on mount type
	_ = s.cache.InvalidateAllKBData(ctx, mount.KBID)

	return nil
}

// GetKBStats retrieves knowledge base statistics
func (s *KBService) GetKBStats(ctx context.Context, kbID string) (*repository.KBStats, error) {
	// Try cache first
	stats, err := s.cache.GetKBStats(ctx, kbID)
	if err == nil && stats != nil {
		return stats, nil
	}

	// Cache miss - get from database
	stats, err = s.docRepo.GetKBStats(ctx, kbID)
	if err != nil {
		return nil, err
	}

	// Cache for next time
	_ = s.cache.SetKBStats(ctx, kbID, stats, 0)

	return stats, nil
}

// CheckUserKBAccess checks if a user has access to a KB with specific permission
func (s *KBService) CheckUserKBAccess(ctx context.Context, kbID, tenantID, organizationID, userID, permission string) (bool, error) {
	// Try to get permissions from cache
	permissions, err := s.cache.GetKBPermissions(ctx, kbID, tenantID, organizationID, userID)
	if err == nil && permissions != nil {
		if permission == "" {
			return true, nil // Just checking if user has any access
		}
		if val, ok := permissions[permission]; ok {
			if boolVal, ok := val.(bool); ok {
				return boolVal, nil
			}
		}
		return false, nil
	}

	// Cache miss - check from database
	return s.mountRepo.CheckUserAccess(ctx, kbID, tenantID, organizationID, userID, permission)
}

// Request/Response DTOs

type CreateKBRequest struct {
	Name           string         `json:"name" binding:"required"`
	Description    string         `json:"description"`
	OwnerType      string         `json:"owner_type" binding:"required"` // tenant, organization, user
	OwnerID        string         `json:"owner_id" binding:"required"`
	TenantID       string         `json:"tenant_id"`        // From context, set by handler
	OrganizationID string         `json:"organization_id"`  // From context, set by handler
	Visibility     string         `json:"visibility"` // public, private, shared
	Tags           []string       `json:"tags"`
	Settings       models.JSONMap `json:"settings"`
}

type UpdateKBRequest struct {
	Name        *string        `json:"name"`
	Description *string        `json:"description"`
	Visibility  *string        `json:"visibility"`
	IsActive    *bool          `json:"is_active"`
	Tags        []string       `json:"tags"`
	Settings    models.JSONMap `json:"settings"`
}

type MountKBRequest struct {
	KBID           string         `json:"kb_id" binding:"required"`
	TenantID       string         `json:"tenant_id" binding:"required"`
	OrganizationID string         `json:"organization_id"`
	UserID         string         `json:"user_id"`
	MountedBy      string         `json:"mounted_by" binding:"required"`
	Permissions    models.JSONMap `json:"permissions"`
}
