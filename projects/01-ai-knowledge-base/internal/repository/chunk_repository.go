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
	ErrChunkNotFound = errors.New("chunk not found")
	ErrInvalidChunkID = errors.New("invalid chunk ID")
)

// ChunkRepository handles document chunk data operations
type ChunkRepository struct {
	db *gorm.DB
}

// NewChunkRepository creates a new chunk repository
func NewChunkRepository(db *gorm.DB) *ChunkRepository {
	return &ChunkRepository{
		db: db,
	}
}

// Create creates a new document chunk
func (r *ChunkRepository) Create(ctx context.Context, chunk *models.DocumentChunk) error {
	if chunk.ID == "" {
		return ErrInvalidChunkID
	}

	// Set timestamp
	chunk.CreatedAt = time.Now().UTC()

	if err := r.db.WithContext(ctx).Create(chunk).Error; err != nil {
		return fmt.Errorf("failed to create chunk: %w", err)
	}

	return nil
}

// GetByID retrieves a chunk by ID
func (r *ChunkRepository) GetByID(ctx context.Context, chunkID string) (*models.DocumentChunk, error) {
	var chunk models.DocumentChunk

	err := r.db.WithContext(ctx).Where("id = ?", chunkID).First(&chunk).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrChunkNotFound
		}
		return nil, fmt.Errorf("failed to get chunk: %w", err)
	}

	return &chunk, nil
}

// ListByDocument lists all chunks for a document
func (r *ChunkRepository) ListByDocument(ctx context.Context, documentID string) ([]*models.DocumentChunk, error) {
	var chunks []*models.DocumentChunk

	err := r.db.WithContext(ctx).
		Where("document_id = ?", documentID).
		Order("chunk_index ASC").
		Find(&chunks).Error

	if err != nil {
		return nil, fmt.Errorf("failed to list chunks: %w", err)
	}

	return chunks, nil
}

// ListByKB lists all chunks in a knowledge base
func (r *ChunkRepository) ListByKB(ctx context.Context, kbID string, limit, offset int) ([]*models.DocumentChunk, int64, error) {
	var chunks []*models.DocumentChunk
	var total int64

	// Get total count
	if err := r.db.WithContext(ctx).Model(&models.DocumentChunk{}).
		Where("kb_id = ?", kbID).
		Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count chunks: %w", err)
	}

	// Get chunks
	query := r.db.WithContext(ctx).Where("kb_id = ?", kbID).Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&chunks).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list chunks: %w", err)
	}

	return chunks, total, nil
}

// DeleteByDocument deletes all chunks for a document
func (r *ChunkRepository) DeleteByDocument(ctx context.Context, documentID string) error {
	result := r.db.WithContext(ctx).Where("document_id = ?", documentID).Delete(&models.DocumentChunk{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete chunks: %w", result.Error)
	}

	return nil
}

// DeleteByKB deletes all chunks in a knowledge base
func (r *ChunkRepository) DeleteByKB(ctx context.Context, kbID string) error {
	result := r.db.WithContext(ctx).Where("kb_id = ?", kbID).Delete(&models.DocumentChunk{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete chunks: %w", result.Error)
	}

	return nil
}

// CountByDocument counts chunks for a document
func (r *ChunkRepository) CountByDocument(ctx context.Context, documentID string) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).Model(&models.DocumentChunk{}).
		Where("document_id = ?", documentID).
		Count(&count).Error

	if err != nil {
		return 0, fmt.Errorf("failed to count chunks: %w", err)
	}

	return count, nil
}

// CountByKB counts chunks in a knowledge base
func (r *ChunkRepository) CountByKB(ctx context.Context, kbID string) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).Model(&models.DocumentChunk{}).
		Where("kb_id = ?", kbID).
		Count(&count).Error

	if err != nil {
		return 0, fmt.Errorf("failed to count chunks: %w", err)
	}

	return count, nil
}

// SearchChunks searches for chunks by content
func (r *ChunkRepository) SearchChunks(ctx context.Context, kbID, query string, limit int) ([]*models.DocumentChunk, error) {
	var chunks []*models.DocumentChunk

	searchQuery := "%" + query + "%"
	err := r.db.WithContext(ctx).
		Where("kb_id = ? AND content ILIKE ?", kbID, searchQuery).
		Limit(limit).
		Order("created_at DESC").
		Find(&chunks).Error

	if err != nil {
		return nil, fmt.Errorf("failed to search chunks: %w", err)
	}

	return chunks, nil
}
