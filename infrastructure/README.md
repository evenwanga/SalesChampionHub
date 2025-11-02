# SalesChampionHub 共享基础设施层

## 概览

本目录包含SalesChampionHub生态系统的共享基础设施层，为所有子项目提供统一的数据库、缓存和API网关服务。

## 架构设计

```
外部请求
    ↓
Kong API Gateway (80/443)
    ├─ /api/v1/auth/*          → 子项目0 (用户中心 :3003)
    ├─ /api/v1/users/*         → 子项目0 (用户中心 :3003)
    ├─ /api/v1/tenants/*       → 子项目0 (用户中心 :3003)
    ├─ /api/v1/knowledge-bases/* → 子项目1 (知识库 :8080)
    ├─ /api/v1/mounts/*        → 子项目1 (知识库 :8080)
    └─ /docs/knowledge-base    → Swagger UI 聚合

共享基础设施
    ├─ PostgreSQL (5432)
    │   ├─ kong                # Kong配置库
    │   ├─ logto               # 用户中心库
    │   └─ knowledge_platform  # 知识库
    │
    └─ Redis (6379)
        ├─ DB 0: 用户中心缓存
        ├─ DB 1: 知识库缓存
        └─ DB 2: Kong缓存
```

## 服务列表

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| **PostgreSQL** | saleschampion-postgres | 5432 | 共享数据库 |
| **Redis** | saleschampion-redis | 6379 | 共享缓存 |
| **Kong Gateway** | kong-gateway | 80, 443, 8001, 8444 | API网关 |
| **Kong Deck** | kong-deck | - | 配置管理工具 |

## 快速开始

### 1. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量（可选，默认值可用）
vim .env
```

### 2. 启动基础设施

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3. 验证服务

```bash
# 检查 PostgreSQL
docker exec saleschampion-postgres psql -U postgres -c "\l"

# 检查 Redis
docker exec saleschampion-redis redis-cli -a SalesChampion_Redis_2024 INFO

# 检查 Kong
curl http://localhost:8001/status
```

## Kong 管理

### 查看当前配置

```bash
docker exec kong-deck deck dump
```

### 同步配置变更

```bash
# 编辑 kong/kong.yml 后同步
docker exec kong-deck deck sync
```

### 查看服务和路由

```bash
# 列出所有服务
curl http://localhost:8001/services

# 列出所有路由
curl http://localhost:8001/routes
```

## 端口分配

### 外部访问端口

- **80**: Kong HTTP 代理入口
- **443**: Kong HTTPS 代理入口
- **8001**: Kong Admin API
- **8444**: Kong Admin API SSL
- **5432**: PostgreSQL 数据库
- **6379**: Redis 缓存

### API 访问示例

```bash
# 用户中心 API（通过Kong）
curl http://localhost/api/v1/auth/verify-token

# 知识库 API（通过Kong）
curl http://localhost/api/v1/knowledge-bases

# Swagger UI
open http://localhost/docs/knowledge-base
```

## 数据库管理

### 访问 PostgreSQL

```bash
# 进入容器
docker exec -it saleschampion-postgres psql -U postgres

# 切换数据库
\c logto
\c knowledge_platform
\c kong

# 查看数据库列表
\l

# 查看表
\dt
```

### 备份数据库

```bash
# 备份所有数据库
docker exec saleschampion-postgres pg_dumpall -U postgres > backup_$(date +%Y%m%d).sql

# 备份特定数据库
docker exec saleschampion-postgres pg_dump -U postgres knowledge_platform > kb_backup.sql
```

### 恢复数据库

```bash
# 恢复所有数据库
cat backup.sql | docker exec -i saleschampion-postgres psql -U postgres

# 恢复特定数据库
cat kb_backup.sql | docker exec -i saleschampion-postgres psql -U postgres -d knowledge_platform
```

## Redis 管理

### 访问 Redis

```bash
# 进入 Redis CLI
docker exec -it saleschampion-redis redis-cli -a SalesChampion_Redis_2024

# 切换数据库
SELECT 0  # 用户中心
SELECT 1  # 知识库
SELECT 2  # Kong

