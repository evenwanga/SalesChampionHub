package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/auth"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/usercenter"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// LogtoAuthMiddleware handles JWT token verification using Logto
type LogtoAuthMiddleware struct {
	verifier    *auth.LogtoVerifier
	redisClient *redis.Client
	cacheTTL    time.Duration
}

// NewLogtoAuthMiddleware creates a new Logto authentication middleware
func NewLogtoAuthMiddleware(
	logtoEndpoint string,
	apiResource string,
	redisClient *redis.Client,
	cacheTTL time.Duration,
) (*LogtoAuthMiddleware, error) {
	verifier, err := auth.NewLogtoVerifier(logtoEndpoint, apiResource)
	if err != nil {
		return nil, err
	}

	return &LogtoAuthMiddleware{
		verifier:    verifier,
		redisClient: redisClient,
		cacheTTL:    cacheTTL,
	}, nil
}

// Authenticate is the Gin middleware function for Logto JWT authentication
func (m *LogtoAuthMiddleware) Authenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract token from Authorization header
		token := extractTokenFromHeader(c)
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

		// Cache miss - verify token with Logto
		userInfo, err := m.verifier.VerifyToken(ctx, token)
		if err != nil {
			AbortWithError(c, http.StatusUnauthorized, "INVALID_TOKEN", err.Error())
			return
		}

		// Convert auth.UserInfo to usercenter.User
		user = &usercenter.User{
			ID:             userInfo.ID,
			TenantID:       userInfo.TenantID,
			Email:          userInfo.Email,
			Name:           userInfo.Username,
			Roles:          userInfo.Roles,
			OrganizationID: userInfo.OrganizationID,
		}

		// Cache the user info
		_ = m.cacheUser(ctx, token, user)

		// Set user context
		SetUserContext(c, user)

		// Continue to next handler
		c.Next()
	}
}

// RequireScope creates a middleware that checks if user has specific scope
func (m *LogtoAuthMiddleware) RequireScope(scope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract and verify token to get scopes
		token := extractTokenFromHeader(c)
		if token == "" {
			AbortWithError(c, http.StatusUnauthorized, "MISSING_TOKEN", "Authorization token is required")
			return
		}

		ctx := c.Request.Context()
		userInfo, err := m.verifier.VerifyToken(ctx, token)
		if err != nil {
			AbortWithError(c, http.StatusUnauthorized, "INVALID_TOKEN", err.Error())
			return
		}

		// Check if user has the required scope
		hasScope := false
		for _, s := range userInfo.Scopes {
			if s == scope {
				hasScope = true
				break
			}
		}

		if !hasScope {
			AbortWithError(c, http.StatusForbidden, "INSUFFICIENT_SCOPE",
				"Required scope '"+scope+"' not granted")
			return
		}

		c.Next()
	}
}

// RequireRole creates a middleware that checks if user has specific role
func (m *LogtoAuthMiddleware) RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetUserContext(c)
		if user == nil {
			AbortWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
			return
		}

		hasRole := false
		for _, r := range user.Roles {
			if r == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			AbortWithError(c, http.StatusForbidden, "INSUFFICIENT_ROLE",
				"Required role '"+role+"' not assigned")
			return
		}

		c.Next()
	}
}

// OptionalAuth is a middleware that authenticates if token is present, but doesn't require it
func (m *LogtoAuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractTokenFromHeader(c)
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

		userInfo, err := m.verifier.VerifyToken(ctx, token)
		if err == nil && userInfo != nil {
			user = &usercenter.User{
				ID:             userInfo.ID,
				TenantID:       userInfo.TenantID,
				Email:          userInfo.Email,
				Name:           userInfo.Username,
				Roles:          userInfo.Roles,
				OrganizationID: userInfo.OrganizationID,
			}
			_ = m.cacheUser(ctx, token, user)
			SetUserContext(c, user)
		}

		c.Next()
	}
}

// extractTokenFromHeader extracts JWT token from Authorization header
func extractTokenFromHeader(c *gin.Context) string {
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

// getUserFromCache retrieves user info from Redis cache
func (m *LogtoAuthMiddleware) getUserFromCache(ctx context.Context, token string) (*usercenter.User, error) {
	if m.redisClient == nil {
		return nil, nil
	}

	cacheKey := "logto_token:" + token
	var user usercenter.User

	err := m.redisClient.Get(ctx, cacheKey).Scan(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// cacheUser caches user info in Redis
func (m *LogtoAuthMiddleware) cacheUser(ctx context.Context, token string, user *usercenter.User) error {
	if m.redisClient == nil {
		return nil
	}

	cacheKey := "logto_token:" + token
	return m.redisClient.Set(ctx, cacheKey, user, m.cacheTTL).Err()
}
