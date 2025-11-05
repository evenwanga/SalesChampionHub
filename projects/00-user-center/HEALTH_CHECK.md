# 用户中心服务健康检查指南

> **重要提示**: 在对服务进行任何修改或排查问题之前，请先按照本指南检查服务健康状态，避免破坏正常工作的服务。

## 快速检查命令

```bash
# 进入项目目录
cd /Users/wangyiwen/produce/SalesChampionHub/projects/00-user-center

# 运行完整健康检查
./health_check.sh
```

---

## 1. 容器运行状态检查

### 1.1 检查容器是否运行

```bash
docker ps --filter "name=logto" --filter "name=user-center"
```

**预期结果**（健康状态）:
```
CONTAINER ID   IMAGE                           STATUS                 PORTS
xxxxxxxxxx     ghcr.io/logto-io/logto:latest  Up X hours (healthy)   0.0.0.0:3001-3002->3001-3002/tcp
xxxxxxxxxx     user-center-custom-api          Up X hours (healthy)   0.0.0.0:3003->3003/tcp
```

**判断标准**:
- ✅ Status 显示 "Up" 且包含 "(healthy)"
- ✅ 端口映射正确: 3001, 3002, 3003
- ❌ 如果显示 "Restarting" 或 "Exited" - 服务异常

---

## 2. Logto Core API 健康检查

### 2.1 检查 Logto 核心服务

```bash
curl -s http://localhost:3001/api/status
```

**预期结果**（健康状态）:
- HTTP 状态码: `204 No Content`
- 无输出内容（正常）

**判断标准**:
- ✅ 返回 204 状态码
- ❌ 连接被拒绝 - Logto 服务未启动
- ❌ 返回 500 错误 - Logto 服务异常

### 2.2 检查 OIDC 配置端点

```bash
curl -s http://localhost:3001/oidc/.well-known/openid-configuration | jq '.issuer'
```

**预期结果**（健康状态）:
```json
"http://localhost:3001/oidc"
```

**判断标准**:
- ✅ 返回正确的 issuer URL
- ❌ 返回错误或无响应 - OIDC 配置异常

---

## 3. Logto Admin Console 健康检查

### 3.1 检查管理控制台可访问性

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002
```

**预期结果**（健康状态）:
- HTTP 状态码: `200` 或 `302` (重定向)

**判断标准**:
- ✅ 返回 200 或 302
- ❌ 返回 500 - 服务器内部错误
- ❌ 连接被拒绝 - 服务未启动

### 3.2 浏览器访问测试

访问: http://localhost:3002

**预期结果**（健康状态）:
- 显示 Logto 管理控制台登录页面或欢迎页面
- 无 JavaScript 错误

---

## 4. 数据库连接检查

### 4.1 检查 Logto 数据库

```bash
docker exec saleschampion-postgres psql -U postgres -d logto -c "SELECT COUNT(*) FROM applications;"
```

**预期结果**（健康状态）:
```
 count
-------
     X