# 查看所有键
KEYS *

# 查看数据库信息
INFO keyspace
```

### 清空缓存

```bash
# 清空特定数据库
docker exec saleschampion-redis redis-cli -a SalesChampion_Redis_2024 -n 1 FLUSHDB

# 清空所有数据库（谨慎使用）
docker exec saleschampion-redis redis-cli -a SalesChampion_Redis_2024 FLUSHALL
```

## 故障排查

### 查看服务日志

```bash
# 查看 PostgreSQL 日志
docker-compose logs -f postgres

# 查看 Redis 日志
docker-compose logs -f redis

# 查看 Kong 日志
docker-compose logs -f kong

# 查看所有服务日志
docker-compose logs -f
```

### 重启服务

```bash
# 重启单个服务
docker-compose restart postgres
docker-compose restart redis
docker-compose restart kong

# 重启所有服务
docker-compose restart
```

### 完全重建

```bash
# 停止并删除所有容器和卷（会清空数据！）
docker-compose down -v

# 重新启动
docker-compose up -d
```

## 性能优化

### PostgreSQL 优化

当前配置已针对中小型应用优化：
- `max_connections=300` - 最大连接数
- `shared_buffers=512MB` - 共享缓冲区
- `effective_cache_size=1GB` - 缓存大小

### Redis 优化

当前配置：
- `maxmemory=1gb` - 最大内存
- `maxmemory-policy=allkeys-lru` - LRU淘汰策略
- `databases=16` - 16个逻辑数据库

## 安全建议

### 生产环境必做

1. **修改默认密码**
   ```bash
   # 在 .env 中设置强密码
   POSTGRES_PASSWORD=<your-strong-password>
   REDIS_PASSWORD=<your-strong-password>
   ```

2. **限制网络访问**
   ```yaml
   # docker-compose.yml 中移除端口映射
   # ports:
   #   - "5432:5432"  # 仅通过内部网络访问
   ```

3. **启用 SSL/TLS**
   - PostgreSQL 启用 SSL
   - Redis 使用 TLS
   - Kong 配置 HTTPS 证书

4. **定期备份**
   - 设置自动备份计划
   - 测试备份恢复流程

## 监控

### Kong 监控端点

```bash
# Kong 状态
curl http://localhost:8001/status

# Prometheus 指标
curl http://localhost:8001/metrics
```

### 集成 Prometheus + Grafana（可选）

在 `docker-compose.yml` 中添加：

```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
```

## 资源占用

### 预期资源使用

| 服务 | 内存 | CPU | 磁盘 |
|------|------|-----|------|
| PostgreSQL | ~200MB | 低 | 根据数据量 |
| Redis | ~50-100MB | 低 | <100MB |
| Kong | ~100MB | 中 | <50MB |
| **总计** | ~350-400MB | - | - |

### 与原架构对比

| 项目 | 原架构 | 新架构 | 节省 |
|------|--------|--------|------|
| PostgreSQL 实例 | 2 | 1 | 50% |
| Redis 实例 | 2 | 1 | 50% |
| 内存占用 | ~600MB | ~400MB | 33% |
| 端口占用 | 6 | 4 | 33% |

## 维护任务

### 日常维护

- 每天检查日志
- 每周检查磁盘空间
- 每月执行数据库 VACUUM

### 定期维护

```bash
# PostgreSQL VACUUM
docker exec saleschampion-postgres vacuumdb -U postgres --all --analyze

# 检查数据库大小
docker exec saleschampion-postgres psql -U postgres -c "
SELECT datname, pg_size_pretty(pg_database_size(datname))
FROM pg_database
WHERE datname IN ('kong', 'logto', 'knowledge_platform');"
```

## 支持

- 问题反馈: [GitHub Issues](https://github.com/evenwanga/SalesChampionHub/issues)
- 文档: `docs/`
- Kong 文档: https://docs.konghq.com/
- PostgreSQL 文档: https://www.postgresql.org/docs/
- Redis 文档: https://redis.io/documentation
