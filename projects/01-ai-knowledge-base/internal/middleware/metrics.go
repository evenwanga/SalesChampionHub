package middleware

import (
	"strconv"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/metrics"
	"github.com/gin-gonic/gin"
)

// responseWriter 用于捕获响应大小
type responseWriter struct {
	gin.ResponseWriter
	size int
}

func (w *responseWriter) Write(b []byte) (int, error) {
	size, err := w.ResponseWriter.Write(b)
	w.size += size
	return size, err
}

func (w *responseWriter) WriteString(s string) (int, error) {
	size, err := w.ResponseWriter.WriteString(s)
	w.size += size
	return size, err
}

// MetricsMiddleware 监控指标中间件
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录请求开始时间
		start := time.Now()

		// 增加活跃连接数
		metrics.ActiveConnections.Inc()
		defer metrics.ActiveConnections.Dec()

		// 获取请求大小
		requestSize := c.Request.ContentLength
		if requestSize < 0 {
			requestSize = 0
		}

		// 包装 ResponseWriter 以捕获响应大小
		writer := &responseWriter{
			ResponseWriter: c.Writer,
			size:           0,
		}
		c.Writer = writer

		// 处理请求
		c.Next()

		// 计算请求耗时
		duration := time.Since(start).Seconds()

		// 获取响应状态码
		status := strconv.Itoa(c.Writer.Status())

		// 记录指标
		metrics.RecordAPIRequest(
			c.Request.Method,
			c.FullPath(),
			status,
			duration,
			requestSize,
			int64(writer.size),
		)
	}
}

