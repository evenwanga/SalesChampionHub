package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"gorm.io/gorm"
)

var (
	ErrVectorNotFound      = errors.New("vector not found")
	ErrVectorAlreadyExists = errors.New("vector already exists")
	ErrInvalidVectorID     = errors.New("invalid vector ID")
	ErrInvalidEmbedding    = errors.New("invalid embedding dimension")
)

// VectorRepository handles vector/embedding operations
type VectorRepository struct {
	db *gorm.DB
}

// NewVectorRepository creates a new vector repository
func NewVectorRepository(db *gorm.DB) *VectorRepository {
	return &VectorRepository{
		db: db,
	}
}

// CreateVector creates a new vector embedding
func (r *VectorRepository) CreateVector(ctx context.Context, vector *models.Vector) error {
	if vector.ID == "" {
		return ErrInvalidVectorID
	}

	// Validate embedding dimension (assuming 1024 as per model)
	if len(vector.Embedding) != 1024 {
		return fmt.Errorf("%w: expected 1024, got %d", ErrInvalidEmbedding, len(vector.Embedding))
	}

	// Create the vector
	if err := r.db.WithContext(ctx).Create(vector).Error; err != nil {
		return fmt.Errorf("failed to create vector: %w", err)
	}

	return nil
}

// CreateChunk creates a new document chunk
func (r *VectorRepository) CreateChunk(ctx context.Context, chunk *models.DocumentChunk) error {
	if chunk.ID == "" {
		return errors.New("invalid chunk ID")
	}

	// Create the chunk
	if err := r.db.WithContext(ctx).Create(chunk).Error; err != nil {
		return fmt.Errorf("failed to create chunk: %w", err)
	}

	return nil
}

// GetChunk retrieves a chunk by ID
func (r *VectorRepository) GetChunk(ctx context.Context, chunkID string) (*models.DocumentChunk, error) {
	var chunk models.DocumentChunk

	err := r.db.WithContext(ctx).Where("id = ?", chunkID).First(&chunk).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("chunk not found")
		}
		return nil, fmt.Errorf("failed to get chunk: %w", err)
	}

	return &chunk, nil
}

// ListChunksByDocument lists all chunks for a document
func (r *VectorRepository) ListChunksByDocument(ctx context.Context, documentID string) ([]*models.DocumentChunk, error) {
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

// DeleteChunksByDocument deletes all chunks for a document
func (r *VectorRepository) DeleteChunksByDocument(ctx context.Context, documentID string) error {
	if err := r.db.WithContext(ctx).Where("document_id = ?", documentID).Delete(&models.DocumentChunk{}).Error; err != nil {
		return fmt.Errorf("failed to delete chunks: %w", err)
	}
	return nil
}

// DeleteVectorsByDocument deletes all vectors for a document
func (r *VectorRepository) DeleteVectorsByDocument(ctx context.Context, documentID string) error {
	// Get chunk IDs first
	var chunkIDs []string
	err := r.db.WithContext(ctx).Model(&models.DocumentChunk{}).
		Where("document_id = ?", documentID).
		Pluck("id", &chunkIDs).Error

	if err != nil {
		return fmt.Errorf("failed to get chunk IDs: %w", err)
	}

	if len(chunkIDs) == 0 {
		return nil // No chunks to delete
	}

	// Delete vectors for these chunks
	if err := r.db.WithContext(ctx).Where("chunk_id IN ?", chunkIDs).Delete(&models.Vector{}).Error; err != nil {
		return fmt.Errorf("failed to delete vectors: %w", err)
	}

	return nil
}

// SimilaritySearch performs vector similarity search using pgvector
// Returns the top K most similar chunks with their distances
func (r *VectorRepository) SimilaritySearch(ctx context.Context, kbIDs []string, queryVector []float32, topK int) ([]*SearchResult, error) {
	if len(queryVector) != 1024 {
		return nil, fmt.Errorf("%w: expected 1024, got %d", ErrInvalidEmbedding, len(queryVector))
	}

	if topK <= 0 || topK > 100 {
		topK = 10 // Default
	}

	// Convert float32 slice to PostgreSQL vector format
	vectorStr := fmt.Sprintf("[%v]", queryVector)

	var results []*SearchResult

	// Use pgvector's <=> operator for cosine distance
	// Lower distance = more similar
	query := `
		SELECT
			v.id,
			v.chunk_id,
			v.kb_id,
			c.content,
			c.chunk_index,
			c.document_id,
			d.filename,
			d.file_type,
			(v.embedding <=> $1::vector) as distance
		FROM vectors v
		JOIN document_chunks c ON v.chunk_id = c.id
		JOIN documents d ON c.document_id = d.id
		WHERE v.kb_id = ANY($2)
			AND d.deleted_at IS NULL
		ORDER BY distance ASC
		LIMIT $3
	`

	if err := r.db.WithContext(ctx).Raw(query, vectorStr, kbIDs, topK).Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("failed to perform similarity search: %w", err)
	}

	return results, nil
}

