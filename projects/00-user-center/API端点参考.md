# API端点参考

## OIDC/OAuth 2.1 端点

所有认证相关的端点都在 `/oidc` 路径下：

### 1. OpenID Connect Discovery（发现文档）
```
GET http://localhost:3001/oidc/.well-known/openid-configuration
```

**说明**：返回OIDC配置信息，包括所有可用的端点、支持的授权类型、签名算法等。

**使用示例**：
```bash
curl http://localhost:3001/oidc/.well-known/openid-configuration | jq '.'
```

### 2. 获取访问令牌（M2M）
```
POST http://localhost:3001/oidc/token
Content-Type: application/x-www-form-urlencoded
```

**请求参数**：
- `grant_type=client_credentials`
- `client_id=<你的App ID>`
- `client_secret=<你的App Secret>`
- `resource=<API Resource Identifier>`
- `scope=<请求的权限>`

**使用示例**：
```bash
curl -X POST "http://localhost:3001/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=rd0j6xvios5fa68ymbjeg" \
  -d "client_secret=q49wZVhuqKzoCS7jpkRTQr8VDvMR3S5l" \
  -d "resource=https://api.saleschampionhub.com/kb" \
  -d "scope=read write"
```

### 3. 授权端点
```
GET http://localhost:3001/oidc/auth
```

**说明**：用于用户登录和授权的端点。

### 4. Token撤销
```
POST http://localhost:3001/oidc/token/revocation
```

**说明**：撤销访问令牌或刷新令牌。

### 5. 用户信息端点
```
GET http://localhost:3001/oidc/me
Authorization: Bearer <access_token>
```

**说明**：获取当前认证用户的信息。

---

## Logto Management API

管理API端点在 `/api` 路径下，需要Management API访问令牌：

### 1. 组织管理
```
GET    http://localhost:3001/api/organizations          # 列出所有组织
POST   http://localhost:3001/api/organizations          # 创建组织
GET    http://localhost:3001/api/organizations/{id}     # 获取组织详情
PATCH  http://localhost:3001/api/organizations/{id}     # 更新组织
DELETE http://localhost:3001/api/organizations/{id}     # 删除组织
```

### 2. 用户管理
```
GET    http://localhost:3001/api/users                   # 列出所有用户
POST   http://localhost:3001/api/users                   # 创建用户
GET    http://localhost:3001/api/users/{id}              # 获取用户详情
PATCH  http://localhost:3001/api/users/{id}              # 更新用户
DELETE http://localhost:3001/api/users/{id}              # 删除用户
```

### 3. 应用管理
```
GET    http://localhost:3001/api/applications            # 列出所有应用
POST   http://localhost:3001/api/applications            # 创建应用
GET    http://localhost:3001/api/applications/{id}       # 获取应用详情
PATCH  http://localhost:3001/api/applications/{id}       # 更新应用
DELETE http://localhost:3001/api/applications/{id}       # 删除应用
```

### 4. API Resources管理
```
GET    http://localhost:3001/api/resources               # 列出所有API资源
POST   http://localhost:3001/api/resources               # 创建API资源
GET    http://localhost:3001/api/resources/{id}          # 获取资源详情
PATCH  http://localhost:3001/api/resources/{id}          # 更新资源
DELETE http://localhost:3001/api/resources/{id}          # 删除资源
```

### 5. 角色管理
```
GET    http://localhost:3001/api/roles                    # 列出所有角色
POST   http://localhost:3001/api/roles                    # 创建角色
GET    http://localhost:3001/api/roles/{id}               # 获取角色详情
PATCH  http://localhost:3001/api/roles/{id}               # 更新角色
DELETE http://localhost:3001/api/roles/{id}               # 删除角色
```

### 6. 连接器管理
```
GET    http://localhost:3001/api/connectors               # 列出所有连接器
POST   http://localhost:3001/api/connectors               # 创建连接器
GET    http://localhost:3001/api/connectors/{id}          # 获取连接器详情
PATCH  http://localhost:3001/api/connectors/{id}          # 更新连接器
DELETE http://localhost:3001/api/connectors/{id}          # 删除连接器
```

---

## Custom API端点

您的自定义业务API在 `http://localhost:3003`：

### 1. 健康检查
```
GET http://localhost:3003/health
```

**响应示例**：
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T13:51:09.160Z",
  "services": {
    "database": "up",
    "redis": "up"
  },
  "version": "1.0.0"
}
```

### 2. 租户配额查询
```
GET http://localhost:3003/api/quota/{organizationId}
Authorization: Bearer <access_token>
```

### 3. 审计日志查询
```
GET http://localhost:3003/api/audit-logs
Authorization: Bearer <access_token>
```

---

## 管理控制台

### Web界面
```
http://localhost:3002
```

**登录账号**：yiwenwang

---

## 快速测试脚本

### 完整测试流程
运行已创建的测试脚本：
```bash
./test-api.sh
```

### 手动测试OIDC Discovery
```bash
curl http://localhost:3001/oidc/.well-known/openid-configuration | jq '.'
```

### 手动获取访问令牌
```bash
curl -X POST "http://localhost:3001/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=rd0j6xvios5fa68ymbjeg" \
  -d "client_secret=q49wZVhuqKzoCS7jpkRTQr8VDvMR3S5l" \
  -d "resource=https://api.saleschampionhub.com/kb" \
  -d "scope=read write" | jq '.'
```

### 使用保存的令牌调用API
```bash
# 令牌已保存在 /tmp/logto-token.txt
curl -H "Authorization: Bearer $(cat /tmp/logto-token.txt)" \
  http://localhost:3003/api/quota/s3yrfd11o57o
```

---

## 常见问题

### Q: 为什么访问 `/.well-known/openid-configuration` 返回404？
**A**: 正确的端点应该是 `/oidc/.well-known/openid-configuration`，包含 `/oidc` 前缀。

### Q: 如何获取Management API的访问令牌？
**A**: 在token请求中使用 `resource=https://default.logto.app/api` 和 `scope=all`：
```bash
curl -X POST "http://localhost:3001/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=rd0j6xvios5fa68ymbjeg" \
  -d "client_secret=q49wZVhuqKzoCS7jpkRTQr8VDvMR3S5l" \
  -d "resource=https://default.logto.app/api" \
  -d "scope=all"
```

### Q: 访问令牌有效期多长？
**A**: 默认1小时（3600秒），可以在API Resource配置中修改。

### Q: 如何查看我拥有的所有API Resources？
**A**:
```bash
# 先获取Management API令牌
TOKEN=$(curl -s -X POST "http://localhost:3001/oidc/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=rd0j6xvios5fa68ymbjeg" \
  -d "client_secret=q49wZVhuqKzoCS7jpkRTQr8VDvMR3S5l" \
  -d "resource=https://default.logto.app/api" \
  -d "scope=all" | jq -r '.access_token')

# 查询API Resources
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/resources | jq '.'
```

---

## 相关文档

- **官方API文档**: https://docs.logto.io/api
- **OIDC规范**: https://openid.net/specs/openid-connect-core-1_0.html
- **OAuth 2.1**: https://oauth.net/2.1/

---

**更新时间**: 2025-10-31 22:10
