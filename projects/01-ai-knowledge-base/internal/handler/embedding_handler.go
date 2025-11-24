package handler

import (
	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/gin-gonic/gin"
)

// EmbeddingHandler handles embedding generation HTTP requests
type EmbeddingHandler struct {
	embeddingService service.EmbeddingClient
}

// NewEmbeddingHandler creates a new embedding handler
func NewEmbeddingHandler(embeddingService service.EmbeddingClient) *EmbeddingHandler {
	return &EmbeddingHandler{
		embeddingService: embeddingService,
	}
}

// GenerateEmbedding godoc
// @Summary 生成文本向量
// @Description 将文本转换为1024维向量，用于语义搜索和RAG问答。使用BGE-large-zh模型
// @Tags 向量化
// @Accept json
// @Produce json
// @Param request body EmbeddingRequest true "文本向量化请求"
// @Success 200 {object} middleware.SuccessResponse{data=EmbeddingResponse} "向量生成成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /embedding [post]
func (h *EmbeddingHandler) GenerateEmbedding(c *gin.Context) {
	var req EmbeddingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	if req.Text == "" {
		middleware.RespondBadRequest(c, "Text is required")
		return
	}

	// 限制文本长度（BGE模型最大支持512 tokens，约2000字符）
	if len(req.Text) > 5000 {
		middleware.RespondBadRequest(c, "Text too long (max 5000 characters)")
		return
	}

	// 生成向量
	embedding, err := h.embeddingService.EmbedText(c.Request.Context(), req.Text)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to generate embedding: "+err.Error())
		return
	}

	// 验证向量维度
	if len(embedding) != h.embeddingService.GetDimension() {
		middleware.RespondInternalError(c, "Invalid embedding dimension")
		return
	}

	middleware.RespondWithSuccess(c, EmbeddingResponse{
		Embedding: embedding,
		Dimension: len(embedding),
		Model:     h.embeddingService.GetModel(),
	})
}

// GenerateBatchEmbeddings godoc
// @Summary 批量生成文本向量
// @Description 批量将多个文本转换为向量，提高处理效率
// @Tags 向量化
// @Accept json
// @Produce json
// @Param request body BatchEmbeddingRequest true "批量文本向量化请求"
// @Success 200 {object} middleware.SuccessResponse{data=BatchEmbeddingResponse} "批量向量生成成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /embeddings/batch [post]
func (h *EmbeddingHandler) GenerateBatchEmbeddings(c *gin.Context) {
	var req BatchEmbeddingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	if len(req.Texts) == 0 {
		middleware.RespondBadRequest(c, "Texts array is required")
		return
	}

	if len(req.Texts) > 100 {
		middleware.RespondBadRequest(c, "Too many texts (max 100)")
		return
	}

	// 生成向量
	embeddings, err := h.embeddingService.EmbedBatch(c.Request.Context(), req.Texts)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to generate embeddings: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, BatchEmbeddingResponse{
		Embeddings: embeddings,
		Count:      len(embeddings),
		Dimension:  h.embeddingService.GetDimension(),
		Model:      h.embeddingService.GetModel(),
	})
}

// Request/Response DTOs

// EmbeddingRequest represents a single text embedding request
type EmbeddingRequest struct {
	Text string `json:"text" binding:"required" example:"如何使用AI知识库进行语义搜索？"`
}

// EmbeddingResponse represents the embedding result
type EmbeddingResponse struct {
	Embedding []float32 `json:"embedding" swaggertype:"array,number"`
	Dimension int       `json:"dimension" example:"1024"`
	Model     string    `json:"model" example:"BAAI/bge-large-zh-v1.5"`
}

// BatchEmbeddingRequest represents a batch embedding request
type BatchEmbeddingRequest struct {
	Texts []string `json:"texts" binding:"required,min=1,max=100" swaggertype:"array,string"`
}

// BatchEmbeddingResponse represents the batch embedding result
type BatchEmbeddingResponse struct {
	Embeddings [][]float32 `json:"embeddings"`
	Count      int         `json:"count" example:"2"`
	Dimension  int         `json:"dimension" example:"1024"`
	Model      string      `json:"model" example:"BAAI/bge-large-zh-v1.5"`
}

