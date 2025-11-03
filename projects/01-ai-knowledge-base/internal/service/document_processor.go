package service

import (
	"context"
	"fmt"
	"log"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/google/uuid"
)

// EmbeddingClient defines the interface for embedding generation
type EmbeddingClient interface {
	EmbedText(ctx context.Context, text string) ([]float32, error)
	EmbedBatch(ctx context.Context, texts []string) ([][]float32, error)
	GetDimension() int
	GetModel() string
}

// DocumentProcessor handles the complete document processing pipeline
type DocumentProcessor struct {
	docRepo       *repository.DocumentRepository
	chunkRepo     *repository.ChunkRepository
	vectorRepo    *repository.VectorRepository
	parser        *DocumentParser
	chunker       *DocumentChunker
	embedClient   EmbeddingClient
}

// NewDocumentProcessor creates a new document processor
func NewDocumentProcessor(
	docRepo *repository.DocumentRepository,
	chunkRepo *repository.ChunkRepository,
	vectorRepo *repository.VectorRepository,
	parser *DocumentParser,
	chunker *DocumentChunker,
	embedClient EmbeddingClient,
) *DocumentProcessor {
	return &DocumentProcessor{
		docRepo:     docRepo,
		chunkRepo:   chunkRepo,
		vectorRepo:  vectorRepo,
		parser:      parser,
		chunker:     chunker,
		embedClient: embedClient,
	}
}

// ProcessDocument processes a document through the complete pipeline
func (p *DocumentProcessor) ProcessDocument(ctx context.Context, docID string) error {
	// Update status to processing
	if err := p.docRepo.UpdateStatus(ctx, docID, "processing", false); err != nil {
		return fmt.Errorf("failed to update status to processing: %w", err)
	}

	// Get document
	doc, err := p.docRepo.GetByID(ctx, docID)
	if err != nil {
		_ = p.docRepo.UpdateStatus(ctx, docID, "failed", false)
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Step 1: Parse document content
	log.Printf("📄 Parsing document: %s (%s)", doc.ID, doc.Filename)
	content, err := p.parser.ParseFile(doc.FilePath)
	if err != nil {
		_ = p.docRepo.UpdateStatus(ctx, docID, "failed", false)
		return fmt.Errorf("failed to parse document: %w", err)
	}

	// Update document with extracted content
	doc.Content = content
	if err := p.docRepo.Update(ctx, doc); err != nil {
		log.Printf("Warning: failed to update document content: %v", err)
	}

	// Step 2: Chunk the content
	log.Printf("✂️  Chunking document: %s into chunks", doc.ID)
	chunks := p.chunker.ChunkText(content)
	if len(chunks) == 0 {
		_ = p.docRepo.UpdateStatus(ctx, docID, "failed", false)
		return fmt.Errorf("no chunks generated from document")
	}

	log.Printf("📦 Generated %d chunks", len(chunks))

	// Step 3: Generate embeddings for all chunks
	log.Printf("🧮 Generating embeddings for %d chunks using model: %s", len(chunks), p.embedClient.GetModel())
	embeddings, err := p.embedClient.EmbedBatch(ctx, chunks)
	if err != nil {
		_ = p.docRepo.UpdateStatus(ctx, docID, "failed", false)
		return fmt.Errorf("failed to generate embeddings: %w", err)
	}

	if len(embeddings) != len(chunks) {
		_ = p.docRepo.UpdateStatus(ctx, docID, "failed", false)
		return fmt.Errorf("embedding count mismatch: got %d, expected %d", len(embeddings), len(chunks))
	}

	// Step 4: Store chunks and vectors
	log.Printf("💾 Storing %d chunks and vectors to database", len(chunks))
	for i, chunkContent := range chunks {
		// Create chunk record
		chunkID := "chunk_" + uuid.New().String()
		chunk := &models.DocumentChunk{
			ID:            chunkID,
			DocumentID:    doc.ID,
			KBID:          doc.KBID,
			ChunkIndex:    i,
			Content:       chunkContent,
			ContentLength: len(chunkContent),
			Metadata:      make(models.JSONMap),
		}

		if err := p.chunkRepo.Create(ctx, chunk); err != nil {
			log.Printf("Warning: failed to create chunk %d: %v", i, err)
			continue
		}

		// Create vector record
		vectorID := "vec_" + uuid.New().String()
		vector := &models.Vector{
			ID:        vectorID,
			ChunkID:   chunkID,
			KBID:      doc.KBID,
			Embedding: embeddings[i],
			Model:     p.embedClient.GetModel(),
		}

		if err := p.vectorRepo.CreateVector(ctx, vector); err != nil {
			log.Printf("Warning: failed to create vector for chunk %d: %v", i, err)
			continue
		}
	}

	// Update document status to completed
	doc.ChunkCount = len(chunks)
	if err := p.docRepo.Update(ctx, doc); err != nil {
		log.Printf("Warning: failed to update chunk count: %v", err)
	}

	if err := p.docRepo.UpdateStatus(ctx, docID, "completed", true); err != nil {
		log.Printf("Warning: failed to update status to completed: %v", err)
	}

	log.Printf("✅ Document processing completed: %s (%d chunks, %d vectors)", doc.ID, len(chunks), len(embeddings))
	return nil
}

// ProcessDocumentAsync processes a document asynchronously in a goroutine
func (p *DocumentProcessor) ProcessDocumentAsync(docID string) {
	go func() {
		ctx := context.Background()
		if err := p.ProcessDocument(ctx, docID); err != nil {
			log.Printf("❌ Failed to process document %s: %v", docID, err)
		}
	}()
}

// ReprocessDocument reprocesses an existing document
// Useful when you want to regenerate embeddings with a new model
func (p *DocumentProcessor) ReprocessDocument(ctx context.Context, docID string) error {
	// Verify document exists
	_, err := p.docRepo.GetByID(ctx, docID)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Delete old vectors by document
	if err := p.vectorRepo.DeleteVectorsByDocument(ctx, docID); err != nil {
		log.Printf("Warning: failed to delete old vectors: %v", err)
	}

	// Delete old chunks
	if err := p.chunkRepo.DeleteByDocument(ctx, docID); err != nil {
		log.Printf("Warning: failed to delete old chunks: %v", err)
	}

	// Process again
	return p.ProcessDocument(ctx, docID)
}

// GetProcessingStats returns statistics about document processing
type ProcessingStats struct {
	TotalDocuments    int64
	ProcessedDocs     int64
	ProcessingDocs    int64
	FailedDocs        int64
	PendingDocs       int64
	TotalChunks       int64
	TotalVectors      int64
}

// GetProcessingStats retrieves processing statistics for a KB
func (p *DocumentProcessor) GetProcessingStats(ctx context.Context, kbID string) (*ProcessingStats, error) {
	// This would need additional repository methods to implement
	// For now, return a placeholder
	return &ProcessingStats{}, nil
}
