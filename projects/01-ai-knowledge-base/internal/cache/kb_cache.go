package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/redis/go-redis/v9"
)

var (
	ErrCacheMiss = errors.New("cache miss")
)

const (
	// Cache key prefixes
	kbMetadataPrefix    = "kb:metadata:"
	kbAccessiblePrefix  = "kb:accessible:"
	kbPermissionsPrefix = "kb:permissions:"
	documentMetaPrefix  = "doc:metadata:"
	kbStatsPrefix       = "kb:stats:"

	// Default TTLs
	kbMetadataTTL    = 5 * time.Minute
	kbAccessibleTTL  = 2 * time.Minute
	kbPermissionsTTL = 5 * time.Minute
	documentMetaTTL  = 5 * time.Minute
	kbStatsTTL       = 2 * time.Minute
)

// KBCache provides caching for knowledge base operations
type KBCache struct {
	redis *redis.Client
}

// NewKBCache creates a new KB cache instance
func NewKBCache(redisClient *redis.Client) *KBCache {
	return &KBCache{
		redis: redisClient,
	}
}

// GetKBMetadata retrieves KB metadata from cache
func (c *KBCache) GetKBMetadata(ctx context.Context, kbID string) (*models.KnowledgeBase, error) {
	key := kbMetadataPrefix + kbID

	data, err := c.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Cache miss
		}
		return nil, fmt.Errorf("failed to get KB metadata from cache: %w", err)
	}

	var kb models.KnowledgeBase
	if err := json.Unmarshal(data, &kb); err != nil {
		return nil, fmt.Errorf("failed to unmarshal KB metadata: %w", err)
	}

	return &kb, nil
}

// SetKBMetadata caches KB metadata
func (c *KBCache) SetKBMetadata(ctx context.Context, kb *models.KnowledgeBase, ttl time.Duration) error {
	if ttl == 0 {
		ttl = kbMetadataTTL
	}

	key := kbMetadataPrefix + kb.ID

	data, err := json.Marshal(kb)
	if err != nil {
		return fmt.Errorf("failed to marshal KB metadata: %w", err)
	}

	if err := c.redis.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to cache KB metadata: %w", err)
	}

	return nil
}

// InvalidateKBMetadata removes KB metadata from cache
func (c *KBCache) InvalidateKBMetadata(ctx context.Context, kbID string) error {
	key := kbMetadataPrefix + kbID
	return c.redis.Del(ctx, key).Err()
}

// GetAccessibleKBs retrieves user's accessible KBs from cache
func (c *KBCache) GetAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string) ([]*models.KnowledgeBase, error) {
	key := fmt.Sprintf("%s%s:%s:%s", kbAccessiblePrefix, tenantID, organizationID, userID)

	data, err := c.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Cache miss
		}
		return nil, fmt.Errorf("failed to get accessible KBs from cache: %w", err)
	}

	var kbs []*models.KnowledgeBase
	if err := json.Unmarshal(data, &kbs); err != nil {
		return nil, fmt.Errorf("failed to unmarshal accessible KBs: %w", err)
	}

	return kbs, nil
}

// SetAccessibleKBs caches user's accessible KBs
func (c *KBCache) SetAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string, kbs []*models.KnowledgeBase, ttl time.Duration) error {
	if ttl == 0 {
		ttl = kbAccessibleTTL
	}

	key := fmt.Sprintf("%s%s:%s:%s", kbAccessiblePrefix, tenantID, organizationID, userID)

	data, err := json.Marshal(kbs)
	if err != nil {
		return fmt.Errorf("failed to marshal accessible KBs: %w", err)
	}

	if err := c.redis.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to cache accessible KBs: %w", err)
	}

	return nil
}

// InvalidateAccessibleKBs removes user's accessible KBs from cache
func (c *KBCache) InvalidateAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string) error {
	key := fmt.Sprintf("%s%s:%s:%s", kbAccessiblePrefix, tenantID, organizationID, userID)
	return c.redis.Del(ctx, key).Err()
}

// GetKBPermissions retrieves user's permissions for a KB from cache
func (c *KBCache) GetKBPermissions(ctx context.Context, kbID, tenantID, organizationID, userID string) (models.JSONMap, error) {
	key := fmt.Sprintf("%s%s:%s:%s:%s", kbPermissionsPrefix, kbID, tenantID, organizationID, userID)

	data, err := c.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Cache miss
		}
		return nil, fmt.Errorf("failed to get KB permissions from cache: %w", err)
	}

	var permissions models.JSONMap
	if err := json.Unmarshal(data, &permissions); err != nil {
		return nil, fmt.Errorf("failed to unmarshal KB permissions: %w", err)
	}

	return permissions, nil
}

