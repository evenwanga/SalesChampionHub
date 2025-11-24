package metrics

import (
	"runtime"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

var (
	// API 指标
	// API请求总数
	APIRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "api_requests_total",
			Help: "API请求总数",
		},
		[]string{"method", "endpoint", "status"},
	)

	// API请求耗时
	APIRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "api_request_duration_seconds",
			Help:    "API请求耗时（秒）",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint", "status"},
	)

	// API请求大小
	APIRequestSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "api_request_size_bytes",
			Help:    "API请求大小（字节）",
			Buckets: prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method", "endpoint"},
	)

	// API响应大小
	APIResponseSize = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "api_response_size_bytes",
			Help:    "API响应大小（字节）",
			Buckets: prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method", "endpoint"},
	)

	// 并发连接数
	ActiveConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_connections",
			Help: "当前活跃连接数",
		},
	)

	// 业务指标
	// Embedding生成耗时
	EmbeddingLatency = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "embedding_latency_seconds",
			Help:    "Embedding生成耗时（秒）",
			Buckets: prometheus.DefBuckets,
		},
	)

	// Embedding批量生成耗时
	EmbeddingBatchLatency = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "embedding_batch_latency_seconds",
			Help:    "Embedding批量生成耗时（秒）",
			Buckets: prometheus.DefBuckets,
		},
	)

	// 向量检索耗时
	VectorSearchLatency = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "vector_search_latency_seconds",
			Help:    "向量检索耗时（秒）",
			Buckets: prometheus.DefBuckets,
		},
	)

	// RAG生成耗时
	RAGGenerationLatency = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "rag_generation_latency_seconds",
			Help:    "RAG生成耗时（秒）",
			Buckets: prometheus.DefBuckets,
		},
	)

	// 文档处理队列长度
	DocumentProcessingQueue = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "document_processing_queue_length",
			Help: "文档处理队列长度",
		},
	)

	// 文档处理成功数
	DocumentProcessingSuccess = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "document_processing_success_total",
			Help: "文档处理成功总数",
		},
	)

	// 文档处理失败数
	DocumentProcessingFailure = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "document_processing_failure_total",
			Help: "文档处理失败总数",
		},
	)

	// 系统指标
	// CPU使用率
	CPUUsagePercent = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "system_cpu_usage_percent",
			Help: "CPU使用率（百分比）",
		},
	)

	// 内存使用率
	MemoryUsagePercent = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "system_memory_usage_percent",
			Help: "内存使用率（百分比）",
		},
	)

	// 内存使用量（字节）
	MemoryUsageBytes = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "system_memory_usage_bytes",
			Help: "内存使用量（字节）",
		},
	)

	// 磁盘使用率
	DiskUsagePercent = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "system_disk_usage_percent",
			Help: "磁盘使用率（百分比）",
		},
		[]string{"path"},
	)

	// 网络接收字节数
	NetworkReceivedBytes = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "system_network_received_bytes_total",
			Help: "网络接收字节总数",
		},
		[]string{"interface"},
	)

	// 网络发送字节数
	NetworkSentBytes = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "system_network_sent_bytes_total",
			Help: "网络发送字节总数",
		},
		[]string{"interface"},
	)

	// Go运行时指标
	// Goroutine数量
	GoroutineCount = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "go_goroutines_count",
			Help: "当前Goroutine数量",
		},
	)

	// 数据库连接池指标
	DBConnectionsOpen = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_open",
			Help: "数据库打开连接数",
		},
	)

	DBConnectionsInUse = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_in_use",
			Help: "数据库使用中连接数",
		},
	)

	DBConnectionsIdle = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "db_connections_idle",
			Help: "数据库空闲连接数",
		},
	)

	// Redis缓存指标
	CacheHits = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "cache_hits_total",
			Help: "缓存命中总数",
		},
	)

	CacheMisses = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "cache_misses_total",
			Help: "缓存未命中总数",
		},
	)
)

// SystemMetricsCollector 系统指标收集器
type SystemMetricsCollector struct {
	stopCh chan struct{}
}

// NewSystemMetricsCollector 创建系统指标收集器
func NewSystemMetricsCollector() *SystemMetricsCollector {
	return &SystemMetricsCollector{
		stopCh: make(chan struct{}),
	}
}

// Start 开始收集系统指标
func (c *SystemMetricsCollector) Start(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for {
			select {
			case <-ticker.C:
				c.collectSystemMetrics()
			case <-c.stopCh:
				ticker.Stop()
				return
			}
		}
	}()
}

// Stop 停止收集
func (c *SystemMetricsCollector) Stop() {
	close(c.stopCh)
}

// collectSystemMetrics 收集系统指标
func (c *SystemMetricsCollector) collectSystemMetrics() {
	// CPU使用率
	if cpuPercent, err := cpu.Percent(0, false); err == nil && len(cpuPercent) > 0 {
		CPUUsagePercent.Set(cpuPercent[0])
	}

	// 内存使用率
	if memStat, err := mem.VirtualMemory(); err == nil {
		MemoryUsagePercent.Set(memStat.UsedPercent)
		MemoryUsageBytes.Set(float64(memStat.Used))
	}

	// 磁盘使用率
	if diskStat, err := disk.Usage("/"); err == nil {
		DiskUsagePercent.WithLabelValues("/").Set(diskStat.UsedPercent)
	}

	// 网络统计
	if netStats, err := net.IOCounters(true); err == nil {
		for _, stat := range netStats {
			NetworkReceivedBytes.WithLabelValues(stat.Name).Set(float64(stat.BytesRecv))
			NetworkSentBytes.WithLabelValues(stat.Name).Set(float64(stat.BytesSent))
		}
	}

	// Goroutine数量
	GoroutineCount.Set(float64(runtime.NumGoroutine()))
}

// RecordAPIRequest 记录API请求
func RecordAPIRequest(method, endpoint, status string, duration float64, requestSize, responseSize int64) {
	APIRequestsTotal.WithLabelValues(method, endpoint, status).Inc()
	APIRequestDuration.WithLabelValues(method, endpoint, status).Observe(duration)
	APIRequestSize.WithLabelValues(method, endpoint).Observe(float64(requestSize))
	APIResponseSize.WithLabelValues(method, endpoint).Observe(float64(responseSize))
}

// RecordEmbeddingLatency 记录Embedding生成耗时
func RecordEmbeddingLatency(duration float64) {
	EmbeddingLatency.Observe(duration)
}

// RecordEmbeddingBatchLatency 记录Embedding批量生成耗时
func RecordEmbeddingBatchLatency(duration float64) {
	EmbeddingBatchLatency.Observe(duration)
}

// RecordVectorSearchLatency 记录向量检索耗时
func RecordVectorSearchLatency(duration float64) {
	VectorSearchLatency.Observe(duration)
}

// RecordRAGGenerationLatency 记录RAG生成耗时
func RecordRAGGenerationLatency(duration float64) {
	RAGGenerationLatency.Observe(duration)
}

// RecordDocumentProcessing 记录文档处理结果
func RecordDocumentProcessing(success bool) {
	if success {
		DocumentProcessingSuccess.Inc()
	} else {
		DocumentProcessingFailure.Inc()
	}
}

// RecordCacheHit 记录缓存命中
func RecordCacheHit() {
	CacheHits.Inc()
}

// RecordCacheMiss 记录缓存未命中
func RecordCacheMiss() {
	CacheMisses.Inc()
}

