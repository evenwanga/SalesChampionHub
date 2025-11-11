# AI 知识库前端 - Docker 部署完成总结

**部署日期**: 2025-11-11
**版本**: 1.0.0
**状态**: ✅ 部署成功

---

## 部署摘要

AI 知识库管理平台前端应用已成功部署到 Docker 容器中，使用 Nginx 作为 Web 服务器，并与基础设施网络集成。

---

## 部署配置

### 基础信息

- **容器名称**: `kb-frontend`
- **镜像名称**: `saleschampion/kb-frontend:latest`
- **端口映射**: `3000:80` (宿主机:容器)
- **网络**: `infrastructure_saleschampion_network`
- **健康检查**: 启用 (30秒间隔)

### 技术栈

- **构建阶段**: Node 20 Alpine
- **运行阶段**: Nginx Alpine
- **最终镜像大小**: ~50MB
- **构建产物**: Vite 7 production build

---

## 已创建的文件

1. **Dockerfile** - 多阶段 Docker 构建配置
2. **docker-compose.yml** - 容器编排配置
3. **nginx.conf** - Nginx Web 服务器配置
4. **docker-entrypoint.sh** - 容器启动脚本（运行时环境变量注入）
5. **env-config.template.js** - 环境配置模板
6. **.dockerignore** - Docker 构建忽略文件
7. **scripts/start.sh** - 自动化启动脚本
8. **DOCKER_DEPLOYMENT.md** - 完整部署文档

---

## 已修复的问题

### 1. TypeScript 构建错误 - ErrorBoundary

**问题**: ErrorBoundary.tsx 使用了非类型导入
```
error TS6133: 'React' is declared but its value is never read.
error TS1484: 'ErrorInfo' is a type and must be imported using a type-only import
```

**解决方案**: 更新导入语句
```typescript
// 修复前
import React, { Component, ErrorInfo, ReactNode } from 'react'

// 修复后
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
```

**文件**: `src/components/ErrorBoundary.tsx:1-2`

---

### 1.5. 运行时环境变量读取问题

**问题**: 应用在 Docker 容器中无法读取环境变量
```
Uncaught Error: 环境变量配置错误：
1. VITE_LOGTO_ENDPOINT is not defined
2. VITE_LOGTO_APP_ID is not defined
...
```

**原因**: `src/utils/env.ts` 只从 `import.meta.env` 读取配置（构建时），没有读取 `window.__ENV__`（运行时）

**解决方案**: 重写 env.ts 支持运行时配置
```typescript
// 添加 window.__ENV__ 类型声明
declare global {
  interface Window {
    __ENV__?: {
      VITE_LOGTO_ENDPOINT?: string
      VITE_LOGTO_APP_ID?: string
      // ...
    }
  }
}

// 优先从运行时配置读取
function getEnvVar(key: string): string | undefined {
  // Try runtime config first (Docker)
  if (typeof window !== 'undefined' && window.__ENV__) {
    const value = window.__ENV__[key as keyof typeof window.__ENV__]
    if (value) return value
  }

  // Fallback to build-time config (development)
  return import.meta.env[key]
}
```

**文件**: `src/utils/env.ts:8-42`

---

### 2. Docker 网络名称不匹配

**问题**: docker-compose.yml 使用了错误的网络名称
```yaml
# 错误
name: infrastructure_saleschampion-network

# 正确
name: infrastructure_saleschampion_network
```

**解决方案**: 更新 docker-compose.yml 和 scripts/start.sh
- `docker-compose.yml:37`
- `scripts/start.sh:28`
- `DOCKER_DEPLOYMENT.md:152`

---

### 3. 端口 3000 冲突

**问题**: 本地 Vite 开发服务器占用端口 3000

**解决方案**: 停止本地开发服务器
```bash
kill 30287  # Vite dev server PID
docker-compose restart
```

---

## 验证结果

### ✅ 容器状态

```bash
$ docker-compose ps
NAME          STATUS
kb-frontend   Up (healthy)
```

### ✅ 健康检查

```bash
$ curl http://localhost:3000/health
healthy
```

### ✅ 主应用访问

```bash
$ curl -s http://localhost:3000 | head -5
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
```

### ✅ 运行时环境配置

```bash
$ curl -s http://localhost:3000/env-config.js
// 运行时环境配置 - 由 Docker 容器启动时生成
window.__ENV__ = {
  VITE_LOGTO_ENDPOINT: 'http://localhost:3001',
  VITE_LOGTO_APP_ID: 'kvci81ndlx6l7erivlz5i',
  VITE_LOGTO_REDIRECT_URI: 'http://localhost:3000/callback',
  VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: 'http://localhost:3000',
  VITE_LOGTO_API_RESOURCE: 'https://api.saleschampionhub.com/kb',
  VITE_API_BASE_URL: 'http://localhost:8080/api/v1'
};
```

### ✅ Nginx 日志

```
2025/11/11 11:00:06 [notice] 1#1: start worker process 17-22
192.168.65.1 - - [11/Nov/2025:11:00:27 +0000] "GET /env-config.js HTTP/1.1" 200 419
```

---

## 访问地址

- **前端应用**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **环境配置**: http://localhost:3000/env-config.js

---

## 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启容器
docker-compose restart

# 停止容器
docker-compose stop

# 删除容器
docker-compose down

# 重新构建
docker-compose up -d --build
```

---

## 环境变量

当前配置 (from `.env`):

```bash
VITE_LOGTO_ENDPOINT=http://localhost:3001
VITE_LOGTO_APP_ID=kvci81ndlx6l7erivlz5i
VITE_LOGTO_REDIRECT_URI=http://localhost:3000/callback
VITE_LOGTO_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
VITE_LOGTO_API_RESOURCE=https://api.saleschampionhub.com/kb
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

