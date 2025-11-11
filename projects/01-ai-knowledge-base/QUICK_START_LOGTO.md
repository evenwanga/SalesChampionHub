# 🚀 Logto 集成快速启动指南

> 5分钟内完成 AI 知识库与 Logto 的集成！

---

## ✅ 前置条件

- [x] Logto 已运行 (http://localhost:3002)
- [x] AI 知识库代码已更新
- [x] Docker 和 Docker Compose 已安装

---

## 📋 步骤 1: 在 Logto 创建 API Resource 和 Permissions (3分钟)

### 1.1 创建 API Resource

1. 打开浏览器访问: **http://localhost:3002**
2. 使用管理员账号登录: `yiwenwang`
3. 左侧菜单点击 **API 资源** (API Resources)
4. 点击右上角 **创建 API 资源**
5. 填写表单:
   ```
   名称: Knowledge Base API
   资源标识符: https://api.saleschampionhub.com/kb
   ```
   > ⚠️ **重要**: 资源标识符必须是唯一的 URI，一旦创建不可更改

6. 点击 **创建 API 资源**

### 1.2 添加 Permissions (权限)

创建完成后，在 API 资源详情页：

1. 点击 **权限** 标签页
2. 点击 **创建权限** 按钮
3. 依次添加以下权限:

   | 权限名称 | 描述 |
   |---------|------|
   | `read` | 读取知识库和文档 |
   | `write` | 创建和更新知识库 |
   | `delete` | 删除知识库和文档 |
   | `admin` | 完全管理权限 |

4. 每个权限创建后点击 **保存**

> 💡 **提示**: 权限（Permissions）是细粒度的操作权限，稍后将通过角色（Roles）分配给用户或应用

---

## 📋 步骤 2: 创建 Roles 并分配 Permissions (3分钟)

### 2.1 创建 M2M 角色

1. 左侧菜单点击 **角色** (Roles)
2. 点击右上角 **创建角色**
3. 填写:
   ```
   角色名称: KB Admin (M2M)
   描述: 知识库管理员角色（用于 M2M 应用）
   角色类型: 机器对机器 (Machine-to-Machine)
   ```
4. 点击 **创建角色**

### 2.2 为角色分配 Permissions

在角色详情页：

1. 点击 **权限** 标签页
2. 点击 **分配权限**
3. 选择 **API 资源**: `Knowledge Base API`
4. 勾选所有权限:
   - ☑️ `read` - 读取知识库和文档
   - ☑️ `write` - 创建和更新知识库
   - ☑️ `delete` - 删除知识库和文档
   - ☑️ `admin` - 完全管理权限
5. 点击 **分配权限**

> 💡 **最佳实践**:
> - **最小权限原则**: 仅授予应用必需的权限
> - **职责分离**: 敏感操作（如 delete、admin）可创建独立角色
> - **角色复用**: 同一角色可分配给多个 M2M 应用

### 2.3 创建用户角色（可选）

如果需要为普通用户创建角色：

1. 点击 **创建角色**
2. 填写:
   ```
   角色名称: KB Reader
   描述: 知识库只读用户
   角色类型: 用户 (User)
   ```
3. 分配权限: 仅勾选 `read`

重复以上步骤创建其他用户角色:
- **KB Editor**: `read`, `write`
- **KB Admin User**: `read`, `write`, `delete`, `admin`

---

## 📋 步骤 3: 创建 M2M 应用并分配角色 (2分钟)

### 3.1 创建 M2M 应用

1. 左侧菜单点击 **应用** (Applications)
2. 点击右上角 **创建应用**
3. 选择 **机器对机器** (Machine-to-Machine)
4. 填写:
   ```
   应用名称: KB API Server
   描述: AI Knowledge Base API Server
   ```
5. 点击 **创建应用**

### 3.2 记录应用凭证

**⚠️ 重要**: 应用密钥只显示一次，请立即保存！

```
App ID:     <复制这个值>
App Secret: <复制这个值>
```

### 3.3 为应用分配角色

在应用详情页：

1. 点击 **角色** 标签页
2. 点击 **分配角色**
3. 搜索并选择 `KB Admin (M2M)`
4. 点击 **分配角色**

> 💡 **说明**:
> - 应用将继承角色的所有权限
> - 获取的访问令牌将包含这些权限（Scopes）
> - 不再需要手动勾选 API Resources 的 Scopes（旧版方式）

---

## 📋 步骤 4: 配置环境变量 (1分钟)

编辑 `.env` 文件:

```bash
cd /Users/wangyiwen/produce/SalesChampionHub/projects/01-ai-knowledge-base

# 创建或更新 .env
cat > .env << 'EOF'
# 从步骤3复制
LOGTO_M2M_APP_ID=<粘贴 App ID>
LOGTO_M2M_APP_SECRET=<粘贴 App Secret>

# 默认值（通常不需要修改）
LOGTO_ENDPOINT=http://logto-core:3001
LOGTO_API_RESOURCE=https://api.saleschampionhub.com/kb

# 其他已有配置保持不变...
EOF
```

---

## 📋 步骤 5: 重启服务 (30秒)

```bash
# 停止现有服务
docker-compose down

# 重新构建（包含新代码）
docker-compose build api-server

# 启动服务
docker-compose up -d

# 等待服务健康检查通过
sleep 20
docker ps | grep kb-api-server
# 应显示 "healthy"
```

---

## 📋 步骤 6: 测试集成 (30秒)

```bash
# 运行自动化测试
./test-logto-integration.sh
```

**期望输出**:
```
✓ 测试 1: 获取 M2M 访问令牌
✓ 测试 2: 验证令牌格式
✓ 测试 3: 健康检查端点
...
成功率: 100%
✓ 所有测试通过！Logto 集成成功！
```

---

## 📚 理解 RBAC 在 Logto 中的工作原理

### RBAC 架构图

```
API Resource (Knowledge Base API)
    └── Permissions (权限)
         ├── read
         ├── write
         ├── delete
         └── admin

Roles (角色)
    ├── KB Admin (M2M)         → [read, write, delete, admin]
    ├── KB Editor (User)       → [read, write]
    └── KB Reader (User)       → [read]

M2M Application (KB API Server)
    └── Assigned Role: KB Admin (M2M)
         └── Inherits: [read, write, delete, admin]

Users (用户)
    ├── User A → KB Admin → [read, write, delete, admin]
    ├── User B → KB Editor → [read, write]
    └── User C → KB Reader → [read]
```

### JWT Token 中的体现

当 M2M 应用或用户获取访问令牌时，JWT 将包含：

```json
{
  "iss": "http://localhost:3001/oidc",
  "sub": "<user_id_or_app_id>",
  "aud": "https://api.saleschampionhub.com/kb",
  "exp": 1699999999,
  "iat": 1699996399,
  "scope": "read write delete admin",
  "client_id": "<app_id>",
  "roles": ["KB Admin (M2M)"]
}
```

**关键字段**:
- `aud`: 必须包含 API Resource Identifier
- `scope`: 从角色继承的所有权限（空格分隔）
- `roles`: 用户或应用被分配的角色列表

### 后端验证流程

我们的 JWT 验证器会：

1. ✅ 验证 JWT 签名（RS256）
2. ✅ 验证 `iss`（Issuer）是否为 Logto
3. ✅ 验证 `aud`（Audience）包含我们的 API Resource
4. ✅ 验证 `exp`（过期时间）
5. ✅ 提取 `scope` 和 `roles`
6. ✅ 检查请求的操作是否在 `scope` 中

### 权限检查示例

在代码中使用中间件检查权限：

```go
// 需要 read 权限
authenticated.Use(logtoAuth.RequireScope("read"))

// 需要 admin 角色
authenticated.Use(logtoAuth.RequireRole("KB Admin (M2M)"))
```

### 最佳实践

遵循 Logto 官方建议：

✅ **最小权限原则**: 仅授予必需权限
✅ **保持简洁**: 避免权限模型过度复杂
✅ **定期审计**: 随产品演进更新 RBAC
✅ **预发布测试**: 验证权限边界
✅ **职责分离**: 敏感操作创建独立角色

---

## 🎯 手动测试

### 1. 获取访问令牌

```bash
curl -X POST "http://localhost:3001/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=<你的APP_ID>" \
  -d "client_secret=<你的APP_SECRET>" \
  -d "resource=https://api.saleschampionhub.com/kb" \
  -d "scope=read write" | jq
```

响应:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 2. 调用 API

```bash
# 保存令牌
export TOKEN="<复制上面的access_token>"

# 测试认证
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/me | jq

# 创建知识库
curl -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8080/api/v1/knowledge-bases \
  -d '{
    "name": "测试知识库",
    "description": "Logto 集成测试",
    "embedding_model": "bge-large-zh",
    "similarity_threshold": 0.7
  }' | jq
```

---

## ❗ 常见问题

### Q1: 获取令牌失败 "invalid_client"

**原因**: App ID 或 App Secret 错误

**解决**:
1. 检查 `.env` 文件中的 `LOGTO_M2M_APP_ID` 和 `LOGTO_M2M_APP_SECRET`
2. 确保复制时没有多余空格
3. 在 Logto 控制台重新查看应用详情

### Q2: API 返回 401 "INVALID_TOKEN"

**原因**: 令牌验证失败

**解决**:
1. 确保 Logto 服务正在运行: `docker ps | grep logto`
2. 检查 `LOGTO_ENDPOINT` 配置正确
3. 确保 API Resource Identifier 一致
4. 查看 API 日志: `docker logs kb-api-server`

### Q3: 服务启动失败

**原因**: 依赖库或配置问题

**解决**:
```bash
# 查看详细日志
docker logs kb-api-server

# 检查环境变量
docker exec kb-api-server env | grep LOGTO

# 重新构建
docker-compose build --no-cache api-server
docker-compose up -d
```

---

## 📊 验证清单

### Logto 配置

- [ ] Logto 控制台可以访问 (http://localhost:3002)
- [ ] API Resource 已创建
  - [ ] 名称: `Knowledge Base API`
  - [ ] Identifier: `https://api.saleschampionhub.com/kb`
- [ ] Permissions 已创建
  - [ ] `read` - 读取知识库和文档
  - [ ] `write` - 创建和更新知识库
  - [ ] `delete` - 删除知识库和文档
  - [ ] `admin` - 完全管理权限
- [ ] M2M 角色已创建
  - [ ] 角色名称: `KB Admin (M2M)`
  - [ ] 角色类型: 机器对机器
  - [ ] 已分配所有4个权限
- [ ] M2M 应用已创建
  - [ ] 应用名称: `KB API Server`
  - [ ] 应用类型: Machine-to-Machine
  - [ ] 已分配角色: `KB Admin (M2M)`
  - [ ] 已记录 App ID 和 App Secret

### 本地配置

- [ ] `.env` 文件已更新
  - [ ] `LOGTO_M2M_APP_ID` 已设置
  - [ ] `LOGTO_M2M_APP_SECRET` 已设置
- [ ] 服务已重启并显示 "healthy"
  - [ ] `docker ps` 显示 kb-api-server (healthy)
  - [ ] 日志无错误

### 集成测试

- [ ] 能成功获取访问令牌
  - [ ] Token 包含 `scope: "read write delete admin"`
  - [ ] Token 包含 `aud: "https://api.saleschampionhub.com/kb"`
- [ ] 能成功调用 /api/v1/me
- [ ] 能成功创建知识库
- [ ] 自动化测试通过 (./test-logto-integration.sh)

### 可选：用户角色测试

- [ ] 创建了用户角色 (KB Reader, KB Editor, KB Admin)
- [ ] 创建了测试用户并分配角色
- [ ] 测试用户可以登录并获取令牌
- [ ] 验证用户权限正确（只能访问被授权的操作）

---

## 🎉 完成！

恭喜！你已成功将 AI 知识库与 Logto 集成。

**接下来可以**:
- 访问 Swagger UI: http://localhost:8080/swagger/index.html
- 创建更多组织和用户
- 测试多租户数据隔离
- 查看详细文档: `LOGTO_INTEGRATION_REPORT.md`

**需要帮助？**
- 详细报告: `LOGTO_INTEGRATION_REPORT.md`
- 测试脚本: `test-logto-integration.sh`
- 项目文档: `README.md`

---

**快速启动指南** | 版本: 1.0 | 更新时间: 2025-11-11
