# 多租户AI知识库管理平台 - 技术设计文档

**项目**: 01-ai-knowledge-base
**基础框架**: WeKnora (Tencent)
**设计日期**: 2025-11-01
**版本**: v3.0
**重大变更**:
- 从Schema级物理隔离改为字段级逻辑隔离
- 知识库作为资源模型（支持多租户共享）
- 深度依赖子项目0（杜绝重复造轮子）

---

## 📋 变更说明 (v2.0 → v3.0)

### 核心架构调整

| 调整项 | v2.0 | v3.0 | 理由 |
|-------|------|------|------|
| **租户隔离** | Schema级（`tenant_001`, `tenant_002`） | 字段级（`tenant_id`列） | 简化实现，降低复杂度 |
| **知识库模型** | 归属于租户（1:N） | 作为资源（M:N） | 支持共享，用户可同时利用多个知识库 |
| **查询模式** | 单知识库检索 | 多知识库联合检索 | 业务需求 |
| **数据存储** | 本地存储租户/用户 | 不存储，完全依赖子项目0 | 杜绝重复造轮子 |
| **权限管理** | 部分依赖子项目0 | 完全依赖子项目0 RBAC | 统一权限体系 |

### 收益

- ✅ 开发周期: 8周 → **5-6周**
- ✅ 实现复杂度: 高 → **中**
- ✅ 灵活性: 中 → **高**
- ✅ 代码量: -40%

---

## 1. 项目概述

### 1.1 项目目标

基于腾讯开源的 **WeKnora** 框架进行二次开发，构建一个支持**多租户**的企业级AI知识库管理平台，采用**知识库资源模型**，支持知识库在多个租户间共享和协作。

### 1.2 核心价值

- 利用 WeKnora 的成熟文档解析和 RAG 能力
- 专注于知识库核心功能，避免重复开发
- **完全依赖子项目0**进行租户、用户、认证、权限管理
- 为 SalesChampionHub 生态系统提供知识库基础设施
- **支持知识库共享**，提升协作效率

### 1.3 依赖关系

**上游依赖**:
- **子项目0**: 多租户统一用户中心
  - ✅ 租户管理（CRUD、配额、设置）
  - ✅ 用户管理（注册、登录、Profile）
  - ✅ 用户认证（JWT/OAuth2/OIDC）
  - ✅ 权限管理（RBAC）
  - ✅ 租户隔离策略
  - ✅ 审计日志

**下游服务**:
- 子项目3: 数字人角色构建平台（调用知识库API）
- 其他需要知识库能力的子项目

---

## 2. WeKnora 框架分析

### 2.1 现有能力

| 能力模块 | WeKnora 支持 | 可直接使用 | 备注 |
|---------|-------------|-----------|------|
| 文档解析 | ✅ PDF/Word/Markdown/图像 | ✅ | 核心能力，直接使用 |
| 向量化 | ✅ BGE/GTE/本地模型 | ✅ | 支持多种嵌入模型 |
| 向量数据库 | ✅ PostgreSQL/ES | ✅ | 推荐使用 pgvector |
| LLM 集成 | ✅ Qwen/DeepSeek | ✅ | 支持思维链模式 |
| 混合检索 | ✅ BM25+密集+GraphRAG | ✅ | 先进的检索策略 |
| REST API | ✅ 标准端点 | ⚠️ | 需扩展多租户路由 |
| 知识图谱 | ✅ 文档图谱 | ✅ | 可选能力 |
| Web UI | ✅ React | ⚠️ | 需改造 |
| **用户认证** | ⚠️ 基础登录 | 🔗 | **由子项目0提供** |
| **多租户** | ❌ | ⚠️ | **字段级隔离（本地实现）** |
| **权限管理** | ❌ | 🔗 | **由子项目0提供** |

### 2.2 技术栈

**后端**: Go
**前端**: React
**数据库**: PostgreSQL (pgvector) + RLS
**缓存**: Redis
**消息队列**: (可选，用于异步任务)

---

## 3. 多租户架构设计

### 3.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│            子项目0: 多租户统一用户中心                          │
│  - 租户管理  - 用户管理  - JWT认证  - RBAC权限  - 审计日志     │
└────────────────────────────┬─────────────────────────────────┘
                             │ API 调用（Token验证、权限校验、租户/用户查询）
                             ↓
