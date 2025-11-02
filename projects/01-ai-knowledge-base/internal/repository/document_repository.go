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
	ErrDocumentNotFound      = errors.New("document not found")
	ErrDocumentAlreadyExists = errors.New("document already exists")
	ErrInvalidDocumentID     = errors.New("invalid document ID")
)

// DocumentRepository handles document data operations
type DocumentRepository struct {
	db *gorm.DB
}

// NewDocumentRepository creates a new document repository
func NewDocumentRepository(db *gorm.DB) *DocumentRepository {
	return &DocumentRepository{
		db: db,
	}
}

// Create creates a new document
func (r *DocumentRepository) Create(ctx context.Context, doc *models.Document) error {
	if doc.ID == "" {
		return ErrInvalidDocumentID
	}

	// Check if document already exists
	var existing models.Document
	err := r.db.WithContext(ctx).Where("id = ?", doc.ID).First(&existing).Error
	if err == nil {
		return ErrDocumentAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to check existing document: %w", err)
	}

	// Set timestamps
	now := time.Now().UTC()
	doc.CreatedAt = now
	doc.UpdatedAt = now

	// Set default values
	if doc.Status == "" {
		doc.Status = "pending"
	}
	if doc.Metadata == nil {
		doc.Metadata = make(models.JSONMap)
	}

	// Create the document
	if err := r.db.WithContext(ctx).Create(doc).Error; err != nil {
		return fmt.Errorf("failed to create document: %w", err)
	}

	return nil
}

// GetByID retrieves a document by ID
// Note: RLS policies will automatically filter based on user's access to the KB
func (r *DocumentRepository) GetByID(ctx context.Context, docID string) (*models.Document, error) {
	var doc models.Document

	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", docID).First(&doc).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrDocumentNotFound
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	return &doc, nil
}

// Update updates a document
func (r *DocumentRepository) Update(ctx context.Context, doc *models.Document) error {
	if doc.ID == "" {
		return ErrInvalidDocumentID
	}

	// Set update timestamp
	doc.UpdatedAt = time.Now().UTC()

	// Update the document (RLS will prevent unauthorized updates)
	result := r.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("id = ? AND deleted_at IS NULL", doc.ID).
		Updates(doc)

	if result.Error != nil {
		return fmt.Errorf("failed to update document: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrDocumentNotFound
	}

	return nil
}

// UpdateStatus updates document status and optionally sets processed_at
func (r *DocumentRepository) UpdateStatus(ctx context.Context, docID, status string, setProcessedAt bool) error {
	if docID == "" {
		return ErrInvalidDocumentID
	}

	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now().UTC(),
	}

	if setProcessedAt {
		updates["processed_at"] = time.Now().UTC()
	}

	result := r.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("id = ? AND deleted_at IS NULL", docID).
		Updates(updates)

	if result.Error != nil {
		return fmt.Errorf("failed to update document status: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrDocumentNotFound
	}

	return nil
}

// Delete soft deletes a document
func (r *DocumentRepository) Delete(ctx context.Context, docID string) error {
	if docID == "" {
		return ErrInvalidDocumentID
	}

	result := r.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("id = ? AND deleted_at IS NULL", docID).
		Update("deleted_at", time.Now().UTC())

	if result.Error != nil {
		return fmt.Errorf("failed to delete document: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return ErrDocumentNotFound
	}

	return nil
}

// ListByKB lists all documents in a knowledge base
func (r *DocumentRepository) ListByKB(ctx context.Context, kbID string, options DocumentListOptions) ([]*models.Document, int64, error) {
	var docs []*models.Document
	var total int64

	// Base query (RLS will automatically filter)
	query := r.db.WithContext(ctx).Model(&models.Document{}).
		Where("kb_id = ? AND deleted_at IS NULL", kbID)

	// Apply filters
	if options.Status != "" {
		query = query.Where("status = ?", options.Status)
	}
	if options.FileType != "" {
		query = query.Where("file_type = ?", options.FileType)
	}
	if options.UploadedBy != "" {
		query = query.Where("uploaded_by = ?", options.UploadedBy)
	}
	if options.Search != "" {
		searchPattern := "%" + options.Search + "%"
		query = query.Where("filename ILIKE ? OR content ILIKE ?", searchPattern, searchPattern)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count documents: %w", err)
	}

	// Apply pagination
	if options.Limit > 0 {
		query = query.Limit(options.Limit)
	} else {
		query = query.Limit(50) // Default limit
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
	if err := query.Find(&docs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list documents: %w", err)
	}

	return docs, total, nil
}

// GetKBStats retrieves statistics for a knowledge base
func (r *DocumentRepository) GetKBStats(ctx context.Context, kbID string) (*KBStats, error) {
	var stats KBStats

	// Get document count and total size
	err := r.db.WithContext(ctx).Model(&models.Document{}).
		Where("kb_id = ? AND deleted_at IS NULL", kbID).
		Select("COUNT(*) as document_count, COALESCE(SUM(file_size), 0) as total_size_bytes").
		Scan(&stats).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get KB stats: %w", err)
	}

	// Get status breakdown
	var statusCounts []struct {
		Status string
		Count  int64
	}

	err = r.db.WithContext(ctx).Model(&models.Document{}).
		Where("kb_id = ? AND deleted_at IS NULL", kbID).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusCounts).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get status breakdown: %w", err)
	}

	stats.StatusBreakdown = make(map[string]int64)
	for _, sc := range statusCounts {
		stats.StatusBreakdown[sc.Status] = sc.Count
	}

	return &stats, nil
}

// FindByContentHash finds documents by content hash (for duplicate detection)
func (r *DocumentRepository) FindByContentHash(ctx context.Context, kbID, contentHash string) ([]*models.Document, error) {
	var docs []*models.Document

	err := r.db.WithContext(ctx).
		Where("kb_id = ? AND content_hash = ? AND deleted_at IS NULL", kbID, contentHash).
		Find(&docs).Error

	if err != nil {
		return nil, fmt.Errorf("failed to find documents by content hash: %w", err)
	}

	return docs, nil
}

// DocumentListOptions defines options for listing documents
type DocumentListOptions struct {
	Limit      int
	Offset     int
	OrderBy    string
	Status     string
	FileType   string
	UploadedBy string
	Search     string
}

// KBStats represents knowledge base statistics
type KBStats struct {
	DocumentCount   int64            `json:"document_count"`
	TotalSizeBytes  int64            `json:"total_size_bytes"`
	StatusBreakdown map[string]int64 `json:"status_breakdown"`
}
