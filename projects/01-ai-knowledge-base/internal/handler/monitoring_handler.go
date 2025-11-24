package handler

import (
	"context"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
	"gorm.io/gorm"
)

// MonitoringHandler 监控处理器
type MonitoringHandler struct {
	db          *gorm.DB
	redisClient *redis.Client
}

// NewMonitoringHandler 创建监控处理器
func NewMonitoringHandler(db *gorm.DB, redisClient *redis.Client) *MonitoringHandler {
	return &MonitoringHandler{
		db:          db,
		redisClient: redisClient,
	}
}

// SystemStatusResponse 系统状态响应
type SystemStatusResponse struct {
	Status    string                 `json:"status"`
	Timestamp string                 `json:"timestamp"`
	Uptime    string                 `json:"uptime"`
	Version   string                 `json:"version"`
	System    SystemMetrics          `json:"system"`
	Services  map[string]ServiceInfo `json:"services"`
	Runtime   RuntimeMetrics         `json:"runtime"`
}

// SystemMetrics 系统指标
type SystemMetrics struct {
	CPU     CPUMetrics     `json:"cpu"`
	Memory  MemoryMetrics  `json:"memory"`
	Disk    DiskMetrics    `json:"disk"`
	Network NetworkMetrics `json:"network"`
}

// CPUMetrics CPU指标
type CPUMetrics struct {
	UsagePercent float64 `json:"usage_percent"`
	Cores        int     `json:"cores"`
}

// MemoryMetrics 内存指标
type MemoryMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
}

// DiskMetrics 磁盘指标
type DiskMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
	Path        string  `json:"path"`
}

// NetworkMetrics 网络指标
type NetworkMetrics struct {
	BytesRecv uint64 `json:"bytes_recv"`
	BytesSent uint64 `json:"bytes_sent"`
}

// ServiceInfo 服务信息
type ServiceInfo struct {
	Status    string `json:"status"`
	Latency   string `json:"latency,omitempty"`
	Message   string `json:"message,omitempty"`
	Available bool   `json:"available"`
}

// RuntimeMetrics 运行时指标
type RuntimeMetrics struct {
	Goroutines   int    `json:"goroutines"`
	MemAllocMB   uint64 `json:"mem_alloc_mb"`
	MemTotalMB   uint64 `json:"mem_total_mb"`
	NumGC        uint32 `json:"num_gc"`
	LastGCTime   string `json:"last_gc_time"`
	GoVersion    string `json:"go_version"`
	NumCPU       int    `json:"num_cpu"`
}

var startTime = time.Now()

// GetSystemStatus 获取系统状态
// @Summary 获取系统状态
// @Description 获取详细的系统状态信息，包括CPU、内存、磁盘、网络等指标
// @Tags 监控
// @Produce json
// @Success 200 {object} SystemStatusResponse "系统状态信息"
// @Router /api/v1/system/status [get]
// @Security BearerAuth
func (h *MonitoringHandler) GetSystemStatus(c *gin.Context) {
	// 系统指标
	systemMetrics := h.collectSystemMetrics()

	// 服务状态
	services := h.checkServicesHealth(c.Request.Context())

	// 运行时指标
	runtimeMetrics := h.collectRuntimeMetrics()

	// 计算运行时间
	uptime := time.Since(startTime)

	response := SystemStatusResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Uptime:    uptime.String(),
		Version:   "1.0.0",
		System:    systemMetrics,
		Services:  services,
		Runtime:   runtimeMetrics,
	}

	c.JSON(http.StatusOK, response)
}

// collectSystemMetrics 收集系统指标
func (h *MonitoringHandler) collectSystemMetrics() SystemMetrics {
	metrics := SystemMetrics{}

	// CPU指标
	if cpuPercent, err := cpu.Percent(time.Second, false); err == nil && len(cpuPercent) > 0 {
		metrics.CPU.UsagePercent = cpuPercent[0]
	}
	metrics.CPU.Cores = runtime.NumCPU()

	// 内存指标
	if memStat, err := mem.VirtualMemory(); err == nil {
		metrics.Memory.Total = memStat.Total
		metrics.Memory.Used = memStat.Used
		metrics.Memory.Free = memStat.Free
		metrics.Memory.UsedPercent = memStat.UsedPercent
	}

	// 磁盘指标
	if diskStat, err := disk.Usage("/"); err == nil {
		metrics.Disk.Total = diskStat.Total
		metrics.Disk.Used = diskStat.Used
		metrics.Disk.Free = diskStat.Free
		metrics.Disk.UsedPercent = diskStat.UsedPercent
		metrics.Disk.Path = "/"
	}

	// 网络指标
	if netStats, err := net.IOCounters(false); err == nil && len(netStats) > 0 {
		metrics.Network.BytesRecv = netStats[0].BytesRecv
		metrics.Network.BytesSent = netStats[0].BytesSent
	}

	return metrics
}

