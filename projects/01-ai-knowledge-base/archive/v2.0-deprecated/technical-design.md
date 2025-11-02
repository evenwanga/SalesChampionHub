# 多租户AI知识库管理平台 - 技术设计文档

**项目**: 01-ai-knowledge-base
**基础框架**: WeKnora (Tencent)
**设计日期**: 2025-10-31
**版本**: v2.0
**重要变更**: 移除租户/用户管理，依赖子项目0（多租户统一用户中心）

---

## 1. 项目概述

### 1.1 项目目标

基于腾讯开源的 **WeKnora** 框架进行二次开发，构建一个支持**多租户**的企业级AI知识库管理平台。

### 1.2 核心价值

- 利用 WeKnora 的成熟文档解析和 RAG 能力
- 专注于知识库核心功能，避免重复开发
- 依赖子项目0（多租户统一用户中心）进行身份认证和权限管理
- 为 SalesChampionHub 生态系统提供知识库基础设施

### 1.3 依赖关系

**上游依赖**:
- **子项目0**: 多租户统一用户中心
  - 租户管理
  - 用户认证（JWT/OAuth2/SSO）
  - 权限管理（RBAC）
  - 租户隔离策略

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
| Web UI | ✅ React | ⚠️ | 需改造为多租户界面 |
| **用户认证** | ⚠️ 基础登录(v0.1.3+) | 🔗 | **由子项目0提供** |
| **多租户** | ❌ | 🔗 | **由子项目0提供** |
| **权限管理** | ❌ | 🔗 | **由子项目0提供** |
| **租户隔离** | ❌ | ⚠️ | **Schema级隔离（本地实现）** |

### 2.2 技术栈

**后端**: Go
**前端**: React
**数据库**: PostgreSQL (pgvector)
**缓存**: Redis (需新增)
**消息队列**: (可选，用于异步任务)

---

## 3. 多租户架构设计

### 3.1 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│               子项目0: 多租户统一用户中心                       │
│  - 租户管理  - 用户管理  - JWT认证  - RBAC权限  - SSO         │
└────────────────────────────┬─────────────────────────────────┘
                             │ API 调用（Token验证、权限校验）
                             ↓
┌──────────────────────────────────────────────────────────────┐
│                    Nginx / API Gateway                        │
│            (路由、限流、Token提取、租户识别)                     │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ↓
┌──────────────────────────────────────────────────────────────┐
│               WeKnora 核心 (多租户扩展)                        │
│  - 知识库 CRUD (基于WeKnora)                                  │
│  - 文档解析与向量化                                            │
│  - 语义检索 (混合检索策略)                                     │
│  - RAG 问答 (思维链模式)                                       │
│  - 租户Schema路由                                             │
└─────────────────────┬────────────────────────────────────────┘
                      │
        ┌─────────────▼───────────────────────┐
        │      数据层 (Schema级租户隔离)       │
        │  ┌───────────────────────────────┐ │
        │  │ PostgreSQL + pgvector         │ │
        │  │ - tenant_{id} Schema隔离      │ │
        │  │ - 知识库表、文档表、向量表      │ │
        │  └───────────────────────────────┘ │
        │  ┌───────────────────────────────┐ │
        │  │ Redis                         │ │
        │  │ - 用户信息缓存（来自子项目0）   │ │
        │  │ - 查询结果缓存                │ │
        │  └───────────────────────────────┘ │
        └───────────────────────────────────┘
```

### 3.2 租户隔离策略

#### 方案选择：**Schema 级隔离** (推荐)

**数据库结构**:
```sql
-- 每个租户一个 Schema
CREATE SCHEMA tenant_001;
CREATE SCHEMA tenant_002;

-- 知识库相关表在各自 Schema 下
tenant_001.knowledge_bases
tenant_001.documents
tenant_001.vectors
tenant_001.query_logs

-- 注意：用户和租户数据在子项目0的数据库中
-- 本项目不存储用户信息
```

**优势**:
- ✅ 数据隔离更彻底
- ✅ 租户间查询性能无影响
- ✅ 数据导出/迁移简单
- ✅ 符合企业数据安全要求

**劣势**:
- ⚠️ Schema 数量有上限（PostgreSQL 支持上千）
- ⚠️ 跨租户查询复杂（但我们不需要）

#### 备选方案：**字段级隔离** (仅作备选)

```sql
-- 单一 Schema，所有表增加 tenant_id
CREATE TABLE knowledge_bases (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    ...
    INDEX idx_tenant (tenant_id)
);
```

### 3.3 租户识别机制

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
4. 提取 `tenant_id` 并路由到对应租户的 Schema
5. 所有数据库操作自动限定在该 Schema

---

## 4. 核心模块设计

### 4.1 子项目0集成模块（用户中心客户端）

#### 用户中心客户端SDK
```go
package usercenter

