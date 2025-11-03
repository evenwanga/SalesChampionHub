package service

import (
	"context"
	"testing"
	"time"

	"github.com/SalesChampionHub/ai-knowledge-base/internal/cache"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/models"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock implementations
type MockKBRepository struct {
	mock.Mock
}

func (m *MockKBRepository) Create(ctx context.Context, kb *models.KnowledgeBase) error {
	args := m.Called(ctx, kb)
	return args.Error(0)
}

func (m *MockKBRepository) GetByID(ctx context.Context, kbID string) (*models.KnowledgeBase, error) {
	args := m.Called(ctx, kbID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.KnowledgeBase), args.Error(1)
}

func (m *MockKBRepository) Update(ctx context.Context, kb *models.KnowledgeBase) error {
	args := m.Called(ctx, kb)
	return args.Error(0)
}

func (m *MockKBRepository) Delete(ctx context.Context, kbID string) error {
	args := m.Called(ctx, kbID)
	return args.Error(0)
}

func (m *MockKBRepository) List(ctx context.Context, options repository.ListOptions) ([]*models.KnowledgeBase, int64, error) {
	args := m.Called(ctx, options)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]*models.KnowledgeBase), args.Get(1).(int64), args.Error(2)
}

func (m *MockKBRepository) GetUserAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string, limit int) ([]*models.KnowledgeBase, error) {
	args := m.Called(ctx, tenantID, organizationID, userID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.KnowledgeBase), args.Error(1)
}

func (m *MockKBRepository) CountByOwner(ctx context.Context, ownerID string) (int64, error) {
	args := m.Called(ctx, ownerID)
	return args.Get(0).(int64), args.Error(1)
}

type MockMountRepository struct {
	mock.Mock
}

func (m *MockMountRepository) MountToTenant(ctx context.Context, kbID, tenantID, mountedBy string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error) {
	args := m.Called(ctx, kbID, tenantID, mountedBy, permissions)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.KnowledgeBaseMount), args.Error(1)
}

func (m *MockMountRepository) MountToOrganization(ctx context.Context, kbID, tenantID, organizationID, mountedBy string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error) {
	args := m.Called(ctx, kbID, tenantID, organizationID, mountedBy, permissions)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.KnowledgeBaseMount), args.Error(1)
}

func (m *MockMountRepository) MountToUser(ctx context.Context, kbID, tenantID, userID, mountedBy string, organizationID *string, permissions models.JSONMap) (*models.KnowledgeBaseMount, error) {
	args := m.Called(ctx, kbID, tenantID, userID, mountedBy, organizationID, permissions)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.KnowledgeBaseMount), args.Error(1)
}

func (m *MockMountRepository) Unmount(ctx context.Context, mountID int64) error {
	args := m.Called(ctx, mountID)
	return args.Error(0)
}

func (m *MockMountRepository) GetMount(ctx context.Context, mountID int64) (*models.KnowledgeBaseMount, error) {
	args := m.Called(ctx, mountID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.KnowledgeBaseMount), args.Error(1)
}

func (m *MockMountRepository) ListMountsForKB(ctx context.Context, kbID string) ([]*models.KnowledgeBaseMount, error) {
	args := m.Called(ctx, kbID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.KnowledgeBaseMount), args.Error(1)
}

func (m *MockMountRepository) ListMountsForTenant(ctx context.Context, tenantID string) ([]*models.KnowledgeBaseMount, error) {
	args := m.Called(ctx, tenantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.KnowledgeBaseMount), args.Error(1)
}

func (m *MockMountRepository) ListMountsForOrganization(ctx context.Context, organizationID string) ([]*models.KnowledgeBaseMount, error) {
	args := m.Called(ctx, organizationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.KnowledgeBaseMount), args.Error(1)
}

func (m *MockMountRepository) ListMountsForUser(ctx context.Context, userID string) ([]*models.KnowledgeBaseMount, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.KnowledgeBaseMount), args.Error(1)
}

