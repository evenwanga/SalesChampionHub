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
)

var (
	ErrLLMRequestFailed = errors.New("LLM request failed")
	ErrInvalidResponse  = errors.New("invalid LLM response")
)

// QwenClient handles requests to Qwen LLM API
type QwenClient struct {
	apiKey     string
	apiURL     string
	model      string
	httpClient *http.Client
	timeout    time.Duration
}

// NewQwenClient creates a new Qwen LLM client
func NewQwenClient(apiKey, apiURL, model string, timeout time.Duration) *QwenClient {
	if apiURL == "" {
		apiURL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
	}
	if model == "" {
		model = "qwen-plus" // Default to qwen-plus
	}

	return &QwenClient{
		apiKey: apiKey,
		apiURL: apiURL,
		model:  model,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		timeout: timeout,
	}
}

// GenerateAnswer generates an answer using the LLM
func (c *QwenClient) GenerateAnswer(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	messages := []Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userPrompt},
	}

	return c.Chat(ctx, messages)
}

// Chat sends a chat completion request to Qwen API
func (c *QwenClient) Chat(ctx context.Context, messages []Message) (string, error) {
	// Prepare request body
	reqBody := QwenRequest{
		Model: c.model,
		Input: QwenInput{
			Messages: messages,
		},
		Parameters: QwenParameters{
			ResultFormat: "message",
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", c.apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	// Send request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("%w: %v", ErrLLMRequestFailed, err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("%w: status %d, body: %s", ErrLLMRequestFailed, resp.StatusCode, string(body))
	}

	// Parse response
	var qwenResp QwenResponse
	if err := json.Unmarshal(body, &qwenResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract answer
	if len(qwenResp.Output.Choices) == 0 {
		return "", fmt.Errorf("%w: no choices in response", ErrInvalidResponse)
	}

	answer := qwenResp.Output.Choices[0].Message.Content
	if answer == "" {
		return "", fmt.Errorf("%w: empty content in response", ErrInvalidResponse)
	}

	return answer, nil
}

// GenerateRAGAnswer generates an answer based on context chunks
func (c *QwenClient) GenerateRAGAnswer(ctx context.Context, query string, contextChunks []string) (string, error) {
	// Build context from chunks
	context := ""
	for i, chunk := range contextChunks {
		context += fmt.Sprintf("\n[文档%d]\n%s\n", i+1, chunk)
	}

	// Build prompts
	systemPrompt := `你是一个专业的知识库问答助手。请根据提供的文档内容回答用户的问题。

要求：
1. 仅基于提供的文档内容回答，不要编造信息
2. 如果文档中没有相关信息，请明确告知用户
3. 回答要准确、简洁、易懂
4. 如果可以，引用具体的文档片段
5. 使用中文回答`

	userPrompt := fmt.Sprintf(`参考文档：
%s

用户问题：%s

请根据上述文档内容回答用户的问题。`, context, query)

	return c.GenerateAnswer(ctx, systemPrompt, userPrompt)
}

// HealthCheck checks if the Qwen API is accessible
func (c *QwenClient) HealthCheck(ctx context.Context) error {
	_, err := c.GenerateAnswer(ctx, "You are a helpful assistant.", "Hello")
	return err
}

// Request/Response structures for Qwen API

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type QwenRequest struct {
	Model      string          `json:"model"`
	Input      QwenInput       `json:"input"`
	Parameters QwenParameters  `json:"parameters,omitempty"`
}

type QwenInput struct {
	Messages []Message `json:"messages"`
}

type QwenParameters struct {
	ResultFormat string  `json:"result_format,omitempty"`
	Temperature  float64 `json:"temperature,omitempty"`
	TopP         float64 `json:"top_p,omitempty"`
	MaxTokens    int     `json:"max_tokens,omitempty"`
}

type QwenResponse struct {
	Output    QwenOutput `json:"output"`
	Usage     QwenUsage  `json:"usage"`
	RequestID string     `json:"request_id"`
}

type QwenOutput struct {
	Choices []QwenChoice `json:"choices"`
}

type QwenChoice struct {
	FinishReason string  `json:"finish_reason"`
	Message      Message `json:"message"`
}

type QwenUsage struct {
	OutputTokens int `json:"output_tokens"`
	InputTokens  int `json:"input_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// MockLLMClient for testing
type MockLLMClient struct{}

// NewMockLLMClient creates a mock LLM client
func NewMockLLMClient() *MockLLMClient {
	return &MockLLMClient{}
}

// GenerateAnswer generates a mock answer
func (m *MockLLMClient) GenerateAnswer(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	return "这是一个模拟的回答。在生产环境中，这将是千问大模型生成的真实答案。", nil
}

// GenerateRAGAnswer generates a mock RAG answer
func (m *MockLLMClient) GenerateRAGAnswer(ctx context.Context, query string, contextChunks []string) (string, error) {
	answer := fmt.Sprintf("根据提供的 %d 个文档片段，针对您的问题「%s」，", len(contextChunks), query)
	answer += "这是一个基于检索增强生成(RAG)的模拟回答。"
	answer += "在生产环境中，千问大模型会分析文档内容并生成准确的答案。"
	return answer, nil
}

// HealthCheck mock health check
func (m *MockLLMClient) HealthCheck(ctx context.Context) error {
	return nil
}
