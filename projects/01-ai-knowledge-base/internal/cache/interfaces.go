package cache

import (
	"context"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
)

// KBCacheInterface defines the interface for knowledge base cache operations
type KBCacheInterface interface {
	// KB Metadata caching
	GetKBMetadata(ctx context.Context, kbID string) (*models.KnowledgeBase, error)
	SetKBMetadata(ctx context.Context, kb *models.KnowledgeBase, ttl time.Duration) error
	InvalidateKBMetadata(ctx context.Context, kbID string) error

	// KB Stats caching
	GetKBStats(ctx context.Context, kbID string) (*repository.KBStats, error)
	SetKBStats(ctx context.Context, kbID string, stats *repository.KBStats, ttl time.Duration) error
	InvalidateKBStats(ctx context.Context, kbID string) error

	// KB Access caching
	GetAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string) ([]*models.KnowledgeBase, error)
	SetAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string, kbs []*models.KnowledgeBase, ttl time.Duration) error
	InvalidateUserKBAccess(ctx context.Context, tenantID, organizationID, userID string) error

	// KB Permissions caching
	GetKBPermissions(ctx context.Context, kbID, tenantID, organizationID, userID string) (models.JSONMap, error)

	// Bulk invalidation
	InvalidateAllKBData(ctx context.Context, kbID string) error
}

// Ensure concrete type implements interface
var _ KBCacheInterface = (*KBCache)(nil)
