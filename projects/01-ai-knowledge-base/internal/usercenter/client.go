package usercenter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client is the User Center API client (sub-project 0)
// This is the ONLY source for authentication, authorization, tenant, and user data
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new User Center client
func NewClient(baseURL, apiKey string, timeout time.Duration) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

// User represents user information from sub-project 0
type User struct {
	ID             string   `json:"id"`
	TenantID       string   `json:"tenant_id"`
	Email          string   `json:"email"`
	Name           string   `json:"name"`
	Roles          []string `json:"roles"`
	OrganizationID string   `json:"organization_id,omitempty"` // For three-level mounting
}

// Tenant represents tenant information from sub-project 0
type Tenant struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
	Plan   string `json:"plan"`
}

// Organization represents organization information from sub-project 0
type Organization struct {
	ID       string `json:"id"`
	TenantID string `json:"tenant_id"`
	Name     string `json:"name"`
	ParentID string `json:"parent_id,omitempty"`
}

// VerifyTokenRequest is the request for token verification
type VerifyTokenRequest struct {
	Token string `json:"token"`
}

// VerifyTokenResponse is the response from token verification
type VerifyTokenResponse struct {
	Valid bool  `json:"valid"`
	User  *User `json:"user,omitempty"`
	Error string `json:"error,omitempty"`
}

// CheckPermissionRequest is the request for permission check
type CheckPermissionRequest struct {
	UserID   string `json:"user_id"`
	Resource string `json:"resource"`
	Action   string `json:"action"`
}

// CheckPermissionResponse is the response from permission check
type CheckPermissionResponse struct {
	Allowed bool   `json:"allowed"`
	Error   string `json:"error,omitempty"`
}

// GetUserResponse is the response from get user API
type GetUserResponse struct {
	User  *User  `json:"user,omitempty"`
	Error string `json:"error,omitempty"`
}

// GetTenantResponse is the response from get tenant API
type GetTenantResponse struct {
	Tenant *Tenant `json:"tenant,omitempty"`
	Error  string  `json:"error,omitempty"`
}

// GetOrganizationResponse is the response from get organization API
type GetOrganizationResponse struct {
	Organization *Organization `json:"organization,omitempty"`
	Error        string        `json:"error,omitempty"`
}

// VerifyToken verifies a JWT token and returns user information
func (c *Client) VerifyToken(ctx context.Context, token string) (*User, error) {
	req := VerifyTokenRequest{Token: token}
	var resp VerifyTokenResponse

	if err := c.doRequest(ctx, "POST", "/api/v1/auth/verify-token", req, &resp); err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}

	if !resp.Valid {
		return nil, fmt.Errorf("invalid token: %s", resp.Error)
	}

	return resp.User, nil
}

// CheckPermission checks if a user has permission to perform an action on a resource
func (c *Client) CheckPermission(ctx context.Context, userID, resource, action string) (bool, error) {
	req := CheckPermissionRequest{
		UserID:   userID,
		Resource: resource,
		Action:   action,
	}
	var resp CheckPermissionResponse

	if err := c.doRequest(ctx, "POST", "/api/v1/auth/check-permission", req, &resp); err != nil {
		return false, fmt.Errorf("failed to check permission: %w", err)
	}

	return resp.Allowed, nil
}

// GetUser gets user information by user ID
func (c *Client) GetUser(ctx context.Context, userID string) (*User, error) {
	var resp GetUserResponse

	if err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/v1/users/%s", userID), nil, &resp); err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if resp.Error != "" {
		return nil, fmt.Errorf("get user error: %s", resp.Error)
	}

	return resp.User, nil
}

// GetTenant gets tenant information by tenant ID
func (c *Client) GetTenant(ctx context.Context, tenantID string) (*Tenant, error) {
	var resp GetTenantResponse

	if err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/v1/tenants/%s", tenantID), nil, &resp); err != nil {
		return nil, fmt.Errorf("failed to get tenant: %w", err)
	}

	if resp.Error != "" {
		return nil, fmt.Errorf("get tenant error: %s", resp.Error)
	}

	return resp.Tenant, nil
}

// GetOrganization gets organization information by organization ID
func (c *Client) GetOrganization(ctx context.Context, orgID string) (*Organization, error) {
	var resp GetOrganizationResponse

	if err := c.doRequest(ctx, "GET", fmt.Sprintf("/api/v1/organizations/%s", orgID), nil, &resp); err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	if resp.Error != "" {
		return nil, fmt.Errorf("get organization error: %s", resp.Error)
	}

	return resp.Organization, nil
}

// SendAuditLog sends an audit log to sub-project 0
func (c *Client) SendAuditLog(ctx context.Context, log AuditLog) error {
	if err := c.doRequest(ctx, "POST", "/api/v1/audit-logs", log, nil); err != nil {
		return fmt.Errorf("failed to send audit log: %w", err)
	}
	return nil
}

// AuditLog represents an audit log entry
type AuditLog struct {
	TenantID  string                 `json:"tenant_id"`
	UserID    string                 `json:"user_id"`
	Action    string                 `json:"action"`
	Resource  string                 `json:"resource"`
	ResourceID string                `json:"resource_id"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// doRequest performs an HTTP request to the User Center API
func (c *Client) doRequest(ctx context.Context, method, path string, reqBody, respBody interface{}) error {
	url := c.baseURL + path

	var bodyReader io.Reader
	if reqBody != nil {
		jsonData, err := json.Marshal(reqBody)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonData)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)

	// Perform request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to perform request: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	if respBody != nil {
		if err := json.NewDecoder(resp.Body).Decode(respBody); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}
