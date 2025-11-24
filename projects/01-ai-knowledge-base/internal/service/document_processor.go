package service

import (
	"context"
	"fmt"
	"log"
	"unicode/utf8"

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

	// Clean content for PostgreSQL storage (remove invalid UTF-8 characters)
	// Note: The chunker will also clean the text, but we need to clean here too
	// to avoid errors when storing the full content in the database
	cleanedContent := cleanTextForPostgres(content)
	
	// Update document with extracted content
	doc.Content = cleanedContent
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

	// Step 3: Generate embeddings for all chunks in batches
	// Process in batches to avoid connection issues with large documents
	batchSize := 50 // Process 50 chunks at a time
	log.Printf("🧮 Generating embeddings for %d chunks using model: %s (batch size: %d)", len(chunks), p.embedClient.GetModel(), batchSize)
	
	var allEmbeddings [][]float32
	for i := 0; i < len(chunks); i += batchSize {
		end := i + batchSize
		if end > len(chunks) {
			end = len(chunks)
		}
		
		batch := chunks[i:end]
		log.Printf("  Processing batch %d-%d (%d chunks)...", i+1, end, len(batch))
		
		batchEmbeddings, err := p.embedClient.EmbedBatch(ctx, batch)
		if err != nil {
			_ = p.docRepo.UpdateStatus(ctx, docID, "failed", false)
			return fmt.Errorf("failed to generate embeddings for batch %d-%d: %w", i+1, end, err)
		}
		
		if len(batchEmbeddings) != len(batch) {
			_ = p.docRepo.UpdateStatus(ctx, docID, "failed", false)
			return fmt.Errorf("embedding count mismatch for batch %d-%d: got %d, expected %d", i+1, end, len(batchEmbeddings), len(batch))
		}
		
		allEmbeddings = append(allEmbeddings, batchEmbeddings...)
	}
	
	embeddings := allEmbeddings
	if len(embeddings) != len(chunks) {
		_ = p.docRepo.UpdateStatus(ctx, docID, "failed", false)
		return fmt.Errorf("total embedding count mismatch: got %d, expected %d", len(embeddings), len(chunks))
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

// cleanTextForPostgres removes invalid UTF-8 characters that PostgreSQL cannot store
func cleanTextForPostgres(text string) string {
	runes := []rune(text)
	cleaned := make([]rune, 0, len(runes))

	for _, r := range runes {
		// Skip null bytes (0x00) - PostgreSQL cannot store these
		if r == 0 {
			continue
		}

		// Skip other control characters except newline, tab, and carriage return
		if r < 32 && r != '\n' && r != '\t' && r != '\r' {
			continue
		}

		// Skip invalid Unicode characters
		if r == utf8.RuneError {
			continue
		}

		// Skip Unicode replacement character (often indicates encoding issues)
		if r == '\uFFFD' {
			continue
		}

		cleaned = append(cleaned, r)
	}

	return string(cleaned)
}
