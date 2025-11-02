package handler

import (
	"net/http"
	"strconv"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/gin-gonic/gin"
)

// KBHandler handles knowledge base HTTP requests
type KBHandler struct {
	kbService *service.KBService
}

// NewKBHandler creates a new KB handler
func NewKBHandler(kbService *service.KBService) *KBHandler {
	return &KBHandler{
		kbService: kbService,
	}
}

// CreateKB godoc
// @Summary 创建知识库
// @Description 创建一个新的知识库。如果未指定所有者，将自动设置为当前用户。
// @Tags 知识库管理
// @Accept json
// @Produce json
// @Param request body service.CreateKBRequest true "知识库创建请求"
// @Success 201 {object} middleware.SuccessResponse{data=object{knowledge_base=models.KnowledgeBase}} "知识库创建成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /knowledge-bases [post]
func (h *KBHandler) CreateKB(c *gin.Context) {
	var req service.CreateKBRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	// Get user context
	user := middleware.MustGetUserContext(c)

	// Set owner to current user if not provided
	if req.OwnerID == "" {
		req.OwnerID = user.ID
	}

	kb, err := h.kbService.CreateKB(c.Request.Context(), &req)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to create knowledge base: "+err.Error())
		return
	}

	middleware.RespondWithData(c, http.StatusCreated, gin.H{
		"knowledge_base": kb,
	})
}

// GetKB godoc
// @Summary 获取知识库详情
// @Description 获取指定知识库的详细信息，包括统计数据
// @Tags 知识库管理
// @Produce json
// @Param id path string true "知识库ID"
// @Success 200 {object} middleware.SuccessResponse{data=object{knowledge_base=models.KnowledgeBase,stats=object}} "知识库详情"
// @Failure 400 {object} middleware.ErrorResponse "知识库ID必填"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 404 {object} middleware.ErrorResponse "知识库不存在"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /knowledge-bases/{id} [get]
func (h *KBHandler) GetKB(c *gin.Context) {
	kbID := c.Param("id")
	if kbID == "" {
		middleware.RespondBadRequest(c, "KB ID is required")
		return
	}

	kb, err := h.kbService.GetKB(c.Request.Context(), kbID)
	if err != nil {
		if err == repository.ErrKBNotFound {
			middleware.RespondNotFound(c, "Knowledge base not found")
			return
		}
		middleware.RespondInternalError(c, "Failed to get knowledge base: "+err.Error())
		return
	}

	// Get stats
	stats, _ := h.kbService.GetKBStats(c.Request.Context(), kbID)

	middleware.RespondWithSuccess(c, gin.H{
		"knowledge_base": kb,
		"stats":          stats,
	})
}

// UpdateKB godoc
// @Summary 更新知识库
// @Description 更新知识库的名称、描述、设置等信息
// @Tags 知识库管理
// @Accept json
// @Produce json
// @Param id path string true "知识库ID"
// @Param request body service.UpdateKBRequest true "更新请求"
// @Success 200 {object} middleware.SuccessResponse{data=object{knowledge_base=models.KnowledgeBase}} "知识库更新成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 404 {object} middleware.ErrorResponse "知识库不存在"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /knowledge-bases/{id} [put]
func (h *KBHandler) UpdateKB(c *gin.Context) {
	kbID := c.Param("id")
	if kbID == "" {
		middleware.RespondBadRequest(c, "KB ID is required")
		return
	}

	var req service.UpdateKBRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	kb, err := h.kbService.UpdateKB(c.Request.Context(), kbID, &req)
	if err != nil {
		if err == repository.ErrKBNotFound {
			middleware.RespondNotFound(c, "Knowledge base not found")
			return
		}
		middleware.RespondInternalError(c, "Failed to update knowledge base: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{
		"knowledge_base": kb,
	})
}

