package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"gorm.io/gorm"
)

var (
	ErrMountNotFound      = errors.New("mount not found")
	ErrMountAlreadyExists = errors.New("mount already exists")
	ErrInvalidMountType   = errors.New("invalid mount type")
	ErrInvalidMountTarget = errors.New("invalid mount target")
)

// Valid mount types
const (
	MountTypeTenant       = "tenant"
	MountTypeOrganization = "organization"
	MountTypeUser         = "user"
)

// MountRepository handles knowledge base mount operations
type MountRepository struct {
	db *gorm.DB
}

// NewMountRepository creates a new mount repository
func NewMountRepository(db *gorm.DB) *MountRepository {
	return &MountRepository{
		db: db,
	}
}

// MountToTenant mounts a KB to a tenant
func (r *MountRepository) MountToTenant(ctx context.Context, kbID, tenantID, mountedBy string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error) {
	if kbID == "" || tenantID == "" || mountedBy == "" {
		return nil, ErrInvalidMountTarget
	}

	// Check if mount already exists
	var existing models.KnowledgeBaseMount
	err := r.db.WithContext(ctx).
		Where("kb_id = ? AND mount_type = ? AND tenant_id = ? AND is_active = true", kbID, MountTypeTenant, tenantID).
		First(&existing).Error

	if err == nil {
		return nil, ErrMountAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing mount: %w", err)
	}

	// Create mount
	// Note: For tenant mounts, organization_id and user_id must be NULL per chk_single_target constraint
	mount := &models.KnowledgeBaseMount{
		KBID:           kbID,
		MountType:      MountTypeTenant,
		TenantID:       &tenantID,
		OrganizationID: nil, // Must be NULL for tenant mounts
		UserID:         nil, // Must be NULL for tenant mounts
		MountedBy:      mountedBy,
		MountedAt:      time.Now().UTC(),
		Permissions:    permissions,
		IsActive:       true,
	}

	if err := r.db.WithContext(ctx).Create(mount).Error; err != nil {
		return nil, fmt.Errorf("failed to create tenant mount: %w", err)
	}

	return mount, nil
}

// MountToOrganization mounts a KB to an organization
func (r *MountRepository) MountToOrganization(ctx context.Context, kbID, tenantID, organizationID, mountedBy string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error) {
	if kbID == "" || tenantID == "" || organizationID == "" || mountedBy == "" {
		return nil, ErrInvalidMountTarget
	}

	// Check if mount already exists
	var existing models.KnowledgeBaseMount
	err := r.db.WithContext(ctx).
		Where("kb_id = ? AND mount_type = ? AND organization_id = ? AND is_active = true", kbID, MountTypeOrganization, organizationID).
		First(&existing).Error

	if err == nil {
		return nil, ErrMountAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing mount: %w", err)
	}

	// Create mount
	// Note: For organization mounts, tenant_id and user_id must be NULL per chk_single_target constraint
	mount := &models.KnowledgeBaseMount{
		KBID:           kbID,
		MountType:      MountTypeOrganization,
		TenantID:       nil, // Must be NULL for organization mounts
		OrganizationID: &organizationID,
		UserID:         nil, // Must be NULL for organization mounts
		MountedBy:      mountedBy,
		MountedAt:      time.Now().UTC(),
		Permissions:    permissions,
		IsActive:       true,
	}

	if err := r.db.WithContext(ctx).Create(mount).Error; err != nil {
		return nil, fmt.Errorf("failed to create organization mount: %w", err)
	}

	return mount, nil
}

// MountToUser mounts a KB to a specific user
func (r *MountRepository) MountToUser(ctx context.Context, kbID, tenantID, userID, mountedBy string, organizationID *string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error) {
	if kbID == "" || tenantID == "" || userID == "" || mountedBy == "" {
		return nil, ErrInvalidMountTarget
	}

	// Check if mount already exists
	var existing models.KnowledgeBaseMount
	err := r.db.WithContext(ctx).
		Where("kb_id = ? AND mount_type = ? AND user_id = ? AND is_active = true", kbID, MountTypeUser, userID).
		First(&existing).Error

	if err == nil {
		return nil, ErrMountAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing mount: %w", err)
	}

	// Create mount
	// Note: For user mounts, tenant_id and organization_id must be NULL per chk_single_target constraint
	mount := &models.KnowledgeBaseMount{
		KBID:           kbID,
		MountType:      MountTypeUser,
		TenantID:       nil, // Must be NULL for user mounts
		OrganizationID: nil, // Must be NULL for user mounts
		UserID:         &userID,
		MountedBy:      mountedBy,
		MountedAt:      time.Now().UTC(),
		Permissions:    permissions,
		IsActive:       true,
	}

	if err := r.db.WithContext(ctx).Create(mount).Error; err != nil {
		return nil, fmt.Errorf("failed to create user mount: %w", err)
	}

	return mount, nil
}

// Unmount deactivates a mount (soft delete)
func (r *MountRepository) Unmount(ctx context.Context, mountID int64) error {
	if mountID == 0 {
		return ErrMountNotFound
	}

	result := r.db.WithContext(ctx).
		Model(&models.KnowledgeBaseMount{}).
		Where("id = ? AND is_active = true", mountID).
		Update("is_active", false)

	if result.Error != nil {
		return fmt.Errorf("failed to unmount: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrMountNotFound
	}

	return nil
}

// GetMount retrieves a mount by ID
func (r *MountRepository) GetMount(ctx context.Context, mountID int64) (*models.KnowledgeBaseMount, error) {
	var mount models.KnowledgeBaseMount

	err := r.db.WithContext(ctx).Where("id = ?", mountID).First(&mount).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMountNotFound
		}
		return nil, fmt.Errorf("failed to get mount: %w", err)
	}

	return &mount, nil
}

