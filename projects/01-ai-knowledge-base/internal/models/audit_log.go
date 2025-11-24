package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// AuditLog 审计日志模型
type AuditLog struct {
	ID            int64           `json:"id" db:"id"`
	TenantID      string          `json:"tenant_id" db:"tenant_id"`
	UserID        string          `json:"user_id" db:"user_id"`
	Username      string          `json:"username" db:"username"`
	Action        string          `json:"action" db:"action"`
	ResourceType  string          `json:"resource_type" db:"resource_type"`
	ResourceID    string          `json:"resource_id,omitempty" db:"resource_id"`
	Details       AuditDetails    `json:"details" db:"details"`
	IPAddress     string          `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent     string          `json:"user_agent,omitempty" db:"user_agent"`
	RequestMethod string          `json:"request_method,omitempty" db:"request_method"`
	RequestPath   string          `json:"request_path,omitempty" db:"request_path"`
	Status        string          `json:"status" db:"status"`
	ErrorMessage  string          `json:"error_message,omitempty" db:"error_message"`
	DurationMs    int             `json:"duration_ms,omitempty" db:"duration_ms"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
}

// AuditDetails 审计详情（JSON字段）
type AuditDetails map[string]interface{}

// Value 实现 driver.Valuer 接口
func (a AuditDetails) Value() (driver.Value, error) {
	if a == nil {
		return json.Marshal(map[string]interface{}{})
	}
	return json.Marshal(a)
}

// Scan 实现 sql.Scanner 接口
func (a *AuditDetails) Scan(value interface{}) error {
	if value == nil {
		*a = make(AuditDetails)
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	
	return json.Unmarshal(bytes, a)
}

// 审计操作类型常量
const (
	// 用户操作
	ActionUserLogin        = "user.login"
	ActionUserLogout       = "user.logout"
	ActionUserRegister     = "user.register"
	ActionUserUpdate       = "user.update"
	ActionUserDelete       = "user.delete"
	ActionPasswordChange   = "user.password_change"
	ActionPermissionChange = "user.permission_change"
	
	// 知识库操作
	ActionKBCreate       = "kb.create"
	ActionKBUpdate       = "kb.update"
	ActionKBDelete       = "kb.delete"
	ActionKBView         = "kb.view"
	ActionKBExport       = "kb.export"
	ActionKBMount        = "kb.mount"
	ActionKBUnmount      = "kb.unmount"
	ActionKBShare        = "kb.share"
	ActionKBPermission   = "kb.permission_change"
	
	// 文档操作
	ActionDocUpload      = "doc.upload"
	ActionDocUpdate      = "doc.update"
	ActionDocDelete      = "doc.delete"
	ActionDocDownload    = "doc.download"
	ActionDocView        = "doc.view"
	ActionDocBatchUpload = "doc.batch_upload"
	ActionDocBatchDelete = "doc.batch_delete"
	
	// 搜索操作
	ActionSearch         = "search.query"
	ActionEmbedding      = "search.embedding"
	
	// 系统操作
	ActionSystemConfig   = "system.config_change"
	ActionSystemBackup   = "system.backup"
	ActionSystemRestore  = "system.restore"
	ActionSystemMaintain = "system.maintenance"
	
	// 管理员操作
	ActionAdminAccess    = "admin.access"
	ActionAdminOperation = "admin.operation"
)

// 资源类型常量
const (
	ResourceTypeUser         = "user"
	ResourceTypeKnowledgeBase = "knowledge_base"
	ResourceTypeDocument     = "document"
	ResourceTypeMount        = "mount"
	ResourceTypeSystem       = "system"
	ResourceTypeAdmin        = "admin"
)

// 操作状态常量
const (
	StatusSuccess = "success"
	StatusFailure = "failure"
	StatusError   = "error"
)

// CreateAuditLogRequest 创建审计日志请求
type CreateAuditLogRequest struct {
	TenantID      string       `json:"tenant_id" binding:"required"`
	UserID        string       `json:"user_id" binding:"required"`
	Username      string       `json:"username"`
	Action        string       `json:"action" binding:"required"`
	ResourceType  string       `json:"resource_type" binding:"required"`
	ResourceID    string       `json:"resource_id"`
	Details       AuditDetails `json:"details"`
	IPAddress     string       `json:"ip_address"`
	UserAgent     string       `json:"user_agent"`
	RequestMethod string       `json:"request_method"`
	RequestPath   string       `json:"request_path"`
	Status        string       `json:"status"`
	ErrorMessage  string       `json:"error_message"`
	DurationMs    int          `json:"duration_ms"`
}

// AuditLogQuery 审计日志查询参数
type AuditLogQuery struct {
	TenantID     string    `form:"tenant_id"`
	UserID       string    `form:"user_id"`
	Action       string    `form:"action"`
	ResourceType string    `form:"resource_type"`
	ResourceID   string    `form:"resource_id"`
	Status       string    `form:"status"`
	StartTime    time.Time `form:"start_time"`
	EndTime      time.Time `form:"end_time"`
	Page         int       `form:"page" binding:"min=1"`
	PageSize     int       `form:"page_size" binding:"min=1,max=100"`
	SortBy       string    `form:"sort_by"` // created_at, duration_ms
	SortOrder    string    `form:"sort_order"` // asc, desc
}

// AuditLogStats 审计日志统计
type AuditLogStats struct {
	TotalOperations int64                    `json:"total_operations"`
	UniqueUsers     int64                    `json:"unique_users"`
	SuccessRate     float64                  `json:"success_rate"`
	TopUsers        []map[string]interface{} `json:"top_users"`
	TopActions      []map[string]interface{} `json:"top_actions"`
}

// UserAuditStats 用户审计统计
type UserAuditStats struct {
	TotalOperations int64                    `json:"total_operations"`
	SuccessCount    int64                    `json:"success_count"`
	FailureCount    int64                    `json:"failure_count"`
	ErrorCount      int64                    `json:"error_count"`
	TopActions      []map[string]interface{} `json:"top_actions"`
}

// AuditLogExportRequest 审计日志导出请求
type AuditLogExportRequest struct {
	Query  AuditLogQuery `json:"query"`
	Format string        `json:"format"` // csv, excel, json
}