// DeleteKB godoc
// @Summary 删除知识库
// @Description 软删除知识库，同时会删除所有关联的文档和向量数据
// @Tags 知识库管理
// @Produce json
// @Param id path string true "知识库ID"
// @Success 200 {object} middleware.SuccessResponse{data=object{message=string}} "知识库删除成功"
// @Failure 400 {object} middleware.ErrorResponse "知识库ID必填"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 404 {object} middleware.ErrorResponse "知识库不存在"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /knowledge-bases/{id} [delete]
func (h *KBHandler) DeleteKB(c *gin.Context) {
	kbID := c.Param("id")
	if kbID == "" {
		middleware.RespondBadRequest(c, "KB ID is required")
		return
	}

	if err := h.kbService.DeleteKB(c.Request.Context(), kbID); err != nil {
		if err == repository.ErrKBNotFound {
			middleware.RespondNotFound(c, "Knowledge base not found")
			return
		}
		middleware.RespondInternalError(c, "Failed to delete knowledge base: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{
		"message": "Knowledge base deleted successfully",
	})
}

// ListKBs godoc
// @Summary 列出知识库
// @Description 分页获取知识库列表，支持多种过滤条件
// @Tags 知识库管理
// @Produce json
// @Param limit query int false "每页数量（默认：20）" default(20)
// @Param offset query int false "偏移量（默认：0）" default(0)
// @Param order_by query string false "排序字段（默认：created_at DESC）" default(created_at DESC)
// @Param visibility query string false "可见性过滤（public/private/restricted）"
// @Param owner_id query string false "所有者ID过滤"
// @Param search query string false "搜索关键词（在名称和描述中搜索）"
// @Success 200 {object} middleware.SuccessResponse{data=object{knowledge_bases=[]models.KnowledgeBase,total=int,limit=int,offset=int}} "知识库列表"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /knowledge-bases [get]
func (h *KBHandler) ListKBs(c *gin.Context) {
	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	orderBy := c.DefaultQuery("order_by", "created_at DESC")
	visibility := c.Query("visibility")
	ownerID := c.Query("owner_id")
	search := c.Query("search")

	options := repository.ListOptions{
		Limit:      limit,
		Offset:     offset,
		OrderBy:    orderBy,
		Visibility: visibility,
		OwnerID:    ownerID,
		Search:     search,
	}

	kbs, total, err := h.kbService.ListKBs(c.Request.Context(), options)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to list knowledge bases: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{
		"knowledge_bases": kbs,
		"total":           total,
		"limit":           limit,
		"offset":          offset,
	})
}

// GetAccessibleKBs godoc
// @Summary 获取可访问的知识库
// @Description 获取当前用户可访问的所有知识库（基于租户、组织、用户三级挂载）
// @Tags 用户相关
// @Produce json
// @Success 200 {object} middleware.SuccessResponse{data=object{knowledge_bases=[]models.KnowledgeBase,total=int,user=object}} "可访问的知识库列表"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /user/accessible-kbs [get]
func (h *KBHandler) GetAccessibleKBs(c *gin.Context) {
	user := middleware.MustGetUserContext(c)

	kbs, err := h.kbService.GetUserAccessibleKBs(c.Request.Context(), user.TenantID, user.OrganizationID, user.ID)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to get accessible knowledge bases: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{
		"knowledge_bases": kbs,
		"total":           len(kbs),
		"user": gin.H{
			"tenant_id":       user.TenantID,
			"organization_id": user.OrganizationID,
			"user_id":         user.ID,
		},
	})
}

// GetKBStats godoc
// @Summary 获取知识库统计
// @Description 获取知识库的详细统计信息，包括文档数量、总大小、状态分布等
// @Tags 知识库管理
// @Produce json
// @Param id path string true "知识库ID"
// @Success 200 {object} middleware.SuccessResponse{data=object{document_count=int,total_size_bytes=int,status_breakdown=object}} "知识库统计信息"
// @Failure 400 {object} middleware.ErrorResponse "知识库ID必填"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /knowledge-bases/{id}/stats [get]
func (h *KBHandler) GetKBStats(c *gin.Context) {
	kbID := c.Param("id")
	if kbID == "" {
		middleware.RespondBadRequest(c, "KB ID is required")
		return
	}

	stats, err := h.kbService.GetKBStats(c.Request.Context(), kbID)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to get KB stats: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, stats)
}

