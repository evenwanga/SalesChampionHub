# User Center Custom API

基于Logto的定制化用户中心API服务。

## 功能

- Token验证
- 权限检查
- 租户管理（配额、设置）
- 用户信息查询
- 审计日志
- 速率限制

## 开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 生产模式
npm start
```

## API端点

### 认证相关

- `POST /api/v1/auth/verify-token` - 验证Token
- `POST /api/v1/auth/check-permission` - 检查权限
- `POST /api/v1/auth/revoke-token` - 吊销Token
- `GET /api/v1/auth/permissions/:userId/:organizationId` - 获取用户权限

### 租户相关

- `POST /api/v1/tenants` - 创建租户
- `GET /api/v1/tenants/:organizationId` - 获取租户信息
- `GET /api/v1/tenants/:organizationId/quota` - 获取配额
- `PATCH /api/v1/tenants/:organizationId/quota` - 更新配额
- `GET /api/v1/tenants/:organizationId/settings` - 获取设置
- `PATCH /api/v1/tenants/:organizationId/settings` - 更新设置
- `POST /api/v1/tenants/:organizationId/check-quota` - 检查配额

### 用户相关

- `GET /api/v1/users/:userId` - 获取用户信息
- `GET /api/v1/users/:userId/organizations/:organizationId/roles` - 获取角色
- `GET /api/v1/users/:userId/organizations/:organizationId/permissions` - 获取权限

## 认证

所有API调用需要在请求头中提供Service API Key：

```
Authorization: Bearer <SERVICE_API_KEY>
```

## Docker部署

```bash
# 构建镜像
docker build -t user-center-custom-api .

# 运行容器
docker run -p 3003:3003 \
  -e DB_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e SERVICE_API_KEY=... \
  user-center-custom-api
```
