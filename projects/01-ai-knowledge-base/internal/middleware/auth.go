package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/usercenter"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// AuthMiddleware handles JWT token verification and user authentication
type AuthMiddleware struct {
	userCenterClient *usercenter.Client
	redisClient      *redis.Client
	cacheTTL         time.Duration
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(
	userCenterClient *usercenter.Client,
	redisClient *redis.Client,
	cacheTTL time.Duration,
) *AuthMiddleware {
	return &AuthMiddleware{
		userCenterClient: userCenterClient,
		redisClient:      redisClient,
		cacheTTL:         cacheTTL,
	}
}

// Authenticate is the Gin middleware function for JWT authentication
func (m *AuthMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		token := extractToken(c)
		if token == "" {
			AbortWithError(c, http.StatusUnauthorized, "MISSING_TOKEN", "Authorization token is required")
			return
		}

		// Try to get user from cache first
		ctx := c.Request.Context()
		user, err := m.getUserFromCache(ctx, token)
		if err == nil && user != nil {
			// Cache hit - set user context and continue
			SetUserContext(c, user)
			c.Next()
			return
		}

		// Cache miss - verify token with user center
		user, err = m.verifyTokenWithUserCenter(ctx, token)
		if err != nil {
			AbortWithError(c, http.StatusUnauthorized, "INVALID_TOKEN", err.Error())
			return
		}

		// Cache the user info
		_ = m.cacheUser(ctx, token, user)

		// Set user context
		SetUserContext(c, user)

		// Continue to next handler
		c.Next()
	}
}

// RequirePermission creates a middleware that checks specific permission
func (m *AuthMiddleware) RequirePermission(resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetUserContext(c)
		if user == nil {
			AbortWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
			return
		}

		// Check permission with user center
		ctx := c.Request.Context()
		allowed, err := m.userCenterClient.CheckPermission(ctx, user.ID, resource, action)
		if err != nil {
			AbortWithError(c, http.StatusInternalServerError, "PERMISSION_CHECK_FAILED", err.Error())
			return
		}

		if !allowed {
			AbortWithError(c, http.StatusForbidden, "PERMISSION_DENIED",
				"You don't have permission to "+action+" "+resource)
			return
		}

		c.Next()
	}
}

// extractToken extracts JWT token from Authorization header
func extractToken(c *gin.Context) string {
	// Check Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	// Bearer token format: "Bearer <token>"
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}

	return parts[1]
}

// verifyTokenWithUserCenter verifies token with user center API
func (m *AuthMiddleware) verifyTokenWithUserCenter(ctx context.Context, token string) (*usercenter.User, error) {
	return m.userCenterClient.VerifyToken(ctx, token)
}

// getUserFromCache retrieves user info from Redis cache
func (m *AuthMiddleware) getUserFromCache(ctx context.Context, token string) (*usercenter.User, error) {
	if m.redisClient == nil {
		return nil, nil
	}

	cacheKey := "user_token:" + token
	var user usercenter.User

	// Try to get from cache
	err := m.redisClient.Get(ctx, cacheKey).Scan(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// cacheUser caches user info in Redis
func (m *AuthMiddleware) cacheUser(ctx context.Context, token string, user *usercenter.User) error {
	if m.redisClient == nil {
		return nil
	}

	cacheKey := "user_token:" + token
	return m.redisClient.Set(ctx, cacheKey, user, m.cacheTTL).Err()
}

// OptionalAuth is a middleware that authenticates if token is present, but doesn't require it
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			// No token - continue without authentication
			c.Next()
			return
		}

		// Token present - try to authenticate
		ctx := c.Request.Context()
		user, err := m.getUserFromCache(ctx, token)
		if err == nil && user != nil {
			SetUserContext(c, user)
			c.Next()
			return
		}

		user, err = m.verifyTokenWithUserCenter(ctx, token)
		if err == nil && user != nil {
			_ = m.cacheUser(ctx, token, user)
			SetUserContext(c, user)
		}

		c.Next()
	}
}