func (m *MockMountRepository) UpdateMountPermissions(ctx context.Context, mountID int64, permissions models.JSONMap) error {
	args := m.Called(ctx, mountID, permissions)
	return args.Error(0)
}

func (m *MockMountRepository) CheckUserAccess(ctx context.Context, kbID, tenantID, organizationID, userID, requiredPermission string) (bool, error) {
	args := m.Called(ctx, kbID, tenantID, organizationID, userID, requiredPermission)
	return args.Bool(0), args.Error(1)
}

func (m *MockMountRepository) GetUserKBPermissions(ctx context.Context, kbID, tenantID, organizationID, userID string) (models.JSONMap, error) {
	args := m.Called(ctx, kbID, tenantID, organizationID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(models.JSONMap), args.Error(1)
}

type MockDocumentRepository struct {
	mock.Mock
}

func (m *MockDocumentRepository) GetKBStats(ctx context.Context, kbID string) (*repository.KBStats, error) {
	args := m.Called(ctx, kbID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.KBStats), args.Error(1)
}

type MockKBCache struct {
	mock.Mock
}

func (m *MockKBCache) GetKBMetadata(ctx context.Context, kbID string) (*models.KnowledgeBase, error) {
	args := m.Called(ctx, kbID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.KnowledgeBase), args.Error(1)
}

func (m *MockKBCache) SetKBMetadata(ctx context.Context, kb *models.KnowledgeBase, ttl time.Duration) error {
	args := m.Called(ctx, kb, ttl)
	return args.Error(0)
}

func (m *MockKBCache) InvalidateKBMetadata(ctx context.Context, kbID string) error {
	args := m.Called(ctx, kbID)
	return args.Error(0)
}

func (m *MockKBCache) InvalidateKBStats(ctx context.Context, kbID string) error {
	args := m.Called(ctx, kbID)
	return args.Error(0)
}

func (m *MockKBCache) InvalidateAllKBData(ctx context.Context, kbID string) error {
	args := m.Called(ctx, kbID)
	return args.Error(0)
}

func (m *MockKBCache) InvalidateUserKBAccess(ctx context.Context, tenantID, organizationID, userID string) error {
	args := m.Called(ctx, tenantID, organizationID, userID)
	return args.Error(0)
}

func (m *MockKBCache) GetAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string) ([]*models.KnowledgeBase, error) {
	args := m.Called(ctx, tenantID, organizationID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.KnowledgeBase), args.Error(1)
}

func (m *MockKBCache) SetAccessibleKBs(ctx context.Context, tenantID, organizationID, userID string, kbs []*models.KnowledgeBase, ttl time.Duration) error {
	args := m.Called(ctx, tenantID, organizationID, userID, kbs, ttl)
	return args.Error(0)
}

func (m *MockKBCache) GetKBStats(ctx context.Context, kbID string) (*repository.KBStats, error) {
	args := m.Called(ctx, kbID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.KBStats), args.Error(1)
}

func (m *MockKBCache) SetKBStats(ctx context.Context, kbID string, stats *repository.KBStats, ttl time.Duration) error {
	args := m.Called(ctx, kbID, stats, ttl)
	return args.Error(0)
}

