package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
)

// LLMClient defines the interface for LLM services
type LLMClient interface {
	GenerateRAGAnswer(ctx context.Context, query string, contextChunks []string) (string, error)
	HealthCheck(ctx context.Context) error
}

// RAGService provides Retrieval-Augmented Generation service
type RAGService struct {
	searchService *SearchService
	vectorRepo    *repository.VectorRepository
	queryLogRepo  *repository.QueryLogRepository
	llmClient     LLMClient // LLM client for answer generation
	maxContextLen int       // Maximum context length for LLM
}

// NewRAGService creates a new RAG service
func NewRAGService(
	searchService *SearchService,
	vectorRepo *repository.VectorRepository,
	queryLogRepo *repository.QueryLogRepository,
	llmClient LLMClient,
	maxContextLen int,
) *RAGService {
	return &RAGService{
		searchService: searchService,
		vectorRepo:    vectorRepo,
		queryLogRepo:  queryLogRepo,
		llmClient:     llmClient,
		maxContextLen: maxContextLen,
	}
}

// Ask answers a question based on knowledge base content using RAG
// Flow: Retrieve relevant documents -> Build context -> Generate answer with LLM
func (s *RAGService) Ask(ctx context.Context, req *AskRequest) (*AskResponse, error) {
	startTime := time.Now()

	// Validate input
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
	}

	// Step 1: Retrieve relevant documents using semantic search
	searchReq := &SearchRequest{
		KBIDs:       req.KBIDs,
		QueryVector: req.QueryVector,
		QueryText:   req.Question,
		TopK:        req.TopK,
		TenantID:    req.TenantID,
		UserID:      req.UserID,
	}

	searchResp, err := s.searchService.SearchKnowledgeBases(ctx, searchReq)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve documents: %w", err)
	}

	// Step 2: Build context from retrieved documents
	contextStr, sources := s.buildContext(searchResp.Results, s.maxContextLen)

	// Step 3: Generate answer using LLM
	var answer string
	if len(searchResp.Results) == 0 {
		answer = "抱歉，我在知识库中没有找到与您问题相关的信息。请尝试重新表述您的问题，或者联系管理员补充相关知识内容。"
	} else {
		// Extract content chunks for LLM
		chunks := make([]string, len(searchResp.Results))
		for i, result := range searchResp.Results {
			chunks[i] = result.Content
		}

		// Generate answer using LLM
		llmAnswer, err := s.llmClient.GenerateRAGAnswer(ctx, req.Question, chunks)
		if err != nil {
			// Fallback to mock answer if LLM fails
			answer = s.generateMockAnswer(req.Question, contextStr, searchResp.Results)
		} else {
			answer = llmAnswer
		}
	}

	// Calculate total latency
	latency := time.Since(startTime)

	// Log RAG query
	if req.TenantID != "" && req.UserID != "" {
		var topKBID *string
		if len(searchResp.Results) > 0 {
			topKBID = &searchResp.Results[0].KBID
		}

		queryLog := &models.QueryLog{
			TenantID:    req.TenantID,
			UserID:      req.UserID,
			QueryText:   req.Question,
			KBIDs:       req.KBIDs,
			ResultCount: len(searchResp.Results),
			TopKBID:     topKBID,
			LatencyMS:   int(latency.Milliseconds()),
			Metadata: models.JSONMap{
				"query_type":     "rag",
				"top_k":          req.TopK,
				"context_length": len(contextStr),
				"sources_count":  len(sources),
				"has_answer":     answer != "",
			},
		}

		go func() {
			_ = s.queryLogRepo.CreateQueryLog(context.Background(), queryLog)
		}()
	}

	return &AskResponse{
		Answer:      answer,
		Sources:     sources,
		Context:     contextStr,
		Confidence:  s.calculateConfidence(searchResp.Results),
		LatencyMS:   int(latency.Milliseconds()),
		KBsSearched: len(req.KBIDs),
	}, nil
}

// buildContext builds context string from search results
// Combines relevant chunks into a coherent context, respecting max length
func (s *RAGService) buildContext(results []*repository.SearchResult, maxLen int) (string, []Source) {
	var contextParts []string
	var sources []Source
	currentLen := 0

	for i, result := range results {
		// Format context part with source attribution
		part := fmt.Sprintf("[Source %d: %s]\n%s\n", i+1, result.Filename, result.Content)
		partLen := len(part)

		// Check if adding this part would exceed max length
		if currentLen+partLen > maxLen {
			// Try to add a truncated version
			remainingLen := maxLen - currentLen
			if remainingLen > 100 { // Only add if we have reasonable space
				truncated := part[:remainingLen-3] + "..."
				contextParts = append(contextParts, truncated)
			}
			break
		}

		contextParts = append(contextParts, part)
		currentLen += partLen

		// Add to sources
		sources = append(sources, Source{
			DocumentID:     result.DocumentID,
			Filename:       result.Filename,
			ChunkID:        result.ChunkID,
			ChunkIndex:     result.ChunkIndex,
			Similarity:     result.Similarity,
			KBID:           result.KBID,
			ContentSnippet: s.truncateContent(result.Content, 200),
		})
	}

	return strings.Join(contextParts, "\n\n"), sources
}