┌──────────────────────────────────────────────────────────────┐
│                    Nginx / API Gateway                        │
│            (路由、限流、Token提取、租户识别)                     │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ↓
┌──────────────────────────────────────────────────────────────┐
│               WeKnora 核心 (多租户扩展)                        │
│  - 知识库资源管理 (全局)                                       │
│  - 租户-知识库关联管理 (多对多)                                 │
│  - 文档解析与向量化                                            │
│  - 多知识库联合检索                                            │
│  - 多知识库RAG问答                                             │
│  - 租户上下文中间件                                            │
└─────────────────────┬────────────────────────────────────────┘
                      │
        ┌─────────────▼───────────────────────┐
        │      数据层 (字段级租户隔离)         │
        │  ┌───────────────────────────────┐ │
        │  │ PostgreSQL + pgvector + RLS   │ │
        │  │ - knowledge_bases (全局)      │ │
        │  │ - tenant_knowledge_bases (M:N)│ │
        │  │ - documents                   │ │
        │  │ - vectors                     │ │
        │  │ - query_logs                  │ │
        │  └───────────────────────────────┘ │
        │  ┌───────────────────────────────┐ │
        │  │ Redis                         │ │
        │  │ - 用户信息缓存（来自子项目0）   │ │
        │  │ - 租户-知识库关联缓存           │ │
        │  │ - 查询结果缓存                │ │
        │  └───────────────────────────────┘ │
        └───────────────────────────────────┘
```

### 3.2 租户隔离策略 ⭐ 重大调整

#### 方案选择：**字段级逻辑隔离** (v3.0采用)

**数据库结构**:
```sql
-- 所有租户共用同一套表，通过 tenant_id 字段区分
CREATE TABLE knowledge_bases (
    id VARCHAR(50) PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL,  -- 来自子项目0
    visibility VARCHAR(20),          -- public/private/shared
    ...
);

CREATE TABLE tenant_knowledge_bases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,  -- 租户ID（来自子项目0）
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id),
    ...
    UNIQUE(tenant_id, kb_id)
);

CREATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY,
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id),
    ...
);

-- 查询时自动过滤
-- SELECT * FROM tenant_knowledge_bases WHERE tenant_id = ?
-- SELECT * FROM documents WHERE kb_id IN (租户的知识库列表)
```

**优势**:
- ✅ 实现简单（只需WHERE条件）
- ✅ 开发效率高
- ✅ 查询灵活（可跨租户分析）
- ✅ 备份简单
- ✅ 成本更低

**劣势**:
- ⚠️ 隔离性较Schema级弱
- ⚠️ 依赖应用层保证隔离
- ⚠️ 误操作风险（需要RLS双重保障）

**安全保障**:
```sql
-- 启用Row Level Security (RLS) 作为双重保障
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON documents
USING (
    kb_id IN (
        SELECT kb_id FROM tenant_knowledge_bases
        WHERE tenant_id = current_setting('app.current_tenant')::text
    )
);
```

### 3.3 知识库资源模型 ⭐ 核心设计

#### 设计理念

知识库作为**独立资源**存在，可以被添加到一个或多个租户：

```
知识库（全局资源池）
    ├── KB-1: 销售话术库 (public)
    ├── KB-2: 产品知识库 (shared)
    └── KB-3: 内部培训库 (private)

租户A                    租户B
├── KB-1 (查看)          ├── KB-1 (查看)
├── KB-2 (编辑)          ├── KB-2 (查看)
└── KB-3 (所有权)        └── (无法访问 KB-3)

用户查询:
- 租户A用户: 同时检索 KB-1, KB-2, KB-3
- 租户B用户: 同时检索 KB-1, KB-2
```

#### 数据模型

```sql
-- 1. 知识库（全局资源）
CREATE TABLE knowledge_bases (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(50) NOT NULL,  -- 创建者（来自子项目0）
    visibility VARCHAR(20) DEFAULT 'private',
        -- public: 所有租户可见和添加
        -- private: 仅创建者所在租户可见
        -- shared: 通过邀请添加到其他租户
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    settings JSONB DEFAULT '{}'
);

