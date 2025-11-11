# AI 知识库前端 - Docker 部署指南

**最后更新**: 2025-11-11
**版本**: 1.0.0

---

## 概述

本文档描述如何使用 Docker 部署 AI 知识库管理平台前端应用。

### 技术栈

- **基础镜像**: Node 20 Alpine (构建) + Nginx Alpine (运行)
- **构建工具**: Vite 7
- **Web 服务器**: Nginx
- **端口**: 3000 (HTTP)

---

## 架构说明

### 多阶段构建

```
阶段 1: Builder (node:20-alpine)
  ├─ 安装依赖
  ├─ 构建应用 (npm run build)
  └─ 生成 dist/

阶段 2: Production (nginx:alpine)
  ├─ 复制 dist/ → /usr/share/nginx/html
  ├─ 配置 Nginx
  ├─ 运行时环境变量注入
  └─ 启动 Nginx
```

### 运行时环境变量

由于前端是静态构建，环境变量在运行时通过以下方式注入：

1. **docker-entrypoint.sh** 读取环境变量
2. 生成 **env-config.js** 文件
3. index.html 加载该文件
4. 应用通过 `window.__ENV__` 访问配置

---

## 快速开始

### 前置条件

1. **Docker 和 Docker Compose 已安装**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **基础设施层已启动**
   ```bash
   cd ../../infrastructure
   docker-compose ps
   # 确认 postgres, redis, kong 都在运行
   ```

3. **后端服务已启动** (可选，用于完整测试)
   ```bash
   cd ../01-ai-knowledge-base
   docker-compose ps
   # 确认 kb-api-server 在运行
   ```

### 一键启动

```bash
cd /Users/wangyiwen/produce/SalesChampionHub/projects/01-ai-knowledge-base-frontend

# 使用启动脚本
./scripts/start.sh
```

### 手动启动

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动容器
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 检查状态
docker-compose ps
curl http://localhost:3000/health
```

---

## 环境变量配置

### .env 文件

创建或编辑 `.env` 文件：

```bash
# Logto 配置
VITE_LOGTO_ENDPOINT=http://localhost:3001
VITE_LOGTO_APP_ID=kvci81ndlx6l7erivlz5i
VITE_LOGTO_REDIRECT_URI=http://localhost:3000/callback
VITE_LOGTO_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
VITE_LOGTO_API_RESOURCE=https://api.saleschampionhub.com/kb

# 后端 API 地址
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

### 环境变量说明

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `VITE_LOGTO_ENDPOINT` | Logto 服务器地址 | `http://localhost:3001` | ✅ |
| `VITE_LOGTO_APP_ID` | SPA Application ID | 无 | ✅ |
| `VITE_LOGTO_REDIRECT_URI` | OAuth 回调地址 | `http://localhost:3000/callback` | ✅ |
| `VITE_LOGTO_POST_LOGOUT_REDIRECT_URI` | 登出重定向地址 | `http://localhost:3000` | ✅ |
| `VITE_LOGTO_API_RESOURCE` | API Resource 标识 | `https://api.saleschampionhub.com/kb` | ✅ |
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:8080/api/v1` | ⚠️ |

---

## Docker Compose 配置

### 服务定义

```yaml
services:
  kb-frontend:
    container_name: kb-frontend
    build: .
    ports:
      - "3000:80"
    environment:
      # 从 .env 文件读取
    networks:
      - saleschampion-network
    restart: unless-stopped
```

### 网络配置

前端容器加入 `infrastructure_saleschampion_network` 网络，可以与以下服务通信：

- `saleschampion-postgres` (PostgreSQL)
- `saleschampion-redis` (Redis)
- `kong-gateway` (API Gateway)
- `logto-core` (Logto)
- `kb-api-server` (后端 API)

---

## Nginx 配置

### 主要特性

1. **SPA 路由支持**: 所有路由都返回 index.html
2. **静态资源缓存**: CSS/JS/图片缓存 1 年
3. **Gzip 压缩**: 减少传输大小
4. **安全 Headers**: XSS、Frame、Content-Type 保护
5. **健康检查**: `/health` 端点

### 配置文件

位置: `nginx.conf`

关键配置：
```nginx
location / {
    try_files $uri $uri/ /index.html;
}

