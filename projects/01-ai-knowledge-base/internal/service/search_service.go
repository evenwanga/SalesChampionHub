package service

import (
	"context"
	"fmt"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
)

// SearchService provides business logic for search operations
type SearchService struct {
	vectorRepo   *repository.VectorRepository
	queryLogRepo *repository.QueryLogRepository
	maxKBs       int
}

// NewSearchService creates a new search service
func NewSearchService(
	vectorRepo *repository.VectorRepository,
	queryLogRepo *repository.QueryLogRepository,
	maxKBs int,
) *SearchService {
	return &SearchService{
		vectorRepo:   vectorRepo,
		queryLogRepo: queryLogRepo,
		maxKBs:       maxKBs,
	}
}

// SearchKnowledgeBases performs multi-knowledge base semantic search
// Returns top K most similar chunks from specified knowledge bases
func (s *SearchService) SearchKnowledgeBases(ctx context.Context, req *SearchRequest) (*SearchResponse, error) {
	startTime := time.Now()

	// Validate input
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	// Limit number of KBs to prevent resource exhaustion
	if len(req.KBIDs) > s.maxKBs {
		return nil, fmt.Errorf("%w: maximum %d knowledge bases allowed, got %d", ErrKBLimitExceeded, s.maxKBs, len(req.KBIDs))
	}

	// Perform vector similarity search
	results, err := s.vectorRepo.SimilaritySearch(ctx, req.KBIDs, req.QueryVector, req.TopK)
	if err != nil {
		return nil, fmt.Errorf("failed to perform similarity search: %w", err)
	}

	// Calculate similarity scores and deduplicate
	uniqueResults := s.deduplicateResults(results)

	// Calculate latency
	latency := time.Since(startTime)

	// Log query if user context is provided
	if req.TenantID != "" && req.UserID != "" {
		var topKBID *string
		if len(uniqueResults) > 0 {
			topKBID = &uniqueResults[0].KBID
		}

		queryLog := &models.QueryLog{
			TenantID:    req.TenantID,
			UserID:      req.UserID,
			QueryText:   req.QueryText,
			KBIDs:       req.KBIDs,
			ResultCount: len(uniqueResults),
			TopKBID:     topKBID,
			LatencyMS:   int(latency.Milliseconds()),
			Metadata: models.JSONMap{
				"search_type": "semantic",
				"top_k":       req.TopK,
			},
		}

		// Log query asynchronously (don't block on errors)
		go func() {
			_ = s.queryLogRepo.CreateQueryLog(context.Background(), queryLog)
		}()
	}

	return &SearchResponse{
		Results:     uniqueResults,
		TotalCount:  len(uniqueResults),
		LatencyMS:   int(latency.Milliseconds()),
		KBsSearched: len(req.KBIDs),
	}, nil
}

// HybridSearch performs hybrid search combining semantic and keyword matching
func (s *SearchService) HybridSearch(ctx context.Context, req *HybridSearchRequest) (*SearchResponse, error) {
	startTime := time.Now()

	// Validate input
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	// Limit number of KBs
	if len(req.KBIDs) > s.maxKBs {
		return nil, fmt.Errorf("%w: maximum %d knowledge bases allowed", ErrKBLimitExceeded, s.maxKBs)
	}

	// Perform hybrid search (vector + text)
	results, err := s.vectorRepo.HybridSearch(ctx, req.KBIDs, req.QueryVector, req.QueryText, req.TopK)
	if err != nil {
		return nil, fmt.Errorf("failed to perform hybrid search: %w", err)
	}

	// Calculate similarity scores and deduplicate
	uniqueResults := s.deduplicateResults(results)

	// Calculate latency
	latency := time.Since(startTime)

	// Log query
	if req.TenantID != "" && req.UserID != "" {
		var topKBID *string
		if len(uniqueResults) > 0 {
			topKBID = &uniqueResults[0].KBID
		}

		queryLog := &models.QueryLog{
			TenantID:    req.TenantID,
			UserID:      req.UserID,
			QueryText:   req.QueryText,
			KBIDs:       req.KBIDs,
			ResultCount: len(uniqueResults),
			TopKBID:     topKBID,
			LatencyMS:   int(latency.Milliseconds()),
			Metadata: models.JSONMap{
				"search_type": "hybrid",
				"top_k":       req.TopK,
			},
		}

		go func() {
			_ = s.queryLogRepo.CreateQueryLog(context.Background(), queryLog)
		}()
	}

	return &SearchResponse{
		Results:     uniqueResults,
		TotalCount:  len(uniqueResults),
		LatencyMS:   int(latency.Milliseconds()),
		KBsSearched: len(req.KBIDs),
	}, nil
}

// deduplicateResults removes duplicate chunks and calculates similarity scores
func (s *SearchService) deduplicateResults(results []*repository.SearchResult) []*repository.SearchResult {
	seen := make(map[string]bool)
	unique := make([]*repository.SearchResult, 0, len(results))

	for _, result := range results {
		// Use chunk_id as deduplication key
		if !seen[result.ChunkID] {
			seen[result.ChunkID] = true

			// Calculate similarity score
			result.CalculateSimilarity()

			unique = append(unique, result)
		}
	}

	return unique
}

// Request/Response DTOs

// SearchRequest represents a semantic search request
type SearchRequest struct {
	KBIDs       []string  `json:"kb_ids" binding:"required,min=1"`
	QueryVector []float32 `json:"query_vector" binding:"required,len=1024"`
	QueryText   string    `json:"query_text"`
	TopK        int       `json:"top_k" binding:"min=1,max=100"`
	TenantID    string    `json:"-"` // Set by middleware
	UserID      string    `json:"-"` // Set by middleware
}

// Validate validates the search request
func (r *SearchRequest) Validate() error {
	if len(r.KBIDs) == 0 {
		return fmt.Errorf("at least one knowledge base ID is required")
	}
	if len(r.QueryVector) != 1024 {
		return fmt.Errorf("query vector must be 1024 dimensions, got %d", len(r.QueryVector))
	}
	if r.TopK <= 0 {
		r.TopK = 10 // Default
	}
	if r.TopK > 100 {
		r.TopK = 100 // Max
	}
	return nil
}

// HybridSearchRequest represents a hybrid search request
type HybridSearchRequest struct {
	KBIDs       []string  `json:"kb_ids" binding:"required,min=1"`
	QueryVector []float32 `json:"query_vector" binding:"required,len=1024"`
	QueryText   string    `json:"query_text" binding:"required"`
	TopK        int       `json:"top_k" binding:"min=1,max=100"`
	TenantID    string    `json:"-"` // Set by middleware
	UserID      string    `json:"-"` // Set by middleware
}

// Validate validates the hybrid search request
func (r *HybridSearchRequest) Validate() error {
	if len(r.KBIDs) == 0 {
		return fmt.Errorf("at least one knowledge base ID is required")
	}
	if len(r.QueryVector) != 1024 {
		return fmt.Errorf("query vector must be 1024 dimensions, got %d", len(r.QueryVector))
	}
	if r.QueryText == "" {
		return fmt.Errorf("query text is required for hybrid search")
	}
	if r.TopK <= 0 {
		r.TopK = 10 // Default
	}
	if r.TopK > 100 {
		r.TopK = 100 // Max
	}
	return nil
}

// SearchResponse represents a search response
type SearchResponse struct {
	Results     []*repository.SearchResult `json:"results"`
	TotalCount  int                        `json:"total_count"`
	LatencyMS   int                        `json:"latency_ms"`
	KBsSearched int                        `json:"kbs_searched"`
}