// HybridSearch performs both vector similarity and text search
func (r *VectorRepository) HybridSearch(ctx context.Context, kbIDs []string, queryVector []float32, queryText string, topK int) ([]*SearchResult, error) {
	if len(queryVector) != 1024 {
		return nil, fmt.Errorf("%w: expected 1024, got %d", ErrInvalidEmbedding, len(queryVector))
	}

	if topK <= 0 || topK > 100 {
		topK = 10
	}

	vectorStr := fmt.Sprintf("[%v]", queryVector)
	searchPattern := "%" + queryText + "%"

	var results []*SearchResult

	// Hybrid search: combine vector similarity with text matching
	// Boost scores when text matches
	query := `
		SELECT
			v.id,
			v.chunk_id,
			v.kb_id,
			c.content,
			c.chunk_index,
			c.document_id,
			d.filename,
			d.file_type,
			(v.embedding <=> $1::vector) as vector_distance,
			CASE
				WHEN c.content ILIKE $2 THEN 0.5
				ELSE 1.0
			END as text_boost,
			((v.embedding <=> $1::vector) * CASE WHEN c.content ILIKE $2 THEN 0.5 ELSE 1.0 END) as distance
		FROM vectors v
		JOIN document_chunks c ON v.chunk_id = c.id
		JOIN documents d ON c.document_id = d.id
		WHERE v.kb_id = ANY($3)
			AND d.deleted_at IS NULL
		ORDER BY distance ASC
		LIMIT $4
	`

	if err := r.db.WithContext(ctx).Raw(query, vectorStr, searchPattern, kbIDs, topK).Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("failed to perform hybrid search: %w", err)
	}

	return results, nil
}

// GetVectorByChunkID retrieves a vector by chunk ID
func (r *VectorRepository) GetVectorByChunkID(ctx context.Context, chunkID string) (*models.Vector, error) {
	var vector models.Vector

	err := r.db.WithContext(ctx).Where("chunk_id = ?", chunkID).First(&vector).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrVectorNotFound
		}
		return nil, fmt.Errorf("failed to get vector: %w", err)
	}

	return &vector, nil
}

// CountVectorsByKB counts vectors in a knowledge base
func (r *VectorRepository) CountVectorsByKB(ctx context.Context, kbID string) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).
		Model(&models.Vector{}).
		Where("kb_id = ?", kbID).
		Count(&count).Error

	if err != nil {
		return 0, fmt.Errorf("failed to count vectors: %w", err)
	}

	return count, nil
}

// SearchResult represents a search result with metadata
type SearchResult struct {
	ID         string  `json:"id"`
	ChunkID    string  `json:"chunk_id"`
	KBID       string  `json:"kb_id"`
	Content    string  `json:"content"`
	ChunkIndex int     `json:"chunk_index"`
	DocumentID string  `json:"document_id"`
	Filename   string  `json:"filename"`
	FileType   string  `json:"file_type"`
	Distance   float64 `json:"distance"`   // Cosine distance (0 = identical, 2 = opposite)
	Similarity float64 `json:"similarity"` // Converted to similarity score (0-1)
	VectorDist float64 `json:"vector_distance,omitempty"`
	TextBoost  float64 `json:"text_boost,omitempty"`
}

// CalculateSimilarity converts distance to similarity score
func (r *SearchResult) CalculateSimilarity() {
	// Cosine distance ranges from 0 to 2
	// Convert to similarity: 1 - (distance / 2)
	r.Similarity = 1.0 - (r.Distance / 2.0)
	if r.Similarity < 0 {
		r.Similarity = 0
	}
	if r.Similarity > 1 {
		r.Similarity = 1
	}
}