// generateMockAnswer generates a fallback answer when LLM is unavailable
// This method is used as a fallback when the real LLM service fails
func (s *RAGService) generateMockAnswer(question string, context string, results []*repository.SearchResult) string {
	if len(results) == 0 {
		return "抱歉，我在知识库中没有找到与您问题相关的信息。请尝试重新表述您的问题，或者联系管理员补充相关知识内容。"
	}

	// Mock answer construction based on retrieved content
	// In production, this would be replaced with actual LLM API call
	answer := fmt.Sprintf(
		"根据知识库中的 %d 个相关文档，我找到了以下信息：\n\n"+
			"[Mock Answer - 等待LLM集成]\n\n"+
			"这个答案基于以下来源：\n",
		len(results),
	)

	for i, result := range results {
		if i >= 3 { // Show top 3 sources
			break
		}
		answer += fmt.Sprintf("- %s (相似度: %.2f%%)\n", result.Filename, result.Similarity*100)
	}

	answer += "\n注意：这是一个模拟回答。实际系统需要集成真实的LLM服务（如OpenAI GPT-4、Anthropic Claude等）来生成更准确和自然的回答。"

	return answer
}

// calculateConfidence calculates answer confidence based on search results
func (s *RAGService) calculateConfidence(results []*repository.SearchResult) float64 {
	if len(results) == 0 {
		return 0.0
	}

	// Simple confidence calculation: average of top 3 similarities
	var sum float64
	count := 0
	for i, result := range results {
		if i >= 3 {
			break
		}
		sum += result.Similarity
		count++
	}

	confidence := sum / float64(count)

	// Normalize to 0-1 range
	if confidence < 0 {
		confidence = 0
	}
	if confidence > 1 {
		confidence = 1
	}

	return confidence
}

// truncateContent truncates content to max length
func (s *RAGService) truncateContent(content string, maxLen int) string {
	if len(content) <= maxLen {
		return content
	}
	return content[:maxLen-3] + "..."
}

// Request/Response DTOs

// AskRequest represents a RAG question request
type AskRequest struct {
	KBIDs       []string  `json:"kb_ids" binding:"required,min=1"`
	Question    string    `json:"question" binding:"required,min=1,max=1000"`
	QueryVector []float32 `json:"query_vector" binding:"required,len=1024"`
	TopK        int       `json:"top_k" binding:"min=1,max=20"` // Lower max for RAG
	TenantID    string    `json:"-"`                            // Set by middleware
	UserID      string    `json:"-"`                            // Set by middleware
	Stream      bool      `json:"stream"`                       // Whether to stream response (future feature)
}

// Validate validates the ask request
func (r *AskRequest) Validate() error {
	if len(r.KBIDs) == 0 {
		return fmt.Errorf("at least one knowledge base ID is required")
	}
	if r.Question == "" {
		return fmt.Errorf("question is required")
	}
	if len(r.QueryVector) != 1024 {
		return fmt.Errorf("query vector must be 1024 dimensions, got %d", len(r.QueryVector))
	}
	if r.TopK <= 0 {
		r.TopK = 5 // Default for RAG (fewer than search)
	}
	if r.TopK > 20 {
		r.TopK = 20 // Max for RAG
	}
	return nil
}

// AskResponse represents a RAG answer response
type AskResponse struct {
	Answer      string   `json:"answer"`
	Sources     []Source `json:"sources"`
	Context     string   `json:"context,omitempty"` // Optional: return context used
	Confidence  float64  `json:"confidence"`        // 0-1 confidence score
	LatencyMS   int      `json:"latency_ms"`
	KBsSearched int      `json:"kbs_searched"`
}

// Source represents a source document for the answer
type Source struct {
	DocumentID     string  `json:"document_id"`
	Filename       string  `json:"filename"`
	ChunkID        string  `json:"chunk_id"`
	ChunkIndex     int     `json:"chunk_index"`
	Similarity     float64 `json:"similarity"`
	KBID           string  `json:"kb_id"`
	ContentSnippet string  `json:"content_snippet"`
}
