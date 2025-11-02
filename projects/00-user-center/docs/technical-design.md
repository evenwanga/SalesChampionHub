# 多租户统一用户中心 - 技术设计文档

**项目**: 00-user-center
**版本**: v1.0
**设计日期**: 2025-10-31
**设计策略**: 基于成熟开源框架定制化开发

---

## 目录

1. [项目概述](#1-项目概述)
2. [开源框架选型](#2-开源框架选型)
3. [技术架构设计](#3-技术架构设计)
4. [核心功能设计](#4-核心功能设计)
5. [数据库设计](#5-数据库设计)
6. [API设计](#6-api设计)
7. [安全设计](#7-安全设计)
8. [部署架构](#8-部署架构)
9. [开发计划](#9-开发计划)

---

## 1. 项目概述

### 1.1 项目定位

多租户统一用户中心是 SalesChampionHub 生态系统的**基础设施层**，为所有8个子项目提供：
- 身份认证（Authentication）
- 访问控制（Authorization）
- 用户管理（User Management）
- 租户管理（Tenant Management）

### 1.2 设计原则

#### 原则1：不重复造轮子
- **基于成熟开源框架**，而非从零开发
- 利用开源社区的最佳实践
- 专注于业务定制化，而非底层实现

#### 原则2：安全第一
- 选择有安全记录和活跃维护的框架
- 遵循行业标准协议（OAuth 2.0, OIDC, SAML）
- 定期安全审计和漏洞修复

#### 原则3：SaaS 原生设计
- 原生多租户支持，而非后期改造
- 支持租户隔离和资源配额
- 支持 SSO 和企业级功能

#### 原则4：开发者友好
- 清晰的 API 设计
- 完善的 SDK 支持
- 易于集成和扩展

---

## 2. 开源框架选型

### 2.1 候选框架对比

经过深入调研，筛选出3个最符合需求的开源框架：

| 维度 | Logto ⭐ | Casdoor | Keycloak |
|------|---------|---------|----------|
| **多租户支持** | ⭐⭐⭐⭐⭐ 原生设计 | ⭐⭐⭐⭐ 组织隔离 | ⭐⭐⭐ Realms有限 |
| **技术栈** | TypeScript/Node.js | Go + React | Java/Quarkus |
| **SaaS 适配性** | ⭐⭐⭐⭐⭐ 专为SaaS设计 | ⭐⭐⭐⭐ 良好 | ⭐⭐⭐ 一般 |
| **开发者体验** | ⭐⭐⭐⭐⭐ 现代化 | ⭐⭐⭐⭐ 良好 | ⭐⭐⭐ 复杂 |
| **协议支持** | OIDC, OAuth 2.1, SAML | OIDC, OAuth 2.0, SAML, LDAP | OIDC, OAuth 2.0, SAML |
| **RBAC/ABAC** | ⭐⭐⭐⭐⭐ 组织级RBAC | ⭐⭐⭐⭐⭐ Casbin集成 | ⭐⭐⭐⭐ 基础RBAC |
| **SSO 支持** | ⭐⭐⭐⭐⭐ 企业SSO | ⭐⭐⭐⭐ 支持 | ⭐⭐⭐⭐⭐ 成熟 |
| **MFA** | ⭐⭐⭐⭐⭐ 支持 | ⭐⭐⭐⭐ 支持 | ⭐⭐⭐⭐⭐ 完善 |
| **UI/管理界面** | ⭐⭐⭐⭐⭐ 现代化 | ⭐⭐⭐ 较旧 | ⭐⭐⭐⭐ 功能完善 |
| **社区活跃度** | ⭐⭐⭐⭐ 10,723 stars | ⭐⭐⭐ ~10,000 stars | ⭐⭐⭐⭐⭐ 29,478 stars |
| **安全记录** | ⭐⭐⭐⭐⭐ 良好 | ⭐⭐⭐ 有历史漏洞 | ⭐⭐⭐⭐⭐ 成熟 |
| **中文支持** | ⭐⭐⭐⭐ 支持 | ⭐⭐⭐⭐⭐ 原生中文 | ⭐⭐⭐ 基础支持 |
| **许可证** | MPL-2.0 | Apache-2.0 | Apache-2.0 |
| **学习曲线** | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐⭐⭐ 中等 | ⭐⭐⭐ 陡峭 |
| **定制化难度** | ⭐⭐⭐⭐ 容易 | ⭐⭐⭐⭐ 容易 | ⭐⭐⭐ 困难 |
| **部署复杂度** | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐⭐⭐ 中等 | ⭐⭐⭐ 复杂 |

### 2.2 详细分析

#### 2.2.1 Logto ⭐ 首选推荐

**官网**: https://logto.io/
**GitHub**: https://github.com/logto-io/logto (10,723 stars)

**核心优势**:
```
✅ 专为现代 SaaS 应用设计
✅ 原生多租户架构（Organizations）
✅ TypeScript 技术栈（与前端统一）
✅ 开发者体验极佳（30+ SDK）
✅ 组织级 RBAC 和成员管理
✅ 企业 SSO 和 Just-in-Time 配置
✅ 现代化的管理界面
✅ 活跃的社区和定期更新
```

**技术亮点**:
- **Multi-tenancy**: "Organization RBAC, member invites, just-in-time provisioning"
- **Framework SDKs**: React, Next.js, Angular, Vue, Flutter, Go, Python等30+
- **Protocols**: OIDC-based, OAuth 2.1, SAML
- **Enterprise**: 企业SSO, MFA, passwordless

**适用场景**:
- ✅ 多租户 SaaS 平台（**完美匹配我们的需求**）
- ✅ 需要快速集成的现代应用
- ✅ 重视开发者体验
- ✅ TypeScript/Node.js 技术栈

**潜在劣势**:
- ⚠️ 相对较新（2021年）
- ⚠️ 社区规模小于 Keycloak
- ⚠️ 企业案例相对较少

**技术栈**:
```
后端: TypeScript/Node.js
前端: React
数据库: PostgreSQL
缓存: Redis
许可: MPL-2.0
```

---

#### 2.2.2 Casdoor

**官网**: https://casdoor.org/
**GitHub**: https://github.com/casdoor/casdoor (~10,000 stars)

**核心优势**:
```
✅ Go 语言（与 WeKnora 技术栈一致）
✅ UI-first 设计，自带管理界面
✅ 集成 Casbin 强大的权限引擎
✅ 中文原生支持
✅ 支持多种认证协议
✅ 前后端分离架构
```

**技术亮点**:
- **Multi-tenancy**: 组织级隔离，支持多组织管理
- **Protocols**: OAuth 2.0, OIDC, SAML, CAS, LDAP, SCIM
- **Permission**: Casbin (RESTful, RBAC, ABAC, priority)
- **Localization**: 10+语言支持

**适用场景**:
- ✅ Go 技术栈项目
- ✅ 需要强大权限系统（Casbin）
- ✅ 中文环境
- ✅ UI 管理界面需求

**潜在劣势**:
- ⚠️ **有历史安全漏洞** (CVE-2022-24124: SQL注入)
- ⚠️ UI 界面较旧
- ⚠️ 文档相对不够完善
- ⚠️ SaaS 多租户设计不如 Logto 原生

**技术栈**:
```
后端: Go
前端: React
数据库: MySQL/PostgreSQL
许可: Apache-2.0
```

---

#### 2.2.3 Keycloak

**官网**: https://www.keycloak.org/
**GitHub**: https://github.com/keycloak/keycloak (29,478 stars)

**核心优势**:
```
✅ 最成熟的开源IAM解决方案
✅ 最大的社区和生态系统
✅ 生产环境验证充分
✅ 功能最全面
✅ 企业级支持（Red Hat）
✅ 安全记录良好
```

**技术亮点**:
- **Maturity**: 2014年至今，最成熟
- **Protocols**: OIDC, OAuth 2.0, SAML 2.0
- **Identity Brokering**: 与外部IdP集成
- **User Federation**: LDAP, Active Directory
- **Admin Console**: 功能强大的管理界面

**适用场景**:
- ✅ 企业级应用
- ✅ 对稳定性要求极高
- ✅ 需要完善的文档和社区支持
- ✅ Java 技术栈

**潜在劣势**:
- ⚠️ **多租户支持有限**（Realms概念不够灵活）
- ⚠️ Java 技术栈（与我们其他项目不一致）
- ⚠️ 部署复杂度较高
- ⚠️ 学习曲线陡峭
- ⚠️ 定制化开发困难

**技术栈**:
```
后端: Java/Quarkus
前端: Java模板引擎
数据库: PostgreSQL/MySQL/MariaDB
许可: Apache-2.0
```

---

### 2.3 选型推荐

#### 🏆 最终推荐：**Logto**

**推荐理由**:

1. **完美匹配需求** ⭐⭐⭐⭐⭐
   - 原生为 SaaS 多租户设计
   - 组织级 RBAC 和成员管理
   - 企业 SSO 和 JIT 配置
   - 与我们的需求100%匹配

2. **技术栈优势** ⭐⭐⭐⭐⭐
   - TypeScript/Node.js 与前端技术栈统一
   - 便于全栈开发和维护
   - 生态系统与 React 完美配合

3. **开发效率** ⭐⭐⭐⭐⭐
   - 30+ SDK，开箱即用
   - 优秀的开发者文档
   - 低学习曲线
   - 快速集成

4. **现代化** ⭐⭐⭐⭐⭐
   - 2025年最新的设计理念
   - 现代化的UI/UX
   - 云原生架构

5. **可扩展性** ⭐⭐⭐⭐
   - 基于 TypeScript，定制化容易
   - 插件系统
   - API-first 设计

**权衡考虑**:
- ⚠️ 社区规模相对较小
- ⚠️ 企业案例较少
- 💡 **建议**: 先进行 POC 验证，确保满足所有需求

#### 备选方案：**Casdoor**

**适用条件**:
- 如果团队更熟悉 Go 语言
- 如果需要 Casbin 的强大权限引擎
- 如果中文支持是关键需求

**注意事项**:
- ⚠️ 必须进行安全审计
- ⚠️ 需要评估历史漏洞的修复情况
- ⚠️ UI 可能需要重新设计

#### 不推荐：**Keycloak**

**原因**:
- 多租户支持不够原生
- Java 技术栈与现有技术栈不一致
- 部署和定制化复杂度高
- 对于我们的 SaaS 场景，过于重量级

---

## 3. 技术架构设计

### 3.1 基于 Logto 的整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                      客户端应用                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 子项目1   │  │ 子项目2   │  │ 子项目3   │  │  ...     │   │
│  │ (知识库)  │  │  (ASR)   │  │ (数字人)  │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────┬───────────────────────────────────────┘
                       │ OAuth 2.1 / OIDC
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                  Logto Core (定制化)                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Authentication Service (认证服务)                      │ │
│  │  - 用户登录/注册                                         │ │
│  │  - JWT Token 生成/验证                                  │ │
│  │  - MFA / Passwordless                                  │ │
│  │  - Social Login (Google, GitHub, etc.)                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Organization Service (组织/租户服务)                   │ │
│  │  - 租户 CRUD                                            │ │
│  │  - 组织成员管理                                         │ │
│  │  - Just-in-Time Provisioning                          │ │
│  │  - 组织级配置                                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Authorization Service (授权服务)                       │ │
│  │  - 组织级 RBAC                                          │ │
│  │  - API 资源权限管理                                     │ │
│  │  - 权限校验 API                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Customization Layer (定制化层) ⭐ 我们开发             │ │
│  │  - 租户配额管理                                         │ │
│  │  - 计费集成                                             │ │
│  │  - 审计日志扩展                                         │ │
│  │  - 业务特定逻辑                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Management Console (管理控制台)                        │ │
│  │  - 租户管理界面                                         │ │
│  │  - 用户管理界面                                         │ │
│  │  - 配置管理                                             │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼─────────┐         ┌─────────▼───────┐
│  PostgreSQL     │         │   Redis         │
│  - 用户数据      │         │   - Token缓存   │
│  - 租户数据      │         │   - Session     │
│  - 权限数据      │         │   - 速率限制     │
└─────────────────┘         └─────────────────┘
```

### 3.2 租户隔离策略

#### 方案：**组织级逻辑隔离**

Logto 原生支持 Organizations（组织），每个组织对应一个租户：

```typescript
// Organization 结构
interface Organization {
  id: string;                    // 组织ID（租户ID）
  name: string;                  // 组织名称
  description: string;           // 描述
  customData: {                  // 自定义数据
    plan: 'free' | 'pro' | 'enterprise';
    quota: {
      maxUsers: number;
      maxApps: number;
      maxAPICallsPerDay: number;
    };
    settings: object;
  };
  createdAt: Date;
  isSuspended: boolean;          // 是否暂停
}
```

#### 隔离级别：
- **用户隔离**: 每个用户属于一个或多个组织
- **权限隔离**: 基于组织的 RBAC
- **数据隔离**: 通过组织 ID 过滤数据
- **配置隔离**: 每个组织独立配置

---

## 4. 核心功能设计

### 4.1 租户管理

#### 4.1.1 租户生命周期

```typescript
// 租户状态机
enum TenantStatus {
  PENDING = 'pending',        // 待激活
  ACTIVE = 'active',          // 活跃
  SUSPENDED = 'suspended',    // 暂停
  ARCHIVED = 'archived'       // 已归档
}

// 租户管理 API
interface TenantManagementAPI {
  // 创建租户
  createTenant(data: CreateTenantDTO): Promise<Tenant>;

  // 获取租户
  getTenant(id: string): Promise<Tenant>;

  // 更新租户
  updateTenant(id: string, data: UpdateTenantDTO): Promise<Tenant>;

  // 暂停租户
  suspendTenant(id: string, reason: string): Promise<void>;

  // 恢复租户
  resumeTenant(id: string): Promise<void>;

  // 删除租户（软删除）
  deleteTenant(id: string): Promise<void>;
}
```

#### 4.1.2 租户配额管理

```typescript
interface TenantQuota {
  maxUsers: number;              // 最大用户数
  maxApplications: number;       // 最大应用数
  maxAPICallsPerDay: number;     // 每日API调用上限
  maxStorageGB: number;          // 存储空间上限
  features: string[];            // 启用的功能列表

  // 使用情况
  usage: {
    users: number;
    applications: number;
    apiCallsToday: number;
    storageUsedGB: number;
  };
}

// 配额检查
async function checkQuota(
  tenantId: string,
  resourceType: string
): Promise<boolean> {
  const quota = await getQuota(tenantId);
  const usage = await getUsage(tenantId);

  switch (resourceType) {
    case 'user':
      return usage.users < quota.maxUsers;
    case 'api_call':
      return usage.apiCallsToday < quota.maxAPICallsPerDay;
    // ...
  }
}
```

---

### 4.2 用户管理

#### 4.2.1 用户注册流程

```typescript
// 用户注册
interface UserRegistration {
  // 基本信息
  email: string;
  password?: string;        // 可选（支持passwordless）
  name: string;
  phone?: string;

  // 所属组织
  organizationId: string;

  // 邀请信息
  invitationToken?: string;

  // 验证
  verificationCode?: string;
}

// 注册流程
async function registerUser(data: UserRegistration): Promise<User> {
  // 1. 验证邮箱
  await verifyEmail(data.email, data.verificationCode);

  // 2. 检查组织配额
  const canAdd = await checkQuota(data.organizationId, 'user');
  if (!canAdd) {
    throw new QuotaExceededError();
  }

  // 3. 创建用户（调用 Logto API）
  const user = await logto.createUser({
    primaryEmail: data.email,
    password: data.password,
    name: data.name,
  });

  // 4. 加入组织
  await logto.addUserToOrganization(user.id, data.organizationId);

  // 5. 分配默认角色
  await logto.assignRole(user.id, 'member', data.organizationId);

  return user;
}
```

#### 4.2.2 用户认证流程

```typescript
// OAuth 2.1 / OIDC 流程

// 1. 授权请求
GET /oidc/auth?
  response_type=code&
  client_id=<app_id>&
  redirect_uri=<callback_url>&
  scope=openid profile email organizations&
  state=<random_state>&
  organization_id=<tenant_id>  // ⭐ 租户标识

// 2. 用户登录并授权

// 3. 授权码返回
GET <callback_url>?
  code=<authorization_code>&
  state=<random_state>

// 4. 令牌交换
POST /oidc/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<authorization_code>&
redirect_uri=<callback_url>&
client_id=<app_id>&
client_secret=<app_secret>

// 5. 获取令牌
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "Gf3bVx...",
  "id_token": "eyJhbGc...",  // 包含用户信息
  "scope": "openid profile email organizations"
}
```

#### 4.2.3 Token 结构

```typescript
// ID Token (JWT)
{
  "iss": "https://user-center.example.com",
  "sub": "user_123",                    // 用户ID
  "aud": "app_client_id",
  "exp": 1699999999,
  "iat": 1699996399,

  // 标准声明
  "email": "user@example.com",
  "email_verified": true,
  "name": "张三",

  // 自定义声明
  "organization_id": "org_tenant_001",  // ⭐ 租户ID
  "organization_roles": ["admin"],      // 组织角色
  "permissions": [                      // 权限列表
    "kb:read",
    "kb:write",
    "kb:admin"
  ]
}
```

---

### 4.3 权限管理

#### 4.3.1 RBAC 模型

```typescript
// 角色定义（基于组织）
interface OrganizationRole {
  name: string;
  description: string;
  permissions: Permission[];
  type: 'predefined' | 'custom';
}

// 预定义角色
const PREDEFINED_ROLES = {
  // 组织级角色
  owner: {
    name: 'Owner',
    description: '组织所有者，拥有所有权限',
    permissions: ['*:*:*']  // 所有资源的所有操作
  },
  admin: {
    name: 'Admin',
    description: '管理员，管理组织设置和成员',
    permissions: [
      'org:read',
      'org:update',
      'user:*',
      'role:*'
    ]
  },
  member: {
    name: 'Member',
    description: '普通成员，基础访问权限',
    permissions: [
      'org:read',
      'user:read'
    ]
  },

  // 应用级角色（由各子项目定义）
  // 例如：知识库管理员
  kb_admin: {
    name: 'Knowledge Base Admin',
    permissions: [
      'kb:create',
      'kb:read',
      'kb:update',
      'kb:delete',
      'doc:*'
    ]
  },
  kb_editor: {
    name: 'Knowledge Base Editor',
    permissions: [
      'kb:read',
      'doc:create',
      'doc:read',
      'doc:update',
      'query:*'
    ]
  },
  kb_viewer: {
    name: 'Knowledge Base Viewer',
    permissions: [
      'kb:read',
      'doc:read',
      'query:search',
      'query:ask'
    ]
  }
};
```

#### 4.3.2 权限校验 API

```typescript
// 权限校验服务
interface PermissionCheckAPI {
  // 检查单个权限
  checkPermission(
    userId: string,
    organizationId: string,
    resource: string,
    action: string
  ): Promise<boolean>;

  // 批量检查权限
  checkPermissions(
    userId: string,
    organizationId: string,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<Record<string, boolean>>;

  // 获取用户的所有权限
  getUserPermissions(
    userId: string,
    organizationId: string
  ): Promise<string[]>;
}

// 使用示例
const canEdit = await permissionAPI.checkPermission(
  'user_123',
  'org_tenant_001',
  'kb',
  'update'
);

if (!canEdit) {
  throw new ForbiddenError('No permission to edit knowledge base');
}
```

---

## 5. 数据库设计

### 5.1 数据模型

Logto 原生数据表 + 自定义扩展表

#### 5.1.1 Logto 原生表（不需要创建）

```sql
-- 用户表（Logto管理）
users (
  id,
  username,
  primary_email,
  primary_phone,
  password_encrypted,
  name,
  avatar,
  created_at,
  updated_at
)

-- 组织表（Logto管理）
organizations (
  id,
  name,
  description,
  custom_data,  -- JSONB，存储我们的扩展字段
  created_at,
  is_suspended
)

-- 组织成员关系（Logto管理）
organization_users (
  organization_id,
  user_id,
  joined_at
)

-- 组织角色（Logto管理）
organization_roles (
  id,
  organization_id,
  name,
  description
)

-- 组织用户角色关系（Logto管理）
organization_user_roles (
  organization_id,
  user_id,
  role_id
)
```

#### 5.1.2 自定义扩展表

```sql
-- 租户配额表
CREATE TABLE tenant_quotas (
  organization_id VARCHAR(21) PRIMARY KEY,  -- 关联 Logto organization.id
  plan VARCHAR(20) NOT NULL DEFAULT 'free',  -- free/pro/enterprise

  -- 配额限制
  max_users INT NOT NULL DEFAULT 10,
  max_applications INT NOT NULL DEFAULT 5,
  max_api_calls_per_day INT NOT NULL DEFAULT 10000,
  max_storage_gb INT NOT NULL DEFAULT 10,

  -- 启用功能
  features JSONB DEFAULT '[]',  -- ['sso', 'mfa', 'audit_log']

  -- 使用情况（定期更新）
  current_users INT DEFAULT 0,
  current_applications INT DEFAULT 0,
  api_calls_today INT DEFAULT 0,
  storage_used_gb DECIMAL(10,2) DEFAULT 0,

  -- 计费信息
  billing_cycle VARCHAR(20),  -- monthly/yearly
  next_billing_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 租户设置表
CREATE TABLE tenant_settings (
  organization_id VARCHAR(21) PRIMARY KEY,

  -- 品牌定制
  logo_url TEXT,
  primary_color VARCHAR(7),
  custom_domain VARCHAR(255),

  -- 安全设置
  password_policy JSONB,       -- 密码策略
  session_timeout_minutes INT DEFAULT 60,
  mfa_required BOOLEAN DEFAULT false,

  -- 通知设置
  notification_email VARCHAR(255),
  webhook_url TEXT,

  -- 其他设置
  settings JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API调用日志（审计）
CREATE TABLE api_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id VARCHAR(21) NOT NULL,
  user_id VARCHAR(21) NOT NULL,

  -- 请求信息
  method VARCHAR(10),
  path TEXT,
  query_params JSONB,
  request_body JSONB,

  -- 响应信息
  status_code INT,
  response_time_ms INT,

  -- 元数据
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),

  -- 索引
  INDEX idx_org_time (organization_id, timestamp DESC),
  INDEX idx_user_time (user_id, timestamp DESC)
);

-- 用户登录历史
CREATE TABLE login_history (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(21) NOT NULL,
  organization_id VARCHAR(21),

  -- 登录信息
  login_method VARCHAR(50),  -- password/sso/social
  success BOOLEAN,
  failure_reason TEXT,

  -- 设备信息
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  location VARCHAR(255),

  timestamp TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_time (user_id, timestamp DESC)
);

-- 租户计费记录
CREATE TABLE billing_records (
  id BIGSERIAL PRIMARY KEY,
  organization_id VARCHAR(21) NOT NULL,

  -- 计费周期
  billing_period_start DATE,
  billing_period_end DATE,

  -- 金额
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'CNY',

  -- 状态
  status VARCHAR(20),  -- pending/paid/overdue

  -- 使用量
  usage_stats JSONB,  -- 详细使用统计

  -- 支付信息
  payment_method VARCHAR(50),
  paid_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 扩展 custom_data 字段

利用 Logto 的 `organizations.custom_data` 存储业务数据：

```typescript
// 组织的 custom_data 结构
interface OrganizationCustomData {
  // 计划和配额
  plan: 'free' | 'pro' | 'enterprise';
  quota: {
    maxUsers: number;
    maxApplications: number;
    maxAPICallsPerDay: number;
    maxStorageGB: number;
  };

  // 业务信息
  industry?: string;
  companySize?: string;
  country?: string;

  // 功能开关
  features: string[];  // ['sso', 'mfa', 'api_access']

  // 状态
  status: 'trial' | 'active' | 'suspended' | 'archived';
  trialEndsAt?: string;

  // 联系人
  billingContact?: {
    name: string;
    email: string;
    phone?: string;
  };

  // 其他元数据
  metadata?: Record<string, any>;
}
```

---

## 6. API设计

### 6.1 API 端点设计

#### 6.1.1 认证 API

```typescript
// 基于 OIDC 标准端点（Logto 提供）

// 授权端点
GET /oidc/auth

// 令牌端点
POST /oidc/token

// 用户信息端点
GET /oidc/me

// 令牌撤销
POST /oidc/token/revocation

// 登出
POST /oidc/session/end
```

#### 6.1.2 租户管理 API（自定义）

```typescript
// 租户 CRUD
POST   /api/v1/tenants              // 创建租户
GET    /api/v1/tenants/:id          // 获取租户信息
PUT    /api/v1/tenants/:id          // 更新租户
DELETE /api/v1/tenants/:id          // 删除租户（软删除）
GET    /api/v1/tenants              // 列出租户（系统管理员）

// 租户配额
GET    /api/v1/tenants/:id/quota    // 获取配额和使用情况
PUT    /api/v1/tenants/:id/quota    // 更新配额（系统管理员）

// 租户设置
GET    /api/v1/tenants/:id/settings
PUT    /api/v1/tenants/:id/settings

// 租户成员
GET    /api/v1/tenants/:id/members
POST   /api/v1/tenants/:id/members/invite
DELETE /api/v1/tenants/:id/members/:userId
```

#### 6.1.3 用户管理 API（基于 Logto + 扩展）

```typescript
// 用户 CRUD（Logto 提供 + 我们扩展）
POST   /api/v1/users                // 创建用户
GET    /api/v1/users/:id            // 获取用户
PUT    /api/v1/users/:id            // 更新用户
DELETE /api/v1/users/:id            // 删除用户
GET    /api/v1/users                // 列出用户（租户范围）

// 用户角色管理
GET    /api/v1/users/:id/roles
POST   /api/v1/users/:id/roles      // 分配角色
DELETE /api/v1/users/:id/roles/:roleId

// 用户组织
GET    /api/v1/users/:id/organizations
```

#### 6.1.4 权限校验 API（重要！）

```typescript
// Token验证（供其他子项目调用）
POST /api/v1/auth/verify-token
Request:
{
  "token": "eyJhbGc..."
}
Response:
{
  "valid": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "张三"
  },
  "organization": {
    "id": "org_tenant_001",
    "name": "XX公司"
  },
  "roles": ["admin"],
  "permissions": ["kb:read", "kb:write", "kb:admin"]
}

// 权限检查（供其他子项目调用）
POST /api/v1/auth/check-permission
Request:
{
  "user_id": "user_123",
  "organization_id": "org_tenant_001",
  "resource": "kb",
  "action": "update"
}
Response:
{
  "allowed": true
}

// 批量权限检查
POST /api/v1/auth/check-permissions
Request:
{
  "user_id": "user_123",
  "organization_id": "org_tenant_001",
  "checks": [
    { "resource": "kb", "action": "create" },
    { "resource": "kb", "action": "delete" },
    { "resource": "doc", "action": "upload" }
  ]
}
Response:
{
  "results": {
    "kb:create": true,
    "kb:delete": false,
    "doc:upload": true
  }
}
```

#### 6.1.5 租户信息 API（供其他子项目调用）

```typescript
// 获取租户信息
GET /api/v1/tenants/:id
Response:
{
  "id": "org_tenant_001",
  "name": "XX公司",
  "plan": "pro",
  "status": "active",
  "quota": {
    "maxUsers": 100,
    "maxAPICallsPerDay": 100000,
    "features": ["sso", "mfa", "api_access"]
  },
  "usage": {
    "users": 45,
    "apiCallsToday": 12345
  }
}

// 获取用户信息
GET /api/v1/users/:id
Response:
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "张三",
  "organizations": [
    {
      "id": "org_tenant_001",
      "roles": ["admin"]
    }
  ]
}
```

---

## 7. 安全设计

### 7.1 安全策略

#### 7.1.1 密码策略

```typescript
interface PasswordPolicy {
  minLength: number;              // 最小长度
  requireUppercase: boolean;      // 需要大写字母
  requireLowercase: boolean;      // 需要小写字母
  requireNumbers: boolean;        // 需要数字
  requireSpecialChars: boolean;   // 需要特殊字符
  preventCommonPasswords: boolean;// 防止常见密码
  passwordExpireDays: number;     // 密码过期天数
  preventReuseCount: number;      // 防止重复使用次数
}

// 默认策略
const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  preventCommonPasswords: true,
  passwordExpireDays: 90,
  preventReuseCount: 5
};
```

#### 7.1.2 多因素认证 (MFA)

```typescript
// MFA 配置
interface MFAConfig {
  enabled: boolean;
  methods: Array<'totp' | 'sms' | 'email'>;
  required: boolean;              // 是否强制
  gracePeriodDays: number;        // 宽限期
}

// 启用 MFA
POST /api/v1/users/:id/mfa/enable
Request:
{
  "method": "totp"  // Time-based One-Time Password
}
Response:
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,..."
}

// 验证 MFA
POST /api/v1/users/:id/mfa/verify
Request:
{
  "code": "123456"
}
```

#### 7.1.3 速率限制

```typescript
// API 速率限制策略
const RATE_LIMITS = {
  // 认证相关（严格限制，防止暴力破解）
  'POST /api/v1/auth/login': {
    points: 5,
    duration: 300  // 5分钟内最多5次
  },
  'POST /api/v1/auth/verify-token': {
    points: 100,
    duration: 60  // 1分钟内最多100次
  },

  // 一般 API
  'default': {
    points: 1000,
    duration: 60  // 1分钟内最多1000次
  }
};
```

#### 7.1.4 审计日志

```typescript
// 审计事件类型
enum AuditEventType {
  // 认证
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_LOGIN_FAILED = 'user.login.failed',

  // 用户管理
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',

  // 租户管理
  TENANT_CREATED = 'tenant.created',
  TENANT_UPDATED = 'tenant.updated',
  TENANT_SUSPENDED = 'tenant.suspended',

  // 权限
  ROLE_ASSIGNED = 'role.assigned',
  ROLE_REVOKED = 'role.revoked',
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_DENIED = 'permission.denied',

  // 敏感操作
  SETTINGS_CHANGED = 'settings.changed',
  MFA_ENABLED = 'mfa.enabled',
  PASSWORD_CHANGED = 'password.changed'
}

// 审计日志结构
interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;

  actor: {
    userId: string;
    ip: string;
    userAgent: string;
  };

  target: {
    resourceType: string;
    resourceId: string;
  };

  organization: {
    id: string;
    name: string;
  };

  details: object;  // 详细信息
  result: 'success' | 'failure';
}
```

---

## 8. 部署架构

### 8.1 Docker Compose 部署

```yaml
version: '3.8'

services:
  # Logto 核心服务
  logto:
    image: ghcr.io/logto-io/logto:latest
    ports:
      - "3001:3001"  # 核心服务
      - "3002:3002"  # 管理控制台
    environment:
      - DB_URL=postgresql://postgres:password@postgres:5432/logto
      - ENDPOINT=https://user-center.example.com
      - ADMIN_ENDPOINT=https://user-center-admin.example.com
    depends_on:
      - postgres
      - redis
    networks:
      - user_center_network

  # 自定义扩展服务
  custom-api:
    build: ./custom-api
    ports:
      - "3003:3003"
    environment:
      - LOGTO_ENDPOINT=http://logto:3001
      - DB_URL=postgresql://postgres:password@postgres:5432/logto
      - REDIS_URL=redis://redis:6379
    depends_on:
      - logto
      - postgres
      - redis
    networks:
      - user_center_network

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: logto
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - user_center_network

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - user_center_network

  # Nginx (反向代理)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - logto
      - custom-api
    networks:
      - user_center_network

volumes:
  postgres_data:
  redis_data:

networks:
  user_center_network:
    driver: bridge
```

### 8.2 Kubernetes 部署（生产环境）

```yaml
# logto-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logto
spec:
  replicas: 3
  selector:
    matchLabels:
      app: logto
  template:
    metadata:
      labels:
        app: logto
    spec:
      containers:
      - name: logto
        image: ghcr.io/logto-io/logto:latest
        ports:
        - containerPort: 3001
        - containerPort: 3002
        env:
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: logto-secrets
              key: db-url
        - name: ENDPOINT
          value: "https://user-center.example.com"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5

---
# logto-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: logto
spec:
  selector:
    app: logto
  ports:
  - name: core
    port: 3001
    targetPort: 3001
  - name: admin
    port: 3002
    targetPort: 3002
  type: ClusterIP

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: logto-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - user-center.example.com
    - user-center-admin.example.com
    secretName: logto-tls
  rules:
  - host: user-center.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: logto
            port:
              number: 3001
  - host: user-center-admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: logto
            port:
              number: 3002
```

---

## 9. 开发计划

### 9.1 Phase 0: 框架验证 (1-2周)

#### Week 1: POC 开发
- [ ] Logto 本地部署
- [ ] 创建测试组织和用户
- [ ] 测试 OIDC 认证流程
- [ ] 测试组织级 RBAC
- [ ] 验证多租户隔离

#### Week 2: 技术评审
- [ ] POC 演示
- [ ] 技术方案评审
- [ ] 确定最终选型
- [ ] 确定定制化范围

### 9.2 Phase 1: 核心功能 (4-6周)

#### Week 3-4: 租户管理
- [ ] 基于 Logto Organizations 实现租户 CRUD
- [ ] 扩展 custom_data 存储业务字段
- [ ] 实现租户配额系统
- [ ] 租户状态管理

#### Week 5-6: 用户管理
- [ ] 用户注册/登录流程
- [ ] 邮件验证
- [ ] 密码策略实现
- [ ] 用户信息管理

#### Week 7: 权限系统
- [ ] 定义预置角色
- [ ] 实现权限校验 API
- [ ] 与 Logto RBAC 集成
- [ ] 权限管理界面

#### Week 8: API 开发
- [ ] Token 验证 API
- [ ] 权限检查 API
- [ ] 租户信息 API
- [ ] API 文档

### 9.3 Phase 2: 高级功能 (3-4周)

#### Week 9: SSO 集成
- [ ] SAML 配置
- [ ] OIDC 联邦
- [ ] 企业 IdP 集成

#### Week 10: MFA
- [ ] TOTP 实现
- [ ] SMS/Email 验证
- [ ] MFA 管理界面

#### Week 11: 审计日志
- [ ] 审计日志系统
- [ ] 日志查询 API
- [ ] 合规报告

#### Week 12: 管理后台
- [ ] 租户管理界面
- [ ] 用户管理界面
- [ ] 配额和统计仪表板

### 9.4 Phase 3: 测试与优化 (2周)

#### Week 13: 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] 安全测试（OWASP）
- [ ] 性能测试

#### Week 14: 优化与部署
- [ ] 性能优化
- [ ] 文档完善
- [ ] 生产环境部署
- [ ] 监控告警配置

**总计**: 12-14周

---

## 10. 成本分析

### 10.1 开发成本

#### 方案对比

| 成本项 | 完全自研 | 基于 Keycloak | 基于 Logto ⭐ |
|-------|---------|--------------|--------------|
| 基础框架学习 | 0周 | 2-3周 | 1周 |
| 核心功能开发 | 8-10周 | 4-5周 | 2-3周 |
| 多租户改造 | 3-4周 | 3-4周 | 1周（原生） |
| 测试与优化 | 2-3周 | 2周 | 1-2周 |
| **总计** | **13-17周** | **11-14周** | **5-7周** ⭐ |

### 10.2 运维成本

- **Logto**: 轻量级，资源占用少
- **Keycloak**: 较重，需要更多资源

### 10.3 维护成本

- **Logto**: 定期更新，社区活跃
- **自研**: 全部自己维护

---

## 11. 风险与应对

### 11.1 技术风险

#### 风险1: Logto 功能不满足需求
**可能性**: 中
**影响**: 高
**应对**:
- 先进行 POC 验证
- 评估定制化难度
- 准备 Plan B（Casdoor 或自研）

#### 风险2: 社区支持不足
**可能性**: 低
**影响**: 中
**应对**:
- 加入社区，积极反馈
- 必要时付费支持
- 自己贡献代码

#### 风险3: 性能问题
**可能性**: 低
**影响**: 高
**应对**:
- 充分的性能测试
- Redis 缓存优化
- 水平扩展

### 11.2 项目风险

#### 风险1: 其他子项目等待时间长
**影响**: 阻塞其他项目
**应对**:
- 优先完成 MVP
- 分阶段交付
- 提供 Mock API

---

## 12. 总结与建议

### 12.1 推荐方案

**✅ 推荐基于 Logto 开发**

**理由**:
1. 原生多租户，完美匹配需求
2. 现代化技术栈，开发效率高
3. SaaS 原生设计，功能完善
4. 开发周期最短（5-7周 vs 11-14周）
5. 定制化容易

### 12.2 实施建议

**建议1: 先 POC，再决策**
- 1周内完成 POC
- 验证核心需求
- 评估风险

**建议2: 分阶段交付**
- Phase 1 完成后即可供其他项目集成
- 不必等待所有功能

**建议3: 做好文档**
- API 文档要详细
- 集成指南要清晰
- 便于其他团队使用

---

**文档版本**: v1.0
**创建日期**: 2025-10-31
**负责人**: SalesChampionHub Team
**状态**: 待评审
