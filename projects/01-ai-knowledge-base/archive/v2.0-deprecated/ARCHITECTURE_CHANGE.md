# 架构变更说明

**变更日期**: 2025-10-31
**变更原因**: 优化生态系统架构，避免重复开发和数据孤岛
**影响范围**: 子项目1 - 多租户AI知识库管理平台

---

## 🔄 架构调整概述

### 变更前

子项目1 包含完整的多租户管理和用户认证能力：
- 租户管理模块
- 用户管理模块
- 认证授权系统
- 知识库管理模块

### 变更后

子项目1 专注于知识库核心能力，依赖统一用户中心：
- ❌ **移除**: 租户管理模块
- ❌ **移除**: 用户管理模块
- ❌ **移除**: 认证授权系统
- ✅ **保留**: 知识库管理核心功能
- ✅ **新增**: 与子项目0的API集成

---

## 📊 新的架构层次

```
┌─────────────────────────────────────────────┐
│  子项目0: 多租户统一用户中心                 │
│  - 租户管理                                 │
│  - 用户管理                                 │
│  - 统一认证 (JWT/OAuth2/SSO)                │
│  - 统一授权 (RBAC)                          │
│  - 租户隔离策略                              │
│  - 审计日志                                 │
└────────────────┬────────────────────────────┘
                 │ 依赖关系
                 ↓
┌─────────────────────────────────────────────┐
│  子项目1: 多租户AI知识库管理平台  (本项目)   │
│  - 知识库 CRUD                              │
│  - 文档解析与向量化 (基于WeKnora)           │
│  - 语义检索                                 │
│  - RAG 问答                                 │
│  - 与子项目0的认证集成                       │
└─────────────────────────────────────────────┘
```

---

## 🔑 关键变更点

### 1. 认证流程变更

#### 变更前（自管理）
```
用户 → 子项目1登录页 → 子项目1验证 → 返回Token → 使用知识库
```

#### 变更后（统一认证）
```
用户 → 子项目0登录 → 子项目0验证 → 返回Token →
子项目1验证Token → 使用知识库
```

### 2. 数据库架构变更

#### 变更前
```sql
-- 子项目1 自己的数据库
knowledge_platform_db
├── tenant_common (公共Schema)
│   ├── tenants 表
│   ├── users 表
│   └── roles 表
└── tenant_{id} (租户Schema)
    ├── knowledge_bases 表
    ├── documents 表
    └── vectors 表
```

#### 变更后
```sql
-- 子项目0 的数据库（用户中心）
user_center_db
├── tenant_common
│   ├── tenants 表
│   ├── users 表
│   └── roles 表
└── tenant_{id}
    └── (用户相关表)

-- 子项目1 的数据库（知识库）
knowledge_platform_db
└── tenant_{id} (租户Schema)
    ├── knowledge_bases 表
    ├── documents 表
    └── vectors 表
```

**关键点**: 租户和用户数据在子项目0，知识库数据在子项目1

### 3. API架构变更

#### 变更前（单体API）
```
子项目1 API Gateway
├── /api/v1/tenants/*        (租户管理)
├── /api/v1/users/*          (用户管理)
├── /api/v1/auth/*           (认证)
└── /api/v1/knowledge-bases/* (知识库)
```

#### 变更后（微服务API）
```
子项目0 API (用户中心)
├── /api/v1/tenants/*
├── /api/v1/users/*
└── /api/v1/auth/*

子项目1 API (知识库)
└── /api/v1/knowledge-bases/*
    (依赖子项目0进行认证和权限校验)
```

---

## 🔧 技术实现变更

### 移除的模块

1. **租户管理服务** (`src/tenant-service/`)
   - 租户 CRUD
   - 租户配额管理
   - Schema 自动创建

2. **用户认证服务** (`src/auth-service/`)
   - JWT 生成/验证
   - 用户登录/注册
   - RBAC 权限系统

3. **数据库表**
   - `tenant_common.tenants`
   - `tenant_common.users`
   - `tenant_common.roles`

### 新增的集成

1. **子项目0 SDK/客户端**
   ```go
   // 新增：用户中心客户端
   package usercenter

   type Client struct {
       baseURL string
       apiKey  string
   }

   // 验证Token
   func (c *Client) VerifyToken(token string) (*User, error)

   // 检查权限
   func (c *Client) CheckPermission(userID, resource, action string) (bool, error)

   // 获取租户信息
   func (c *Client) GetTenant(tenantID string) (*Tenant, error)
   ```

