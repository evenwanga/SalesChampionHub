# 用户中心部署验证清单

## 🚀 首次部署前检查

- [ ] Docker和Docker Compose已安装
- [ ] 端口3001, 3002, 3003, 5432, 6379未被占用
- [ ] 至少8GB可用内存
- [ ] 磁盘空间充足（建议20GB+）

## 📝 配置文件检查

- [ ] 已复制`.env.example`为`.env`
- [ ] 已修改数据库密码`DB_PASSWORD`
- [ ] 已修改Redis密码`REDIS_PASSWORD`
- [ ] 已生成并配置`JWT_SECRET`
- [ ] 已生成并配置`SERVICE_API_KEY`
- [ ] 已检查`CORS_ORIGIN`配置

### 生成密钥命令：

```bash
# JWT密钥
openssl rand -base64 32

# API密钥
openssl rand -hex 32

# 数据库密码
openssl rand -base64 24
```

## 🎯 启动服务

- [ ] 运行`./scripts/start.sh`
- [ ] 等待所有服务健康检查通过
- [ ] 访问http://localhost:3002确认管理控制台可用
- [ ] 访问http://localhost:3003/health确认Custom API健康

## 🔧 Logto初始配置

### 1. 创建管理员账号

- [ ] 访问http://localhost:3002
- [ ] 按向导创建第一个管理员账号
- [ ] 记录管理员邮箱和密码

### 2. 创建M2M应用（用于Custom API）

- [ ] 登录管理控制台
- [ ] 进入"Applications" > "Create Application"
- [ ] 选择"Machine-to-Machine"
- [ ] 名称：Custom API Client
- [ ] 保存后获得App ID和App Secret
- [ ] 更新`.env`文件：
  ```bash
  LOGTO_M2M_APP_ID=<app_id>
  LOGTO_M2M_APP_SECRET=<app_secret>
  ```
- [ ] 重启Custom API：`docker-compose restart custom-api`

### 3. 创建API Resources

- [ ] 进入"API Resources" > "Create API Resource"
- [ ] 创建以下资源：

**知识库资源**:
- Name: Knowledge Base
- Identifier: kb
- Scopes:
  - `kb:read` - 读取知识库
  - `kb:write` - 编写知识库
  - `kb:delete` - 删除知识库
  - `kb:admin` - 管理知识库

**其他资源（可选，根据需要）**:
- [ ] Training资源（training:read, training:write等）
- [ ] Analytics资源（analytics:read等）

### 4. 创建组织角色

- [ ] 进入"Organization template" > "Organization roles"
- [ ] 创建以下角色：

**Admin角色**:
- Name: Admin
- Description: 组织管理员
- Permissions: 所有权限（kb:*, training:*等）

**Editor角色**:
- Name: Editor
- Description: 编辑者
- Permissions: kb:read, kb:write, training:read, training:write

**Viewer角色**:
- Name: Viewer
- Description: 查看者
- Permissions: kb:read, training:read

### 5. 创建第一个组织

- [ ] 进入"Organizations" > "Create organization"
- [ ] 名称：测试公司
- [ ] 记录Organization ID
- [ ] 为组织创建用户或添加现有用户
- [ ] 为用户分配角色

### 6. 创建应用（用于子项目）

- [ ] 进入"Applications" > "Create Application"
- [ ] 选择类型：Traditional Web 或 SPA
- [ ] 名称：AI Knowledge Base（子项目1）
- [ ] Redirect URI: http://localhost:8080/callback
- [ ] 记录Client ID和Client Secret

## ✅ 功能验证

### 1. 健康检查

```bash
./scripts/health-check.sh
```

预期结果：
- [ ] 所有服务显示✅正常
- [ ] 容器状态为Up
- [ ] 资源使用正常

### 2. 数据库验证

```bash
docker-compose exec postgres psql -U postgres -d logto -c "\dt"
```

预期结果：
- [ ] 看到Logto核心表（users, organizations等）
- [ ] 看到扩展表（tenant_quotas, tenant_settings等）

### 3. Custom API验证

```bash
# 健康检查
curl http://localhost:3003/health

# 带Service API Key的API调用
curl -X POST http://localhost:3003/api/v1/auth/verify-token \
  -H "Authorization: Bearer <SERVICE_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"token": "test"}'
```

预期结果：
- [ ] 健康检查返回200和健康状态
- [ ] API调用返回合法的JSON响应（即使token无效）

### 4. 完整OAuth流程测试

获取授权码：