// SetKBPermissions caches user's permissions for a KB
func (c *KBCache) SetKBPermissions(ctx context.Context, kbID, tenantID, organizationID, userID string, permissions models.JSONMap, ttl time.Duration) error {
	if ttl == 0 {
		ttl = kbPermissionsTTL
	}

	key := fmt.Sprintf("%s%s:%s:%s:%s", kbPermissionsPrefix, kbID, tenantID, organizationID, userID)

	data, err := json.Marshal(permissions)
	if err != nil {
		return fmt.Errorf("failed to marshal KB permissions: %w", err)
	}

	if err := c.redis.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to cache KB permissions: %w", err)
	}

	return nil
}

// InvalidateKBPermissions removes user's permissions for a KB from cache
func (c *KBCache) InvalidateKBPermissions(ctx context.Context, kbID, tenantID, organizationID, userID string) error {
	key := fmt.Sprintf("%s%s:%s:%s:%s", kbPermissionsPrefix, kbID, tenantID, organizationID, userID)
	return c.redis.Del(ctx, key).Err()
}

// GetDocumentMetadata retrieves document metadata from cache
func (c *KBCache) GetDocumentMetadata(ctx context.Context, docID string) (*models.Document, error) {
	key := documentMetaPrefix + docID

	data, err := c.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Cache miss
		}
		return nil, fmt.Errorf("failed to get document metadata from cache: %w", err)
	}

	var doc models.Document
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal document metadata: %w", err)
	}

	return &doc, nil
}

// SetDocumentMetadata caches document metadata
func (c *KBCache) SetDocumentMetadata(ctx context.Context, doc *models.Document, ttl time.Duration) error {
	if ttl == 0 {
		ttl = documentMetaTTL
	}

	key := documentMetaPrefix + doc.ID

	data, err := json.Marshal(doc)
	if err != nil {
		return fmt.Errorf("failed to marshal document metadata: %w", err)
	}

	if err := c.redis.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to cache document metadata: %w", err)
	}

	return nil
}

// InvalidateDocumentMetadata removes document metadata from cache
func (c *KBCache) InvalidateDocumentMetadata(ctx context.Context, docID string) error {
	key := documentMetaPrefix + docID
	return c.redis.Del(ctx, key).Err()
}

// GetKBStats retrieves KB statistics from cache
func (c *KBCache) GetKBStats(ctx context.Context, kbID string) (*repository.KBStats, error) {
	key := kbStatsPrefix + kbID

	data, err := c.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Cache miss
		}
		return nil, fmt.Errorf("failed to get KB stats from cache: %w", err)
	}

	var stats repository.KBStats
	if err := json.Unmarshal(data, &stats); err != nil {
		return nil, fmt.Errorf("failed to unmarshal KB stats: %w", err)
	}

	return &stats, nil
}

// SetKBStats caches KB statistics
func (c *KBCache) SetKBStats(ctx context.Context, kbID string, stats *repository.KBStats, ttl time.Duration) error {
	if ttl == 0 {
		ttl = kbStatsTTL
	}

	key := kbStatsPrefix + kbID

	data, err := json.Marshal(stats)
	if err != nil {
		return fmt.Errorf("failed to marshal KB stats: %w", err)
	}

	if err := c.redis.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to cache KB stats: %w", err)
	}

	return nil
}

// InvalidateKBStats removes KB statistics from cache
func (c *KBCache) InvalidateKBStats(ctx context.Context, kbID string) error {
	key := kbStatsPrefix + kbID
	return c.redis.Del(ctx, key).Err()
}

// InvalidateAllKBData removes all cached data for a KB
func (c *KBCache) InvalidateAllKBData(ctx context.Context, kbID string) error {
	// Delete KB metadata
	if err := c.InvalidateKBMetadata(ctx, kbID); err != nil {
		return err
	}

	// Delete KB stats
	if err := c.InvalidateKBStats(ctx, kbID); err != nil {
		return err
	}

	// Note: We don't delete accessible KBs or permissions here as those are user-specific
	// Those should be invalidated when mounts change

	return nil
}

// InvalidateUserKBAccess removes all KB access caches for a user
// Call this when user's mounts change
func (c *KBCache) InvalidateUserKBAccess(ctx context.Context, tenantID, organizationID, userID string) error {
	// Delete accessible KBs
	if err := c.InvalidateAccessibleKBs(ctx, tenantID, organizationID, userID); err != nil {
		return err
	}

	// Delete all permission caches for this user
	// We need to use a pattern scan since we don't know all KB IDs
	pattern := fmt.Sprintf("%s*:%s:%s:%s", kbPermissionsPrefix, tenantID, organizationID, userID)

	iter := c.redis.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		if err := c.redis.Del(ctx, iter.Val()).Err(); err != nil {
			return fmt.Errorf("failed to delete permission cache: %w", err)
		}
	}

	if err := iter.Err(); err != nil {
		return fmt.Errorf("failed to scan permission caches: %w", err)
	}

	return nil
}
