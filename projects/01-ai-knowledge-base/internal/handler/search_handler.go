package handler

import (
	"strconv"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/gin-gonic/gin"
)

// SearchHandler handles search and RAG HTTP requests
type SearchHandler struct {
	searchService *service.SearchService
	ragService    *service.RAGService
	kbService     *service.KBService
}

// NewSearchHandler creates a new search handler
func NewSearchHandler(
	searchService *service.SearchService,
	ragService *service.RAGService,
	kbService *service.KBService,
) *SearchHandler {
	return &SearchHandler{
		searchService: searchService,
		ragService:    ragService,
		kbService:     kbService,
	}
}

// Search godoc
// @Summary 搜索知识库
// @Description 在指定的知识库中进行语义搜索或混合搜索，返回最相关的文档片段。使用BGE-large-zh模型生成1024维向量进行语义匹配
// @Tags 搜索
// @Accept json
// @Produce json
// @Param request body SearchRequestBody true "搜索请求"
// @Success 200 {object} middleware.SuccessResponse{data=service.SearchResponse} "搜索成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /search [post]
func (h *SearchHandler) Search(c *gin.Context) {
	var body SearchRequestBody
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	// Get user context
	user := middleware.MustGetUserContext(c)

	// Verify user has access to all requested KBs
	for _, kbID := range body.KBIDs {
		hasAccess, err := h.kbService.CheckUserKBAccess(
			c.Request.Context(),
			kbID,
			user.TenantID,
			user.OrganizationID,
			user.ID,
			"can_read",
		)
		if err != nil || !hasAccess {
			middleware.RespondForbidden(c, "Access denied to knowledge base: "+kbID)
			return
		}
	}

	// Determine search type and execute
	var resp *service.SearchResponse
	var err error

	if body.SearchType == "hybrid" && body.QueryText != "" {
		// Hybrid search
		req := &service.HybridSearchRequest{
			KBIDs:       body.KBIDs,
			QueryVector: body.QueryVector,
			QueryText:   body.QueryText,
			TopK:        body.TopK,
			TenantID:    user.TenantID,
			UserID:      user.ID,
		}
		resp, err = h.searchService.HybridSearch(c.Request.Context(), req)
	} else {
		// Semantic search (default)
		req := &service.SearchRequest{
			KBIDs:       body.KBIDs,
			QueryVector: body.QueryVector,
			QueryText:   body.QueryText,
			TopK:        body.TopK,
			TenantID:    user.TenantID,
			UserID:      user.ID,
		}
		resp, err = h.searchService.SearchKnowledgeBases(c.Request.Context(), req)
	}

	if err != nil {
		middleware.RespondInternalError(c, "Failed to search: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, resp)
}

// Ask godoc
// @Summary RAG 问答
// @Description 基于知识库内容回答问题，使用检索增强生成(RAG)技术。通过BGE-large-zh模型(1024维向量)进行语义检索，结合千问(Qwen)大语言模型生成准确回答
// @Tags RAG
// @Accept json
// @Produce json
// @Param request body AskRequestBody true "问答请求"
// @Success 200 {object} middleware.SuccessResponse{data=service.AskResponse} "回答成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 403 {object} middleware.ErrorResponse "无权访问指定知识库"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /ask [post]
func (h *SearchHandler) Ask(c *gin.Context) {
	var body AskRequestBody
	if err := c.ShouldBindJSON(&body); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	// Get user context
	user := middleware.MustGetUserContext(c)

	// Verify user has access to all requested KBs
	for _, kbID := range body.KBIDs {
		hasAccess, err := h.kbService.CheckUserKBAccess(
			c.Request.Context(),
			kbID,
			user.TenantID,
			user.OrganizationID,
			user.ID,
			"can_read",
		)
		if err != nil || !hasAccess {
			middleware.RespondForbidden(c, "Access denied to knowledge base: "+kbID)
			return
		}
	}

	// Build RAG request
	req := &service.AskRequest{
		KBIDs:       body.KBIDs,
		Question:    body.Question,
		QueryVector: body.QueryVector,
		TopK:        body.TopK,
		TenantID:    user.TenantID,
		UserID:      user.ID,
		Stream:      body.Stream,
	}

	// Execute RAG query
	resp, err := h.ragService.Ask(c.Request.Context(), req)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to answer question: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, resp)
}

// GetQueryHistory godoc
// @Summary 获取查询历史
// @Description 获取当前用户的查询历史记录，包括搜索和RAG问答
// @Tags 查询历史
// @Produce json
// @Param limit query int false "每页数量（默认：20）" default(20)
// @Param offset query int false "偏移量（默认：0）" default(0)
// @Success 200 {object} middleware.SuccessResponse{data=object{queries=[]models.QueryLog,total=int,limit=int,offset=int}} "查询历史"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /query-history [get]
func (h *SearchHandler) GetQueryHistory(c *gin.Context) {
	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Validate limits
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Get user context
	_ = middleware.MustGetUserContext(c)

	// Get query history from repository
	// Note: We need to add this to the handler dependencies
	// For now, return a placeholder response
	middleware.RespondWithSuccess(c, gin.H{
		"queries": []interface{}{},
		"total":   0,
		"limit":   limit,
		"offset":  offset,
		"message": "Query history feature - repository integration pending",
	})
}

// Request body DTOs for Swagger documentation

// SearchRequestBody represents the search request body
type SearchRequestBody struct {
	KBIDs       []string  `json:"kb_ids" binding:"required,min=1" example:"kb_123,kb_456"`
	QueryVector []float32 `json:"query_vector" binding:"required,len=1024" swaggertype:"array,number" example:"[0.1,0.2,...]"`
	QueryText   string    `json:"query_text" example:"如何使用API"`
	TopK        int       `json:"top_k" binding:"min=1,max=100" example:"10"`
	SearchType  string    `json:"search_type" enums:"semantic,hybrid" example:"semantic"` // semantic or hybrid
}

// AskRequestBody represents the RAG question request body
type AskRequestBody struct {
	KBIDs       []string  `json:"kb_ids" binding:"required,min=1" example:"kb_123,kb_456"`
	Question    string    `json:"question" binding:"required,min=1,max=1000" example:"什么是知识库的三级挂载系统？"`
	QueryVector []float32 `json:"query_vector" binding:"required,len=1024" swaggertype:"array,number" example:"[0.1,0.2,...]"`
	TopK        int       `json:"top_k" binding:"min=1,max=20" example:"5"`
	Stream      bool      `json:"stream" example:"false"` // Future feature: streaming responses
}