location /health {
    return 200 "healthy\n";
}
```

---

## 常用命令

### 容器管理

```bash
# 查看日志
docker-compose logs -f kb-frontend

# 重启容器
docker-compose restart kb-frontend

# 停止容器
docker-compose stop kb-frontend

# 删除容器
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

### 调试

```bash
# 进入容器
docker exec -it kb-frontend sh

# 查看 Nginx 配置
docker exec kb-frontend cat /etc/nginx/conf.d/default.conf

# 查看环境配置
docker exec kb-frontend cat /usr/share/nginx/html/env-config.js

# 测试 Nginx 配置
docker exec kb-frontend nginx -t

# 重新加载 Nginx
docker exec kb-frontend nginx -s reload
```

### 清理

```bash
# 停止并删除容器、网络、卷
docker-compose down -v

# 删除镜像
docker rmi saleschampion/kb-frontend:latest

# 完全重建
docker-compose down -v && docker-compose up -d --build
```

---

## 验证部署

### 1. 健康检查

```bash
curl http://localhost:3000/health
# 预期输出: healthy
```

### 2. 访问前端

浏览器打开: http://localhost:3000

**预期结果**:
- ✅ 页面正常加载
- ✅ 自动重定向到登录页
- ✅ 静态资源正常加载（无 404）

### 3. 环境变量验证

浏览器 Console 执行:
```javascript
console.log(window.__ENV__)
// 应该显示所有配置的环境变量
```

### 4. Logto 集成测试

1. 点击"使用 Logto 登录"
2. 跳转到 Logto 登录页
3. 输入凭证登录
4. 成功跳转回前端

---

## 故障排查

### 问题 1: 容器启动失败

**症状**: `docker-compose up` 失败

**排查步骤**:
```bash
# 查看详细日志
docker-compose logs kb-frontend

# 常见原因:
# 1. 端口 3000 已被占用
lsof -i :3000

# 2. Docker 网络不存在
docker network ls | grep saleschampion

# 3. 构建失败
docker-compose build --no-cache
```

**解决方法**:
- 更换端口: 编辑 `docker-compose.yml` 中的 `ports: ["3001:80"]`
- 创建网络: 先启动 `infrastructure`
- 重新构建: `docker-compose build --no-cache`

---

### 问题 2: 环境变量未生效

**症状**: 登录时提示配置错误

**排查步骤**:
```bash
# 检查容器环境变量
docker exec kb-frontend env | grep VITE

# 检查生成的配置文件
docker exec kb-frontend cat /usr/share/nginx/html/env-config.js
```

**解决方法**:
1. 确认 `.env` 文件存在且正确
2. 重启容器: `docker-compose restart`
3. 重新构建: `docker-compose up -d --build`

---

### 问题 3: Logto 登录重定向失败

**症状**: 登录后无法回到前端

**原因**: Redirect URI 配置不匹配