-- 2. 租户-知识库关联（多对多）⭐ 核心表
CREATE TABLE tenant_knowledge_bases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,  -- 租户ID（来自子项目0，不存储实体）
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    added_by VARCHAR(50),  -- 添加者（来自子项目0）
    added_at TIMESTAMP DEFAULT NOW(),
    permissions JSONB DEFAULT '{
        "can_read": true,
        "can_write": false,
        "can_delete": false
    }',
    is_active BOOLEAN DEFAULT true,

    UNIQUE(tenant_id, kb_id),
    INDEX idx_tenant_kb_tenant (tenant_id, is_active),
    INDEX idx_tenant_kb_kb (kb_id)
);
```

### 3.4 租户识别机制

#### JWT Token 方式（由子项目0颁发）
```json
{
  "tenant_id": "tenant_001",
  "user_id": "user_123",
  "roles": ["admin", "editor"],
  "permissions": ["kb:read", "kb:write"],
  "exp": 1234567890,
  "iss": "user-center"  // 颁发者：子项目0
}
```

#### 请求流程
1. 用户在子项目0登录，获取JWT Token
2. 客户端在 Header 携带 JWT: `Authorization: Bearer <token>`
3. 子项目1 API Gateway 调用子项目0验证Token
4. 提取 `tenant_id` 和 `user_id`
5. 设置租户上下文：`SET app.current_tenant = 'tenant_001'`
6. 所有数据库操作自动应用RLS策略

---

## 4. 核心模块设计

### 4.1 子项目0集成模块 ⭐ 完全依赖

#### 用户中心客户端SDK

```go
package usercenter

// 用户中心客户端（唯一的认证/授权/租户/用户来源）
type Client struct {
    baseURL    string
    apiKey     string
    httpClient *http.Client
    cache      *redis.Client  // 缓存
}

// 用户信息（来自子项目0，不存储）
type User struct {
    ID       string   `json:"id"`
    TenantID string   `json:"tenant_id"`
    Email    string   `json:"email"`
    Name     string   `json:"name"`
    Roles    []string `json:"roles"`
}

// 租户信息（来自子项目0，不存储）
type Tenant struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Status   string `json:"status"`
    Plan     string `json:"plan"`
}

// 核心方法（全部调用子项目0 API）
func (c *Client) VerifyToken(token string) (*User, error)
func (c *Client) CheckPermission(userID, resource, action string) (bool, error)
func (c *Client) GetTenant(tenantID string) (*Tenant, error)
func (c *Client) GetUsersByTenant(tenantID string) ([]User, error)
func (c *Client) SendAuditLog(log AuditLog) error  // 发送审计日志
```

#### 认证中间件（集成子项目0）

```go
func AuthMiddleware(c *gin.Context) {
    token := extractToken(c)

    // 1. 尝试从Redis缓存获取（降低延迟）
    cacheKey := "user_token:" + token
    if cachedUser, err := redis.Get(cacheKey); err == nil {
        user := parseUser(cachedUser)
        setUserContext(c, user)
        return
    }

    // 2. 远程验证Token（调用子项目0）
    user, err := userCenterClient.VerifyToken(token)
    if err != nil {
        // 降级：本地JWT验证（短期有效）
        if localUser, err := validateJWTLocally(token); err == nil {
            setUserContext(c, localUser)
            return
        }

        c.JSON(401, gin.H{"error": "invalid token"})
        c.Abort()
        return
    }

    // 3. 缓存用户信息（TTL: 5分钟）
    redis.Set(cacheKey, serializeUser(user), 5*time.Minute)

    // 4. 设置租户和用户上下文
    c.Set("tenant_id", user.TenantID)
    c.Set("user_id", user.ID)
    c.Set("roles", user.Roles)

    // 5. 设置数据库RLS上下文
    db.Exec("SET app.current_tenant = ?", user.TenantID)
    db.Exec("SET app.current_user = ?", user.ID)

    c.Next()
}
```

#### 权限校验中间件

```go
func RequirePermission(resource, action string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetString("user_id")

        // 调用子项目0检查权限
        hasPermission, err := userCenterClient.CheckPermission(
            userID, resource, action,
        )

        if err != nil || !hasPermission {
            c.JSON(403, gin.H{"error": "permission denied"})
            c.Abort()
            return
        }

        c.Next()
    }
}
```

### 4.2 知识库资源管理模块 ⭐ 核心

#### 知识库服务

```go
package kbservice

type KnowledgeBaseService struct {
    db             *gorm.DB
    userCenterSDK  *usercenter.Client
    redis          *redis.Client
}