func (m *MockKBCache) GetKBPermissions(ctx context.Context, kbID, tenantID, organizationID, userID string) (models.JSONMap, error) {
	args := m.Called(ctx, kbID, tenantID, organizationID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(models.JSONMap), args.Error(1)
}

// Tests
func TestKBService_CreateKB(t *testing.T) {
	mockKBRepo := new(MockKBRepository)
	mockCache := new(MockKBCache)
	service := NewKBService(mockKBRepo, nil, nil, mockCache, 4)

	ctx := context.Background()

	t.Run("成功创建知识库", func(t *testing.T) {
		req := &CreateKBRequest{
			Name:        "测试知识库",
			Description: "这是一个测试",
			OwnerID:     "user_001",
			Visibility:  "private",
		}

		mockKBRepo.On("Create", ctx, mock.AnythingOfType("*models.KnowledgeBase")).Return(nil).Once()
		mockCache.On("SetKBMetadata", ctx, mock.AnythingOfType("*models.KnowledgeBase"), mock.Anything).Return(nil).Once()

		kb, err := service.CreateKB(ctx, req)
		assert.NoError(t, err)
		assert.NotNil(t, kb)
		assert.Contains(t, kb.ID, "kb_")
		assert.Equal(t, "测试知识库", kb.Name)

		mockKBRepo.AssertExpectations(t)
		mockCache.AssertExpectations(t)
	})

	t.Run("名称为空返回错误", func(t *testing.T) {
		req := &CreateKBRequest{
			OwnerID: "user_001",
		}

		kb, err := service.CreateKB(ctx, req)
		assert.ErrorIs(t, err, ErrInvalidInput)
		assert.Nil(t, kb)
	})

	t.Run("OwnerID为空返回错误", func(t *testing.T) {
		req := &CreateKBRequest{
			Name: "测试",
		}

		kb, err := service.CreateKB(ctx, req)
		assert.ErrorIs(t, err, ErrInvalidInput)
		assert.Nil(t, kb)
	})
}

func TestKBService_GetKB(t *testing.T) {
	mockKBRepo := new(MockKBRepository)
	mockCache := new(MockKBCache)
	service := NewKBService(mockKBRepo, nil, nil, mockCache, 4)

	ctx := context.Background()
	testKB := &models.KnowledgeBase{
		ID:      "kb_test",
		Name:    "测试知识库",
		OwnerID: "user_001",
	}

	t.Run("从缓存获取知识库", func(t *testing.T) {
		mockCache.On("GetKBMetadata", ctx, "kb_test").Return(testKB, nil).Once()

		kb, err := service.GetKB(ctx, "kb_test")
		assert.NoError(t, err)
		assert.Equal(t, "kb_test", kb.ID)

		mockCache.AssertExpectations(t)
	})

	t.Run("缓存未命中从数据库获取", func(t *testing.T) {
		mockCache2 := new(MockKBCache)
		mockKBRepo2 := new(MockKBRepository)
		service2 := NewKBService(mockKBRepo2, nil, nil, mockCache2, 4)

		mockCache2.On("GetKBMetadata", ctx, "kb_test").Return(nil, cache.ErrCacheMiss).Once()
		mockKBRepo2.On("GetByID", ctx, "kb_test").Return(testKB, nil).Once()
		mockCache2.On("SetKBMetadata", ctx, testKB, mock.Anything).Return(nil).Once()

		kb, err := service2.GetKB(ctx, "kb_test")
		assert.NoError(t, err)
		assert.Equal(t, "kb_test", kb.ID)

		mockCache2.AssertExpectations(t)
		mockKBRepo2.AssertExpectations(t)
	})
}

func TestKBService_UpdateKB(t *testing.T) {
	mockKBRepo := new(MockKBRepository)
	mockCache := new(MockKBCache)
	service := NewKBService(mockKBRepo, nil, nil, mockCache, 4)

	ctx := context.Background()
	existingKB := &models.KnowledgeBase{
		ID:      "kb_update",
		Name:    "原始名称",
		OwnerID: "user_001",
	}

	t.Run("成功更新知识库", func(t *testing.T) {
		newName := "新名称"
		req := &UpdateKBRequest{
			Name: &newName,
		}

		mockKBRepo.On("GetByID", ctx, "kb_update").Return(existingKB, nil).Once()
		mockKBRepo.On("Update", ctx, mock.AnythingOfType("*models.KnowledgeBase")).Return(nil).Once()
		mockCache.On("InvalidateKBMetadata", ctx, "kb_update").Return(nil).Once()
		mockCache.On("InvalidateKBStats", ctx, "kb_update").Return(nil).Once()

		kb, err := service.UpdateKB(ctx, "kb_update", req)
		assert.NoError(t, err)
		assert.Equal(t, "新名称", kb.Name)

		mockKBRepo.AssertExpectations(t)
		mockCache.AssertExpectations(t)
	})
}

func TestKBService_MountKBToTenant(t *testing.T) {
	mockMountRepo := new(MockMountRepository)
	mockCache := new(MockKBCache)
	service := NewKBService(nil, mockMountRepo, nil, mockCache, 4)

	ctx := context.Background()

	t.Run("成功挂载到租户", func(t *testing.T) {
		req := &MountKBRequest{
			KBID:      "kb_001",
			TenantID:  "tenant_001",
			MountedBy: "user_admin",
		}

		expectedMount := &models.KnowledgeBaseMount{
			ID:       1,
			KBID:     "kb_001",
			TenantID: &req.TenantID,
		}

		mockMountRepo.On("MountToTenant", ctx, "kb_001", "tenant_001", "user_admin", mock.AnythingOfType("models.JSONMap")).Return(expectedMount, nil).Once()
		mockCache.On("InvalidateAllKBData", ctx, "kb_001").Return(nil).Once()

		mount, err := service.MountKBToTenant(ctx, req)
		assert.NoError(t, err)
		assert.NotNil(t, mount)
		assert.Equal(t, "kb_001", mount.KBID)

		mockMountRepo.AssertExpectations(t)
		mockCache.AssertExpectations(t)
	})

	t.Run("参数不完整返回错误", func(t *testing.T) {
		req := &MountKBRequest{
			KBID:      "kb_001",
			MountedBy: "user_admin",
		}

		mount, err := service.MountKBToTenant(ctx, req)
		assert.ErrorIs(t, err, ErrInvalidInput)
		assert.Nil(t, mount)
	})
}

func TestKBService_GetUserAccessibleKBs(t *testing.T) {
	mockKBRepo := new(MockKBRepository)
	mockCache := new(MockKBCache)
	service := NewKBService(mockKBRepo, nil, nil, mockCache, 4)

	ctx := context.Background()
	testKBs := []*models.KnowledgeBase{
		{ID: "kb_001", Name: "知识库1"},
		{ID: "kb_002", Name: "知识库2"},
	}

	t.Run("从缓存获取可访问知识库", func(t *testing.T) {
		mockCache.On("GetAccessibleKBs", ctx, "tenant_001", "org_001", "user_001").Return(testKBs, nil).Once()

		kbs, err := service.GetUserAccessibleKBs(ctx, "tenant_001", "org_001", "user_001")
		assert.NoError(t, err)
		assert.Len(t, kbs, 2)

		mockCache.AssertExpectations(t)
	})

	t.Run("缓存未命中从数据库获取", func(t *testing.T) {
		mockCache2 := new(MockKBCache)
		mockKBRepo2 := new(MockKBRepository)
		service2 := NewKBService(mockKBRepo2, nil, nil, mockCache2, 4)

		mockCache2.On("GetAccessibleKBs", ctx, "tenant_001", "org_001", "user_001").Return(nil, cache.ErrCacheMiss).Once()
		mockKBRepo2.On("GetUserAccessibleKBs", ctx, "tenant_001", "org_001", "user_001", 4).Return(testKBs, nil).Once()
		mockCache2.On("SetAccessibleKBs", ctx, "tenant_001", "org_001", "user_001", testKBs, mock.Anything).Return(nil).Once()

		kbs, err := service2.GetUserAccessibleKBs(ctx, "tenant_001", "org_001", "user_001")
		assert.NoError(t, err)
		assert.Len(t, kbs, 2)

		mockCache2.AssertExpectations(t)
		mockKBRepo2.AssertExpectations(t)
	})
}