**解决方法**:
1. 检查 `.env` 中的 `VITE_LOGTO_REDIRECT_URI`
2. 访问 Logto Admin Console (http://localhost:3002)
3. 确认 SPA Application 的 Redirect URIs 包含: `http://localhost:3000/callback`
4. 如使用不同端口，相应更新配置

---

### 问题 4: 静态资源 404

**症状**: CSS/JS 加载失败

**排查步骤**:
```bash
# 检查构建产物
docker exec kb-frontend ls -la /usr/share/nginx/html

# 查看 Nginx 错误日志
docker exec kb-frontend cat /var/log/nginx/error.log
```

**解决方法**:
- 重新构建: `docker-compose build --no-cache`
- 检查 Vite 构建配置

---

### 问题 5: API 调用失败 (CORS)

**症状**: Console 显示 CORS 错误

**原因**:
- 前端调用后端 API 时跨域
- Logto OIDC 端点跨域

**解决方法**:
1. **后端 API**: 确保后端启用 CORS
2. **Logto**: 在 Logto Admin Console 配置 CORS origins
   - 添加: `http://localhost:3000`

---

## 生产环境部署

### 使用 Kong 作为统一入口

修改 `docker-compose.yml`:

```yaml
services:
  kb-frontend:
    ports:
      - "3000:80"  # 仅暴露给 Kong，不对外
```

在 `infrastructure/kong/kong.yml` 添加前端路由:

```yaml
services:
  - name: kb-frontend-service
    url: http://kb-frontend:80
    routes:
      - name: kb-frontend-route
        paths:
          - /
        strip_path: false
```

访问: `http://localhost/` (通过 Kong)

---

### HTTPS 配置

1. **获取 SSL 证书** (Let's Encrypt 或自签名)

2. **更新 Nginx 配置**:

创建 `nginx-ssl.conf`:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... 其他配置
}
```

3. **挂载证书**:

```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
  - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf
```

---

### 环境变量（生产）

```bash
# .env.production
VITE_LOGTO_ENDPOINT=https://logto.saleschampionhub.com
VITE_LOGTO_APP_ID=<production-app-id>
VITE_LOGTO_REDIRECT_URI=https://kb.saleschampionhub.com/callback
VITE_LOGTO_POST_LOGOUT_REDIRECT_URI=https://kb.saleschampionhub.com
VITE_LOGTO_API_RESOURCE=https://api.saleschampionhub.com/kb
VITE_API_BASE_URL=https://api.saleschampionhub.com/api/v1
```

---

## 性能优化

### 构建优化

1. **使用 `.dockerignore`**: 已配置，减少构建上下文
2. **多阶段构建**: 已实现，减小最终镜像大小
3. **依赖缓存**: `npm ci` 使用锁定文件

### 运行优化

1. **Nginx Gzip**: 已启用，压缩传输
2. **静态资源缓存**: CSS/JS 缓存 1 年
3. **健康检查**: 30秒间隔，确保服务可用

### 镜像大小

- **构建镜像**: ~600MB (包含 Node.js 和所有依赖)
- **最终镜像**: ~50MB (仅 Nginx + 静态文件)

---

## 监控和日志

### 查看实时日志

```bash
# 所有日志
docker-compose logs -f

# 最近 100 行
docker-compose logs --tail=100

# 仅错误
docker-compose logs | grep -i error
```

### 日志文件位置

容器内:
- Nginx Access Log: `/var/log/nginx/access.log`
- Nginx Error Log: `/var/log/nginx/error.log`

导出日志:
```bash
docker exec kb-frontend cat /var/log/nginx/access.log > access.log
docker exec kb-frontend cat /var/log/nginx/error.log > error.log
```

---

## 安全建议

### 生产环境必做

1. **使用 HTTPS**
   - 配置 SSL 证书
   - 强制 HTTPS 重定向

2. **安全 Headers**
   - 已配置: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
   - 建议添加: Content-Security-Policy

3. **限制访问**
   - 使用防火墙规则
   - 仅允许必要的端口

4. **定期更新**
   - 更新 Node.js 基础镜像
   - 更新 Nginx 版本
   - 更新 npm 依赖

---

## 附录

### 文件结构

```
01-ai-knowledge-base-frontend/
├── Dockerfile                 # Docker 构建文件
├── docker-compose.yml         # Docker Compose 配置
├── .dockerignore             # Docker 忽略文件
├── nginx.conf                # Nginx 配置
├── docker-entrypoint.sh      # 容器启动脚本
├── env-config.template.js    # 环境配置模板
├── scripts/
│   └── start.sh             # 启动脚本
├── src/                     # 源代码
├── public/                  # 静态资源
└── dist/                    # 构建产物（构建后生成）
```

### 端口分配

| 服务 | 容器端口 | 宿主端口 | 说明 |
|------|---------|---------|------|
| kb-frontend | 80 | 3000 | 前端 HTTP |

### 相关文档

- [前端 Logto 集成指南](./FRONTEND_LOGTO_INTEGRATION.md)
- [集成完成总结](./INTEGRATION_COMPLETE.md)
- [App ID 更新记录](./APP_ID_UPDATE.md)
- [基础设施文档](../../infrastructure/README.md)

---

**维护者**: Claude Code
**最后更新**: 2025-11-11
**版本**: 1.0.0
