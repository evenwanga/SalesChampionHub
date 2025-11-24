package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
)

// AuditMiddleware 审计中间件
type AuditMiddleware struct {
	auditRepo repository.AuditRepository
}

// NewAuditMiddleware 创建审计中间件
func NewAuditMiddleware(auditRepo repository.AuditRepository) *AuditMiddleware {
	return &AuditMiddleware{
		auditRepo: auditRepo,
	}
}

// AuditLogger 审计日志中间件函数
func (m *AuditMiddleware) AuditLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录开始时间
		start := time.Now()
		
		// 读取请求体（用于记录详情）
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			// 重新设置请求体，因为已经读取过了
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}
		
		// 处理请求
		c.Next()
		
		// 判断是否需要记录审计日志
		if !shouldAudit(c) {
			return
		}
		
		// 计算耗时
		duration := time.Since(start)
		
		// 记录审计日志
		go m.logAuditEvent(c, bodyBytes, int(duration.Milliseconds()))
	}
}

// shouldAudit 判断是否需要审计
func shouldAudit(c *gin.Context) bool {
	path := c.Request.URL.Path
	method := c.Request.Method
	
	// 不需要审计的路径
	excludePaths := []string{
		"/health",
		"/metrics",
		"/api/v1/audit-logs", // 避免递归
	}
	
	for _, exclude := range excludePaths {
		if strings.HasPrefix(path, exclude) {
			return false
		}
	}
	
	// 只审计以下情况：
	// 1. 所有POST、PUT、DELETE请求
	// 2. 特定的GET请求（如下载、导出）
	if method == "POST" || method == "PUT" || method == "DELETE" {
		return true
	}
	
	// 特定的GET请求需要审计
	if method == "GET" {
		auditGetPaths := []string{
			"/api/v1/documents/",    // 文档下载
			"/api/v1/kb/",           // 知识库导出
			"/export",               // 任何导出操作
		}
		
		for _, auditPath := range auditGetPaths {
			if strings.Contains(path, auditPath) {
				return true
			}
		}
	}
	
	return false
}

// logAuditEvent 记录审计事件
func (m *AuditMiddleware) logAuditEvent(c *gin.Context, bodyBytes []byte, durationMs int) {
	// 从上下文获取用户信息
	tenantID := GetTenantID(c)
	userID := GetUserID(c)
	username := GetUsername(c)
	
	// 如果没有用户信息，不记录
	if tenantID == "" || userID == "" {
		return
	}
	
	// 确定操作类型和资源类型
	action, resourceType, resourceID := determineActionAndResource(c)
	
	// 构建详情
	details := buildAuditDetails(c, bodyBytes)
	
	// 确定状态
	status := models.StatusSuccess
	errorMessage := ""
	statusCode := c.Writer.Status()
	
	if statusCode >= 400 && statusCode < 500 {
		status = models.StatusFailure
		errorMessage = c.Errors.String()
	} else if statusCode >= 500 {
		status = models.StatusError
		errorMessage = c.Errors.String()
	}
	
	// 创建审计日志
	auditLog := &models.AuditLog{
		TenantID:      tenantID,
		UserID:        userID,
		Username:      username,
		Action:        action,
		ResourceType:  resourceType,
		ResourceID:    resourceID,
		Details:       details,
		IPAddress:     c.ClientIP(),
		UserAgent:     c.Request.UserAgent(),
		RequestMethod: c.Request.Method,
		RequestPath:   c.Request.URL.Path,
		Status:        status,
		ErrorMessage:  errorMessage,
		DurationMs:    durationMs,
		CreatedAt:     time.Now(),
	}
	
	// 异步记录到数据库
	if err := m.auditRepo.Create(c.Request.Context(), auditLog); err != nil {
		// 记录失败，输出日志但不影响正常流程
		// TODO: 使用logger
		println("Failed to create audit log:", err.Error())
	}
}