// 用户中心客户端
type Client struct {
    baseURL    string
    apiKey     string
    httpClient *http.Client
}

// 用户信息（来自子项目0）
type User struct {
    ID       string   `json:"id"`
    TenantID string   `json:"tenant_id"`
    Email    string   `json:"email"`
    Name     string   `json:"name"`
    Roles    []string `json:"roles"`
}

// 租户信息（来自子项目0）
type Tenant struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Status   string `json:"status"`
    Plan     string `json:"plan"`
}

// 核心方法
func (c *Client) VerifyToken(token string) (*User, error)
func (c *Client) CheckPermission(userID, resource, action string) (bool, error)
func (c *Client) GetTenant(tenantID string) (*Tenant, error)
func (c *Client) GetUsersByTenant(tenantID string) ([]User, error)
```

#### 认证中间件（集成子项目0）
```go
// 变更后：调用子项目0验证Token
func AuthMiddleware(c *gin.Context) {
    token := extractToken(c)

    // 远程验证Token
    user, err := userCenterClient.VerifyToken(token)
    if err != nil {
        c.JSON(401, gin.H{"error": "invalid token"})
        c.Abort()
        return
    }

    // 设置租户上下文
    c.Set("tenant_id", user.TenantID)
    c.Set("user_id", user.ID)
    c.Set("roles", user.Roles)

    // 设置数据库Schema
    db.Exec("SET search_path TO ?", "tenant_"+user.TenantID)

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

#### 权限矩阵（由子项目0管理）

知识库相关权限：

| 资源 | 操作 | 权限标识 | Owner | Admin | Editor | Viewer |
|-----|------|---------|-------|-------|--------|--------|
| 知识库 | 创建 | kb:create | ✅ | ✅ | ✅ | ❌ |
| 知识库 | 读取 | kb:read | ✅ | ✅ | ✅ | ✅ |
| 知识库 | 更新 | kb:update | ✅ | ✅ | ✅ | ❌ |
| 知识库 | 删除 | kb:delete | ✅ | ✅ | ❌ | ❌ |
| 文档 | 上传 | doc:upload | ✅ | ✅ | ✅ | ❌ |
| 文档 | 删除 | doc:delete | ✅ | ✅ | ✅ | ❌ |
| 查询 | 搜索 | query:search | ✅ | ✅ | ✅ | ✅ |
| 查询 | 问答 | query:ask | ✅ | ✅ | ✅ | ✅ |

**注意**: 实际权限验证由子项目0执行，本项目只需调用API

### 4.2 WeKnora 扩展模块

#### 4.2.1 知识库管理（扩展）

**原 WeKnora 能力**:
- 文档上传
- 向量化存储
- 语义检索

**需要扩展**:
```go
type KnowledgeBase struct {
    // WeKnora 原有字段
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`

    // 新增多租户字段
    TenantID    string    `json:"tenant_id"`     // 租户隔离
    OwnerID     string    `json:"owner_id"`      // 创建者
    Visibility  string    `json:"visibility"`    // private/shared
    Permissions []string  `json:"permissions"`   // 访问权限
    Tags        []string  `json:"tags"`          // 标签分类
    Quota       KBQuota   `json:"quota"`         // 知识库级配额
}

type KBQuota struct {
    MaxDocuments int `json:"max_documents"`
    MaxSizeMB    int `json:"max_size_mb"`
    UsedDocs     int `json:"used_docs"`
    UsedSizeMB   int `json:"used_size_mb"`
}
```

#### 4.2.2 文档管理（扩展）

```go
type Document struct {
    // WeKnora 原有
    ID           string    `json:"id"`
    FileName     string    `json:"file_name"`
    FileType     string    `json:"file_type"`
    Content      string    `json:"content"`
    VectorID     string    `json:"vector_id"`

    // 新增字段
    TenantID     string    `json:"tenant_id"`
    KnowledgeBaseID string `json:"kb_id"`
    UploaderID   string    `json:"uploader_id"`
    Version      int       `json:"version"`
    Status       string    `json:"status"`  // processing/ready/failed
    Metadata     JSON      `json:"metadata"`
}
```

#### 4.2.3 检索服务（扩展）

**原 WeKnora 检索流程**:
```
Query → 向量化 → 向量检索 → 重排序 → LLM生成答案
```

**多租户检索流程**:
```
Query + TenantID → 租户Schema路由 → 向量化 →
租户内向量检索 → 重排序 → LLM生成答案 → 记录调用量
```

**API 改造**:
```go
// 原 WeKnora API
POST /api/query
{
    "query": "什么是销售技巧?",
    "kb_id": "kb_123"
}