2. **认证中间件改造**
   ```go
   // 变更前：本地验证JWT
   func AuthMiddleware(c *gin.Context) {
       token := extractToken(c)
       claims, err := verifyJWT(token)  // 本地验证
       // ...
   }

   // 变更后：调用子项目0验证
   func AuthMiddleware(c *gin.Context) {
       token := extractToken(c)
       user, err := userCenterClient.VerifyToken(token)  // 远程验证
       // ...
   }
   ```

3. **租户上下文管理**
   ```go
   // 变更前：从本地数据库获取租户
   func SetTenantContext(tenantID string) {
       tenant := db.GetTenant(tenantID)  // 本地查询
       // ...
   }

   // 变更后：从子项目0获取租户
   func SetTenantContext(tenantID string) {
       tenant := userCenterClient.GetTenant(tenantID)  // 远程调用
       // ...
   }
   ```

---

## 📋 更新后的开发计划

### Phase 1: 基础设施 (1周) ← 减少1周

- ~~Week 1: 租户管理开发~~ (已移除)
- Week 1: 子项目0 SDK集成
- Week 1: 数据库设计调整

### Phase 2: 知识库核心 (4-5周)

- Week 2-3: WeKnora 集成与扩展
- Week 4-5: 知识库 API 开发
- Week 5-6: 检索服务实现

### Phase 3: 集成与测试 (1-2周)

- Week 6: 与子项目0集成测试
- Week 7: 端到端测试
- Week 8: 优化与文档

**总周期**: 从 10周 缩短到 **6-8周** ✅

---

## ✅ 优势分析

### 1. 避免重复开发
- ❌ 每个子项目都开发租户管理 (重复8次)
- ✅ 统一用户中心，一次开发，全局复用

### 2. 数据一致性
- ❌ 用户在多个系统中注册
- ✅ 单一用户数据源

### 3. 单点登录（SSO）
- ❌ 每个系统单独登录
- ✅ 登录一次，访问所有系统

### 4. 权限管理
- ❌ 权限分散，难以统一管理
- ✅ 集中权限管理，统一授权

### 5. 审计合规
- ❌ 审计日志分散
- ✅ 统一审计，便于合规

### 6. 开发效率
- ❌ 子项目1开发周期: 10周
- ✅ 子项目1开发周期: 6-8周 (减少20-30%)

---

## 🚀 迁移步骤

### Step 1: 依赖子项目0

等待子项目0完成基础功能：
- 租户管理 API
- 用户管理 API
- JWT 认证 API
- 权限校验 API

### Step 2: 集成子项目0

1. 安装子项目0 SDK
2. 配置 API 端点
3. 实现认证中间件
4. 实现权限校验

### Step 3: 调整数据库

1. 移除用户相关表
2. 保留知识库相关表
3. 调整 Schema 隔离策略

### Step 4: 测试验证

1. 认证流程测试
2. 权限校验测试
3. 跨服务集成测试
4. 性能压测

---

## 📖 相关文档

已更新的文档：
- ✅ [整体架构规划](../../../docs/architecture-planning-discussion.md) - v2.0
- 🔄 [技术设计文档](./technical-design.md) - 待更新
- 🔄 [架构概览](./architecture-overview.md) - 待更新
- 🔄 [开发路线图](./roadmap.md) - 待更新

---

## ❓ 常见问题

**Q: 如果子项目0出现故障，子项目1是否能继续工作？**

A: 需要设计降级方案：
- JWT Token 本地缓存验证（短期有效）
- 子项目0健康检查与熔断机制
- 关键场景的本地权限缓存

**Q: 网络延迟会不会影响性能？**

A: 优化策略：
- Redis 缓存用户信息和权限
- JWT Token 携带基础信息，减少远程调用
- 异步权限校验（非关键路径）

**Q: 多租户隔离是否依然安全？**

A: 安全性不受影响：
- 租户数据依然物理隔离（Schema 级）
- 子项目0统一认证更安全
- 统一审计日志更利于安全监控

---

**文档版本**: v1.0
**创建日期**: 2025-10-31
**作者**: sale champion hub
**状态**: 已确认
