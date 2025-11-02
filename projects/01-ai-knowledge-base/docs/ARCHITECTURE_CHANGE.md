# 架构变更说明 (v2.0 → v3.0)

**日期**: 2025-11-01
**变更类型**: 重大架构调整
**影响范围**: 数据模型、隔离策略、业务模型

---

## 📋 变更总结

基于业务需求反馈，v3.0版本进行了3项重大架构调整：

1. **租户隔离策略**: Schema级物理隔离 → 字段级逻辑隔离
2. **知识库业务模型**: 租户独占 → 多租户共享资源
3. **子项目0集成深度**: 部分依赖 → 完全依赖（杜绝重复造轮子）

---

## 1. 租户隔离策略变更

### v2.0 方案: Schema级物理隔离

```sql
-- 每个租户独立Schema
CREATE SCHEMA tenant_001;
CREATE SCHEMA tenant_002;

-- 租户数据完全物理隔离
tenant_001.knowledge_bases
tenant_001.documents
tenant_001.vectors

tenant_002.knowledge_bases
tenant_002.documents
tenant_002.vectors
```

**特点**:
- ✅ 安全性最高（物理隔离）
- ✅ 性能最好（无查询干扰）
- ❌ 实现复杂（动态Schema管理）
- ❌ 开发周期长

### v3.0 方案: 字段级逻辑隔离 ⭐ 新方案

```sql
-- 所有租户共用同一套表，通过tenant_id区分
CREATE TABLE knowledge_bases (
    id VARCHAR(50) PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL,
    ...
);

CREATE TABLE tenant_knowledge_bases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,  -- 租户字段
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id),
    ...
);

CREATE TABLE documents (
    id VARCHAR(50) PRIMARY KEY,
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id),
    ...
);

-- 查询时自动过滤
SELECT * FROM tenant_knowledge_bases WHERE tenant_id = 'tenant_001';
```

**特点**:
- ✅ 实现简单（WHERE条件）
- ✅ 开发效率高
- ✅ 灵活性高（支持跨租户分析）
- ⚠️ 需要RLS双重保障
- ✅ 成本更低

**安全保障**:
```sql
-- Row Level Security (RLS) 作为双重保障
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON documents
USING (
    kb_id IN (
        SELECT kb_id FROM tenant_knowledge_bases
        WHERE tenant_id = current_setting('app.current_tenant')::text
    )
);
```

### 变更影响

| 影响维度 | v2.0 | v3.0 | 说明 |
|---------|------|------|------|
| **开发复杂度** | 高 | 中 | 不需要Schema动态管理 |
| **开发周期** | 8周 | 5-6周 | 节省2周 |
| **安全性** | 最高 | 高（RLS保障） | 双重保障 |
| **性能** | 最优 | 优（需索引优化） | 可接受 |
| **灵活性** | 低 | 高 | 支持更多场景 |

---

## 2. 知识库业务模型变更

### v2.0 方案: 租户独占模型

```
租户A
├── 知识库1 (归属租户A)
├── 知识库2 (归属租户A)
└── 知识库3 (归属租户A)

租户B
├── 知识库4 (归属租户B)
└── 知识库5 (归属租户B)

特点: 知识库与租户 1:N 关系，无法共享
```

### v3.0 方案: 知识库资源模型 ⭐ 新方案

```
知识库池（全局资源）
├── KB-1: 销售话术库 (visibility: public)
├── KB-2: 产品知识库 (visibility: shared)
└── KB-3: 内部培训库 (visibility: private)

租户A                          租户B
├── KB-1 (查看权限)            ├── KB-1 (查看权限)
├── KB-2 (编辑权限)            ├── KB-2 (查看权限)
└── KB-3 (所有权)              └── (无法访问)

特点: 知识库与租户 M:N 关系，支持共享
```

**数据模型**:

```sql
-- v3.0: 知识库作为全局资源
CREATE TABLE knowledge_bases (
    id VARCHAR(50) PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL,  -- 创建者
    visibility VARCHAR(20),  -- public/private/shared
    ...
);

-- v3.0: 租户-知识库多对多关系 ⭐ 核心
CREATE TABLE tenant_knowledge_bases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id),
    permissions JSONB,  -- 租户对知识库的权限
    ...
    UNIQUE(tenant_id, kb_id)
);
```

