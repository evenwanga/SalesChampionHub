# AI知识库管理平台 (AI Knowledge Base Management Platform)

> 子项目1 - 多租户AI知识库管理系统，支持三级挂载、向量搜索、完整RLS数据隔离

## 📋 项目概览

AI知识库管理平台是一个企业级的知识库管理系统，提供完整的多租户支持、细粒度权限控制和强大的向量搜索能力。系统采用PostgreSQL的Row-Level Security (RLS)实现数据库级别的数据隔离，确保租户数据安全。

### 核心特性

- ✅ **多租户架构**：完整的租户/组织/用户三级隔离
- ✅ **Row-Level Security**：数据库级别的数据隔离，自动过滤查询结果
- ✅ **三级挂载系统**：知识库可挂载到租户、组织或用户级别
- ✅ **优先级权限**：用户 > 组织 > 租户的权限继承机制
- ✅ **向量搜索**：基于pgvector的语义搜索（1024维embeddings）
- ✅ **混合搜索**：结合向量相似度和文本匹配的智能搜索
- ✅ **多层缓存**：Redis缓存热点数据，提升性能
- ✅ **完整认证**：与子项目0用户中心完全集成
- ✅ **RESTful API**：14个标准化API端点
- ✅ **中文Swagger UI**：交互式API文档，支持在线测试

## 🚀 快速开始

### 前置要求

- Go 1.25.3+
- Docker & Docker Compose
- 子项目0（用户中心）已启动

### 1. 启动依赖服务

\`\`\`bash
# 启动PostgreSQL + Redis
docker-compose up -d

# 验证服务状态
docker ps | grep -E 'kb-postgres|kb-redis'
\`\`\`

### 2. 配置环境变量

创建\`.env\`文件，参考\`.env.example\`

### 3. 初始化数据库

\`\`\`bash
psql -h localhost -p 5434 -U postgres -d knowledge_platform -f migrations/init/01_init_schema.sql
\`\`\`

### 4. 编译并运行

\`\`\`bash
go build -o bin/server ./cmd/server && ./bin/server
\`\`\`

服务器将在 \`http://localhost:8080\` 启动。

## 📚 API文档

### 🌐 交互式API文档 (Swagger UI)

**强烈推荐使用Swagger UI**来浏览和测试所有API端点！

访问地址：**http://localhost:8080/swagger/index.html**

Swagger UI提供：
- ✅ **中文界面** - 所有API说明都是中文的
- ✅ **交互测试** - 在浏览器中直接调用API
- ✅ **自动认证** - 一次配置Token，所有请求自动带上
- ✅ **请求构建器** - 可视化填写参数
- ✅ **实时响应** - 查看API返回结果
- ✅ **Schema浏览** - 完整的数据模型文档

### 认证端点

所有API端点需要JWT Token认证（通过\`Authorization: Bearer <token>\`）

#### 知识库管理

- \`GET /api/v1/knowledge-bases\` - 列出知识库
- \`POST /api/v1/knowledge-bases\` - 创建知识库
- \`GET /api/v1/knowledge-bases/:id\` - 获取知识库详情
- \`PUT /api/v1/knowledge-bases/:id\` - 更新知识库
- \`DELETE /api/v1/knowledge-bases/:id\` - 删除知识库
- \`GET /api/v1/knowledge-bases/:id/stats\` - 获取知识库统计

#### 挂载管理

- \`POST /api/v1/mounts/tenant\` - 挂载到租户
- \`POST /api/v1/mounts/organization\` - 挂载到组织
- \`POST /api/v1/mounts/user\` - 挂载到用户
- \`DELETE /api/v1/mounts/:id\` - 取消挂载

#### 用户相关

- \`GET /api/v1/me\` - 获取当前用户信息
- \`GET /api/v1/user/accessible-kbs\` - 获取用户可访问的知识库

## 🏗️ 核心设计

### 三级挂载系统

知识库通过挂载机制实现访问控制，优先级：**用户 > 组织 > 租户**

### RLS数据隔离

PostgreSQL RLS策略自动过滤所有查询，确保数据库级别安全。

### 多层缓存

- KB元数据：5分钟TTL
- 用户可访问KB列表：2分钟TTL
- 权限信息：5分钟TTL

## 📊 项目统计

- **Go代码**: 2,400+ 行
- **API端点**: 14个（全中文Swagger文档）
- **数据库表**: 6张
- **单元测试**: 15+ 用例
- **缓存策略**: 4层
- **文档**: Swagger UI + API示例

## 📝 更新日志

### v1.0.0 (2025-11-02)

✅ 核心功能全部完成：
- 知识库CRUD、三级挂载、RLS隔离
- Redis多层缓存、向量搜索基础设施
- 中文Swagger UI交互式API文档

---

**注意**：本项目需要配合子项目0（用户中心）一起使用。
