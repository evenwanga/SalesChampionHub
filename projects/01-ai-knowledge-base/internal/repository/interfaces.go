package repository

import (
	"context"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
)

// KBRepositoryInterface defines the interface for knowledge base data operations
type KBRepositoryInterface interface {
	Create(ctx context.Context, kb *models.KnowledgeBase) error
	GetByID(ctx context.Context, kbID string) (*models.KnowledgeBase, error)
	Update(ctx context.Context, kb *models.KnowledgeBase) error
	Delete(ctx context.Context, kbID string) error
	List(ctx context.Context, options ListOptions) ([]*models.KnowledgeBase, int64, error)
	GetUserAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string, limit int) ([]*models.KnowledgeBase, error)
	CountByOwner(ctx context.Context, ownerID string) (int64, error)
}

// MountRepositoryInterface defines the interface for mount operations
type MountRepositoryInterface interface {
	MountToTenant(ctx context.Context, kbID, tenantID, mountedBy string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error)
	MountToOrganization(ctx context.Context, kbID, tenantID, organizationID, mountedBy string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error)
	MountToUser(ctx context.Context, kbID, tenantID, userID, mountedBy string, organizationID *string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error)
	Unmount(ctx context.Context, mountID int64) error
	GetMount(ctx context.Context, mountID int64) (*models.KnowledgeBaseMount, error)
	ListMountsForKB(ctx context.Context, kbID string) ([]*models.KnowledgeBaseMount, error)
	ListMountsForTenant(ctx context.Context, tenantID string) ([]*models.KnowledgeBaseMount, error)
	ListMountsForOrganization(ctx context.Context, organizationID string) ([]*models.KnowledgeBaseMount, error)
	ListMountsForUser(ctx context.Context, userID string) ([]*models.KnowledgeBaseMount, error)
	UpdateMountPermissions(ctx context.Context, mountID int64, permissions models.JSONMap) error
	CheckUserAccess(ctx context.Context, kbID, tenantID, organizationID, userID, requiredPermission string) (bool, error)
	GetUserKBPermissions(ctx context.Context, kbID, tenantID, organizationID, userID string) (models.JSONMap, error)
}

// DocumentRepositoryInterface defines the interface for document operations
type DocumentRepositoryInterface interface {
	GetKBStats(ctx context.Context, kbID string) (*KBStats, error)
}

// Ensure concrete types implement interfaces
var (
	_ KBRepositoryInterface       = (*KBRepository)(nil)
	_ MountRepositoryInterface    = (*MountRepository)(nil)
	_ DocumentRepositoryInterface = (*DocumentRepository)(nil)
)