```
浏览器访问：
http://localhost:3001/oidc/auth?
  response_type=code&
  client_id=<YOUR_CLIENT_ID>&
  redirect_uri=http://localhost:8080/callback&
  scope=openid profile email organizations&
  state=random_state&
  organization_id=<YOUR_ORG_ID>
```

- [ ] 登录成功后跳转到回调URL
- [ ] 获得authorization_code

交换Token：

```bash
curl -X POST http://localhost:3001/oidc/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=<AUTHORIZATION_CODE>" \
  -d "redirect_uri=http://localhost:8080/callback" \
  -d "client_id=<CLIENT_ID>" \
  -d "client_secret=<CLIENT_SECRET>"
```

- [ ] 获得access_token和id_token

验证Token：

```bash
curl -X POST http://localhost:3003/api/v1/auth/verify-token \
  -H "Authorization: Bearer <SERVICE_API_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"<ACCESS_TOKEN>\"}"
```

- [ ] 返回用户信息、组织信息和权限列表

### 5. 权限检查测试

```bash
curl -X POST http://localhost:3003/api/v1/auth/check-permission \
  -H "Authorization: Bearer <SERVICE_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<USER_ID>",
    "organizationId": "<ORG_ID>",
    "resource": "kb",
    "action": "read"
  }'
```

- [ ] 返回`{"allowed": true/false}`

### 6. 租户管理测试

```bash
# 获取租户信息
curl http://localhost:3003/api/v1/tenants/<ORG_ID> \
  -H "Authorization: Bearer <SERVICE_API_KEY>"

# 获取配额
curl http://localhost:3003/api/v1/tenants/<ORG_ID>/quota \
  -H "Authorization: Bearer <SERVICE_API_KEY>"
```

- [ ] 返回租户完整信息
- [ ] 返回配额数据

## 📊 性能验证

```bash
# 查看容器资源使用
docker stats

# 查看数据库连接数
docker-compose exec postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

预期：
- [ ] CPU使用 < 50%（空闲状态）
- [ ] 内存使用 < 4GB（空闲状态）
- [ ] 数据库连接数 < 10（空闲状态）

## 🔐 安全检查

- [ ] 生产环境已修改所有默认密码
- [ ] SERVICE_API_KEY使用强随机值
- [ ] JWT_SECRET使用强随机值
- [ ] 管理控制台配置了IP白名单（生产环境）
- [ ] SSL证书已配置（生产环境）
- [ ] 防火墙规则已配置（生产环境）

## 📚 文档验证

- [ ] 已阅读README.md了解项目概述
- [ ] 已阅读QUICK_START.md了解快速开始
- [ ] 已阅读DEPLOY.md了解部署选项
- [ ] 已阅读PROJECT_STATUS.md了解实施状态
- [ ] 已阅读docs/api-specification.md了解API规范

## 🎓 子项目集成准备

### 子项目1（AI知识库）集成清单

在子项目1的`.env`中配置：

```bash
# 用户中心配置
USER_CENTER_ENDPOINT=http://localhost:3003
USER_CENTER_API_KEY=<SERVICE_API_KEY>

# Logto配置（用于前端OAuth）
LOGTO_ENDPOINT=http://localhost:3001
LOGTO_APP_ID=<YOUR_CLIENT_ID>
LOGTO_APP_SECRET=<YOUR_CLIENT_SECRET>
```

- [ ] 已记录所有必要的配置值
- [ ] 已在子项目中创建认证中间件
- [ ] 已测试Token验证功能
- [ ] 已测试权限检查功能

## 🚨 故障排查清单

如遇问题，依次检查：

- [ ] 查看服务日志：`docker-compose logs -f`
- [ ] 检查端口占用：`lsof -i :3001`
- [ ] 检查容器状态：`docker-compose ps`
- [ ] 检查环境变量：`docker-compose exec custom-api env`
- [ ] 重启服务：`./scripts/restart.sh`
- [ ] 查看数据库连接：`docker-compose exec postgres psql -U postgres -c "SELECT 1"`
- [ ] 查看Redis连接：`docker-compose exec redis redis-cli ping`

## ✨ 完成！

当所有检查项都打勾后，用户中心已成功部署并可以投入使用！

下一步：
1. 将配置信息分发给子项目团队
2. 开始子项目1的集成开发
3. 根据实际使用情况调整配额和权限配置

---

**记录关键信息**（请妥善保存）：

- 管理员邮箱：_______________
- Organization ID：_______________
- Client ID（子项目1）：_______________
- Client Secret（子项目1）：_______________
- SERVICE_API_KEY：_______________
