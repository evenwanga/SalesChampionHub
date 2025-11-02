package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"gorm.io/gorm"
)

// QueryLogRepository handles query log operations
type QueryLogRepository struct {
	db *gorm.DB
}

// NewQueryLogRepository creates a new query log repository
func NewQueryLogRepository(db *gorm.DB) *QueryLogRepository {
	return &QueryLogRepository{
		db: db,
	}
}

// CreateQueryLog creates a new query log entry
func (r *QueryLogRepository) CreateQueryLog(ctx context.Context, log *models.QueryLog) error {
	if err := r.db.WithContext(ctx).Create(log).Error; err != nil {
		return fmt.Errorf("failed to create query log: %w", err)
	}
	return nil
}

// GetUserQueryHistory retrieves user's query history with pagination
// Returns query logs sorted by created_at DESC
func (r *QueryLogRepository) GetUserQueryHistory(ctx context.Context, tenantID, userID string, limit, offset int) ([]*models.QueryLog, int64, error) {
	var logs []*models.QueryLog
	var total int64

	// Get total count
	if err := r.db.WithContext(ctx).
		Model(&models.QueryLog{}).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count query history: %w", err)
	}

	// Get paginated results
	if err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get query history: %w", err)
	}

	return logs, total, nil
}

// GetTenantQueryStats retrieves query statistics for a tenant
// Returns aggregated stats within a time range
func (r *QueryLogRepository) GetTenantQueryStats(ctx context.Context, tenantID string, startTime, endTime time.Time) (*QueryStats, error) {
	var stats QueryStats

	// Total queries
	if err := r.db.WithContext(ctx).
		Model(&models.QueryLog{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, startTime, endTime).
		Count(&stats.TotalQueries).Error; err != nil {
		return nil, fmt.Errorf("failed to count total queries: %w", err)
	}

	// Unique users
	if err := r.db.WithContext(ctx).
		Model(&models.QueryLog{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, startTime, endTime).
		Distinct("user_id").
		Count(&stats.UniqueUsers).Error; err != nil {
		return nil, fmt.Errorf("failed to count unique users: %w", err)
	}

	// Average latency
	if err := r.db.WithContext(ctx).
		Model(&models.QueryLog{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, startTime, endTime).
		Select("AVG(latency_ms) as avg_latency").
		Scan(&stats.AvgLatencyMS).Error; err != nil {
		return nil, fmt.Errorf("failed to calculate average latency: %w", err)
	}

	// Total results returned
	if err := r.db.WithContext(ctx).
		Model(&models.QueryLog{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, startTime, endTime).
		Select("SUM(result_count) as total_results").
		Scan(&stats.TotalResults).Error; err != nil {
		return nil, fmt.Errorf("failed to sum results: %w", err)
	}

	// Most queried KBs (top 10)
	type KBQueryCount struct {
		KBID  string `json:"kb_id"`
		Count int64  `json:"count"`
	}

	var kbCounts []KBQueryCount
	if err := r.db.WithContext(ctx).
		Model(&models.QueryLog{}).
		Select("unnest(kb_ids) as kb_id, COUNT(*) as count").
		Where("tenant_id = ? AND created_at BETWEEN ? AND ? AND kb_ids IS NOT NULL", tenantID, startTime, endTime).
		Group("kb_id").
		Order("count DESC").
		Limit(10).
		Scan(&kbCounts).Error; err != nil {
		return nil, fmt.Errorf("failed to get KB query counts: %w", err)
	}

	stats.TopKBs = make(map[string]int64)
	for _, kbc := range kbCounts {
		stats.TopKBs[kbc.KBID] = kbc.Count
	}

	return &stats, nil
}

// GetRecentQueries retrieves most recent queries for a tenant
func (r *QueryLogRepository) GetRecentQueries(ctx context.Context, tenantID string, limit int) ([]*models.QueryLog, error) {
	var logs []*models.QueryLog

	if err := r.db.WithContext(ctx).
		Where("tenant_id = ?", tenantID).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error; err != nil {
		return nil, fmt.Errorf("failed to get recent queries: %w", err)
	}

	return logs, nil
}

// QueryStats represents aggregated query statistics
type QueryStats struct {
	TotalQueries int64            `json:"total_queries"`
	UniqueUsers  int64            `json:"unique_users"`
	TotalResults int64            `json:"total_results"`
	AvgLatencyMS float64          `json:"avg_latency_ms"`
	TopKBs       map[string]int64 `json:"top_kbs"` // KB ID -> query count
}
