package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"gorm.io/gorm"
)

// AuditRepository 审计日志仓储接口
type AuditRepository interface {
	// 创建审计日志
	Create(ctx context.Context, log *models.AuditLog) error
	
	// 批量创建审计日志
	BatchCreate(ctx context.Context, logs []*models.AuditLog) error
	
	// 查询审计日志
	Query(ctx context.Context, query *models.AuditLogQuery) ([]*models.AuditLog, int64, error)
	
	// 根据ID获取审计日志
	GetByID(ctx context.Context, id int64) (*models.AuditLog, error)
	
	// 获取用户统计
	GetUserStats(ctx context.Context, tenantID, userID string, days int) (*models.UserAuditStats, error)
	
	// 获取租户统计
	GetTenantStats(ctx context.Context, tenantID string, days int) (*models.AuditLogStats, error)
	
	// 清理旧的审计日志
	CleanupOldLogs(ctx context.Context, retentionDays int) (int, error)
	
	// 导出审计日志
	Export(ctx context.Context, query *models.AuditLogQuery) ([]*models.AuditLog, error)
}

// auditRepository 审计日志仓储实现
type auditRepository struct {
	db *gorm.DB
}

// NewAuditRepository 创建审计日志仓储
func NewAuditRepository(db *gorm.DB) AuditRepository {
	return &auditRepository{db: db}
}

// Create 创建审计日志
func (r *auditRepository) Create(ctx context.Context, log *models.AuditLog) error {
	// 设置默认值
	if log.Status == "" {
		log.Status = models.StatusSuccess
	}
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}
	if log.Details == nil {
		log.Details = make(models.AuditDetails)
	}
	
	return r.db.WithContext(ctx).Create(log).Error
}

// BatchCreate 批量创建审计日志
func (r *auditRepository) BatchCreate(ctx context.Context, logs []*models.AuditLog) error {
	if len(logs) == 0 {
		return nil
	}
	
	// 设置默认值
	for _, log := range logs {
		if log.Status == "" {
			log.Status = models.StatusSuccess
		}
		if log.CreatedAt.IsZero() {
			log.CreatedAt = time.Now()
		}
		if log.Details == nil {
			log.Details = make(models.AuditDetails)
		}
	}
	
	return r.db.WithContext(ctx).CreateInBatches(logs, 100).Error
}

// Query 查询审计日志
func (r *auditRepository) Query(ctx context.Context, query *models.AuditLogQuery) ([]*models.AuditLog, int64, error) {
	db := r.db.WithContext(ctx).Model(&models.AuditLog{})
	
	// 构建查询条件
	if query.TenantID != "" {
		db = db.Where("tenant_id = ?", query.TenantID)
	}
	
	if query.UserID != "" {
		db = db.Where("user_id = ?", query.UserID)
	}
	
	if query.Action != "" {
		db = db.Where("action = ?", query.Action)
	}
	
	if query.ResourceType != "" {
		db = db.Where("resource_type = ?", query.ResourceType)
	}
	
	if query.ResourceID != "" {
		db = db.Where("resource_id = ?", query.ResourceID)
	}
	
	if query.Status != "" {
		db = db.Where("status = ?", query.Status)
	}
	
	if !query.StartTime.IsZero() {
		db = db.Where("created_at >= ?", query.StartTime)
	}
	
	if !query.EndTime.IsZero() {
		db = db.Where("created_at <= ?", query.EndTime)
	}
	
	// 查询总数
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// 构建排序
	sortBy := "created_at"
	if query.SortBy != "" {
		sortBy = query.SortBy
	}
	
	sortOrder := "DESC"
	if query.SortOrder != "" {
		sortOrder = query.SortOrder
	}
	
	// 分页
	page := 1
	if query.Page > 0 {
		page = query.Page
	}
	
	pageSize := 20
	if query.PageSize > 0 {
		pageSize = query.PageSize
	}
	
	offset := (page - 1) * pageSize
	
	// 查询数据
	var logs []*models.AuditLog
	err := db.Order(fmt.Sprintf("%s %s", sortBy, sortOrder)).
		Limit(pageSize).
		Offset(offset).
		Find(&logs).Error
	
	if err != nil {
		return nil, 0, err
	}
	
	return logs, total, nil
}

