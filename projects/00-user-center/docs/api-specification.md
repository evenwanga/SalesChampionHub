# 用户中心 API 规范

**项目**: 00-user-center
**版本**: v1.0
**协议**: REST API / OAuth 2.1 / OIDC
**基础URL**: `https://user-center.example.com`

---

## 📖 目录

1. [认证流程](#1-认证流程)
2. [核心集成API](#2-核心集成api)
3. [租户管理API](#3-租户管理api)
4. [用户管理API](#4-用户管理api)
5. [错误处理](#5-错误处理)

---

## 1. 认证流程

### 1.1 OAuth 2.1 / OIDC 认证（标准流程）

#### Step 1: 授权请求

```http
GET /oidc/auth HTTP/1.1
Host: user-center.example.com

Parameters:
  response_type: code                      # 固定值
  client_id: <your_app_id>                 # 应用ID
  redirect_uri: <your_callback_url>        # 回调URL
  scope: openid profile email organizations # 请求的权限范围
  state: <random_string>                   # 防CSRF
  organization_id: <tenant_id>             # 可选：指定租户
```

#### Step 2: 用户登录并授权

用户在用户中心完成登录（支持多种方式）：
- 密码登录
- 社交登录（Google, GitHub, etc.）
- SSO 企业登录
- MFA 二次验证

#### Step 3: 授权码返回

```http
HTTP/1.1 302 Found
Location: <callback_url>?code=<authorization_code>&state=<state>
```

#### Step 4: 令牌交换

```http
POST /oidc/token HTTP/1.1
Host: user-center.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<authorization_code>
&redirect_uri=<callback_url>
&client_id=<app_id>
&client_secret=<app_secret>
```

**响应**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "Gf3bVxWaE7Kq9mNpRsTuVwXyZ...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "openid profile email organizations"
}
```

#### Step 5: 令牌刷新

```http
POST /oidc/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=<refresh_token>
&client_id=<app_id>
&client_secret=<app_secret>
```

---

## 2. 核心集成API

**这些API专门供其他子项目调用，用于验证和授权**

### 2.1 Token 验证

**重要**: 每个请求到子项目时，都应该调用此API验证Token

```http
POST /api/v1/auth/verify-token
Content-Type: application/json
Authorization: Bearer <service_api_key>

Request Body:
{
  "token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**成功响应** (200 OK):
```json
{
  "valid": true,
  "user": {
    "id": "user_01hgk3nq8p9r7s6t5u4v3w2x",
    "email": "user@example.com",
    "name": "张三",
    "emailVerified": true
  },
  "organization": {
    "id": "org_tenant_001",
    "name": "XX公司"
  },
  "roles": ["admin"],
  "permissions": [
    "kb:read",
    "kb:write",
    "kb:admin",
    "doc:upload"
  ],
  "expiresAt": "2025-10-31T12:00:00Z"
}
```

**失败响应** (401 Unauthorized):
```json
{
  "error": "invalid_token",
  "error_description": "Token is expired or invalid"
}
```

---

### 2.2 权限检查

```http
POST /api/v1/auth/check-permission
Content-Type: application/json
Authorization: Bearer <service_api_key>

Request Body:
{
  "user_id": "user_01hgk3nq8p9r7s6t5u4v3w2x",
  "organization_id": "org_tenant_001",
  "resource": "kb",      // 资源类型
  "action": "update"     // 操作类型
}
```

**响应**:
```json
{
  "allowed": true,
  "reason": null
}
```

或

```json
{
  "allowed": false,
  "reason": "User does not have 'kb:update' permission"
}
```

---

### 2.3 批量权限检查

```http
POST /api/v1/auth/check-permissions
Content-Type: application/json
Authorization: Bearer <service_api_key>

Request Body:
{
  "user_id": "user_01hgk3nq8p9r7s6t5u4v3w2x",
  "organization_id": "org_tenant_001",
  "checks": [
    { "resource": "kb", "action": "create" },
    { "resource": "kb", "action": "delete" },
    { "resource": "doc", "action": "upload" }
  ]
}
```

**响应**:
```json
{
  "results": {
    "kb:create": true,
    "kb:delete": false,
    "doc:upload": true
  }
}
```

---

### 2.4 获取租户信息

```http
GET /api/v1/tenants/{organization_id}
Authorization: Bearer <service_api_key>
```

**响应**:
```json
{
  "id": "org_tenant_001",
  "name": "XX公司",
  "plan": "pro",
  "status": "active",
  "quota": {
    "maxUsers": 100,
    "maxApplications": 10,
    "maxAPICallsPerDay": 100000,
    "maxStorageGB": 500,
    "features": ["sso", "mfa", "api_access"]
  },
  "usage": {
    "users": 45,
    "applications": 3,
    "apiCallsToday": 12345,
    "storageUsedGB": 123.45
  },
  "createdAt": "2025-01-15T08:30:00Z"
}
```

---

### 2.5 获取用户信息

```http
GET /api/v1/users/{user_id}
Authorization: Bearer <service_api_key>
```

**响应**:
```json
{
  "id": "user_01hgk3nq8p9r7s6t5u4v3w2x",
  "email": "user@example.com",
  "name": "张三",
  "avatar": "https://cdn.example.com/avatars/user_123.jpg",
  "emailVerified": true,
  "phoneVerified": false,
  "mfaEnabled": true,
  "organizations": [
    {
      "id": "org_tenant_001",
      "name": "XX公司",
      "roles": ["admin"],
      "joinedAt": "2025-01-15T08:30:00Z"
    }
  ],
  "createdAt": "2025-01-15T08:30:00Z",
  "lastLoginAt": "2025-10-31T10:15:00Z"
}
```

---

## 3. 租户管理API

### 3.1 创建租户

```http
POST /api/v1/tenants
Content-Type: application/json
Authorization: Bearer <admin_token>

Request Body:
{
  "name": "XX公司",
  "description": "一家科技公司",
  "plan": "pro",
  "admin": {
    "email": "admin@example.com",
    "name": "管理员",
    "password": "SecurePassword123!"
  }
}
```

**响应** (201 Created):
```json
{
  "id": "org_tenant_002",
  "name": "XX公司",
  "plan": "pro",
  "status": "active",
  "admin": {
    "id": "user_abc123",
    "email": "admin@example.com"
  },
  "createdAt": "2025-10-31T12:00:00Z"
}
```

---

### 3.2 更新租户

```http
PUT /api/v1/tenants/{organization_id}
Content-Type: application/json
Authorization: Bearer <owner_token>

Request Body:
{
  "name": "新公司名称",
  "description": "更新后的描述"
}
```

---

### 3.3 获取租户配额和使用情况

```http
GET /api/v1/tenants/{organization_id}/quota
Authorization: Bearer <token>
```

**响应**:
```json
{
  "plan": "pro",
  "quota": {
    "maxUsers": 100,
    "maxAPICallsPerDay": 100000
  },
  "usage": {
    "users": 45,
    "usersPercentage": 45,
    "apiCallsToday": 12345,
    "apiCallsPercentage": 12.3
  },
  "warnings": [
    {
      "type": "approaching_limit",
      "resource": "users",
      "message": "用户数已达配额的80%"
    }
  ]
}
```

---

### 3.4 暂停/恢复租户

```http
POST /api/v1/tenants/{organization_id}/suspend
Content-Type: application/json
Authorization: Bearer <admin_token>

Request Body:
{
  "reason": "逾期未付款"
}
```

```http
POST /api/v1/tenants/{organization_id}/resume
Authorization: Bearer <admin_token>
```

---

## 4. 用户管理API

### 4.1 邀请用户

```http
POST /api/v1/tenants/{organization_id}/invitations
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "email": "newuser@example.com",
  "roles": ["member"],
  "expiresInHours": 72
}
```

**响应**:
```json
{
  "id": "inv_xyz789",
  "email": "newuser@example.com",
  "invitationUrl": "https://user-center.example.com/accept-invitation?token=...",
  "expiresAt": "2025-11-03T12:00:00Z"
}
```

---

### 4.2 分配角色

```http
POST /api/v1/tenants/{organization_id}/users/{user_id}/roles
Content-Type: application/json
Authorization: Bearer <admin_token>

Request Body:
{
  "roles": ["admin", "kb_editor"]
}
```

---

### 4.3 移除用户

```http
DELETE /api/v1/tenants/{organization_id}/users/{user_id}
Authorization: Bearer <admin_token>
```

---

## 5. 错误处理

### 5.1 标准错误格式

```json
{
  "error": "error_code",
  "error_description": "Human readable error message",
  "error_details": {
    "field": "Additional details"
  }
}
```

### 5.2 常见错误码

| HTTP状态码 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | `invalid_request` | 请求参数错误 |
| 401 | `invalid_token` | Token无效或过期 |
| 401 | `unauthorized` | 未认证 |
| 403 | `forbidden` | 无权限 |
| 403 | `quota_exceeded` | 配额超限 |
| 404 | `not_found` | 资源不存在 |
| 409 | `conflict` | 资源冲突（如邮箱已存在）|
| 429 | `rate_limit_exceeded` | 速率限制 |
| 500 | `internal_server_error` | 服务器错误 |

### 5.3 错误示例

```json
{
  "error": "quota_exceeded",
  "error_description": "Maximum number of users reached for this organization",
  "error_details": {
    "resource": "users",
    "current": 100,
    "limit": 100,
    "plan": "pro"
  }
}
```

---

## 6. 权限定义

### 6.1 资源和操作

| 资源类型 | 操作 | 权限标识 | 说明 |
|---------|------|---------|------|
| 组织(org) | 读取 | `org:read` | 查看组织信息 |
| 组织(org) | 更新 | `org:update` | 更新组织设置 |
| 用户(user) | 创建 | `user:create` | 邀请用户 |
| 用户(user) | 读取 | `user:read` | 查看用户列表 |
| 用户(user) | 更新 | `user:update` | 更新用户信息 |
| 用户(user) | 删除 | `user:delete` | 移除用户 |
| 角色(role) | 分配 | `role:assign` | 分配角色 |
| 角色(role) | 撤销 | `role:revoke` | 撤销角色 |

**应用级权限**（由各子项目定义）:

| 应用 | 权限标识 | 说明 |
|------|---------|------|
| 知识库 | `kb:create` | 创建知识库 |
| 知识库 | `kb:read` | 查看知识库 |
| 知识库 | `kb:update` | 更新知识库 |
| 知识库 | `kb:delete` | 删除知识库 |
| 知识库 | `kb:admin` | 知识库管理员权限 |
| 文档 | `doc:upload` | 上传文档 |
| 文档 | `doc:read` | 查看文档 |
| 文档 | `doc:delete` | 删除文档 |
| 查询 | `query:search` | 语义搜索 |
| 查询 | `query:ask` | RAG问答 |

---

## 7. SDK 示例

### 7.1 Go SDK

```go
package main

import (
    "github.com/logto-io/go"
    usercenter "github.com/SalesChampionHub/user-center-sdk-go"
)

func main() {
    // 初始化客户端
    client := usercenter.NewClient(&usercenter.Config{
        Endpoint: "https://user-center.example.com",
        APIKey:   "your_service_api_key",
    })

    // 验证Token
    user, err := client.VerifyToken(ctx, token)
    if err != nil {
        log.Fatal(err)
    }

    // 检查权限
    allowed, err := client.CheckPermission(ctx, &usercenter.PermissionCheck{
        UserID:         user.ID,
        OrganizationID: user.Organization.ID,
        Resource:       "kb",
        Action:         "update",
    })

    if !allowed {
        return errors.New("permission denied")
    }
}
```

### 7.2 TypeScript SDK

```typescript
import { UserCenterClient } from '@saleschampionhub/user-center-sdk';

const client = new UserCenterClient({
  endpoint: 'https://user-center.example.com',
  apiKey: 'your_service_api_key'
});

// 验证Token
const user = await client.verifyToken(token);

// 检查权限
const allowed = await client.checkPermission({
  userId: user.id,
  organizationId: user.organization.id,
  resource: 'kb',
  action: 'update'
});

if (!allowed) {
  throw new Error('Permission denied');
}
```

---

## 8. 集成检查清单

### 8.1 子项目集成步骤

- [ ] 在用户中心注册应用，获取 `client_id` 和 `client_secret`
- [ ] 配置回调URL
- [ ] 实现 OAuth 2.1 认证流程
- [ ] 实现 Token 存储和刷新机制
- [ ] 在每个API请求前调用 `/api/v1/auth/verify-token` 验证
- [ ] 在需要权限检查的地方调用 `/api/v1/auth/check-permission`
- [ ] 处理 Token 过期和错误情况
- [ ] 实现登出流程

### 8.2 安全建议

- ✅ 始终使用 HTTPS
- ✅ 妥善保管 `client_secret` 和 `api_key`
- ✅ Token 使用短期有效期 + 刷新机制
- ✅ 实现 CSRF 防护（state 参数）
- ✅ 缓存 Token 验证结果（5分钟TTL）
- ✅ 实现速率限制
- ✅ 记录审计日志

---

**文档版本**: v1.0
**创建日期**: 2025-10-31
**维护者**: SalesChampionHub Team
**联系方式**: api-support@example.com
