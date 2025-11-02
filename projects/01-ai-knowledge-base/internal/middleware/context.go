package middleware

import (
	"github.com/SalesChampionHub/ai-knowledge-base/internal/usercenter"
	"github.com/gin-gonic/gin"
)

// Context keys for storing user information
const (
	UserContextKey = "user"
)

// SetUserContext sets user information in the Gin context
func SetUserContext(c *gin.Context, user *usercenter.User) {
	c.Set(UserContextKey, user)
}

// GetUserContext retrieves user information from the Gin context
func GetUserContext(c *gin.Context) *usercenter.User {
	val, exists := c.Get(UserContextKey)
	if !exists {
		return nil
	}

	user, ok := val.(*usercenter.User)
	if !ok {
		return nil
	}

	return user
}

// MustGetUserContext retrieves user context and panics if not found
// Use this only in authenticated routes where user MUST exist
func MustGetUserContext(c *gin.Context) *usercenter.User {
	user := GetUserContext(c)
	if user == nil {
		panic("user context not found - authentication middleware missing?")
	}
	return user
}

// GetTenantID is a convenience function to get tenant ID from context
func GetTenantID(c *gin.Context) string {
	user := GetUserContext(c)
	if user == nil {
		return ""
	}
	return user.TenantID
}

// GetUserID is a convenience function to get user ID from context
func GetUserID(c *gin.Context) string {
	user := GetUserContext(c)
	if user == nil {
		return ""
	}
	return user.ID
}

// GetOrganizationID is a convenience function to get organization ID from context
func GetOrganizationID(c *gin.Context) string {
	user := GetUserContext(c)
	if user == nil {
		return ""
	}
	return user.OrganizationID
}

// UserInfo is a simplified user info for response
type UserInfo struct {
	ID             string   `json:"id"`
	TenantID       string   `json:"tenant_id"`
	Email          string   `json:"email"`
	Name           string   `json:"name"`
	OrganizationID string   `json:"organization_id,omitempty"`
	Roles          []string `json:"roles"`
}

// GetUserInfo converts User to UserInfo for API responses
func GetUserInfo(c *gin.Context) *UserInfo {
	user := GetUserContext(c)
	if user == nil {
		return nil
	}

	return &UserInfo{
		ID:             user.ID,
		TenantID:       user.TenantID,
		Email:          user.Email,
		Name:           user.Name,
		OrganizationID: user.OrganizationID,
		Roles:          user.Roles,
	}
}