// 多租户 API (自动从 JWT 获取 tenant_id)
POST /api/v1/query
Headers: Authorization: Bearer <jwt_token>
{
    "query": "什么是销售技巧?",
    "kb_id": "kb_123"  // 会自动校验是否属于当前租户
}
```

---

## 5. 数据库设计

**重要说明**:
- 租户和用户数据存储在**子项目0**的数据库中
- 本项目只存储知识库相关数据
- 通过API调用获取租户和用户信息

### 5.1 租户 Schema (tenant_{id})

```sql
-- 每个租户的知识库表
CREATE TABLE tenant_001.knowledge_bases (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id VARCHAR(50),
    visibility VARCHAR(20) DEFAULT 'private',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    quota JSONB,
    settings JSONB
);

-- 文档表 (继承 WeKnora 设计并扩展)
CREATE TABLE tenant_001.documents (
    id VARCHAR(50) PRIMARY KEY,
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id),
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size INT,
    uploader_id VARCHAR(50),
    content TEXT,
    vector_id VARCHAR(255),  -- 向量数据库中的ID
    version INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'processing',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_docs_kb ON tenant_001.documents(kb_id);
CREATE INDEX idx_docs_status ON tenant_001.documents(status);

-- 向量索引表 (WeKnora 使用 pgvector)
CREATE TABLE tenant_001.vectors (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(50) REFERENCES documents(id),
    chunk_index INT,
    chunk_text TEXT,
    embedding vector(1536),  -- 向量维度根据模型调整
    metadata JSONB
);
CREATE INDEX ON tenant_001.vectors USING ivfflat (embedding vector_cosine_ops);

-- 查询历史表 (用于分析和计费)
CREATE TABLE tenant_001.query_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    kb_id VARCHAR(50),
    query_text TEXT,
    result_count INT,
    latency_ms INT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_query_logs_created ON tenant_001.query_logs(created_at);
```

---

## 6. API 设计

**重要说明**:
- 用户认证、租户管理API由**子项目0**提供
- 本项目只提供知识库核心API
- 所有API都需要携带子项目0颁发的JWT Token

### 6.1 知识库 API (扩展 WeKnora)

```bash
# 创建知识库
POST /api/v1/knowledge-bases
{
    "name": "销售培训知识库",
    "description": "销售技巧和话术",
    "tags": ["sales", "training"]
}

# 列出知识库
GET /api/v1/knowledge-bases
Query: ?page=1&size=20&tag=sales

# 上传文档
POST /api/v1/knowledge-bases/:kb_id/documents
Content-Type: multipart/form-data
file: <file>

# 文档列表
GET /api/v1/knowledge-bases/:kb_id/documents

# 删除文档
DELETE /api/v1/knowledge-bases/:kb_id/documents/:doc_id
```

### 6.2 检索与问答 API (扩展 WeKnora)

```bash
# 语义搜索
POST /api/v1/query/search
{
    "kb_id": "kb_123",
    "query": "如何处理客户异议?",
    "top_k": 5,
    "strategy": "hybrid"  // bm25/dense/hybrid/graph
}

Response:
{
    "results": [
        {
            "doc_id": "doc_456",
            "chunk_text": "...",
            "score": 0.92,
            "metadata": {...}
        }
    ]
}

# RAG 问答
POST /api/v1/query/ask
{
    "kb_id": "kb_123",
    "question": "如何处理客户异议?",
    "mode": "chain_of_thought",  // normal/chain_of_thought
    "include_sources": true
}