// 创建知识库
func (s *KnowledgeBaseService) CreateKB(ctx context.Context, req CreateKBRequest) (*KnowledgeBase, error) {
    // 1. 从上下文获取用户信息
    userID := ctx.Value("user_id").(string)
    tenantID := ctx.Value("tenant_id").(string)

    // 2. 创建知识库（全局资源）
    kb := &KnowledgeBase{
        ID:          generateID(),
        Name:        req.Name,
        Description: req.Description,
        OwnerID:     userID,
        Visibility:  req.Visibility,
        Tags:        req.Tags,
    }
    if err := s.db.Create(kb).Error; err != nil {
        return nil, err
    }

    // 3. 自动添加到创建者所在租户
    tkb := &TenantKnowledgeBase{
        TenantID: tenantID,
        KBID:     kb.ID,
        AddedBy:  userID,
        Permissions: map[string]bool{
            "can_read":   true,
            "can_write":  true,
            "can_delete": true,
        },
        IsActive: true,
    }
    if err := s.db.Create(tkb).Error; err != nil {
        return nil, err
    }

    // 4. 发送审计日志到子项目0
    s.userCenterSDK.SendAuditLog(AuditLog{
        TenantID: tenantID,
        UserID:   userID,
        Action:   "kb.create",
        Resource: kb.ID,
    })

    return kb, nil
}

// 列出租户的知识库 ⭐ 核心
func (s *KnowledgeBaseService) ListTenantKBs(ctx context.Context, tenantID string) ([]KnowledgeBase, error) {
    var kbs []KnowledgeBase

    // 查询租户的所有知识库
    err := s.db.
        Joins("JOIN tenant_knowledge_bases tkb ON tkb.kb_id = knowledge_bases.id").
        Where("tkb.tenant_id = ? AND tkb.is_active = true", tenantID).
        Find(&kbs).Error

    return kbs, err
}

// 添加知识库到租户 ⭐ 核心
func (s *KnowledgeBaseService) AddKBToTenant(ctx context.Context, req AddKBToTenantRequest) error {
    userID := ctx.Value("user_id").(string)

    // 1. 检查知识库是否存在和可见性
    kb, err := s.GetKB(ctx, req.KBID)
    if err != nil {
        return err
    }

    // 2. 检查是否可以添加
    if kb.Visibility == "private" {
        // 只有所有者所在租户可以添加私有知识库
        ownerUser, _ := s.userCenterSDK.GetUser(kb.OwnerID)
        if ownerUser.TenantID != req.TenantID {
            return errors.New("cannot add private knowledge base")
        }
    }

    // 3. 添加关联
    tkb := &TenantKnowledgeBase{
        TenantID: req.TenantID,
        KBID:     req.KBID,
        AddedBy:  userID,
        IsActive: true,
    }
    return s.db.Create(tkb).Error
}
```

### 4.3 多知识库检索模块 ⭐ 核心

#### 联合检索服务

```go
package searchservice

type SearchService struct {
    db    *gorm.DB
    redis *redis.Client
}

// 多知识库语义检索 ⭐ 核心功能
func (s *SearchService) Search(ctx context.Context, req SearchRequest) (*SearchResult, error) {
    tenantID := ctx.Value("tenant_id").(string)

    // 1. 获取租户的所有知识库
    var kbIDs []string
    err := s.db.
        Table("tenant_knowledge_bases").
        Where("tenant_id = ? AND is_active = true", tenantID).
        Pluck("kb_id", &kbIDs).Error
    if err != nil {
        return nil, err
    }

    // 2. 限制知识库数量（性能考虑）
    if len(kbIDs) > 10 {
        // 可以根据相关性智能选择，或返回错误
        kbIDs = kbIDs[:10]
    }

    // 3. 查询向量化
    queryVector, err := s.vectorize(req.Query)
    if err != nil {
        return nil, err
    }

    // 4. 在所有知识库中检索
    var results []SearchResultItem
    err = s.db.Raw(`
        SELECT
            v.document_id,
            v.chunk_text,
            v.embedding <=> ? as distance,
            d.kb_id,
            kb.name as kb_name
        FROM vectors v
        JOIN documents d ON v.document_id = d.id
        JOIN knowledge_bases kb ON d.kb_id = kb.id
        WHERE d.kb_id IN (?)
        AND d.status = 'ready'
        ORDER BY distance
        LIMIT ?
    `, pq.Array(queryVector), pq.Array(kbIDs), req.TopK).Scan(&results).Error

    return &SearchResult{
        Results: results,
        KBsSearched: kbIDs,  // 告知用户检索了哪些知识库
    }, err
}