// GetByID 根据ID获取审计日志
func (r *auditRepository) GetByID(ctx context.Context, id int64) (*models.AuditLog, error) {
	var log models.AuditLog
	err := r.db.WithContext(ctx).First(&log, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	
	return &log, nil
}

// GetUserStats 获取用户统计
func (r *auditRepository) GetUserStats(ctx context.Context, tenantID, userID string, days int) (*models.UserAuditStats, error) {
	var result struct {
		TotalOperations int64  `gorm:"column:total_operations"`
		SuccessCount    int64  `gorm:"column:success_count"`
		FailureCount    int64  `gorm:"column:failure_count"`
		ErrorCount      int64  `gorm:"column:error_count"`
		TopActions      []byte `gorm:"column:top_actions"`
	}
	
	err := r.db.WithContext(ctx).
		Raw("SELECT * FROM get_user_audit_stats(?, ?, ?)", tenantID, userID, days).
		Scan(&result).Error
	
	if err != nil {
		return nil, err
	}
	
	stats := &models.UserAuditStats{
		TotalOperations: result.TotalOperations,
		SuccessCount:    result.SuccessCount,
		FailureCount:    result.FailureCount,
		ErrorCount:      result.ErrorCount,
	}
	
	if result.TopActions != nil {
		var topActions []map[string]interface{}
		if err := json.Unmarshal(result.TopActions, &topActions); err == nil {
			stats.TopActions = topActions
		}
	}
	
	return stats, nil
}

// GetTenantStats 获取租户统计
func (r *auditRepository) GetTenantStats(ctx context.Context, tenantID string, days int) (*models.AuditLogStats, error) {
	var result struct {
		TotalOperations int64   `gorm:"column:total_operations"`
		UniqueUsers     int64   `gorm:"column:unique_users"`
		SuccessRate     float64 `gorm:"column:success_rate"`
		TopUsers        []byte  `gorm:"column:top_users"`
		TopActions      []byte  `gorm:"column:top_actions"`
	}
	
	err := r.db.WithContext(ctx).
		Raw("SELECT * FROM get_tenant_audit_stats(?, ?)", tenantID, days).
		Scan(&result).Error
	
	if err != nil {
		return nil, err
	}
	
	stats := &models.AuditLogStats{
		TotalOperations: result.TotalOperations,
		UniqueUsers:     result.UniqueUsers,
		SuccessRate:     result.SuccessRate,
	}
	
	if result.TopUsers != nil {
		var topUsers []map[string]interface{}
		if err := json.Unmarshal(result.TopUsers, &topUsers); err == nil {
			stats.TopUsers = topUsers
		}
	}
	
	if result.TopActions != nil {
		var topActions []map[string]interface{}
		if err := json.Unmarshal(result.TopActions, &topActions); err == nil {
			stats.TopActions = topActions
		}
	}
	
	return stats, nil
}

// CleanupOldLogs 清理旧的审计日志
func (r *auditRepository) CleanupOldLogs(ctx context.Context, retentionDays int) (int, error) {
	var deletedCount int
	err := r.db.WithContext(ctx).
		Raw("SELECT cleanup_old_audit_logs(?)", retentionDays).
		Scan(&deletedCount).Error
	
	if err != nil {
		return 0, err
	}
	
	return deletedCount, nil
}

// Export 导出审计日志（不分页，用于导出）
func (r *auditRepository) Export(ctx context.Context, query *models.AuditLogQuery) ([]*models.AuditLog, error) {
	db := r.db.WithContext(ctx).Model(&models.AuditLog{})
	
	// 构建查询条件
	if query.TenantID != "" {
		db = db.Where("tenant_id = ?", query.TenantID)
	}
	
	if query.UserID != "" {
		db = db.Where("user_id = ?", query.UserID)
	}
	
	if query.Action != "" {
		db = db.Where("action = ?", query.Action)
	}
	
	if query.ResourceType != "" {
		db = db.Where("resource_type = ?", query.ResourceType)
	}
	
	if query.ResourceID != "" {
		db = db.Where("resource_id = ?", query.ResourceID)
	}
	
	if query.Status != "" {
		db = db.Where("status = ?", query.Status)
	}
	
	if !query.StartTime.IsZero() {
		db = db.Where("created_at >= ?", query.StartTime)
	}
	
	if !query.EndTime.IsZero() {
		db = db.Where("created_at <= ?", query.EndTime)
	}
	
	// 查询数据（限制10000条，防止导出过大）
	var logs []*models.AuditLog
	err := db.Order("created_at DESC").
		Limit(10000).
		Find(&logs).Error
	
	if err != nil {
		return nil, err
	}
	
	return logs, nil
}
