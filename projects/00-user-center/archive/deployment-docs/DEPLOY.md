# 部署指南

## 快速部署（本地开发）

### 1. 环境准备

- Docker & Docker Compose
- 8GB+ 内存
- 端口：3001, 3002, 3003, 5432, 6379 未被占用

### 2. 一键启动

```bash
# 克隆并进入目录
cd /Users/wangyiwen/produce/SalesChampionHub/projects/00-user-center

# 复制环境配置
cp .env.example .env

# 编辑.env，修改必要的密码
vi .env

# 启动服务
./scripts/start.sh
```

等待30秒，所有服务启动完成。

### 3. 访问系统

- **管理控制台**: http://localhost:3002
- **Logto API**: http://localhost:3001
- **Custom API**: http://localhost:3003

### 4. 创建第一个租户

```bash
./scripts/create-first-tenant.sh
```

按照提示在管理控制台创建组织和应用。

## 常用命令

```bash
# 启动服务
./scripts/start.sh

# 停止服务
./scripts/stop.sh

# 重启服务
./scripts/restart.sh

# 健康检查
./scripts/health-check.sh

# 备份数据
./scripts/backup.sh

# 测试API
./scripts/test-api.sh

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f logto
docker-compose logs -f custom-api

# 进入数据库
docker-compose exec postgres psql -U postgres -d logto
```

## 生产环境部署

### 1. 安全配置

在生产环境部署前，必须修改以下配置：

```bash
# .env文件
DB_PASSWORD=<strong-random-password>
REDIS_PASSWORD=<strong-random-password>
JWT_SECRET=<random-256-bit-key>
SERVICE_API_KEY=<random-api-key>

# 生成方法
openssl rand -base64 32  # JWT_SECRET
openssl rand -hex 32     # SERVICE_API_KEY
openssl rand -base64 24  # DB_PASSWORD
```

### 2. 域名配置

修改.env文件：

```bash
ENDPOINT=https://auth.yourdomain.com
ADMIN_ENDPOINT=https://auth-admin.yourdomain.com
```

### 3. SSL证书

将证书放在`deployments/nginx/certs/`目录：

```
deployments/nginx/certs/
├── fullchain.pem
└── privkey.pem
```

### 4. 启用Nginx

取消docker-compose.yml中nginx服务的注释，然后启动：

```bash
docker-compose --profile production up -d
```

### 5. 数据备份

设置定时备份（crontab）：

```bash
# 每天凌晨2点备份
0 2 * * * cd /path/to/00-user-center && ./scripts/backup.sh
```

## Kubernetes部署

参考`docs/deployment-guide.md`中的Kubernetes部署章节。

## 监控

### 健康检查端点

```bash
# Logto
curl http://localhost:3001/api/health

# Custom API
curl http://localhost:3003/health
curl http://localhost:3003/health/liveness
curl http://localhost:3003/health/readiness
```

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看数据库连接数
docker-compose exec postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

## 故障排查

### 服务启动失败

```bash
# 查看日志
docker-compose logs logto
docker-compose logs postgres

# 检查端口占用
lsof -i :3001

# 重启服务
docker-compose restart logto
```

### 数据库连接失败

```bash
# 检查PostgreSQL
docker-compose ps postgres

# 测试连接
docker-compose exec postgres psql -U postgres -c "SELECT 1"
```

### Custom API错误

```bash
# 查看详细日志
docker-compose logs -f custom-api

# 检查环境变量
docker-compose exec custom-api env

# 进入容器调试
docker-compose exec custom-api sh
```

## 子项目集成

子项目（如01-ai-knowledge-base）需要以下配置：

```bash
# 子项目.env
USER_CENTER_ENDPOINT=http://localhost:3003
USER_CENTER_API_KEY=<SERVICE_API_KEY>

LOGTO_ENDPOINT=http://localhost:3001
LOGTO_APP_ID=<your_client_id>
LOGTO_APP_SECRET=<your_client_secret>
```

详细集成方法参考`QUICK_START.md`中的SDK使用示例。

## 文档

- [快速启动](QUICK_START.md) - 5分钟快速上手
- [技术设计](docs/technical-design.md) - 完整的技术设计文档
- [API规范](docs/api-specification.md) - API接口文档
- [开发路线图](docs/roadmap.md) - 开发计划和里程碑