// ListMountsForKB lists all active mounts for a knowledge base
func (r *MountRepository) ListMountsForKB(ctx context.Context, kbID string) ([]*models.KnowledgeBaseMount, error) {
	var mounts []*models.KnowledgeBaseMount

	err := r.db.WithContext(ctx).
		Where("kb_id = ? AND is_active = true", kbID).
		Order("created_at DESC").
		Find(&mounts).Error

	if err != nil {
		return nil, fmt.Errorf("failed to list mounts: %w", err)
	}

	return mounts, nil
}

// ListMountsForTenant lists all active mounts for a tenant
func (r *MountRepository) ListMountsForTenant(ctx context.Context, tenantID string) ([]*models.KnowledgeBaseMount, error) {
	var mounts []*models.KnowledgeBaseMount

	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND mount_type = ? AND is_active = true", tenantID, MountTypeTenant).
		Order("created_at DESC").
		Find(&mounts).Error

	if err != nil {
		return nil, fmt.Errorf("failed to list tenant mounts: %w", err)
	}

	return mounts, nil
}

// ListMountsForOrganization lists all active mounts for an organization
func (r *MountRepository) ListMountsForOrganization(ctx context.Context, organizationID string) ([]*models.KnowledgeBaseMount, error) {
	var mounts []*models.KnowledgeBaseMount

	err := r.db.WithContext(ctx).
		Where("organization_id = ? AND mount_type = ? AND is_active = true", organizationID, MountTypeOrganization).
		Order("created_at DESC").
		Find(&mounts).Error

	if err != nil {
		return nil, fmt.Errorf("failed to list organization mounts: %w", err)
	}

	return mounts, nil
}

// ListMountsForUser lists all active mounts for a user
func (r *MountRepository) ListMountsForUser(ctx context.Context, userID string) ([]*models.KnowledgeBaseMount, error) {
	var mounts []*models.KnowledgeBaseMount

	err := r.db.WithContext(ctx).
		Where("user_id = ? AND mount_type = ? AND is_active = true", userID, MountTypeUser).
		Order("created_at DESC").
		Find(&mounts).Error

	if err != nil {
		return nil, fmt.Errorf("failed to list user mounts: %w", err)
	}

	return mounts, nil
}

// UpdateMountPermissions updates the permissions for a mount
func (r *MountRepository) UpdateMountPermissions(ctx context.Context, mountID int64, permissions models.JSONMap) error {
	if mountID == 0 {
		return ErrMountNotFound
	}

	result := r.db.WithContext(ctx).
		Model(&models.KnowledgeBaseMount{}).
		Where("id = ? AND is_active = true", mountID).
		Update("permissions", permissions)

	if result.Error != nil {
		return fmt.Errorf("failed to update mount permissions: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrMountNotFound
	}

	return nil
}

// CheckUserAccess checks if a user has access to a KB with specific permissions
func (r *MountRepository) CheckUserAccess(ctx context.Context, kbID, tenantID, organizationID, userID string, requiredPermission string) (bool, error) {
	var count int64

	query := r.db.WithContext(ctx).Model(&models.KnowledgeBaseMount{}).
		Where("kb_id = ? AND is_active = true", kbID)

	// Check tenant-level mount
	tenantQuery := query.Session(&gorm.Session{}).
		Where("mount_type = ? AND tenant_id = ?", MountTypeTenant, tenantID)

	// Check organization-level mount (if user has organization)
	orgQuery := query.Session(&gorm.Session{})
	if organizationID != "" {
		orgQuery = orgQuery.Where("mount_type = ? AND organization_id = ?", MountTypeOrganization, organizationID)
	} else {
		orgQuery = orgQuery.Where("1 = 0") // No organization - always false
	}

	// Check user-level mount
	userQuery := query.Session(&gorm.Session{}).
		Where("mount_type = ? AND user_id = ?", MountTypeUser, userID)

	// Combine all queries with OR
	combinedQuery := r.db.WithContext(ctx).Model(&models.KnowledgeBaseMount{}).Where(
		r.db.Where(tenantQuery).Or(orgQuery).Or(userQuery),
	)

	// Add permission check if specified
	if requiredPermission != "" {
		permissionPath := fmt.Sprintf("permissions->>'%s'", requiredPermission)
		combinedQuery = combinedQuery.Where(permissionPath+" = ?", "true")
	}

	if err := combinedQuery.Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to check user access: %w", err)
	}

	return count > 0, nil
}

// GetUserKBPermissions retrieves the effective permissions a user has on a KB
// Priority: user-level > organization-level > tenant-level
func (r *MountRepository) GetUserKBPermissions(ctx context.Context, kbID, tenantID, organizationID, userID string) (models.JSONMap, error) {
	var mounts []*models.KnowledgeBaseMount

	query := r.db.WithContext(ctx).
		Where("kb_id = ? AND is_active = true", kbID).
		Where("(mount_type = ? AND tenant_id = ?) OR (mount_type = ? AND organization_id = ?) OR (mount_type = ? AND user_id = ?)",
			MountTypeTenant, tenantID,
			MountTypeOrganization, organizationID,
			MountTypeUser, userID).
		Order("CASE mount_type WHEN 'user' THEN 1 WHEN 'organization' THEN 2 WHEN 'tenant' THEN 3 END").
		Limit(1)

	if err := query.Find(&mounts).Error; err != nil {
		return nil, fmt.Errorf("failed to get user KB permissions: %w", err)
	}

	if len(mounts) == 0 {
		return nil, nil // No access
	}

	// Return the highest priority mount's permissions (first in order)
	return mounts[0].Permissions, nil
}
