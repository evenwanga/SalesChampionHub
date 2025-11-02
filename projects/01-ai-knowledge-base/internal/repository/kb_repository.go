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
	ErrKBNotFound      = errors.New("knowledge base not found")
	ErrKBAlreadyExists = errors.New("knowledge base already exists")
	ErrInvalidKBID     = errors.New("invalid knowledge base ID")
)

// KBRepository handles knowledge base data operations
type KBRepository struct {
	db *gorm.DB
}

// NewKBRepository creates a new knowledge base repository
func NewKBRepository(db *gorm.DB) *KBRepository {
	return &KBRepository{
		db: db,
	}
}

// Create creates a new knowledge base
func (r *KBRepository) Create(ctx context.Context, kb *models.KnowledgeBase) error {
	if kb.ID == "" {
		return ErrInvalidKBID
	}

	// Check if KB already exists
	var existing models.KnowledgeBase
	err := r.db.WithContext(ctx).Where("id = ?", kb.ID).First(&existing).Error
	if err == nil {
		return ErrKBAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to check existing KB: %w", err)
	}

	// Set timestamps
	now := time.Now().UTC()
	kb.CreatedAt = now
	kb.UpdatedAt = now
	kb.LastUpdatedAt = now

	// Set default values
	if kb.Visibility == "" {
		kb.Visibility = "private"
	}
	if kb.Settings == nil {
		kb.Settings = make(models.JSONMap)
	}

	// Create the KB
	if err := r.db.WithContext(ctx).Create(kb).Error; err != nil {
		return fmt.Errorf("failed to create knowledge base: %w", err)
	}

	return nil
}

// GetByID retrieves a knowledge base by ID
// Note: RLS policies will automatically filter based on user's access
func (r *KBRepository) GetByID(ctx context.Context, kbID string) (*models.KnowledgeBase, error) {
	var kb models.KnowledgeBase

	err := r.db.WithContext(ctx).Where("id = ?", kbID).First(&kb).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrKBNotFound
		}
		return nil, fmt.Errorf("failed to get knowledge base: %w", err)
	}

	return &kb, nil
}

// Update updates a knowledge base
// Note: RLS policies ensure users can only update KBs they have write access to
func (r *KBRepository) Update(ctx context.Context, kb *models.KnowledgeBase) error {
	if kb.ID == "" {
		return ErrInvalidKBID
	}

	// Set update timestamp
	kb.UpdatedAt = time.Now().UTC()

	// Update the KB (RLS will prevent unauthorized updates)
	result := r.db.WithContext(ctx).
		Model(&models.KnowledgeBase{}).
		Where("id = ?", kb.ID).
		Updates(kb)

	if result.Error != nil {
		return fmt.Errorf("failed to update knowledge base: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrKBNotFound
	}

	return nil
}

// Delete soft deletes a knowledge base
// Note: RLS policies ensure users can only delete KBs they have delete access to
func (r *KBRepository) Delete(ctx context.Context, kbID string) error {
	if kbID == "" {
		return ErrInvalidKBID
	}

	// Soft delete by setting deleted_at timestamp
	result := r.db.WithContext(ctx).
		Model(&models.KnowledgeBase{}).
		Where("id = ? AND deleted_at IS NULL", kbID).
		Update("deleted_at", time.Now().UTC())

	if result.Error != nil {
		return fmt.Errorf("failed to delete knowledge base: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrKBNotFound
	}

	return nil
}

// List retrieves all knowledge bases accessible to the current user
// Supports pagination and filtering
func (r *KBRepository) List(ctx context.Context, options ListOptions) ([]*models.KnowledgeBase, int64, error) {
	var kbs []*models.KnowledgeBase
	var total int64

	// Base query (RLS will automatically filter)
	query := r.db.WithContext(ctx).Model(&models.KnowledgeBase{}).
		Where("deleted_at IS NULL")

	// Apply filters
	if options.Visibility != "" {
		query = query.Where("visibility = ?", options.Visibility)
	}
	if options.OwnerID != "" {
		query = query.Where("owner_id = ?", options.OwnerID)
	}
	if options.Search != "" {
		searchPattern := "%" + options.Search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", searchPattern, searchPattern)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count knowledge bases: %w", err)
	}

	// Apply pagination
	if options.Limit > 0 {
		query = query.Limit(options.Limit)
	} else {
		query = query.Limit(20) // Default limit
	}
	if options.Offset > 0 {
		query = query.Offset(options.Offset)
	}

	// Apply sorting
	if options.OrderBy != "" {
		query = query.Order(options.OrderBy)
	} else {
		query = query.Order("created_at DESC")
	}

	// Execute query
	if err := query.Find(&kbs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list knowledge bases: %w", err)
	}

	return kbs, total, nil
}

// GetUserAccessibleKBs retrieves all KBs accessible to a user using the PostgreSQL helper function
// This uses the database-level helper function that handles the three-level mounting logic
func (r *KBRepository) GetUserAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string, limit int) ([]*models.KnowledgeBase, error) {
	var kbs []*models.KnowledgeBase

	// Call the PostgreSQL helper function
	// The function signature: get_user_accessible_kbs(p_tenant_id, p_organization_id, p_user_id, p_limit)
	query := `
		SELECT kb.*
		FROM get_user_accessible_kbs($1, $2, $3, $4) AS kb_id
		JOIN knowledge_bases kb ON kb.id = kb_id
		WHERE kb.deleted_at IS NULL
		ORDER BY kb.created_at DESC
	`

	if err := r.db.WithContext(ctx).Raw(query, tenantID, organizationID, userID, limit).Scan(&kbs).Error; err != nil {
		return nil, fmt.Errorf("failed to get accessible knowledge bases: %w", err)
	}

	return kbs, nil
}

// CountByOwner counts knowledge bases by owner
func (r *KBRepository) CountByOwner(ctx context.Context, ownerID string) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&models.KnowledgeBase{}).
		Where("owner_id = ? AND deleted_at IS NULL", ownerID).
		Count(&count).Error

	if err != nil {
		return 0, fmt.Errorf("failed to count knowledge bases: %w", err)
	}

	return count, nil
}

// ListOptions defines options for listing knowledge bases
type ListOptions struct {
	Limit      int
	Offset     int
	OrderBy    string
	Visibility string
	OwnerID    string
	Search     string
}
