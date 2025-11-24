package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/metrics"
)

var (
	ErrEmbeddingFailed    = errors.New("embedding generation failed")
	ErrInvalidDimension   = errors.New("invalid embedding dimension")
	ErrModelNotAvailable  = errors.New("embedding model not available")
)

// EmbeddingService handles text embedding generation
type EmbeddingService struct {
	apiURL     string
	apiKey     string
	model      string
	dimension  int
	httpClient *http.Client
	timeout    time.Duration
}

// NewEmbeddingService creates a new embedding service
func NewEmbeddingService(apiURL, apiKey, model string, dimension int, timeout time.Duration) *EmbeddingService {
	return &EmbeddingService{
		apiURL:    apiURL,
		apiKey:    apiKey,
		model:     model,
		dimension: dimension,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		timeout: timeout,
	}
}

// EmbedText generates embedding vector for a single text
func (s *EmbeddingService) EmbedText(ctx context.Context, text string) ([]float32, error) {
	start := time.Now()
	defer func() {
		metrics.RecordEmbeddingLatency(time.Since(start).Seconds())
	}()

	if text == "" {
		return nil, errors.New("text cannot be empty")
	}

	embeddings, err := s.EmbedBatch(ctx, []string{text})
	if err != nil {
		return nil, err
	}

	if len(embeddings) == 0 {
		return nil, fmt.Errorf("%w: no embeddings returned", ErrEmbeddingFailed)
	}

	return embeddings[0], nil
}

// EmbedBatch generates embedding vectors for multiple texts
func (s *EmbeddingService) EmbedBatch(ctx context.Context, texts []string) ([][]float32, error) {
	start := time.Now()
	defer func() {
		metrics.RecordEmbeddingBatchLatency(time.Since(start).Seconds())
	}()

	if len(texts) == 0 {
		return nil, errors.New("texts cannot be empty")
	}

	// Prepare request
	reqBody := EmbeddingRequest{
		Model: s.model,
		Texts: texts,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", s.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers with explicit UTF-8 encoding for Chinese characters
	req.Header.Set("Content-Type", "application/json; charset=utf-8")
	if s.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+s.apiKey)
	}

	// Send request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrEmbeddingFailed, err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: status %d, body: %s", ErrEmbeddingFailed, resp.StatusCode, string(body))
	}

	// Parse response
	var embResp EmbeddingResponse
	if err := json.Unmarshal(body, &embResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Validate embeddings
	if len(embResp.Embeddings) == 0 {
		return nil, fmt.Errorf("%w: no embeddings returned", ErrEmbeddingFailed)
	}

	// Validate dimension
	for i, embedding := range embResp.Embeddings {
		if len(embedding) != s.dimension {
			return nil, fmt.Errorf("%w: embedding %d expected %d, got %d", ErrInvalidDimension, i, s.dimension, len(embedding))
		}
	}

	return embResp.Embeddings, nil
}

// HealthCheck checks if the embedding service is available
func (s *EmbeddingService) HealthCheck(ctx context.Context) error {
	// Try to embed a simple test text
	_, err := s.EmbedText(ctx, "test")
	if err != nil {
		return fmt.Errorf("%w: %v", ErrModelNotAvailable, err)
	}
	return nil
}

// GetDimension returns the embedding dimension
func (s *EmbeddingService) GetDimension() int {
	return s.dimension
}

// GetModel returns the model name
func (s *EmbeddingService) GetModel() string {
	return s.model
}

// Request/Response structures for embedding API

type EmbeddingRequest struct {
	Model string   `json:"model"`
	Texts []string `json:"texts"`
}

type EmbeddingResponse struct {
	Embeddings      [][]float32 `json:"embeddings"`
	Model           string      `json:"model"`
	Dimension       int         `json:"dimension"`
	ProcessingTimeMs float64    `json:"processing_time_ms"`
}

// MockEmbeddingService for testing (generates random vectors)
type MockEmbeddingService struct {
	dimension int
}

// NewMockEmbeddingService creates a mock embedding service
func NewMockEmbeddingService(dimension int) *MockEmbeddingService {
	return &MockEmbeddingService{
		dimension: dimension,
	}
}

// EmbedText generates a mock embedding vector
func (m *MockEmbeddingService) EmbedText(ctx context.Context, text string) ([]float32, error) {
	// Generate a deterministic "embedding" based on text length
	// This is just for testing - not a real embedding!
	embedding := make([]float32, m.dimension)
	textLen := float32(len(text))

	for i := 0; i < m.dimension; i++ {
		// Create a simple pattern based on text length and position
		embedding[i] = (textLen + float32(i)) / float32(m.dimension*10)
	}

	return embedding, nil
}

// EmbedBatch generates mock embedding vectors for multiple texts
func (m *MockEmbeddingService) EmbedBatch(ctx context.Context, texts []string) ([][]float32, error) {
	embeddings := make([][]float32, len(texts))
	for i, text := range texts {
		emb, err := m.EmbedText(ctx, text)
		if err != nil {
			return nil, err
		}
		embeddings[i] = emb
	}
	return embeddings, nil
}

// GetDimension returns the embedding dimension
func (m *MockEmbeddingService) GetDimension() int {
	return m.dimension
}

// GetModel returns the model name
func (m *MockEmbeddingService) GetModel() string {
	return "mock-embedding-model"
}