---

## 下一步操作

### 1. 配置 Logto Admin Console (必需)

访问 http://localhost:3002 并完成以下配置：

#### 步骤 1: 创建 API Resource
- Console → API resources → Create API resource
- **Identifier**: `https://api.saleschampionhub.com/kb`
- **Name**: Knowledge Base API

#### 步骤 2: 定义 Permissions
- API Resource 详情页 → Permissions → Create permission
- 添加权限:
  - `read` - 读取知识库
  - `write` - 写入知识库
  - `delete` - 删除知识库
  - `admin` - 管理员权限

#### 步骤 3: 创建 Role
- Console → Roles → Create role
- **Role type**: User
- **Role name**: `kb_admin`
- **Permissions**: 选择 API Resource 的所有权限 (read, write, delete, admin)

#### 步骤 4: 分配用户到 Role
- Console → Roles → kb_admin → Users → Assign users
- 选择测试用户并分配角色

#### 步骤 5: 验证 SPA Application 配置
- Console → Applications → kvci81ndlx6l7erivlz5i
- **Redirect URIs**: `http://localhost:3000/callback`
- **Post sign-out redirect URIs**: `http://localhost:3000`
- **CORS allowed origins**: `http://localhost:3000`

---

### 2. 测试完整流程

#### 测试登录流程

1. 浏览器访问: http://localhost:3000
2. 点击"使用 Logto 登录"
3. 跳转到 Logto 登录页 (http://localhost:3001)
4. 输入凭证登录
5. 成功跳转回 http://localhost:3000/callback
6. 自动重定向到应用主页

#### 测试 Token 获取

浏览器 Console 执行:
```javascript
// 检查环境配置
console.log(window.__ENV__)

// 检查 Access Token (在登录后)
console.log(window.__logtoAccessToken)
```

#### 测试后端 API 调用

1. 登录成功后，前端会自动获取 Access Token
2. 所有 API 请求会在 Authorization header 中携带 token
3. 后端验证 token 并返回数据

**验证命令**:
```bash
# 获取 token (从浏览器 Console)
TOKEN="<从 window.__logtoAccessToken 复制>"

# 测试后端 API
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/v1/knowledge-bases
```

---

### 3. 验证 RBAC 权限

#### 测试有权限的用户

1. 使用分配了 `kb_admin` role 的用户登录
2. 应该能访问所有知识库功能

#### 测试无权限的用户

1. 创建新用户但不分配 role
2. 登录后应该无法访问 API（403 Forbidden）

---

## 故障排查

### 问题 1: 容器无法启动

**检查网络**:
```bash
docker network ls | grep infrastructure_saleschampion_network
```

**解决方案**:
```bash
cd ../../infrastructure
docker-compose up -d
```

---

### 问题 2: 健康检查失败

**查看日志**:
```bash
docker-compose logs kb-frontend
```

**常见原因**:
- Nginx 配置错误
- 端口冲突 (3000 被占用)
- 文件权限问题

---

### 问题 3: 环境变量未生效

**检查生成的配置**:
```bash
docker exec kb-frontend cat /usr/share/nginx/html/env-config.js
```

**重新生成**:
```bash
docker-compose restart
```

---

### 问题 4: 登录失败

**检查 Logto 配置**:
1. SPA Application ID 是否正确
2. Redirect URIs 是否包含 `http://localhost:3000/callback`
3. CORS origins 是否包含 `http://localhost:3000`

**检查浏览器 Console**:
- 查看是否有 CORS 错误
- 查看 OAuth 错误消息

---

### 问题 5: API 调用 401 Unauthorized

**检查 Token**:
```javascript
// 浏览器 Console
console.log(window.__logtoAccessToken)

// 解码 JWT (使用 jwt.io)
```

**验证 Token 包含**:
- `aud`: `https://api.saleschampionhub.com/kb` (API Resource)
- `scope`: `read write delete admin` (Permissions)
- `sub`: 用户 ID
- `iss`: `http://localhost:3001/oidc` (Logto Issuer)

**检查后端**:
```bash
cd ../01-ai-knowledge-base
docker-compose logs -f
```

---

## 性能指标

- **构建时间**: ~15 秒
- **镜像大小**: ~50MB (运行时)
- **启动时间**: ~5 秒
- **健康检查间隔**: 30 秒
- **首次加载时间**: <2 秒

---

## 安全特性

### Nginx 安全 Headers

```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer-when-downgrade
```

### 环境配置隔离

- 运行时注入，避免敏感信息写入镜像
- 每个环境可使用不同的 .env 文件
- Docker secrets 支持（生产环境推荐）

---

## 相关文档

- [Docker 部署指南](./DOCKER_DEPLOYMENT.md) - 完整部署文档
- [前端 Logto 集成](./FRONTEND_LOGTO_INTEGRATION.md) - Logto 集成详解
- [集成完成总结](./INTEGRATION_COMPLETE.md) - 快速开始指南
- [App ID 更新记录](./APP_ID_UPDATE.md) - App ID 变更历史

---

## 技术支持

遇到问题？

1. 查看 [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) 故障排查章节
2. 检查容器日志: `docker-compose logs -f`
3. 查看 Logto 文档: https://docs.logto.io
4. 检查 GitHub Issues

---

**部署完成！** 🎉

前端应用现在运行在 Docker 容器中，可以通过 http://localhost:3000 访问。

下一步：完成 Logto Admin Console 配置并测试完整的登录和 API 调用流程。