### 查询模型变更

**v2.0**: 单知识库查询
```sql
-- 用户查询时指定一个知识库
SELECT * FROM tenant_001.vectors
WHERE kb_id = 'kb_123'
ORDER BY embedding <=> query_vector
LIMIT 10;
```

**v3.0**: 多知识库联合查询 ⭐ 新能力
```sql
-- 用户查询时自动检索租户下所有知识库
SELECT v.* FROM vectors v
JOIN documents d ON v.document_id = d.id
WHERE d.kb_id IN (
    SELECT kb_id FROM tenant_knowledge_bases
    WHERE tenant_id = 'tenant_001' AND is_active = true
)
ORDER BY v.embedding <=> query_vector
LIMIT 10;
```

### 变更影响

| 影响维度 | v2.0 | v3.0 | 说明 |
|---------|------|------|------|
| **知识库共享** | ❌ 不支持 | ✅ 支持 | 多租户可共享同一知识库 |
| **查询能力** | 单知识库 | 多知识库联合 | 更强大 |
| **协作能力** | 低 | 高 | 支持跨组织协作 |
| **业务灵活性** | 中 | 高 | 多种使用场景 |

---

## 3. 子项目0集成深度变更

### v2.0 方案: 部分依赖

**依赖子项目0**:
- ✅ 用户认证（Token验证）
- ✅ 权限校验（RBAC）
- ⚠️ 租户信息获取

**本地实现**:
- ❌ 租户Schema管理
- ❌ 用户缓存
- ❌ 权限缓存

### v3.0 方案: 完全依赖（杜绝重复造轮子）⭐ 新方案

**完全依赖子项目0**:
- ✅ 租户管理（CRUD、配额、设置）
- ✅ 用户管理（注册、登录、Profile）
- ✅ 用户认证（JWT/OAuth2/OIDC）
- ✅ 权限管理（RBAC、资源权限）
- ✅ 审计日志（统一发送）
- ✅ 组织架构

**本地只管理**:
- ✅ 知识库资源
- ✅ 文档数据
- ✅ 向量数据
- ✅ 查询日志（元数据，详细日志发送到子项目0）

**对比**:

```
v2.0:
子项目1 = 知识库 + 部分租户管理 + 部分用户缓存

v3.0:
子项目1 = 知识库（纯粹）
子项目0 = 租户 + 用户 + 认证 + 权限 + 审计
```

### 变更影响

| 影响维度 | v2.0 | v3.0 | 说明 |
|---------|------|------|------|
| **代码重复** | 有 | 无 | 杜绝重复造轮子 |
| **维护成本** | 高 | 低 | 减少50% |
| **开发时间** | 8周 | 5-6周 | 节省2-3周 |
| **一致性** | 中 | 高 | 统一用户体验 |
| **安全性** | 高 | 高 | 统一安全策略 |

---

## 4. 综合对比

### 数据库对比

**v2.0 数据库结构**:
```
Database: knowledge_platform
├── Schema: tenant_common
│   ├── tenants (租户表)
│   ├── users (用户表)
│   └── ...
├── Schema: tenant_001
│   ├── knowledge_bases
│   ├── documents
│   └── vectors
└── Schema: tenant_002
    ├── knowledge_bases
    ├── documents
    └── vectors
```

**v3.0 数据库结构**:
```
Database: knowledge_platform
└── Schema: public
    ├── knowledge_bases (全局资源)
    ├── tenant_knowledge_bases (M:N关联) ⭐
    ├── documents
    ├── vectors
    └── query_logs

注意: 租户和用户数据在子项目0，不在本地
```

### API对比

**v2.0 API**:
```bash
# 创建知识库（归属当前租户）
POST /api/v1/knowledge-bases

# 查询（单知识库）
POST /api/v1/query/search
Body: { "kb_id": "kb_123", "query": "..." }
```

