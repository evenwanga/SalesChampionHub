package middleware

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RLSMiddleware sets up Row-Level Security session variables for PostgreSQL
type RLSMiddleware struct {
	db *gorm.DB
}

// NewRLSMiddleware creates a new RLS middleware
func NewRLSMiddleware(db *gorm.DB) *RLSMiddleware {
	return &RLSMiddleware{
		db: db,
	}
}

// SetRLSContext is a Gin middleware that sets RLS session variables
// This must run AFTER authentication middleware
func (m *RLSMiddleware) SetRLSContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := GetUserContext(c)
		if user == nil {
			// No user authenticated - skip RLS setup
			// This allows public endpoints to work
			c.Next()
			return
		}

		// Set RLS session variables in PostgreSQL
		if err := m.setSessionVariables(user.TenantID, user.OrganizationID, user.ID); err != nil {
			log.Printf("Failed to set RLS session variables: %v", err)
			AbortWithError(c, 500, "RLS_SETUP_FAILED", "Failed to set up data isolation context")
			return
		}

		c.Next()
	}
}

// setSessionVariables sets the PostgreSQL session variables for RLS
func (m *RLSMiddleware) setSessionVariables(tenantID, organizationID, userID string) error {
	// Use SET LOCAL for transaction-scoped variables
	// These will automatically reset after the transaction/connection is returned to pool

	sqls := []string{
		fmt.Sprintf("SET LOCAL \"app.current_tenant\" = '%s'", escapeSQLString(tenantID)),
		fmt.Sprintf("SET LOCAL \"app.current_user\" = '%s'", escapeSQLString(userID)),
	}

	// Organization ID is optional (user might not belong to any organization)
	if organizationID != "" {
		sqls = append(sqls, fmt.Sprintf("SET LOCAL \"app.current_organization\" = '%s'", escapeSQLString(organizationID)))
	} else {
		// Set empty string if no organization
		sqls = append(sqls, "SET LOCAL \"app.current_organization\" = ''")
	}

	// Execute all SET statements
	for _, sql := range sqls {
		if err := m.db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to execute %s: %w", sql, err)
		}
	}

	return nil
}

// SetRLSContextForDB sets RLS context directly on a DB instance
// Use this when you need to set RLS context outside of HTTP request context
func SetRLSContextForDB(db *gorm.DB, tenantID, organizationID, userID string) error {
	sqls := []string{
		fmt.Sprintf("SET LOCAL \"app.current_tenant\" = '%s'", escapeSQLString(tenantID)),
		fmt.Sprintf("SET LOCAL \"app.current_user\" = '%s'", escapeSQLString(userID)),
	}

	if organizationID != "" {
		sqls = append(sqls, fmt.Sprintf("SET LOCAL \"app.current_organization\" = '%s'", escapeSQLString(organizationID)))
	} else {
		sqls = append(sqls, "SET LOCAL \"app.current_organization\" = ''")
	}

	for _, sql := range sqls {
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to execute %s: %w", sql, err)
		}
	}

	return nil
}

// ClearRLSContext clears RLS session variables
// Usually not needed as SET LOCAL is transaction-scoped
func ClearRLSContext(db *gorm.DB) error {
	sqls := []string{
		"RESET app.current_tenant",
		"RESET app.current_organization",
		"RESET app.current_user",
	}

	for _, sql := range sqls {
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to execute %s: %w", sql, err)
		}
	}

	return nil
}

// escapeSQLString escapes single quotes in SQL strings to prevent SQL injection
func escapeSQLString(s string) string {
	// Replace single quote with two single quotes (SQL escaping)
	result := ""
	for _, c := range s {
		if c == '\'' {
			result += "''"
		} else {
			result += string(c)
		}
	}
	return result
}

// WithRLSContext is a helper to execute database operations with RLS context
// Use this pattern in repositories when you need to ensure RLS is set
func WithRLSContext(db *gorm.DB, tenantID, organizationID, userID string, fn func(*gorm.DB) error) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// Set RLS context
		if err := SetRLSContextForDB(tx, tenantID, organizationID, userID); err != nil {
			return err
		}

		// Execute the function
		return fn(tx)
	})
}