// determineActionAndResource 确定操作类型和资源类型
func determineActionAndResource(c *gin.Context) (action, resourceType, resourceID string) {
	path := c.Request.URL.Path
	method := c.Request.Method
	
	// 从URL参数获取资源ID
	resourceID = c.Param("id")
	if resourceID == "" {
		resourceID = c.Param("kb_id")
	}
	if resourceID == "" {
		resourceID = c.Param("doc_id")
	}
	
	// 根据路径和方法确定操作类型和资源类型
	switch {
	// 用户操作
	case strings.Contains(path, "/auth/login"):
		return models.ActionUserLogin, models.ResourceTypeUser, ""
	case strings.Contains(path, "/auth/logout"):
		return models.ActionUserLogout, models.ResourceTypeUser, ""
	case strings.Contains(path, "/auth/register"):
		return models.ActionUserRegister, models.ResourceTypeUser, ""
		
	// 知识库操作
	case strings.Contains(path, "/kb") && method == "POST":
		return models.ActionKBCreate, models.ResourceTypeKnowledgeBase, resourceID
	case strings.Contains(path, "/kb") && method == "PUT":
		return models.ActionKBUpdate, models.ResourceTypeKnowledgeBase, resourceID
	case strings.Contains(path, "/kb") && method == "DELETE":
		return models.ActionKBDelete, models.ResourceTypeKnowledgeBase, resourceID
	case strings.Contains(path, "/kb") && strings.Contains(path, "/mount"):
		if method == "POST" {
			return models.ActionKBMount, models.ResourceTypeMount, resourceID
		} else if method == "DELETE" {
			return models.ActionKBUnmount, models.ResourceTypeMount, resourceID
		}
	case strings.Contains(path, "/kb") && strings.Contains(path, "/export"):
		return models.ActionKBExport, models.ResourceTypeKnowledgeBase, resourceID
		
	// 文档操作
	case strings.Contains(path, "/documents") && method == "POST":
		if strings.Contains(path, "/batch") {
			return models.ActionDocBatchUpload, models.ResourceTypeDocument, ""
		}
		return models.ActionDocUpload, models.ResourceTypeDocument, resourceID
	case strings.Contains(path, "/documents") && method == "PUT":
		return models.ActionDocUpdate, models.ResourceTypeDocument, resourceID
	case strings.Contains(path, "/documents") && method == "DELETE":
		if strings.Contains(path, "/batch") {
			return models.ActionDocBatchDelete, models.ResourceTypeDocument, ""
		}
		return models.ActionDocDelete, models.ResourceTypeDocument, resourceID
	case strings.Contains(path, "/documents") && strings.Contains(path, "/download"):
		return models.ActionDocDownload, models.ResourceTypeDocument, resourceID
		
	// 搜索操作
	case strings.Contains(path, "/search"):
		return models.ActionSearch, models.ResourceTypeKnowledgeBase, ""
	case strings.Contains(path, "/embedding"):
		return models.ActionEmbedding, models.ResourceTypeDocument, ""
		
	// 系统操作
	case strings.Contains(path, "/admin") || strings.Contains(path, "/system"):
		return models.ActionAdminOperation, models.ResourceTypeSystem, ""
	}
	
	// 默认：通用操作
	return method + "_" + path, "unknown", resourceID
}

// buildAuditDetails 构建审计详情
func buildAuditDetails(c *gin.Context, bodyBytes []byte) models.AuditDetails {
	details := make(models.AuditDetails)
	
	// 添加查询参数
	if len(c.Request.URL.Query()) > 0 {
		details["query_params"] = c.Request.URL.Query()
	}
	
	// 添加路径参数
	pathParams := make(map[string]string)
	for _, param := range c.Params {
		pathParams[param.Key] = param.Value
	}
	if len(pathParams) > 0 {
		details["path_params"] = pathParams
	}
	
	// 添加请求体（敏感信息需要过滤）
	if len(bodyBytes) > 0 && len(bodyBytes) < 10240 { // 限制10KB
		var body map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &body); err == nil {
			// 过滤敏感字段
			filterSensitiveFields(body)
			details["request_body"] = body
		}
	}
	
	// 添加响应状态
	details["status_code"] = c.Writer.Status()
	
	return details
}

// filterSensitiveFields 过滤敏感字段
func filterSensitiveFields(data map[string]interface{}) {
	sensitiveFields := []string{
		"password",
		"token",
		"secret",
		"api_key",
		"access_token",
		"refresh_token",
		"private_key",
	}
	
	for _, field := range sensitiveFields {
		if _, exists := data[field]; exists {
			data[field] = "***FILTERED***"
		}
	}
	
	// 递归处理嵌套对象
	for _, value := range data {
		if nestedMap, ok := value.(map[string]interface{}); ok {
			filterSensitiveFields(nestedMap)
		}
	}
}

// GetUsername 从上下文获取用户名（辅助函数）
func GetUsername(c *gin.Context) string {
	if username, exists := c.Get("username"); exists {
		if str, ok := username.(string); ok {
			return str
		}
	}
	return ""
}

