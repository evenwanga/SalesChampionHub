package repository

import (
	"context"
	"database/sql"
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
	var avgLatency sql.NullFloat64
	if err := r.db.WithContext(ctx).
		Model(&models.QueryLog{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, startTime, endTime).
		Select("AVG(latency_ms) as avg_latency").
		Scan(&avgLatency).Error; err != nil {
		return nil, fmt.Errorf("failed to calculate average latency: %w", err)
	}
	if avgLatency.Valid {
		stats.AvgLatencyMS = avgLatency.Float64
	} else {
		stats.AvgLatencyMS = 0
	}

	// Total results returned
	var totalResults sql.NullInt64
	if err := r.db.WithContext(ctx).
		Model(&models.QueryLog{}).
		Where("tenant_id = ? AND created_at BETWEEN ? AND ?", tenantID, startTime, endTime).
		Select("SUM(result_count) as total_results").
		Scan(&totalResults).Error; err != nil {
		return nil, fmt.Errorf("failed to sum results: %w", err)
	}
	if totalResults.Valid {
		stats.TotalResults = totalResults.Int64
	} else {
		stats.TotalResults = 0
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

// QueryStatsGrouped represents query statistics grouped by time period
type QueryStatsGrouped struct {
	Period              string  `json:"period"`                 // Date period (YYYY-MM-DD)
	TotalQueries        int64   `json:"total_queries"`          // Total queries in period
	SearchCount         int64   `json:"search_count"`           // Search-type queries
	AskCount            int64   `json:"ask_count"`              // Ask-type queries
	AvgProcessingTimeMS float64 `json:"avg_processing_time_ms"` // Average processing time
}

// GetTenantQueryStatsByGroup retrieves query statistics grouped by time period
// Supports grouping by day, week, or month
func (r *QueryLogRepository) GetTenantQueryStatsByGroup(ctx context.Context, tenantID string, startDate, endDate time.Time, groupBy string) ([]*QueryStatsGrouped, error) {
	var stats []*QueryStatsGrouped

	// Determine date truncation format based on group_by
	var dateFormat string
	var dateTrunc string
	switch groupBy {
	case "day":
		dateFormat = "2006-01-02"
		dateTrunc = "DATE(created_at)"
	case "week":
		dateFormat = "2006-01-02"
		dateTrunc = "DATE_TRUNC('week', created_at)"
	case "month":
		dateFormat = "2006-01"
		dateTrunc = "DATE_TRUNC('month', created_at)"
	default:
		dateFormat = "2006-01-02"
		dateTrunc = "DATE(created_at)"
	}

	// Raw SQL query to aggregate stats by period
	query := fmt.Sprintf(`
		SELECT
			%s as period,
			COUNT(*) as total_queries,
			COUNT(*) FILTER (WHERE query_type = 'search') as search_count,
			COUNT(*) FILTER (WHERE query_type = 'ask') as ask_count,
			AVG(latency_ms) as avg_processing_time_ms
		FROM query_logs
		WHERE tenant_id = ?
			AND created_at >= ?
			AND created_at < ?
		GROUP BY period
		ORDER BY period ASC
	`, dateTrunc)

	type QueryResult struct {
		Period              time.Time
		TotalQueries        int64
		SearchCount         int64
		AskCount            int64
		AvgProcessingTimeMS float64
	}

	var results []QueryResult
	if err := r.db.WithContext(ctx).Raw(query, tenantID, startDate, endDate).Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("failed to get grouped query stats: %w", err)
	}

	// Convert to response format
	for _, result := range results {
		stats = append(stats, &QueryStatsGrouped{
			Period:              result.Period.Format(dateFormat),
			TotalQueries:        result.TotalQueries,
			SearchCount:         result.SearchCount,
			AskCount:            result.AskCount,
			AvgProcessingTimeMS: result.AvgProcessingTimeMS,
		})
	}

	return stats, nil
}