// MountKBToTenant godoc
// @Summary 挂载知识库到租户
// @Description 将知识库挂载到租户级别，租户内所有用户都可访问
// @Tags 知识库挂载
// @Accept json
// @Produce json
// @Param request body service.MountKBRequest true "挂载请求"
// @Success 201 {object} middleware.SuccessResponse{data=object{mount=models.KnowledgeBaseMount}} "挂载成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /mounts/tenant [post]
func (h *KBHandler) MountKBToTenant(c *gin.Context) {
	var req service.MountKBRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	// Set mounted_by to current user
	user := middleware.MustGetUserContext(c)
	req.MountedBy = user.ID

	mount, err := h.kbService.MountKBToTenant(c.Request.Context(), &req)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to mount KB to tenant: "+err.Error())
		return
	}

	middleware.RespondWithData(c, http.StatusCreated, gin.H{
		"mount": mount,
	})
}

// MountKBToOrganization godoc
// @Summary 挂载知识库到组织
// @Description 将知识库挂载到组织级别，组织内所有用户都可访问
// @Tags 知识库挂载
// @Accept json
// @Produce json
// @Param request body service.MountKBRequest true "挂载请求"
// @Success 201 {object} middleware.SuccessResponse{data=object{mount=models.KnowledgeBaseMount}} "挂载成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /mounts/organization [post]
func (h *KBHandler) MountKBToOrganization(c *gin.Context) {
	var req service.MountKBRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	user := middleware.MustGetUserContext(c)
	req.MountedBy = user.ID

	mount, err := h.kbService.MountKBToOrganization(c.Request.Context(), &req)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to mount KB to organization: "+err.Error())
		return
	}

	middleware.RespondWithData(c, http.StatusCreated, gin.H{
		"mount": mount,
	})
}

// MountKBToUser godoc
// @Summary 挂载知识库到指定用户
// @Description 将知识库挂载到特定用户，提供个性化访问权限
// @Tags 知识库挂载
// @Accept json
// @Produce json
// @Param request body service.MountKBRequest true "挂载请求"
// @Success 201 {object} middleware.SuccessResponse{data=object{mount=models.KnowledgeBaseMount}} "挂载成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /mounts/user [post]
func (h *KBHandler) MountKBToUser(c *gin.Context) {
	var req service.MountKBRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	user := middleware.MustGetUserContext(c)
	req.MountedBy = user.ID

	mount, err := h.kbService.MountKBToUser(c.Request.Context(), &req)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to mount KB to user: "+err.Error())
		return
	}

	middleware.RespondWithData(c, http.StatusCreated, gin.H{
		"mount": mount,
	})
}

// Unmount godoc
// @Summary 取消知识库挂载
// @Description 移除知识库挂载，撤销指定级别的访问权限
// @Tags 知识库挂载
// @Produce json
// @Param id path int true "挂载ID"
// @Success 200 {object} middleware.SuccessResponse{data=object{message=string}} "挂载已移除"
// @Failure 400 {object} middleware.ErrorResponse "挂载ID无效"
// @Failure 401 {object} middleware.ErrorResponse "未授权"
// @Failure 404 {object} middleware.ErrorResponse "挂载不存在"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /mounts/{id} [delete]
func (h *KBHandler) Unmount(c *gin.Context) {
	mountIDStr := c.Param("id")
	if mountIDStr == "" {
		middleware.RespondBadRequest(c, "Mount ID is required")
		return
	}

	mountID, err := strconv.ParseInt(mountIDStr, 10, 64)
	if err != nil {
		middleware.RespondBadRequest(c, "Invalid mount ID")
		return
	}

	if err := h.kbService.Unmount(c.Request.Context(), mountID); err != nil {
		if err == repository.ErrMountNotFound {
			middleware.RespondNotFound(c, "Mount not found")
			return
		}
		middleware.RespondInternalError(c, "Failed to unmount: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, gin.H{
		"message": "Mount removed successfully",
	})
}
