package handler

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ContactUser 用户信息
type ContactUser struct {
	UserID        string    `json:"user_id"`
	Username      string    `json:"username,omitempty"`
	Name          string    `json:"name,omitempty"`
	Email         string    `json:"email,omitempty"`
	Phone         string    `json:"phone,omitempty"`
	Avatar        string    `json:"avatar,omitempty"`
	ActivityCount int64     `json:"activity_count,omitempty"`
	LastActive    time.Time `json:"last_active"`
}

// ContactTenant 组织（租户）与用户列表
type ContactTenant struct {
	TenantID         string        `json:"tenant_id"`
	OrganizationName string        `json:"organization_name,omitempty"`
	Users            []ContactUser `json:"users"`
}

// ContactHandler 通讯录相关处理
type ContactHandler struct {
	db *gorm.DB
}

// NewContactHandler 创建通讯录处理器
func NewContactHandler(db *gorm.DB) *ContactHandler {
	return &ContactHandler{
		db: db,
	}
}

// GetContacts 返回租户及其用户列表（优先从用户中心获取，兜底 query_logs）
// @Summary 获取通讯录
// @Description 从用户中心获取组织+用户列表；若失败则基于查询日志聚合
// @Tags 通讯录
// @Produce json
// @Success 200 {object} []ContactTenant
// @Router /api/v1/contacts [get]
// @Security BearerAuth
func (h *ContactHandler) GetContacts(c *gin.Context) {
	if contacts, ok := h.fetchFromUserCenter(); ok && len(contacts) > 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    contacts,
		})
		return
	}

	// 兜底：基于 query_logs 聚合
	type row struct {
		TenantID   string
		UserID     string
		LastActive time.Time
		Count      int64
	}

	var rows []row
	if err := h.db.
		Table("query_logs").
		Select("tenant_id, user_id, MAX(created_at) as last_active, COUNT(*) as count").
		Group("tenant_id, user_id").
		Order("tenant_id ASC, last_active DESC").
		Scan(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "failed to load contacts",
		})
		return
	}

	tenantMap := make(map[string][]ContactUser)
	for _, r := range rows {
		tenantMap[r.TenantID] = append(tenantMap[r.TenantID], ContactUser{
			UserID:        r.UserID,
			ActivityCount: r.Count,
			LastActive:    r.LastActive,
		})
	}

	var contacts []ContactTenant
	for tenantID, users := range tenantMap {
		contacts = append(contacts, ContactTenant{
			TenantID: tenantID,
			Users:    users,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    contacts,
	})
}

// fetchFromUserCenter 调用用户中心获取组织+用户列表
func (h *ContactHandler) fetchFromUserCenter() ([]ContactTenant, bool) {
	baseURL := os.Getenv("USER_CENTER_API")
	apiKey := os.Getenv("USER_CENTER_API_KEY")
	if baseURL == "" || apiKey == "" {
		return nil, false
	}

	req, err := http.NewRequest(http.MethodGet, baseURL+"/contacts", nil)
	if err != nil {
		return nil, false
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// 再尝试一次使用容器内部地址
		altReq, _ := http.NewRequest(http.MethodGet, "http://user-center-custom-api:3003/api/v1/contacts", nil)
		altReq.Header.Set("Authorization", "Bearer "+apiKey)
		altResp, altErr := client.Do(altReq)
		if altErr != nil || altResp.StatusCode != http.StatusOK {
			if altResp != nil {
				altResp.Body.Close()
			}
			return nil, false
		}
		resp.Body.Close()
		resp = altResp
	}

	var payload struct {
		Success bool            `json:"success"`
		Data    []ContactTenant `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, false
	}
	if !payload.Success || payload.Data == nil {
		return nil, false
	}
	return payload.Data, true
}
