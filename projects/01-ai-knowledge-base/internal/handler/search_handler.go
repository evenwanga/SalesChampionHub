package handler

import (
	"strconv"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/gin-gonic/gin"
)

// SearchHandler handles search and RAG HTTP requests
type SearchHandler struct {
	searchService *service.SearchService
	ragService    *service.RAGService
	kbService     *service.KBService
	queryLogRepo  *repository.QueryLogRepository
}

// NewSearchHandler creates a new search handler
func NewSearchHandler(
	searchService *service.SearchService,
	ragService *service.RAGService,
	kbService *service.KBService,
	queryLogRepo *repository.QueryLogRepository,
) *SearchHandler {
	return &SearchHandler{
		searchService: searchService,
		ragService:    ragService,
		kbService:     kbService,
		queryLogRepo:  queryLogRepo,
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
	user := middleware.MustGetUserContext(c)

	// Get query history from repository
	queries, total, err := h.queryLogRepo.GetUserQueryHistory(
		c.Request.Context(),
		user.TenantID,
		user.ID,
		limit,
		offset,
	)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to retrieve query history: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{
		"queries": queries,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetQueryStats godoc
// @Summary 获取查询统计
// @Description 获取租户的查询统计信息，包括总查询数、独立用户数、平均延迟等
// @Tags 查询历史
// @Produce json
// @Param start_time query string false "开始时间（RFC3339格式，默认：7天前）" default(2025-10-27T00:00:00Z)
// @Param end_time query string false "结束时间（RFC3339格式，默认：现在）" default(2025-11-03T00:00:00Z)
// @Success 200 {object} middleware.SuccessResponse{data=repository.QueryStats} "查询统计"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /query-stats [get]
func (h *SearchHandler) GetQueryStats(c *gin.Context) {
	// Get user context
	user := middleware.MustGetUserContext(c)

	// Parse time range parameters
	now := time.Now()
	startTimeStr := c.DefaultQuery("start_time", now.AddDate(0, 0, -7).Format(time.RFC3339))
	endTimeStr := c.DefaultQuery("end_time", now.Format(time.RFC3339))

	startTime, err := time.Parse(time.RFC3339, startTimeStr)
	if err != nil {
		middleware.RespondBadRequest(c, "Invalid start_time format (use RFC3339): "+err.Error())
		return
	}

	endTime, err := time.Parse(time.RFC3339, endTimeStr)
	if err != nil {
		middleware.RespondBadRequest(c, "Invalid end_time format (use RFC3339): "+err.Error())
		return
	}

	// Validate time range
	if endTime.Before(startTime) {
		middleware.RespondBadRequest(c, "end_time must be after start_time")
		return
	}

	// Get query statistics from repository
	stats, err := h.queryLogRepo.GetTenantQueryStats(
		c.Request.Context(),
		user.TenantID,
		startTime,
		endTime,
	)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to retrieve query stats: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, stats)
}

// AskStream godoc
// @Summary RAG 问答（流式）
// @Description 基于知识库内容回答问题（流式响应），使用检索增强生成(RAG)技术。通过BGE-large-zh模型(1024维向量)进行语义检索，结合千问(Qwen)大语言模型实时流式生成回答
// @Tags RAG
// @Accept json
// @Produce text/event-stream
// @Param request body AskRequestBody true "问答请求"
// @Success 200 {string} string "SSE流式响应"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 403 {object} middleware.ErrorResponse "无权访问指定知识库"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /ask-stream [post]
func (h *SearchHandler) AskStream(c *gin.Context) {
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

	// Set SSE headers
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")
	c.Header("X-Accel-Buffering", "no") // Disable nginx buffering

	// Build search request
	searchReq := &service.SearchRequest{
		KBIDs:       body.KBIDs,
		QueryVector: body.QueryVector,
		QueryText:   body.Question,
		TopK:        body.TopK,
		TenantID:    user.TenantID,
		UserID:      user.ID,
	}

	// Execute search to get context
	searchResp, err := h.searchService.SearchKnowledgeBases(c.Request.Context(), searchReq)
	if err != nil {
		// Send error as SSE event
		c.SSEvent("error", gin.H{"message": "Failed to retrieve documents: " + err.Error()})
		c.Writer.Flush()
		return
	}

	// Extract context chunks
	chunks := make([]string, len(searchResp.Results))
	for i, result := range searchResp.Results {
		chunks[i] = result.Content
	}

	// Send sources as first event
	sources := make([]service.Source, len(searchResp.Results))
	for i, result := range searchResp.Results {
		sources[i] = service.Source{
			DocumentID:     result.DocumentID,
			Filename:       result.Filename,
			ChunkID:        result.ChunkID,
			ChunkIndex:     result.ChunkIndex,
			Similarity:     result.Similarity,
			KBID:           result.KBID,
			ContentSnippet: h.truncateContent(result.Content, 200),
		}
	}

	c.SSEvent("sources", sources)
	c.Writer.Flush()

	// Start streaming answer generation
	chunkChan, errChan := h.ragService.GenerateAnswerStream(c.Request.Context(), body.Question, chunks)

	// Stream response chunks
	for {
		select {
		case chunk, ok := <-chunkChan:
			if !ok {
				// Channel closed, streaming complete
				c.SSEvent("done", gin.H{"message": "Stream completed"})
				c.Writer.Flush()
				return
			}

			// Send chunk as SSE event
			c.SSEvent("chunk", gin.H{
				"content":       chunk.Content,
				"finish_reason": chunk.FinishReason,
			})
			c.Writer.Flush()

		case err := <-errChan:
			if err != nil {
				c.SSEvent("error", gin.H{"message": err.Error()})
				c.Writer.Flush()
				return
			}

		case <-c.Request.Context().Done():
			// Client disconnected
			return
		}
	}
}

// truncateContent truncates content to max length
func (h *SearchHandler) truncateContent(content string, maxLen int) string {
	if len(content) <= maxLen {
		return content
	}
	return content[:maxLen-3] + "..."
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