// checkServicesHealth 检查服务健康状态
func (h *MonitoringHandler) checkServicesHealth(ctx context.Context) map[string]ServiceInfo {
	services := make(map[string]ServiceInfo)

	// 检查数据库
	dbStart := time.Now()
	if sqlDB, err := h.db.DB(); err == nil {
		if err := sqlDB.Ping(); err == nil {
			services["database"] = ServiceInfo{
				Status:    "up",
				Latency:   time.Since(dbStart).String(),
				Available: true,
			}
		} else {
			services["database"] = ServiceInfo{
				Status:    "down",
				Message:   err.Error(),
				Available: false,
			}
		}
	} else {
		services["database"] = ServiceInfo{
			Status:    "down",
			Message:   err.Error(),
			Available: false,
		}
	}

	// 检查Redis
	redisStart := time.Now()
	if err := h.redisClient.Ping(ctx).Err(); err == nil {
		services["redis"] = ServiceInfo{
			Status:    "up",
			Latency:   time.Since(redisStart).String(),
			Available: true,
		}
	} else {
		services["redis"] = ServiceInfo{
			Status:    "down",
			Message:   err.Error(),
			Available: false,
		}
	}

	return services
}

// collectRuntimeMetrics 收集运行时指标
func (h *MonitoringHandler) collectRuntimeMetrics() RuntimeMetrics {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	lastGCTime := "never"
	if m.NumGC > 0 {
		lastGCTime = time.Unix(0, int64(m.LastGC)).Format(time.RFC3339)
	}

	return RuntimeMetrics{
		Goroutines:   runtime.NumGoroutine(),
		MemAllocMB:   m.Alloc / 1024 / 1024,
		MemTotalMB:   m.TotalAlloc / 1024 / 1024,
		NumGC:        m.NumGC,
		LastGCTime:   lastGCTime,
		GoVersion:    runtime.Version(),
		NumCPU:       runtime.NumCPU(),
	}
}

// GetMetricsSnapshot 获取指标快照
// @Summary 获取指标快照
// @Description 获取当前时刻的关键性能指标快照
// @Tags 监控
// @Produce json
// @Success 200 {object} map[string]interface{} "指标快照"
// @Router /api/v1/system/metrics [get]
// @Security BearerAuth
func (h *MonitoringHandler) GetMetricsSnapshot(c *gin.Context) {
	// 获取数据库连接池统计
	var dbStats map[string]interface{}
	if sqlDB, err := h.db.DB(); err == nil {
		stats := sqlDB.Stats()
		dbStats = map[string]interface{}{
			"open_connections":  stats.OpenConnections,
			"in_use":            stats.InUse,
			"idle":              stats.Idle,
			"wait_count":        stats.WaitCount,
			"wait_duration":     stats.WaitDuration.String(),
			"max_idle_closed":   stats.MaxIdleClosed,
			"max_lifetime_closed": stats.MaxLifetimeClosed,
		}
	}

	// 获取Redis统计
	var redisStats map[string]interface{}
	if poolStats := h.redisClient.PoolStats(); poolStats != nil {
		redisStats = map[string]interface{}{
			"hits":       poolStats.Hits,
			"misses":     poolStats.Misses,
			"timeouts":   poolStats.Timeouts,
			"total_conns": poolStats.TotalConns,
			"idle_conns": poolStats.IdleConns,
			"stale_conns": poolStats.StaleConns,
		}
	}

	snapshot := map[string]interface{}{
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"database":  dbStats,
		"redis":     redisStats,
		"runtime": map[string]interface{}{
			"goroutines": runtime.NumGoroutine(),
			"mem_alloc":  runtime.MemStats{}.Alloc,
		},
	}

	c.JSON(http.StatusOK, snapshot)
}

