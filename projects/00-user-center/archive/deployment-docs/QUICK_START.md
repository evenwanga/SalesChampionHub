# 快速启动指南 - 5分钟跑起来

**目标**: 5分钟内在本地运行完整的用户中心系统

---

## 🚀 一键启动

### 前置条件
- Docker & Docker Compose
- 8GB+ 内存
- 端口：3001, 3002, 5432, 6379 未被占用

### Step 1: 克隆并进入目录

```bash
cd /Users/wangyiwen/produce/SalesChampionHub/projects/00-user-center
```

### Step 2: 创建环境配置

```bash
cp .env.example .env
# 编辑 .env，修改必要的密码
```

### Step 3: 一键启动

```bash
docker-compose up -d
```

**等待30秒，所有服务启动完成**

### Step 4: 访问系统

- **管理控制台**: http://localhost:3002
- **用户中心API**: http://localhost:3001
- **自定义API**: http://localhost:3003

### Step 5: 创建第一个租户

```bash
# 使用提供的脚本
./scripts/create-first-tenant.sh
```

**完成！** 🎉

---

## 📋 详细步骤

### 1. 初始化数据库

首次启动会自动：
- 创建Logto所需的表
- 创建自定义扩展表（tenant_quotas, tenant_settings等）
- 初始化系统管理员账号

### 2. 配置第一个应用

访问管理控制台 http://localhost:3002

**默认管理员账号**:
- Username: `admin`
- Password: `admin123` (首次登录后必须修改)

**创建应用**:
1. 进入 "Applications" 页面
2. 点击 "Create Application"
3. 选择类型: "Traditional Web"
4. 应用名称: "Knowledge Base"（知识库）
5. Redirect URI: `http://localhost:8080/callback`
6. 保存，获得 `client_id` 和 `client_secret`

### 3. 创建第一个组织（租户）

**通过管理控制台**:
1. 进入 "Organizations" 页面
2. 点击 "Create Organization"
3. 名称: "测试公司"
4. 保存，获得 `organization_id`

**通过API**:
```bash
curl -X POST http://localhost:3003/api/v1/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "name": "测试公司",
    "plan": "pro",
    "admin": {
      "email": "test@example.com",
      "name": "测试管理员",
      "password": "Test123456!"
    }
  }'
```

### 4. 测试认证流程

**获取授权码**:
```
浏览器访问:
http://localhost:3001/oidc/auth?
  response_type=code&
  client_id=<your_client_id>&
  redirect_uri=http://localhost:8080/callback&
  scope=openid profile email organizations&
  state=random_state&
  organization_id=<your_org_id>
```

**用户登录后，会跳转到回调URL**:
```
http://localhost:8080/callback?code=<authorization_code>&state=random_state
```

**交换Token**:
```bash
curl -X POST http://localhost:3001/oidc/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=<authorization_code>" \
  -d "redirect_uri=http://localhost:8080/callback" \
  -d "client_id=<client_id>" \
  -d "client_secret=<client_secret>"
```

**响应**:
```json
{
  "access_token": "eyJhbGc...",
  "id_token": "eyJhbGc...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

---

## 🧪 测试API

### 验证Token

```bash
curl -X POST http://localhost:3003/api/v1/auth/verify-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <service_api_key>" \
  -d '{
    "token": "<access_token>"
  }'
```

### 检查权限

```bash
curl -X POST http://localhost:3003/api/v1/auth/check-permission \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <service_api_key>" \
  -d '{
    "user_id": "user_123",
    "organization_id": "org_tenant_001",
    "resource": "kb",
    "action": "create"
  }'
```

### 获取租户信息

```bash
curl http://localhost:3003/api/v1/tenants/<org_id> \
  -H "Authorization: Bearer <service_api_key>"
```

---

## 🔧 开发模式

### 本地开发自定义API

```bash
# 进入自定义API目录
cd custom-api

# 安装依赖
npm install

# 启动开发服务器（热重载）
npm run dev
```

修改代码后自动重启。

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f logto
docker-compose logs -f custom-api
```

### 进入数据库

```bash
docker-compose exec postgres psql -U postgres -d logto

# 查看表
\dt

# 查看组织
SELECT * FROM organizations;

# 查看用户
SELECT * FROM users;

# 查看自定义表
SELECT * FROM tenant_quotas;
```

---

## 📦 SDK使用示例

### Go SDK (子项目1使用)