(1 row)
```

**判断标准**:
- ✅ 成功返回数字（表明数据库正常且有数据）
- ❌ "database does not exist" - 数据库不存在
- ❌ "relation does not exist" - 数据表未初始化

### 4.2 检查关键数据表是否存在

```bash
docker exec saleschampion-postgres psql -U postgres -d logto -c "\dt" | grep -E "applications|users|_logto_configs"
```

**预期结果**（健康状态）:
```
public | applications      | table | postgres
public | users            | table | postgres
public | _logto_configs   | table | postgres
```

**判断标准**:
- ✅ 三个关键表都存在
- ❌ 表不存在 - 数据库未正确初始化

---

## 5. User Center Custom API 健康检查

### 5.1 检查健康端点

```bash
curl -s http://localhost:3003/health
```

**预期结果**（健康状态）:
```json
{"status":"ok"}
```

**判断标准**:
- ✅ 返回 status: ok
- ❌ 无响应 - 服务未启动
- ❌ 返回错误 - 服务异常

---

## 6. 认证流程端到端测试

### 6.1 检查 Logto 应用配置

访问 Logto Admin Console (http://localhost:3002)，进入 Applications：

**检查项目**:
- [ ] 至少有一个 Traditional Web 应用
- [ ] 应用的 Redirect URIs 已配置
- [ ] 应用的 App ID 存在

### 6.2 检查测试用户

访问 User Management > Users：

**检查项目**:
- [ ] 至少有一个测试用户
- [ ] 用户状态为 Active

---

## 7. 容器日志检查

### 7.1 检查 Logto 日志

```bash
docker logs logto-core --tail 50 --since 5m
```

**健康标志**:
- ✅ 无 "error" 或 "fatal" 级别日志
- ✅ 无频繁的数据库连接错误
- ✅ 无 "Restarting" 消息

**异常标志**:
- ❌ 出现 "Error while initializing app"
- ❌ 出现 "password authentication failed"
- ❌ 出现 "relation does not exist"

### 7.2 检查 Custom API 日志

```bash
docker logs user-center-custom-api --tail 50 --since 5m
```

**健康标志**:
- ✅ 无持续的错误日志
- ✅ API 请求日志正常

---

## 8. 数据持久化验证

### 8.1 检查 PostgreSQL 数据目录

```bash
ls -lh /Users/wangyiwen/produce/SalesChampionHub/docker_data/postgres/ | head -10
```

**预期结果**（健康状态）:
- ✅ 目录存在且包含数据文件
- ✅ 最近修改时间为近期（说明数据在更新）

### 8.2 检查数据库备份（可选）

```bash
ls -lh /Users/wangyiwen/produce/SalesChampionHub/backups/logto_*.sql 2>/dev/null || echo "无备份文件"
```

**建议**:
- 定期创建数据库备份
- 备份命令: `docker exec saleschampion-postgres pg_dump -U postgres logto > backups/logto_$(date +%Y%m%d_%H%M%S).sql`

---

## 9. 网络连接检查

### 9.1 检查容器网络

```bash
docker network inspect infrastructure_saleschampion_network | jq '.[0].Containers | keys'
```

**预期结果**（健康状态）:
```json
[
  "logto-core",
  "saleschampion-postgres",
  "user-center-custom-api",
  ...
]
```

**判断标准**:
- ✅ 所有必需容器都在同一网络
- ❌ 容器不在网络中 - 网络配置错误

---

## 10. 配置文件完整性检查

### 10.1 检查环境变量配置

```bash
# 检查 docker-compose.yml 中的数据库密码配置
grep "DB_PASSWORD" /Users/wangyiwen/produce/SalesChampionHub/infrastructure/.env
```

**预期结果**（健康状态）:
```
POSTGRES_PASSWORD=SalesChampion_PG_2024!Secure
```

### 10.2 检查 Docker Compose 配置

```bash
cd /Users/wangyiwen/produce/SalesChampionHub/projects/00-user-center
docker-compose config --quiet && echo "✅ 配置文件语法正确" || echo "❌ 配置文件有语法错误"
```

---

## 健康状态汇总检查清单

将以下检查项逐一执行并记录结果：

- [ ] 1. 容器运行状态正常
- [ ] 2. Logto Core API 响应正常 (3001端口)
- [ ] 3. Logto Admin Console 可访问 (3002端口)
- [ ] 4. 数据库连接正常且数据完整
- [ ] 5. Custom API 健康检查通过 (3003端口)
- [ ] 6. 容器日志无错误
- [ ] 7. 数据持久化目录正常
- [ ] 8. 网络配置正确
- [ ] 9. 至少有一个应用和测试用户配置

**判断标准**:
- ✅ **服务健康**: 所有检查项通过
- ⚠️ **需要关注**: 1-2个检查项失败但服务仍可用
- ❌ **服务异常**: 3个或以上检查项失败

---

## 常见问题诊断

### 问题1: 容器频繁重启

**诊断步骤**:
1. 检查容器日志: `docker logs logto-core --tail 100`
2. 查找错误关键词: "error", "fatal", "failed"
3. 常见原因:
   - 数据库连接失败（密码错误）
   - 数据库未初始化
   - 内存不足

### 问题2: Admin Console 返回 500 错误

**诊断步骤**:
1. 检查数据库连接: 执行 "4. 数据库连接检查"
2. 检查数据表是否存在: 执行 "4.2 检查关键数据表"
3. 检查 Logto 日志: `docker logs logto-core --tail 50`

### 问题3: OAuth 登录失败

**诊断步骤**:
1. 检查应用配置是否存在: 访问 http://localhost:3002
2. 验证 Redirect URIs 配置
3. 检查 CORS 配置
4. 验证前端 .env 中的 APP_ID 是否正确

---

## 紧急恢复步骤

如果服务完全失效，按以下顺序操作：

### 1. 停止所有服务（不删除数据）

```bash
cd /Users/wangyiwen/produce/SalesChampionHub/projects/00-user-center
docker-compose stop
```

### 2. 检查数据完整性

```bash
# 检查数据库数据
docker start saleschampion-postgres
docker exec saleschampion-postgres psql -U postgres -c "\l" | grep logto

# 如果数据库存在，数据应该是完整的
```

### 3. 重启服务

```bash
docker-compose up -d
```

### 4. 等待服务健康

```bash
# 等待30秒让服务启动
sleep 30

# 运行健康检查
docker ps --filter "name=logto"
curl http://localhost:3001/api/status
```

---

## 备份建议

### 创建完整备份

```bash
#!/bin/bash
# 创建日期时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/Users/wangyiwen/produce/SalesChampionHub/backups"

mkdir -p $BACKUP_DIR

# 备份 Logto 数据库
docker exec saleschampion-postgres pg_dump -U postgres logto > "$BACKUP_DIR/logto_$TIMESTAMP.sql"

# 备份配置文件
cp /Users/wangyiwen/produce/SalesChampionHub/projects/00-user-center/docker-compose.yml "$BACKUP_DIR/docker-compose_$TIMESTAMP.yml"

echo "✅ 备份完成: $BACKUP_DIR/logto_$TIMESTAMP.sql"
```

### 从备份恢复

```bash
# 恢复数据库
docker exec -i saleschampion-postgres psql -U postgres -d logto < backups/logto_YYYYMMDD_HHMMSS.sql
```

---

## 维护建议

1. **每次修改前**: 运行完整健康检查
2. **每天一次**: 检查容器状态和日志
3. **每周一次**: 创建数据库备份
4. **每月一次**: 清理旧日志和备份

---

## 联系与支持

如果健康检查发现问题，请先：
1. 记录所有检查结果
2. 收集相关日志
3. 检查是否有最近的备份
4. 然后再进行修复操作

**重要**: 在执行任何破坏性操作（如 DROP DATABASE、删除容器等）前，务必先创建备份！
