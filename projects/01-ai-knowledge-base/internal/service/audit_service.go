package service

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
)

// AuditService 审计日志服务接口
type AuditService interface {
	// 查询审计日志
	QueryLogs(ctx context.Context, query *models.AuditLogQuery) ([]*models.AuditLog, int64, error)
	
	// 获取审计日志详情
	GetLogByID(ctx context.Context, id int64) (*models.AuditLog, error)
	
	// 获取用户统计
	GetUserStats(ctx context.Context, tenantID, userID string, days int) (*models.UserAuditStats, error)
	
	// 获取租户统计
	GetTenantStats(ctx context.Context, tenantID string, days int) (*models.AuditLogStats, error)
	
	// 导出审计日志
	ExportLogs(ctx context.Context, query *models.AuditLogQuery, format string) (string, error)
	
	// 清理旧日志
	CleanupOldLogs(ctx context.Context, retentionDays int) (int, error)
}

// auditService 审计日志服务实现
type auditService struct {
	auditRepo repository.AuditRepository
}

// NewAuditService 创建审计日志服务
func NewAuditService(auditRepo repository.AuditRepository) AuditService {
	return &auditService{
		auditRepo: auditRepo,
	}
}

// QueryLogs 查询审计日志
func (s *auditService) QueryLogs(ctx context.Context, query *models.AuditLogQuery) ([]*models.AuditLog, int64, error) {
	// 设置默认值
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 {
		query.PageSize = 20
	}
	if query.PageSize > 100 {
		query.PageSize = 100
	}
	
	// 如果没有指定时间范围，默认查询最近30天
	if query.StartTime.IsZero() && query.EndTime.IsZero() {
		query.EndTime = time.Now()
		query.StartTime = query.EndTime.AddDate(0, 0, -30)
	}
	
	return s.auditRepo.Query(ctx, query)
}

// GetLogByID 获取审计日志详情
func (s *auditService) GetLogByID(ctx context.Context, id int64) (*models.AuditLog, error) {
	return s.auditRepo.GetByID(ctx, id)
}

// GetUserStats 获取用户统计
func (s *auditService) GetUserStats(ctx context.Context, tenantID, userID string, days int) (*models.UserAuditStats, error) {
	if days <= 0 {
		days = 30
	}
	return s.auditRepo.GetUserStats(ctx, tenantID, userID, days)
}

// GetTenantStats 获取租户统计
func (s *auditService) GetTenantStats(ctx context.Context, tenantID string, days int) (*models.AuditLogStats, error) {
	if days <= 0 {
		days = 30
	}
	return s.auditRepo.GetTenantStats(ctx, tenantID, days)
}

// ExportLogs 导出审计日志
func (s *auditService) ExportLogs(ctx context.Context, query *models.AuditLogQuery, format string) (string, error) {
	// 获取要导出的日志
	logs, err := s.auditRepo.Export(ctx, query)
	if err != nil {
		return "", err
	}
	
	// 根据格式导出
	switch format {
	case "csv":
		return s.exportToCSV(logs)
	case "json":
		return s.exportToJSON(logs)
	default:
		return "", fmt.Errorf("unsupported export format: %s", format)
	}
}

// exportToCSV 导出为CSV
func (s *auditService) exportToCSV(logs []*models.AuditLog) (string, error) {
	// 创建临时文件
	filename := fmt.Sprintf("/tmp/audit_logs_%d.csv", time.Now().Unix())
	file, err := os.Create(filename)
	if err != nil {
		return "", err
	}
	defer file.Close()
	
	writer := csv.NewWriter(file)
	defer writer.Flush()
	
	// 写入表头
	headers := []string{
		"ID", "租户ID", "用户ID", "用户名", "操作", "资源类型", "资源ID",
		"状态", "IP地址", "请求方法", "请求路径", "耗时(ms)", "创建时间",
	}
	if err := writer.Write(headers); err != nil {
		return "", err
	}
	
	// 写入数据
	for _, log := range logs {
		record := []string{
			fmt.Sprintf("%d", log.ID),
			log.TenantID,
			log.UserID,
			log.Username,
			log.Action,
			log.ResourceType,
			log.ResourceID,
			log.Status,
			log.IPAddress,
			log.RequestMethod,
			log.RequestPath,
			fmt.Sprintf("%d", log.DurationMs),
			log.CreatedAt.Format("2006-01-02 15:04:05"),
		}
		if err := writer.Write(record); err != nil {
			return "", err
		}
	}
	
	return filename, nil
}

// exportToJSON 导出为JSON
func (s *auditService) exportToJSON(logs []*models.AuditLog) (string, error) {
	// 创建临时文件
	filename := fmt.Sprintf("/tmp/audit_logs_%d.json", time.Now().Unix())
	file, err := os.Create(filename)
	if err != nil {
		return "", err
	}
	defer file.Close()
	
	// 编码为JSON
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(logs); err != nil {
		return "", err
	}
	
	return filename, nil
}

// CleanupOldLogs 清理旧日志
func (s *auditService) CleanupOldLogs(ctx context.Context, retentionDays int) (int, error) {
	if retentionDays <= 0 {
		retentionDays = 365 // 默认保留1年
	}
	return s.auditRepo.CleanupOldLogs(ctx, retentionDays)
}

