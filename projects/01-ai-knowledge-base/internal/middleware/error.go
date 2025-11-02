package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Success bool       `json:"success"`
	Error   ErrorDetail `json:"error"`
	Meta    MetaInfo   `json:"meta"`
}

// ErrorDetail contains error information
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// MetaInfo contains metadata about the request
type MetaInfo struct {
	Timestamp string `json:"timestamp"`
	RequestID string `json:"request_id,omitempty"`
	Path      string `json:"path,omitempty"`
}

// SuccessResponse represents a standardized success response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    MetaInfo    `json:"meta,omitempty"`
}

// AbortWithError aborts the request with a standardized error response
func AbortWithError(c *gin.Context, statusCode int, errorCode, message string) {
	c.AbortWithStatusJSON(statusCode, ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    errorCode,
			Message: message,
		},
		Meta: MetaInfo{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			RequestID: getRequestID(c),
			Path:      c.Request.URL.Path,
		},
	})
}

// RespondWithSuccess sends a standardized success response
func RespondWithSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Data:    data,
		Meta: MetaInfo{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			RequestID: getRequestID(c),
		},
	})
}

// RespondWithData sends a success response with custom status code
func RespondWithData(c *gin.Context, statusCode int, data interface{}) {
	c.JSON(statusCode, SuccessResponse{
		Success: true,
		Data:    data,
		Meta: MetaInfo{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			RequestID: getRequestID(c),
		},
	})
}

// ErrorRecovery is a middleware that recovers from panics and returns error response
func ErrorRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic recovered: %v", err)

				AbortWithError(c, http.StatusInternalServerError,
					"INTERNAL_ERROR",
					"An internal server error occurred")
			}
		}()

		c.Next()
	}
}

// RequestLogger is a middleware that logs all requests
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Process request
		c.Next()

		// Log after request
		duration := time.Since(start)
		statusCode := c.Writer.Status()

		log.Printf("[%s] %s %s - %d (%v)",
			method,
			path,
			c.ClientIP(),
			statusCode,
			duration,
		)
	}
}

// CORS middleware for Cross-Origin Resource Sharing
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// RequestID middleware generates a unique request ID
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if request ID already exists in header
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			// Generate new request ID
			requestID = generateRequestID()
		}

		// Set request ID in context
		c.Set("request_id", requestID)

		// Set request ID in response header
		c.Writer.Header().Set("X-Request-ID", requestID)

		c.Next()
	}
}

// getRequestID retrieves request ID from context
func getRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	// Simple request ID: timestamp + random suffix
	return "req_" + time.Now().Format("20060102150405") + "_" + randomString(6)
}

// randomString generates a random string of given length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}

// Common error codes
const (
	ErrUnauthorized      = "UNAUTHORIZED"
	ErrForbidden         = "FORBIDDEN"
	ErrNotFound          = "NOT_FOUND"
	ErrBadRequest        = "BAD_REQUEST"
	ErrInternalError     = "INTERNAL_ERROR"
	ErrValidationFailed  = "VALIDATION_FAILED"
	ErrDatabaseError     = "DATABASE_ERROR"
	ErrCacheError        = "CACHE_ERROR"
	ErrExternalAPIError  = "EXTERNAL_API_ERROR"
)

// Helper functions for common error responses

func RespondUnauthorized(c *gin.Context, message string) {
	AbortWithError(c, http.StatusUnauthorized, ErrUnauthorized, message)
}

func RespondForbidden(c *gin.Context, message string) {
	AbortWithError(c, http.StatusForbidden, ErrForbidden, message)
}

func RespondNotFound(c *gin.Context, message string) {
	AbortWithError(c, http.StatusNotFound, ErrNotFound, message)
}

func RespondBadRequest(c *gin.Context, message string) {
	AbortWithError(c, http.StatusBadRequest, ErrBadRequest, message)
}

func RespondInternalError(c *gin.Context, message string) {
	AbortWithError(c, http.StatusInternalServerError, ErrInternalError, message)
}

func RespondValidationError(c *gin.Context, message string) {
	AbortWithError(c, http.StatusBadRequest, ErrValidationFailed, message)
}
