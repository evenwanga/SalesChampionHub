package handler

import (
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
)

// AuditHandler 审计日志处理器
type AuditHandler struct {
	auditService service.AuditService
}

// NewAuditHandler 创建审计日志处理器
func NewAuditHandler(auditService service.AuditService) *AuditHandler {
	return &AuditHandler{
		auditService: auditService,
	}
}

// QueryLogs 查询审计日志
// @Summary 查询审计日志
// @Description 查询审计日志，支持多种过滤条件
// @Tags 审计日志
// @Accept json
// @Produce json
// @Param tenant_id query string false "租户ID"
// @Param user_id query string false "用户ID"
// @Param action query string false "操作类型"
// @Param resource_type query string false "资源类型"
// @Param resource_id query string false "资源ID"
// @Param status query string false "状态"
// @Param start_time query string false "开始时间"
// @Param end_time query string false "结束时间"
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/audit-logs [get]
func (h *AuditHandler) QueryLogs(c *gin.Context) {
	var query models.AuditLogQuery
	
	// 绑定查询参数
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid query parameters",
			"details": err.Error(),
		})
		return
	}
	
	// 从上下文获取租户ID（如果没有在查询参数中指定）
	if query.TenantID == "" {
		query.TenantID = middleware.GetTenantID(c)
	}
	
	// 解析时间参数
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			query.StartTime = t
		}
	}
	
	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			query.EndTime = t
		}
	}
	
	// 查询审计日志
	logs, total, err := h.auditService.QueryLogs(c.Request.Context(), &query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to query audit logs",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"pagination": gin.H{
			"page":       query.Page,
			"page_size":  query.PageSize,
			"total":      total,
			"total_pages": (total + int64(query.PageSize) - 1) / int64(query.PageSize),
		},
	})
}

// GetLogByID 获取审计日志详情
// @Summary 获取审计日志详情
// @Description 根据ID获取审计日志详情
// @Tags 审计日志
// @Accept json
// @Produce json
// @Param id path int true "审计日志ID"
// @Success 200 {object} models.AuditLog
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/audit-logs/{id} [get]
func (h *AuditHandler) GetLogByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid audit log ID",
		})
		return
	}
	
	log, err := h.auditService.GetLogByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get audit log",
			"details": err.Error(),
		})
		return
	}
	
	if log == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Audit log not found",
		})
		return
	}
	
	c.JSON(http.StatusOK, log)
}

// GetUserStats 获取用户统计
// @Summary 获取用户审计统计
// @Description 获取指定用户的审计统计信息
// @Tags 审计日志
// @Accept json
// @Produce json
// @Param user_id path string true "用户ID"
// @Param days query int false "统计天数（默认30天）"
// @Success 200 {object} models.UserAuditStats
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/audit-logs/users/{user_id}/stats [get]
func (h *AuditHandler) GetUserStats(c *gin.Context) {
	userID := c.Param("user_id")
	tenantID := middleware.GetTenantID(c)
	
	days := 30
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}
	
	stats, err := h.auditService.GetUserStats(c.Request.Context(), tenantID, userID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user stats",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, stats)
}

// GetTenantStats 获取租户统计
// @Summary 获取租户审计统计
// @Description 获取指定租户的审计统计信息
// @Tags 审计日志
// @Accept json
// @Produce json
// @Param days query int false "统计天数（默认30天）"
// @Success 200 {object} models.AuditLogStats
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/audit-logs/stats [get]
func (h *AuditHandler) GetTenantStats(c *gin.Context) {
	tenantID := middleware.GetTenantID(c)
	
	days := 30
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}
	
	stats, err := h.auditService.GetTenantStats(c.Request.Context(), tenantID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get tenant stats",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, stats)
}

// ExportLogs 导出审计日志
// @Summary 导出审计日志
// @Description 导出审计日志为CSV或JSON格式
// @Tags 审计日志
// @Accept json
// @Produce json
// @Param format query string true "导出格式（csv/json）"
// @Param tenant_id query string false "租户ID"
// @Param user_id query string false "用户ID"
// @Param action query string false "操作类型"
// @Param resource_type query string false "资源类型"
// @Param start_time query string false "开始时间"
// @Param end_time query string false "结束时间"
// @Success 200 {file} file
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/audit-logs/export [get]
func (h *AuditHandler) ExportLogs(c *gin.Context) {
	format := c.Query("format")
	if format != "csv" && format != "json" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid format, must be 'csv' or 'json'",
		})
		return
	}
	
	var query models.AuditLogQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid query parameters",
			"details": err.Error(),
		})
		return
	}
	
	// 从上下文获取租户ID
	if query.TenantID == "" {
		query.TenantID = middleware.GetTenantID(c)
	}
	
	// 解析时间参数
	if startTimeStr := c.Query("start_time"); startTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, startTimeStr); err == nil {
			query.StartTime = t
		}
	}
	
	if endTimeStr := c.Query("end_time"); endTimeStr != "" {
		if t, err := time.Parse(time.RFC3339, endTimeStr); err == nil {
			query.EndTime = t
		}
	}
	
	// 导出日志
	filename, err := h.auditService.ExportLogs(c.Request.Context(), &query, format)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to export audit logs",
			"details": err.Error(),
		})
		return
	}
	
	// 设置响应头
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+filepath.Base(filename))
	
	if format == "csv" {
		c.Header("Content-Type", "text/csv")
	} else {
		c.Header("Content-Type", "application/json")
	}
	
	// 发送文件
	c.File(filename)
}

// RegisterRoutes 注册路由
func (h *AuditHandler) RegisterRoutes(r *gin.RouterGroup) {
	auditGroup := r.Group("/audit-logs")
	{
		auditGroup.GET("", h.QueryLogs)
		auditGroup.GET("/:id", h.GetLogByID)
		auditGroup.GET("/stats", h.GetTenantStats)
		auditGroup.GET("/users/:user_id/stats", h.GetUserStats)
		auditGroup.GET("/export", h.ExportLogs)
	}
}