```go
package main

import (
    "context"
    usercenter "github.com/SalesChampionHub/user-center-sdk-go"
)

func main() {
    // 初始化客户端
    client := usercenter.NewClient(&usercenter.Config{
        Endpoint: "http://localhost:3003",
        APIKey:   "your_service_api_key",
    })

    // 在每个API请求的中间件中
    func AuthMiddleware(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // 1. 提取Token
            token := extractTokenFromHeader(r)

            // 2. 验证Token
            user, err := client.VerifyToken(context.Background(), token)
            if err != nil {
                http.Error(w, "Unauthorized", 401)
                return
            }

            // 3. 设置用户上下文
            ctx := context.WithValue(r.Context(), "user", user)
            ctx = context.WithValue(ctx, "tenant_id", user.Organization.ID)

            // 4. 继续处理
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }

    // 权限检查
    func RequirePermission(resource, action string) func(http.Handler) http.Handler {
        return func(next http.Handler) http.Handler {
            return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                user := r.Context().Value("user").(*usercenter.User)

                allowed, err := client.CheckPermission(r.Context(), &usercenter.PermissionCheck{
                    UserID:         user.ID,
                    OrganizationID: user.Organization.ID,
                    Resource:       resource,
                    Action:         action,
                })

                if err != nil || !allowed {
                    http.Error(w, "Forbidden", 403)
                    return
                }

                next.ServeHTTP(w, r)
            })
        }
    }
}
```

### TypeScript SDK

```typescript
import { UserCenterClient } from '@saleschampionhub/user-center-sdk';

// 初始化
const client = new UserCenterClient({
  endpoint: 'http://localhost:3003',
  apiKey: 'your_service_api_key'
});

// Express中间件
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. 提取Token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // 2. 验证Token
    const user = await client.verifyToken(token);

    // 3. 设置到request对象
    req.user = user;
    req.tenantId = user.organization.id;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// 权限检查中间件
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allowed = await client.checkPermission({
        userId: req.user.id,
        organizationId: req.tenantId,
        resource,
        action
      });

      if (!allowed) {
        return res.status(403).json({ error: 'Permission denied' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

// 使用示例
app.post('/api/knowledge-bases',
  authMiddleware,
  requirePermission('kb', 'create'),
  async (req, res) => {
    // 创建知识库
    // 此时已经验证了Token和权限
  }
);
```

---

## 🐛 故障排查

### 服务启动失败

```bash
# 检查端口占用
lsof -i :3001
lsof -i :3002
lsof -i :5432
lsof -i :6379

# 查看服务日志
docker-compose logs logto
docker-compose logs postgres

# 重启服务
docker-compose restart logto
```

### 数据库连接失败

```bash
# 检查PostgreSQL是否启动
docker-compose ps postgres

# 测试连接
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# 查看日志
docker-compose logs postgres
```

### Token验证失败

**常见原因**:
1. Token已过期 → 使用refresh_token刷新
2. Token签名错误 → 检查client_secret
3. Token格式错误 → 确保是`Bearer <token>`格式

**解决方法**:
```bash
# 检查Token内容（不验证签名）
echo "<token>" | cut -d. -f2 | base64 -d | jq

# 重新获取Token
# 使用上面的OAuth流程
```

### 权限检查失败

**检查步骤**:
1. 用户是否属于该组织？
2. 用户是否有对应的角色？
3. 角色是否有对应的权限？

```bash
# 查询用户的组织
SELECT * FROM organization_users WHERE user_id = 'user_123';

# 查询用户的角色
SELECT * FROM organization_user_roles WHERE user_id = 'user_123';
```

---

## 📊 监控与健康检查

### 健康检查端点

```bash
# Logto核心服务
curl http://localhost:3001/api/health

# 自定义API
curl http://localhost:3003/health

# PostgreSQL
docker-compose exec postgres pg_isready

# Redis
docker-compose exec redis redis-cli ping
```

### 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看数据库连接数
docker-compose exec postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🔒 安全配置

### 生产环境必须修改

**`.env` 文件**:
```bash
# 数据库密码（强密码）
DB_PASSWORD=<strong-random-password>

# JWT密钥（随机生成）
JWT_SECRET=<random-256-bit-key>

# API密钥（服务间调用）
SERVICE_API_KEY=<random-api-key>

# Redis密码
REDIS_PASSWORD=<random-password>
```

### 生成安全密钥

```bash
# JWT密钥
openssl rand -base64 32

# API密钥
openssl rand -hex 32

# 数据库密码
openssl rand -base64 24
```

---

## 📚 下一步

1. **集成到子项目1**
   - 复制SDK示例代码
   - 配置环境变量
   - 实现认证中间件

2. **配置SSO**（可选）
   - 在管理控制台配置SAML
   - 集成企业IdP

3. **配置MFA**（可选）
   - 启用TOTP
   - 配置短信服务

4. **部署到生产**
   - 参考 `docs/deployment-guide.md`
   - 配置Kubernetes
   - 设置监控告警

---

**🎉 恭喜！用户中心已经运行起来了！**

任何问题查看 `docs/` 目录的详细文档。