// RAG问答（多知识库） ⭐ 核心功能
func (s *SearchService) Ask(ctx context.Context, req AskRequest) (*AskResult, error) {
    // 1. 多知识库检索
    searchResult, err := s.Search(ctx, SearchRequest{
        Query: req.Question,
        TopK:  5,
    })
    if err != nil {
        return nil, err
    }

    // 2. 构建上下文（来自多个知识库）
    context := buildContext(searchResult.Results)

    // 3. 调用LLM生成答案
    answer, err := s.llm.Generate(LLMRequest{
        Question: req.Question,
        Context:  context,
        Mode:     req.Mode,  // normal/chain_of_thought
    })

    return &AskResult{
        Answer:      answer,
        Sources:     searchResult.Results,
        KBsUsed:     searchResult.KBsSearched,  // 标注使用了哪些知识库
    }, err
}
```

---

## 5. 数据库设计

### 5.1 完整Schema

```sql
-- ==================================================
-- 核心表
-- ==================================================

-- 1. 知识库（全局资源）
CREATE TABLE knowledge_bases (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(50) NOT NULL,  -- 创建者（来自子项目0，不外键）
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'shared')),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    settings JSONB DEFAULT '{}'
);

CREATE INDEX idx_kb_owner ON knowledge_bases(owner_id);
CREATE INDEX idx_kb_visibility ON knowledge_bases(visibility);

-- 2. 租户-知识库关联（多对多）⭐ 核心
CREATE TABLE tenant_knowledge_bases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,  -- 租户ID（来自子项目0，不外键）
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    added_by VARCHAR(50),  -- 添加者（来自子项目0，不外键）
    added_at TIMESTAMP DEFAULT NOW(),
    permissions JSONB DEFAULT '{
        "can_read": true,
        "can_write": false,
        "can_delete": false
    }',
    is_active BOOLEAN DEFAULT true,

    UNIQUE(tenant_id, kb_id)
);

CREATE INDEX idx_tenant_kb_tenant ON tenant_knowledge_bases(tenant_id, is_active);
CREATE INDEX idx_tenant_kb_kb ON tenant_knowledge_bases(kb_id);

-- 3. 文档表
CREATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY,
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size BIGINT,
    uploader_id VARCHAR(50),  -- 上传者（来自子项目0，不外键）
    content TEXT,
    vector_id VARCHAR(255),
    version INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'processing',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_doc_kb ON documents(kb_id);
CREATE INDEX idx_doc_status ON documents(kb_id, status);

-- 4. 向量表
CREATE TABLE vectors (
    id BIGSERIAL PRIMARY KEY,
    document_id VARCHAR(50) REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT,
    chunk_text TEXT,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_vector_doc ON vectors(document_id);
CREATE INDEX ON vectors USING ivfflat (embedding vector_cosine_ops);

-- 5. 查询日志
CREATE TABLE query_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    kb_ids TEXT[],  -- 查询涉及的知识库列表 ⭐
    query_text TEXT,
    query_type VARCHAR(20),
    result_count INT,
    latency_ms INT,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_query_tenant ON query_logs(tenant_id, created_at);

-- 按月分区
CREATE TABLE query_logs_2025_11 PARTITION OF query_logs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- ==================================================
-- Row Level Security (RLS) ⭐ 安全保障
-- ==================================================

-- 启用RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vectors ENABLE ROW LEVEL SECURITY;

-- 文档访问策略
CREATE POLICY tenant_document_access ON documents
USING (
    kb_id IN (
        SELECT kb_id FROM tenant_knowledge_bases
        WHERE tenant_id = current_setting('app.current_tenant', TRUE)::text
        AND is_active = true
    )
);

-- 向量访问策略
CREATE POLICY tenant_vector_access ON vectors
USING (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN tenant_knowledge_bases tkb ON tkb.kb_id = d.kb_id
        WHERE tkb.tenant_id = current_setting('app.current_tenant', TRUE)::text
        AND tkb.is_active = true
    )
);
```

---

## 6. API 设计

### 6.1 知识库资源 API

```bash
# ==================================================
# 知识库管理
# ==================================================

# 创建知识库
POST /api/v1/knowledge-bases
Headers: Authorization: Bearer <token>
Body: {
    "name": "销售话术库",
    "description": "常用销售话术和技巧",
    "visibility": "shared",  # public/private/shared
    "tags": ["sales", "training"]
}

# 列出所有公共知识库
GET /api/v1/knowledge-bases?visibility=public