**v3.0 API** ⭐:
```bash
# 创建知识库（全局资源）
POST /api/v1/knowledge-bases
Body: { "visibility": "public/private/shared" }

# 添加知识库到租户 ⭐ 新增
POST /api/v1/tenants/:tenant_id/knowledge-bases
Body: { "kb_id": "kb_123" }

# 查询（自动联合租户下所有知识库）⭐ 增强
POST /api/v1/query/search
Body: { "query": "..." }  # 不需要指定kb_id
Response: { "results": [...], "kbs_searched": ["kb_001", "kb_002"] }
```

### 开发周期对比

| Phase | v2.0 | v3.0 | 节省 |
|-------|------|------|------|
| Week 1 | 环境搭建 | 环境搭建 + RLS | +1天 |
| Week 2 | 数据库 + 子项目0集成 | 数据库 + 子项目0 SDK | 持平 |
| Week 3 | Schema管理 + 知识库 | 知识库资源管理 | -2天 |
| Week 4 | 文档管理 | 租户-KB关联 | -1天 |
| Week 5 | 检索服务 | 多KB检索 | 持平 |
| Week 6 | 前端 | 前端 | 持平 |
| Week 7 | 测试 | 测试 | -3天 |
| Week 8 | 部署 | (完成) | -7天 |
| **总计** | **8周** | **5-6周** | **2-3周** |

---

## 5. 迁移指南

如果需要从v2.0迁移到v3.0（理论上，实际是直接实施v3.0）：

### 数据库迁移

```sql
-- 1. 创建v3.0表结构
CREATE TABLE knowledge_bases (...);
CREATE TABLE tenant_knowledge_bases (...);
CREATE TABLE documents (...);
CREATE TABLE vectors (...);

-- 2. 迁移数据（如果从v2.0迁移）
-- 知识库数据
INSERT INTO knowledge_bases
SELECT * FROM tenant_001.knowledge_bases
UNION ALL
SELECT * FROM tenant_002.knowledge_bases;

-- 创建租户-知识库关联
INSERT INTO tenant_knowledge_bases (tenant_id, kb_id)
SELECT 'tenant_001', id FROM tenant_001.knowledge_bases
UNION ALL
SELECT 'tenant_002', id FROM tenant_002.knowledge_bases;

-- 3. 启用RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...;
```

---

## 6. 风险与应对

### 风险1: 数据隔离安全性降低

**风险**: 字段级隔离不如Schema级

**应对**:
- ✅ RLS双重保障
- ✅ 中间件强制过滤
- ✅ 代码审查
- ✅ 自动化测试

### 风险2: 多知识库查询性能

**风险**: 联合查询多个知识库可能影响性能

**应对**:
- ✅ 限制数量（≤10个）
- ✅ 索引优化
- ✅ Redis缓存
- ✅ 查询优化

### 风险3: 子项目0深度依赖

**风险**: 单点依赖

**应对**:
- ✅ 降级方案（JWT本地验证）
- ✅ 缓存策略（Redis）
- ✅ 熔断机制
- ✅ 健康检查

---

## 7. 决策记录

| 决策点 | v2.0决策 | v3.0决策 | 变更理由 |
|-------|---------|---------|---------|
| 租户隔离 | Schema级 | 字段级 | 简化实现，降低复杂度 |
| 知识库模型 | 租户独占 | 全局资源 | 支持共享和协作 |
| 查询模型 | 单KB | 多KB联合 | 业务需求 |
| 子项目0集成 | 部分依赖 | 完全依赖 | 杜绝重复造轮子 |
| 安全保障 | Schema隔离 | RLS+字段隔离 | 双重保障 |
| 开发周期 | 8周 | 5-6周 | 架构简化 |

---

## 8. 总结

v3.0架构变更带来显著收益：

✅ **简化**: 字段级隔离比Schema级简单，降低开发复杂度
✅ **灵活**: 知识库资源模型支持共享，提升协作能力
✅ **高效**: 完全依赖子项目0，杜绝重复造轮子
✅ **快速**: 开发周期缩短40%（8周→5-6周）

建议：
1. ✅ 采用v3.0方案
2. ✅ 必须实施RLS
3. ✅ 限制多知识库查询数量
4. ✅ 充分依赖子项目0

---

**文档版本**: v1.0
**日期**: 2025-11-01
**负责人**: SalesChampionHub Team
**状态**: ✅ 架构调整完成，准备实施