Response:
{
    "answer": "处理客户异议的关键步骤包括...",
    "sources": [
        {"doc_id": "doc_456", "chunk": "...", "score": 0.92}
    ],
    "reasoning": "..." // 思维链模式下的推理过程
}
```

---

## 7. 二次开发任务清单

### 7.1 基础设施改造

- [ ] 多租户数据库 Schema 设计与初始化脚本
- [ ] Redis 集成（用户缓存、查询缓存）
- [ ] API Gateway / Nginx 配置（租户路由、Token提取）
- [ ] Docker Compose 编排更新

### 7.2 子项目0集成开发 ⭐ 新增

- [ ] 安装/实现子项目0 SDK客户端
- [ ] 配置子项目0 API端点和密钥
- [ ] 实现Token验证中间件（调用子项目0）
- [ ] 实现权限校验中间件（调用子项目0）
- [ ] 租户信息缓存机制（Redis）
- [ ] 降级方案（本地Token缓存验证）

### 7.3 WeKnora 核心扩展

- [ ] 知识库 API 增加租户隔离
- [ ] 文档上传增加权限校验
- [ ] 向量检索增加租户路由
- [ ] 查询日志记录（计费依据）
- [ ] Schema动态切换机制

### 7.4 前端改造

- [ ] 移除本地登录页面（跳转到子项目0）
- [ ] WeKnora 原界面适配多租户
- [ ] Token管理（存储、刷新）
- [ ] 统一错误处理（401跳转登录）

### 7.5 监控与运维

- [ ] 知识库级监控指标
- [ ] API 调用统计
- [ ] 存储使用统计
- [ ] 告警规则配置
- [ ] 与子项目0的健康检查

---

## 8. 技术风险与应对

### 8.1 子项目0依赖风险 ⭐ 新增

**风险**: 子项目0服务故障导致本项目无法使用

**应对**:
- **降级方案**: JWT Token本地缓存验证（短期有效）
- **健康检查**: 实时监控子项目0健康状态
- **熔断机制**: 连续失败后启用降级模式
- **本地缓存**: Redis缓存用户信息和权限（TTL: 5分钟）
- **重试机制**: 失败时自动重试3次

### 8.2 网络延迟风险 ⭐ 新增

**风险**: 调用子项目0 API增加延迟

**应对**:
- **缓存策略**: Redis缓存Token验证结果（减少远程调用）
- **JWT自包含**: Token携带基础信息，减少查询
- **异步验证**: 非关键路径异步校验权限
- **批量接口**: 批量获取用户信息

### 8.3 WeKnora 升级风险

**风险**: WeKnora 官方版本更新可能与我们的改动冲突

**应对**:
- Fork WeKnora 仓库，独立维护
- 定期同步上游更新（cherry-pick 关键修复）
- 将多租户逻辑解耦为独立服务（减少核心代码修改）

### 8.4 性能风险

**风险**: 多租户 Schema 可能影响查询性能

**应对**:
- 每个租户独立 Schema，查询性能不受影响
- Redis 缓存热点数据
- 连接池优化（按租户分配连接）

### 8.5 数据安全风险

**风险**: 租户数据泄露

**应对**:
- Schema 级物理隔离
- API 层强制租户校验
- 审计日志记录所有操作（发送到子项目0）
- 定期安全扫描

---

## 9. 部署架构

### 9.1 Docker Compose 部署

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf"]

  api-gateway:
    build: ./api-gateway
    depends_on: [postgres, redis]

  weknora-core:
    build: ./weknora-core
    environment:
      - TENANT_MODE=true
      - USER_CENTER_URL=http://user-center-api:8080  # 子项目0地址
      - USER_CENTER_API_KEY=${USER_CENTER_API_KEY}

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: knowledge_platform
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  redis:
    image: redis:alpine
    volumes: ["redis_data:/data"]

volumes:
  postgres_data:
  redis_data:
```

### 9.2 生产环境建议

- **容器编排**: Kubernetes
- **数据库**: PostgreSQL 主从 + pgvector
- **缓存**: Redis Cluster
- **对象存储**: MinIO / S3 (文档存储)
- **负载均衡**: Nginx / ALB
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack

---

## 10. 开发计划与里程碑

**重要**: 由于依赖子项目0，总周期从10周缩短到**6-8周**

### Phase 1: 基础设施与集成 (1-2周) ⭐ 缩短1周
- Week 1: 数据库设计、Docker 环境搭建
- Week 1-2: 子项目0 SDK集成、认证中间件开发

### Phase 2: WeKnora 核心扩展 (2-3周)
- Week 2-3: 知识库 API 多租户改造
- Week 3-4: 文档管理扩展
- Week 4-5: 检索服务集成

### Phase 3: 前端与测试 (2周)
- Week 5-6: 前端界面改造（集成子项目0登录）
- Week 6-7: 端到端测试、性能优化
- Week 7-8: 与子项目0联调测试

**总计**: 6-8周 (比原计划减少2周)

---

## 11. 参考资料

- [WeKnora GitHub](https://github.com/Tencent/WeKnora)
- [WeKnora 文档](https://github.com/Tencent/WeKnora/blob/main/README.md)
- [pgvector 文档](https://github.com/pgvector/pgvector)
- [多租户架构最佳实践](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)

---

**文档版本**: v2.0
**创建日期**: 2025-10-31
**更新日期**: 2025-10-31
**负责人**: sale champion hub
**状态**: 已更新（架构优化：依赖子项目0）

**变更历史**:
- v1.0 (2025-10-31): 初始版本，包含完整租户管理
- v2.0 (2025-10-31): 架构优化，移除租户/用户管理，依赖子项目0