# ==================================================
# 租户-知识库管理 ⭐ 核心
# ==================================================

# 列出租户的知识库
GET /api/v1/tenants/:tenant_id/knowledge-bases
Response: {
    "knowledge_bases": [
        {
            "id": "kb_001",
            "name": "销售话术库",
            "permissions": {"can_read": true, "can_write": false}
        }
    ]
}

# 添加知识库到租户
POST /api/v1/tenants/:tenant_id/knowledge-bases
Body: {
    "kb_id": "kb_123"
}

# 从租户移除知识库
DELETE /api/v1/tenants/:tenant_id/knowledge-bases/:kb_id

# ==================================================
# 文档管理
# ==================================================

# 上传文档
POST /api/v1/knowledge-bases/:kb_id/documents
Content-Type: multipart/form-data

# ==================================================
# 检索与问答 ⭐ 多知识库联合
# ==================================================

# 语义搜索（自动检索租户下所有知识库）
POST /api/v1/query/search
Body: {
    "query": "如何处理客户异议?",
    "top_k": 5
}
Response: {
    "results": [...],
    "kbs_searched": ["kb_001", "kb_002", "kb_003"]  # 告知检索了哪些知识库
}

# RAG问答（自动利用租户下所有知识库）
POST /api/v1/query/ask
Body: {
    "question": "如何处理客户异议?",
    "mode": "chain_of_thought"
}
Response: {
    "answer": "...",
    "sources": [...],
    "kbs_used": ["kb_001", "kb_002"]  # 告知使用了哪些知识库
}
```

---

## 7. 关键技术实现

### 7.1 租户上下文中间件

```go
func TenantContextMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 从认证中间件获取租户ID
        tenantID := c.GetString("tenant_id")
        userID := c.GetString("user_id")

        // 设置PostgreSQL会话变量（用于RLS）
        db := c.MustGet("db").(*gorm.DB)
        db.Exec("SET app.current_tenant = ?", tenantID)
        db.Exec("SET app.current_user = ?", userID)

        c.Next()
    }
}
```

### 7.2 租户知识库缓存

```go
func (s *KnowledgeBaseService) GetTenantKBIDs(tenantID string) ([]string, error) {
    // 1. 尝试从Redis获取
    cacheKey := fmt.Sprintf("tenant_kbs:%s", tenantID)
    if cached, err := s.redis.Get(cacheKey).Result(); err == nil {
        var kbIDs []string
        json.Unmarshal([]byte(cached), &kbIDs)
        return kbIDs, nil
    }

    // 2. 从数据库查询
    var kbIDs []string
    err := s.db.
        Table("tenant_knowledge_bases").
        Where("tenant_id = ? AND is_active = true", tenantID).
        Pluck("kb_id", &kbIDs).Error
    if err != nil {
        return nil, err
    }

    // 3. 缓存结果（TTL: 10分钟）
    data, _ := json.Marshal(kbIDs)
    s.redis.Set(cacheKey, data, 10*time.Minute)

    return kbIDs, nil
}
```

---

## 8. 部署架构

### 8.1 Docker Compose

```yaml
version: '3.8'

services:
  # PostgreSQL with pgvector
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: knowledge_platform
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: postgres -c shared_preload_libraries=pgaudit

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # API Server
  api-server:
    build: ./src
    environment:
      # 数据库
      DB_HOST: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      # Redis
      REDIS_HOST: redis
      # 子项目0集成 ⭐
      USER_CENTER_API: ${USER_CENTER_API}
      USER_CENTER_API_KEY: ${USER_CENTER_API_KEY}
      LOGTO_ENDPOINT: ${LOGTO_ENDPOINT}
      LOGTO_M2M_APP_ID: ${LOGTO_M2M_APP_ID}
      LOGTO_M2M_APP_SECRET: ${LOGTO_M2M_APP_SECRET}
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

---

## 9. 开发计划

**总周期**: 5-6周

**Week 1**: WeKnora + 数据库 + 子项目0集成测试
**Week 2**: 子项目0 SDK + 中间件
**Week 3**: 知识库资源管理 + 租户-知识库关联
**Week 4**: 多知识库检索 + RAG
**Week 5**: 前端开发
**Week 6**: 测试与部署

---

**文档版本**: v3.0
**创建日期**: 2025-11-01
**负责人**: SalesChampionHub Team
**状态**: 架构重大调整（字段级隔离 + 知识库资源模型）
