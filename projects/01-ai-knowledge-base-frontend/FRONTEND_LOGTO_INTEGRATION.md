# 前端 Logto 集成完成指南

## 集成概述

本文档描述了 AI 知识库管理平台前端与 Logto 的集成实现，使前端能够正常登录并访问后端 API。

**完成时间**: 2025-11-11
**集成状态**: ✅ 代码更新完成，待测试验证
**参考文档**: 基于 [Logto 官方文档](https://docs.logto.io) 更新，确保技术准确性

---

## Logto 核心概念 (必读)

基于 [Logto RBAC 官方文档](https://docs.logto.io/zh-CN/authorization/role-based-access-control)

### API Resource (API 资源)

**定义**: API Resource 代表需要保护的后端服务端点或微服务，使用 **绝对 URI** 作为唯一标识符（遵循 RFC 8707 规范）。

**示例**: `https://api.saleschampionhub.com/kb`

**关键特性**:
- 每个 API Resource 有独立的权限（Permissions/Scopes）定义
- Access Token 的 `aud` (audience) claim 必须匹配 API Resource Identifier
- 支持配置 Token 过期时间（默认 3600 秒）

### Permissions / Scopes (权限)

**定义**: Permissions 和 Scopes 在 Logto 中是**完全等价**的概念，表示对 API Resource 的具体操作权限。

**示例**: `read`, `write`, `delete`, `admin`

**重要规则**:
- ⚠️ **必须精确匹配**：Logto 不支持通配符或前缀匹配
  - ❌ 错误：请求 `["read"]` 不会匹配 `read:products` 权限
  - ✅ 正确：请求 `["read:products"]` 才能匹配 `read:products` 权限
- 权限名称必须与 Logto Admin Console 中定义的完全一致

### Roles (角色)

**定义**: Role 是权限的命名集合，用于简化权限管理。

**示例**: `admin`, `viewer`, `billing-manager`

**三种 RBAC 模型**:
1. **Global API Resources** - 所有用户共享同一个 API，全局角色控制访问
2. **Organization Permissions** - 非 API 功能，由组织特定角色控制
3. **Organization-Level API Resources** - 多租户场景，每个组织有独立数据

### Token 类型详解

#### 1. ID Token
- **用途**: 用户身份验证，包含用户 profile 信息
- **Audience**: SPA Application ID
- **获取**: 登录成功后自动获取
- **不适用于**: 后端 API 调用（`aud` 不匹配）

#### 2. Access Token (UserInfo Endpoint)
- **用途**: 访问 Logto 的 UserInfo Endpoint 获取用户详细信息
- **Audience**: Logto OIDC Issuer
- **获取**: `getAccessToken()` 无参数调用
- **不适用于**: 自定义后端 API 调用

#### 3. Access Token (API Resource) ✅ **后端 API 所需**
- **用途**: 访问自定义后端 API Resource
- **Audience**: API Resource Identifier (如 `https://api.saleschampionhub.com/kb`)
- **获取**: `getAccessToken(resource)` 带 resource 参数调用
- **包含**: 自定义 scopes (如 `read write delete admin`)
- **适用于**: 所有后端 API 调用

### Resource Parameter 的重要性

根据 [Logto SDK 官方文档](https://docs.logto.io/developers/sdk-conventions/platform-sdk-convention)，`getAccessToken()` 方法的行为：

```typescript
// ❌ 无参数 - 返回 UserInfo Endpoint 的 Access Token
const token1 = await getAccessToken()
// token1.aud = "http://localhost:3001/oidc"

// ✅ 带 resource 参数 - 返回 API Resource 的 Access Token
const token2 = await getAccessToken('https://api.saleschampionhub.com/kb')
// token2.aud = "https://api.saleschampionhub.com/kb"
```

**后端验证逻辑**:
```go
// 后端会验证 JWT 的 aud claim
if token.Audience != "https://api.saleschampionhub.com/kb" {
    return 401 Unauthorized  // aud 不匹配，拒绝请求
}
```

因此，前端**必须**在调用 `getAccessToken()` 时传递正确的 `resource` 参数。

---

## 核心变更总结

### 1. ProtectedRoute.tsx - 请求正确的访问令牌

**文件**: `src/components/ProtectedRoute.tsx`

**问题**: 原代码调用 `getAccessToken()` 时没有传递 `resource` 参数，导致获取的是用于 UserInfo Endpoint 的 Access Token，而非后端 API Resource 的 Access Token。

**修复**:
```typescript
// ❌ 修复前 - 获取 UserInfo Endpoint 的 Access Token
getAccessToken()
  .then((token) => { ... })

// ✅ 修复后 - 获取 API Resource 的 Access Token
const apiResource = import.meta.env.VITE_LOGTO_API_RESOURCE || 'https://api.saleschampionhub.com/kb'

getAccessToken(apiResource)
  .then((token) => {
    (window as any).__logtoAccessToken = token
    console.log('Access token obtained successfully for resource:', apiResource)
    setTokenReady(true)
  })
```

**关键点** (基于 [Logto 官方文档](https://docs.logto.io/developers/sdk-conventions/platform-sdk-convention)):
- `getAccessToken()` 无参数调用：返回用于 **UserInfo Endpoint** 的 Access Token
- `getAccessToken(resource)` 带参数调用：返回指定 **API Resource** 的 Access Token
- Access Token 包含 `aud` (audience) claim，后端通过该 claim 验证令牌有效性
- **ID Token** 用于前端用户身份识别和认证状态判断
- **Access Token** 用于请求受保护的 API 资源，具有特定的 scopes 和过期时间

---

### 2. App.tsx - 配置 Scopes 和 Resources

**文件**: `src/App.tsx`

**问题**: `LogtoConfig` 缺少 `scopes` 和 `resources` 配置，无法在登录时请求所需权限。

**修复**:
```typescript
// ❌ 修复前
const logtoConfig: LogtoConfig = {
  endpoint: env.VITE_LOGTO_ENDPOINT,
  appId: env.VITE_LOGTO_APP_ID,
}

// ✅ 修复后
const logtoConfig: LogtoConfig = {
  endpoint: env.VITE_LOGTO_ENDPOINT,
  appId: env.VITE_LOGTO_APP_ID,
  scopes: ['read', 'write', 'delete', 'admin'], // 请求所有可用权限
  resources: [env.VITE_LOGTO_API_RESOURCE],     // 指定 API 资源
}
```

**关键点** (基于 [Logto 官方文档](https://docs.logto.io/authorization/global-api-resources)):
- `scopes`: 定义应用需要的权限范围（也称为 permissions），**必须与后端 API Resource 中定义的 scopes 完全匹配**
  - ⚠️ Logto 不支持通配符或前缀匹配，例如 `["read"]` 不会匹配 `read:products`
  - ✅ Scope 名称必须精确匹配 Logto Admin Console 中定义的权限名称
- `resources`: 指定要访问的 API 资源标识符（使用绝对 URI，遵循 RFC 8707 规范）
  - 格式：`https://api.yourapp.com` (不含 fragment，尽量避免 query string)
  - 该值会成为 Access Token 的 `aud` (audience) claim
- 配置后，Logto SDK 会在 OAuth 授权流程中自动携带 `resource` 和 `scope` 参数

---

### 3. env.ts - 验证 API Resource 环境变量

**文件**: `src/utils/env.ts`

**问题**: `VITE_LOGTO_API_RESOURCE` 在 `.env` 中定义但未被验证和导出。

**修复**:
```typescript
// 1. 添加到接口定义
interface EnvConfig {
  VITE_LOGTO_ENDPOINT: string
  VITE_LOGTO_APP_ID: string
  VITE_LOGTO_REDIRECT_URI: string
  VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: string
  VITE_LOGTO_API_RESOURCE: string  // ✅ 新增
}

// 2. 添加验证逻辑
const apiResource = import.meta.env.VITE_LOGTO_API_RESOURCE
if (!apiResource) {
  errors.push('VITE_LOGTO_API_RESOURCE is not defined')
} else if (!apiResource.startsWith('http://') && !apiResource.startsWith('https://')) {
  errors.push('VITE_LOGTO_API_RESOURCE must start with http:// or https://')
}

// 3. 返回验证后的值
return {
  ...
  VITE_LOGTO_API_RESOURCE: apiResource,
}

// 4. 添加到调试输出
export function printEnvConfig() {
  ...
  console.log(`  VITE_LOGTO_API_RESOURCE: ${env.VITE_LOGTO_API_RESOURCE}`)
}
```

**关键点**:
- 确保 `VITE_LOGTO_API_RESOURCE` 环境变量存在且格式正确
- 应用启动时会自动验证，格式错误会抛出清晰的错误信息

---

## 环境变量配置

### .env 文件内容

```bash
# Logto OIDC 配置
VITE_LOGTO_ENDPOINT=http://localhost:3001
VITE_LOGTO_APP_ID=kvci81ndlx6l7erivlz5i
VITE_LOGTO_REDIRECT_URI=http://localhost:3000/callback
VITE_LOGTO_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
VITE_LOGTO_API_RESOURCE=https://api.saleschampionhub.com/kb

# 后端 API 地址
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

**说明**:
- `VITE_LOGTO_APP_ID`: 从 Logto Admin Console 创建 SPA 应用后获取
- `VITE_LOGTO_API_RESOURCE`: 必须与后端 API Resource Identifier 一致
- `VITE_API_BASE_URL`: 后端 API 基础 URL

---

## Logto Admin Console 配置要求

### 1. 创建 SPA Application

访问 Logto Admin Console (http://localhost:3002)，创建一个 **Single Page Application (SPA)**。

**配置项**:

| 配置项 | 值 |
|--------|-----|
| Application Name | AI Knowledge Base Frontend |
| Application Type | Single Page App (SPA) |
| App ID | kvci81ndlx6l7erivlz5i (自动生成) |

### 2. 配置 Redirect URIs

**Redirect URIs** (OAuth callback):
```
http://localhost:3000/callback
```

**Post sign-out redirect URIs** (登出后跳转):
```
http://localhost:3000
```

### 3. 配置 CORS Allowed Origins

**CORS origins** (允许跨域请求):
```
http://localhost:3000
```

**重要**: 必须配置 CORS，否则浏览器会阻止前端请求 Logto OIDC endpoints。

### 4. 创建和配置 API Resource

基于 [Logto RBAC 官方文档](https://docs.logto.io/docs/recipes/rbac/protect-resource/)

#### 步骤 1: 创建 API Resource

访问 **Console → API resources**:
1. 点击 **Create API resource**
2. 填写配置:
   - **API name**: `AI Knowledge Base API`
   - **API identifier**: `https://api.saleschampionhub.com/kb`
3. 保存

#### 步骤 2: 定义 Permissions (权限)

在创建的 API Resource 详情页，进入 **Permissions** 标签:
1. 点击 **Create permission**
2. 添加以下权限:
   - `read` - 读取知识库和文档
   - `write` - 创建和编辑知识库和文档
   - `delete` - 删除知识库和文档
   - `admin` - 管理员完全权限
3. 保存

#### 步骤 3: 创建 Role 并分配权限

访问 **Console → Roles**:
1. 点击 **Create role**
2. 配置角色:
   - **Role name**: `kb_admin` (或 `kb_user`)
   - **Role type**: 选择 **User**
3. 在 **Permissions** 部分:
   - 选择刚创建的 API Resource: `https://api.saleschampionhub.com/kb`
   - 勾选所需权限: `read`, `write`, `delete`, `admin`
4. 保存

#### 步骤 4: 分配用户到 Role

在 **Console → Roles** 中:
1. 选择刚创建的 `kb_admin` 角色
2. 点击 **Users** 标签
3. 点击 **Assign users**
4. 搜索并选择测试用户
5. 确认分配

**关键说明**:
- ⚠️ **Logto 1.33.0 中，SPA Application 没有直接的"API resources"标签页**
- ✅ 正确方式：通过 **Roles** 关联 API Resource 的 Permissions
- ✅ 用户通过 **Role 分配** 获得访问 API Resource 的权限
- ✅ 前端 SDK 配置的 `scopes` 和 `resources` 会在登录时请求相应权限

**验证方法**:
1. 访问 **Console → API resources** → 选择知识库 API
2. 查看 **Permissions** 标签，确认包含 4 个权限
3. 访问 **Console → Roles** → 选择 `kb_admin`
4. 查看 **Permissions** 标签，确认已分配知识库 API 的权限
5. 查看 **Users** 标签，确认测试用户已分配到该角色

---

## 认证流程说明

### 完整认证流程

```
用户访问受保护页面
    ↓
ProtectedRoute 检查登录状态
    ↓
[未登录] 重定向到 /login
    ↓
用户点击登录按钮
    ↓
signIn() 调用 - 跳转到 Logto 登录页
  (携带 scopes + resources 参数)
    ↓
用户在 Logto 输入凭证
    ↓
Logto 验证成功，重定向到 /callback
  (携带 authorization code)
    ↓
Callback 页面处理回调
  useHandleSignInCallback() 自动:
  - 交换 code 获取 tokens
  - 保存 ID Token 和 Refresh Token
  - 重定向到首页
    ↓
ProtectedRoute 检测到已登录
    ↓
调用 getAccessToken(apiResource)
  - 使用 ID Token 换取 Access Token
  - Access Token 包含 audience=https://api.saleschampionhub.com/kb
  - 保存到 window.__logtoAccessToken
    ↓
Token 准备完毕，渲染受保护内容
    ↓
用户调用后端 API
    ↓
Axios 拦截器添加 Authorization: Bearer {accessToken}
    ↓
后端验证 JWT 签名和 audience
    ↓
请求成功！
```

---

## Token 类型对比

基于 [Logto SDK 官方文档](https://docs.logto.io/developers/sdk-conventions/platform-sdk-convention)

### ID Token vs Access Token

| 特性 | ID Token | Access Token (UserInfo) | Access Token (API Resource) |
|------|----------|-------------------------|----------------------------|
| **用途** | 用户身份验证和认证状态判断 | 访问 Logto UserInfo Endpoint | 访问自定义后端 API 资源 |
| **Audience** | 应用的 App ID | Logto 的 OIDC Issuer | API Resource Identifier (URI) |
| **获取方式** | 登录后自动获取 | `getAccessToken()` 无参数 | `getAccessToken(resource)` |
| **包含信息** | 用户 profile claims (sub, name, email 等) | 最小化信息 (用于 UserInfo 请求) | sub + client_id + scopes + aud |
| **Scopes** | openid, profile, email 等 OIDC scopes | openid 相关 scopes | API Resource 定义的自定义 scopes |
| **后端 API 验证** | ❌ 会被拒绝 (aud 不匹配) | ❌ 会被拒绝 (aud 不匹配) | ✅ 验证通过 (aud 匹配 API Resource) |
| **有效期** | 通常 1 小时 | 通常 1 小时 | 可配置 (默认 3600 秒) |
| **自动刷新** | 使用 Refresh Token | SDK 自动管理 | SDK 自动管理 (过期时用 Refresh Token 换取) |

**示例 ID Token Payload**:
```json
{
  "sub": "user_abc123",                        // 用户唯一标识
  "name": "张三",
  "email": "zhangsan@example.com",
  "email_verified": true,
  "aud": "kvci81ndlx6l7erivlz5i",             // 前端 SPA Application ID
  "iss": "http://localhost:3001/oidc",        // Logto OIDC Issuer
  "iat": 1699900000,                          // 签发时间
  "exp": 1699903600                           // 过期时间
}
```

**示例 Access Token (UserInfo Endpoint)**:
```json
{
  "sub": "user_abc123",
  "aud": "http://localhost:3001/oidc",        // Logto OIDC Issuer (用于 UserInfo)
  "iss": "http://localhost:3001/oidc",
  "scope": "openid profile email",            // OIDC 标准 scopes
  "iat": 1699900000,
  "exp": 1699903600
}
```

**示例 Access Token (API Resource)** - ✅ 后端需要的类型:
```json
{
  "sub": "user_abc123",                                    // 用户唯一标识
  "client_id": "kvci81ndlx6l7erivlz5i",                   // SPA Application ID
  "aud": "https://api.saleschampionhub.com/kb",           // ✅ API Resource Identifier
  "scope": "read write delete admin",                      // API Resource 定义的 scopes
  "iss": "http://localhost:3001/oidc",
  "iat": 1699900000,
  "exp": 1699903600
}
```

**关键区别** (基于 [Logto 官方文档](https://docs.logto.io/authorization/global-api-resources)):
- ✅ API Resource Access Token 的 `aud` 必须是您在 Logto Admin Console 注册的 API Resource Identifier
- ✅ `scope` 包含的是 API Resource 中定义的自定义权限，而非 OIDC 标准 scopes
- ✅ 后端验证时会检查 `aud` claim 是否匹配预期的 API Resource Identifier
- ❌ 使用 ID Token 或 UserInfo Access Token 调用后端 API 会因为 `aud` 不匹配而返回 401

---

## 测试步骤

### 前置条件

1. **Infrastructure 服务运行中**:
   ```bash
   cd infrastructure
   docker ps | grep -E "postgres|redis|kong"
   ```

2. **User Center (Logto) 运行中**:
   ```bash
   cd projects/00-user-center
   docker ps | grep logto
   ```

   访问 http://localhost:3002 验证 Admin Console 可用。

3. **后端 API 服务运行中**:
   ```bash
   cd projects/01-ai-knowledge-base
   docker ps | grep kb-api-server
   ```

   访问 http://localhost:8080/health 验证后端健康。

### 启动前端

```bash
cd projects/01-ai-knowledge-base-frontend
npm install
npm run dev
```

访问 http://localhost:3000

### 测试用例

#### 1. 登录流程测试

**步骤**:
1. 访问 http://localhost:3000
2. 应该自动重定向到 `/login` 页面
3. 点击 **"使用 Logto 登录"** 按钮
4. 跳转到 Logto 登录页 (http://localhost:3001/...)
5. 输入测试用户凭证 (或注册新用户)
6. 同意授权请求 (scopes: read, write, delete, admin)
7. 自动跳转回 `/callback`
8. 短暂加载后跳转到首页 `/`

**预期结果**:
- ✅ 成功登录，显示用户名/头像
- ✅ 控制台输出: `Access token obtained successfully for resource: https://api.saleschampionhub.com/kb`
- ✅ `window.__logtoAccessToken` 存在且为有效 JWT

**检查 Token**:
```javascript
// 在浏览器 Console 执行
console.log(window.__logtoAccessToken)

// 解码 JWT (使用 jwt.io 或浏览器插件)
// 验证 payload 包含:
// - aud: "https://api.saleschampionhub.com/kb"
// - scope: "read write delete admin"
```

#### 2. API 调用测试

**步骤**:
1. 登录成功后，访问 **知识库管理** 页面
2. 点击 **"创建知识库"** 按钮
3. 填写表单并提交

**预期结果**:
- ✅ Network 面板显示请求包含 `Authorization: Bearer {token}`
- ✅ 后端返回 200 成功响应（或 400 业务错误，但非 401 认证失败）
- ✅ 知识库列表更新

**检查 Network 请求**:
```
GET http://localhost:8080/api/v1/knowledge-bases
Headers:
  Authorization: Bearer eyJhbGciOiJFUzM4NCIsInR5cCI6IkpXVCIsImtpZCI6Ii4uLiJ9...
```

#### 3. Token 刷新测试

**步骤**:
1. 登录后等待 Access Token 过期（默认 1 小时）
2. 调用需要认证的 API

**预期结果**:
- ✅ Logto SDK 自动使用 Refresh Token 获取新 Access Token
- ✅ API 调用成功，无需重新登录

#### 4. 登出测试

**步骤**:
1. 点击右上角用户菜单中的 **"退出登录"**
2. 执行登出操作

**预期结果**:
- ✅ 清除本地 tokens
- ✅ 重定向到 `/login` 页面
- ✅ 访问受保护页面会要求重新登录

---

## 常见问题排查

### 问题 1: 前端登录成功，但 API 返回 401

**可能原因**:
- ❌ `getAccessToken()` 未传递 `resource` 参数（获取的是 UserInfo Endpoint 的 Access Token，`aud` 不匹配）
- ❌ 用户未分配到包含 API Resource 权限的 Role
- ❌ 后端 `LOGTO_API_RESOURCE` 环境变量与前端不一致
- ❌ Scope 名称在前端配置与 Logto Admin Console 中定义不匹配

**排查步骤**:
1. 检查 `ProtectedRoute.tsx` 是否调用 `getAccessToken(apiResource)`
2. 在浏览器 Console 检查 `window.__logtoAccessToken` 的 `aud` 字段
3. 使用 jwt.io 解码 token，验证 `aud` 是否为 `https://api.saleschampionhub.com/kb`
4. 检查 Logto Admin Console:
   - **Console → API resources** → 验证知识库 API 存在且 Permissions 已定义
   - **Console → Roles** → 验证 Role 已分配 API Resource 的 Permissions
   - **Console → Roles → Users** → 验证当前用户已分配到该 Role

**解决方法**:
```typescript
// 确保 ProtectedRoute.tsx 包含:
const apiResource = import.meta.env.VITE_LOGTO_API_RESOURCE
getAccessToken(apiResource)
```

---

### 问题 2: CORS 错误

**错误信息**:
```
Access to XMLHttpRequest at 'http://localhost:3001/oidc/...' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**原因**:
- ❌ Logto SPA Application 未配置 CORS allowed origins

**解决方法**:
1. 访问 Logto Admin Console
2. 进入 SPA Application 设置
3. 在 **CORS allowed origins** 添加: `http://localhost:3000`
4. 保存并重启 Logto 服务

---

### 问题 3: Redirect URI mismatch

**错误信息**:
```
redirect_uri_mismatch: The redirect URI provided does not match a registered redirect URI
```

**原因**:
- ❌ Logto Application 的 Redirect URIs 配置错误

**解决方法**:
1. 检查 `.env` 文件: `VITE_LOGTO_REDIRECT_URI=http://localhost:3000/callback`
2. 检查 Logto Admin Console → SPA Application → Redirect URIs
3. 确保两者完全一致（包括协议、端口、路径）
4. **注意**: 不能使用通配符，必须是完整 URI

---

### 问题 4: Token 解码后 scopes 为空

**可能原因**:
- ❌ `App.tsx` 的 `LogtoConfig` 未配置 `scopes`
- ❌ Logto API Resource 未定义 scopes

**排查步骤**:
1. 检查 `App.tsx`:
   ```typescript
   scopes: ['read', 'write', 'delete', 'admin']
   ```
2. 检查 Logto Admin Console → API resources → 知识库 API → Permissions
3. 确认 scopes 已定义: `read`, `write`, `delete`, `admin`

**解决方法**:
- 在 `App.tsx` 添加 `scopes` 配置
- 重新登录以获取新 token

---

### 问题 5: 前端启动失败

**错误信息**:
```
环境变量配置错误：
1. VITE_LOGTO_API_RESOURCE is not defined
```

**原因**:
- ❌ `.env` 文件缺少必需变量

**解决方法**:
1. 确保 `.env` 文件存在于项目根目录
2. 添加缺失的环境变量:
   ```bash
   VITE_LOGTO_API_RESOURCE=https://api.saleschampionhub.com/kb
   ```
3. 重启开发服务器: `npm run dev`

---

## 代码审查清单

在部署到生产环境前，请确认以下检查项:

### 安全性

- [ ] Access Token 存储在 `window` 对象中，生产环境考虑更安全的存储方式
- [ ] `.env` 文件不包含在 Git 仓库中（已在 `.gitignore`）
- [ ] 生产环境 Logto endpoint 使用 HTTPS
- [ ] 生产环境 Redirect URIs 使用 HTTPS

### 功能完整性

- [ ] ✅ `ProtectedRoute.tsx` 正确请求 Access Token (带 resource 参数)
- [ ] ✅ `App.tsx` 配置 scopes 和 resources
- [ ] ✅ `env.ts` 验证所有必需环境变量
- [ ] Axios 拦截器正确添加 `Authorization` header
- [ ] Token 过期时能自动刷新

### 用户体验

- [ ] 登录失败时显示友好错误信息
- [ ] Token 获取期间显示加载状态
- [ ] 登出后清除所有本地状态
- [ ] 受保护路由自动重定向到登录页

---

## 生产环境配置

### 前端 .env.production

```bash
VITE_LOGTO_ENDPOINT=https://logto.saleschampionhub.com
VITE_LOGTO_APP_ID=<production_app_id>
VITE_LOGTO_REDIRECT_URI=https://kb.saleschampionhub.com/callback
VITE_LOGTO_POST_LOGOUT_REDIRECT_URI=https://kb.saleschampionhub.com
VITE_LOGTO_API_RESOURCE=https://api.saleschampionhub.com/kb
VITE_API_BASE_URL=https://api.saleschampionhub.com/api/v1
```

### Logto Production Application 配置

1. **创建生产环境 SPA Application**
2. **配置 Redirect URIs**:
   ```
   https://kb.saleschampionhub.com/callback
   ```
3. **配置 Post sign-out URIs**:
   ```
   https://kb.saleschampionhub.com
   ```
4. **配置 CORS origins**:
   ```
   https://kb.saleschampionhub.com
   ```
5. **分配 API Resource** 并授予 scopes

### 部署步骤

```bash
# 构建生产版本
npm run build

# 构建产物在 dist/ 目录

# 部署到 CDN/Nginx/Vercel 等
```

---

## 附录: 关键文件对照表

| 文件 | 作用 | 关键配置 |
|------|------|----------|
| `src/App.tsx` | LogtoProvider 配置 | `scopes`, `resources` |
| `src/components/ProtectedRoute.tsx` | 路由保护 + Token 获取 | `getAccessToken(resource)` |
| `src/services/api.ts` | Axios 实例 + 拦截器 | `Authorization` header |
| `src/utils/env.ts` | 环境变量验证 | 验证 `VITE_LOGTO_API_RESOURCE` |
| `src/pages/Login.tsx` | 登录页面 | `signIn(redirectUri)` |
| `src/pages/Callback.tsx` | OAuth 回调处理 | `useHandleSignInCallback()` |
| `.env` | 环境变量配置 | 所有 `VITE_LOGTO_*` 变量 |

---

## 总结

### ✅ 完成的工作

1. **修复 Token 请求逻辑**
   - `ProtectedRoute.tsx` 现在正确请求 Access Token (带 resource 参数)
   - 确保获取的 token 包含正确的 `audience` claim

2. **配置 Scopes 和 Resources**
   - `App.tsx` 中的 `LogtoConfig` 包含完整的 scopes 和 resources
   - 登录时会请求所需权限

3. **环境变量验证增强**
   - `env.ts` 验证 `VITE_LOGTO_API_RESOURCE` 存在性和格式
   - 启动时自动检查配置完整性

4. **文档完善**
   - 详细的集成指南和测试步骤
   - 常见问题排查手册
   - 生产环境配置建议

### 🔧 待完成的任务

1. **Logto Admin Console 配置验证**
   - 确认 SPA Application 已正确配置
   - 验证 API Resource 分配和 scopes

2. **端到端测试**
   - 登录流程测试
   - API 调用测试
   - Token 刷新测试

3. **生产环境准备**
   - HTTPS 配置
   - 生产环境 Logto Application 创建
   - CDN 部署配置

### 📚 相关文档

**项目内部文档**:
- 后端 Logto 集成测试结果: `LOGTO_INTEGRATION_TEST_RESULT.md`
- Logto 快速开始指南: `QUICK_START_LOGTO.md`
- 项目总览: `docs/项目总览.md`
- 前端集成完成总结: `INTEGRATION_COMPLETE.md`

**Logto 官方文档**:
- [基于角色的访问控制 (RBAC)](https://docs.logto.io/zh-CN/authorization/role-based-access-control)
- [保护全局 API 资源](https://docs.logto.io/authorization/global-api-resources)
- [React SDK 快速开始](https://docs.logto.io/quick-starts/react)
- [Platform SDK 约定](https://docs.logto.io/developers/sdk-conventions/platform-sdk-convention)
- [组织集成](https://docs.logto.io/docs/recipes/organizations/integration/)

---

**文档版本**: 2.0 (基于 Logto 官方文档更新)
**最后更新**: 2025-11-11 18:00
**维护者**: Claude Code
**技术审核**: 基于 Logto 官方文档验证技术准确性
