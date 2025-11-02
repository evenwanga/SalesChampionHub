# 快速启动指南

**项目**: 多租户AI知识库管理平台 (基于 WeKnora)
**开始日期**: 2025-10-31

---

## 🎯 项目概览

基于腾讯开源的 **WeKnora** 框架进行二次开发，构建支持多租户的企业级AI知识库管理平台。

### 核心目标
- ✅ 利用 WeKnora 的文档解析和 RAG 能力
- ✅ 扩展多租户架构（Schema 级隔离）
- ✅ 企业级权限管理
- ✅ 为 SalesChampionHub 生态提供知识库基础设施

### 预计周期
**8-10周** (已考虑 WeKnora 框架加速因素)

---

## 📚 核心文档导航

在开始前，请阅读以下文档：

1. **[技术设计文档](./docs/technical-design.md)** ⭐ 必读
   - 完整的技术架构设计
   - 多租户隔离策略
   - 数据库设计
   - API 设计

2. **[架构概览](./docs/architecture-overview.md)** ⭐ 必读
   - 系统架构图
   - 核心设计决策
   - 数据流图
   - 性能指标

3. **[开发路线图](./docs/roadmap.md)**
   - 10周详细开发计划
   - 每周任务清单
   - 里程碑与交付物

4. **[整体生态规划](../../docs/architecture-planning-discussion.md)**
   - SalesChampionHub 完整架构
   - 8个子项目规划
   - 分阶段实施计划

---

## 🚀 第一周行动计划

### Day 1: WeKnora 环境搭建

#### 1. Fork 和克隆 WeKnora

```bash
# Fork 仓库到您的组织（GitHub 网页操作）
# 然后克隆
git clone https://github.com/Tencent/WeKnora.git weknora-source
cd weknora-source

# 添加上游远程仓库（用于同步更新）
git remote add upstream https://github.com/Tencent/WeKnora.git
```

#### 2. 本地部署 WeKnora

```bash
# 方式1: Docker Compose (推荐)
docker-compose up -d

# 方式2: 本地部署
# 参考 WeKnora README.md
```

#### 3. 验证基础功能

访问: `http://localhost:8080`

测试功能:
- [ ] 创建知识库
- [ ] 上传文档 (PDF/Word)
- [ ] 语义检索
- [ ] RAG 问答

#### 4. 阅读 WeKnora 源码

重点关注:
- `/backend` - Go 后端代码结构
- `/frontend` - React 前端代码
- `/docs/API.md` - API 文档
- 数据库 Schema

---

### Day 2-3: 项目基础架构搭建

#### 1. 创建项目目录

```bash
cd /Users/wangyiwen/produce/SalesChampionHub/projects/01-ai-knowledge-base

# 创建源代码目录
mkdir -p src/{tenant-service,auth-service,gateway,weknora-ext,common}
mkdir -p src/frontend
mkdir -p tests/{unit,integration,e2e}
mkdir -p deployments/{docker,k8s}
mkdir -p scripts/{db,build}
```

#### 2. 初始化 Go 模块

```bash
cd src
go mod init github.com/SalesChampionHub/ai-knowledge-base

# 添加依赖
go get github.com/gin-gonic/gin
go get github.com/golang-jwt/jwt/v5
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/redis/go-redis/v9
```

#### 3. 创建 Docker Compose 配置

`deployments/docker/docker-compose.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL with pgvector
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: knowledge_platform
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/db:/docker-entrypoint-initdb.d
    networks:
      - kb_network

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - kb_network

  # Nginx (API Gateway)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api-server
    networks:
      - kb_network

  # API Server (待开发)
  api-server:
    build: ../../src
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: knowledge_platform
      DB_USER: admin
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - postgres
      - redis
    networks:
      - kb_network

volumes:
  postgres_data:
  redis_data:

networks:
  kb_network:
    driver: bridge
```

#### 4. 创建环境变量文件

`.env`:
```bash
# Database
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE_HOURS=24

# Server
SERVER_PORT=8080
SERVER_MODE=debug  # debug/release
```

---

### Day 4-5: 数据库设计实现

#### 1. 创建数据库迁移脚本

`scripts/db/001_create_schemas.sql`:

```sql
-- 创建公共 Schema
CREATE SCHEMA IF NOT EXISTS tenant_common;

-- 租户表
CREATE TABLE tenant_common.tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    plan VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    quota JSONB DEFAULT '{
        "max_users": 10,
        "max_kbs": 5,
        "max_docs": 1000,
        "max_storage_mb": 10240,
        "max_api_calls_day": 10000
    }'::jsonb
);

-- 用户表
CREATE TABLE tenant_common.users (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) REFERENCES tenant_common.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    roles TEXT[] DEFAULT ARRAY['viewer'],
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_tenant ON tenant_common.users(tenant_id);
CREATE INDEX idx_users_email ON tenant_common.users(email);
CREATE INDEX idx_users_status ON tenant_common.users(status);

-- 租户 Schema 模板函数
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_id VARCHAR(50))
RETURNS VOID AS $$
BEGIN
    -- 创建租户 Schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS tenant_%s', tenant_id);

    -- 知识库表
    EXECUTE format('
        CREATE TABLE tenant_%s.knowledge_bases (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            owner_id VARCHAR(50),
            visibility VARCHAR(20) DEFAULT ''private'',
            tags TEXT[],
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            quota JSONB,
            settings JSONB DEFAULT ''{}''
        )', tenant_id);

    -- 文档表
    EXECUTE format('
        CREATE TABLE tenant_%s.documents (
            id VARCHAR(50) PRIMARY KEY,
            kb_id VARCHAR(50) REFERENCES tenant_%s.knowledge_bases(id) ON DELETE CASCADE,
            file_name VARCHAR(255),
            file_type VARCHAR(50),
            file_size BIGINT,
            uploader_id VARCHAR(50),
            content TEXT,
            vector_id VARCHAR(255),
            version INT DEFAULT 1,
            status VARCHAR(20) DEFAULT ''processing'',
            metadata JSONB DEFAULT ''{}''::jsonb,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', tenant_id, tenant_id);

    -- 向量表 (pgvector)
    EXECUTE format('
        CREATE TABLE tenant_%s.vectors (
            id SERIAL PRIMARY KEY,
            document_id VARCHAR(50) REFERENCES tenant_%s.documents(id) ON DELETE CASCADE,
            chunk_index INT,
            chunk_text TEXT,
            embedding vector(1536),
            metadata JSONB DEFAULT ''{}''
        )', tenant_id, tenant_id);

    -- 查询日志表
    EXECUTE format('
        CREATE TABLE tenant_%s.query_logs (
            id BIGSERIAL PRIMARY KEY,
            user_id VARCHAR(50),
            kb_id VARCHAR(50),
            query_text TEXT,
            result_count INT,
            latency_ms INT,
            created_at TIMESTAMP DEFAULT NOW()
        )', tenant_id);

    -- 创建索引
    EXECUTE format('CREATE INDEX idx_docs_kb ON tenant_%s.documents(kb_id)', tenant_id);
    EXECUTE format('CREATE INDEX idx_vectors_doc ON tenant_%s.vectors(document_id)', tenant_id);
    EXECUTE format('CREATE INDEX ON tenant_%s.vectors USING ivfflat (embedding vector_cosine_ops)', tenant_id);

END;
$$ LANGUAGE plpgsql;
```

#### 2. 启动数据库

```bash
cd deployments/docker
docker-compose up -d postgres redis

# 验证连接
docker-compose exec postgres psql -U admin -d knowledge_platform

# 执行迁移
docker-compose exec postgres psql -U admin -d knowledge_platform -f /docker-entrypoint-initdb.d/001_create_schemas.sql
```

#### 3. 创建测试租户

```sql
-- 创建测试租户
INSERT INTO tenant_common.tenants (id, name, plan)
VALUES ('tenant_test', '测试租户', 'pro');

-- 创建租户 Schema
SELECT create_tenant_schema('tenant_test');

-- 创建测试用户
INSERT INTO tenant_common.users (id, tenant_id, email, password_hash, name, roles)
VALUES (
    'user_test',
    'tenant_test',
    'test@example.com',
    '$2a$10$...', -- bcrypt hash
    '测试用户',
    ARRAY['owner']
);

-- 验证
SELECT * FROM tenant_common.tenants;
SELECT * FROM tenant_common.users;
\dn  -- 查看所有 Schema
```

---

## ✅ Week 1 验收标准

完成以下检查点即可进入 Week 2:

- [ ] WeKnora 本地成功运行并理解架构
- [ ] 项目目录结构创建完成
- [ ] Docker Compose 环境就绪
- [ ] PostgreSQL + Redis 成功运行
- [ ] 数据库 Schema 设计完成并测试通过
- [ ] 测试租户创建成功
- [ ] Go 开发环境配置完成

---

## 🛠️ 常用命令

### Docker 操作

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f [service_name]

# 停止服务
docker-compose down

# 重建镜像
docker-compose build --no-cache
```

### 数据库操作

```bash
# 进入 PostgreSQL
docker-compose exec postgres psql -U admin -d knowledge_platform

# 备份数据库
docker-compose exec postgres pg_dump -U admin knowledge_platform > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U admin knowledge_platform < backup.sql
```

### Git 操作

```bash
# 同步上游 WeKnora 更新
cd weknora-source
git fetch upstream
git merge upstream/main

# 查看变更
git log upstream/main..HEAD
```

---

## 📖 学习资源

### WeKnora 相关
- [WeKnora GitHub](https://github.com/Tencent/WeKnora)
- [WeKnora README](https://github.com/Tencent/WeKnora/blob/main/README.md)
- [WeKnora API 文档](https://github.com/Tencent/WeKnora/blob/main/docs/API.md)

### 技术栈学习
- [Go Web 开发](https://gin-gonic.com/docs/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [pgvector 向量扩展](https://github.com/pgvector/pgvector)
- [Redis 文档](https://redis.io/documentation)
- [JWT 认证](https://jwt.io/)

### 多租户架构
- [多租户数据库设计](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/overview)
- [SaaS 架构模式](https://martinfowler.com/articles/multi-tenant.html)

---

## 🆘 遇到问题?

### 常见问题

**Q: WeKnora 启动失败?**
A: 检查 Docker 版本、端口占用、配置文件

**Q: 数据库连接失败?**
A: 检查 .env 文件、PostgreSQL 服务状态

**Q: pgvector 扩展加载失败?**
A: 确保使用 `pgvector/pgvector` 镜像而非普通 PostgreSQL

### 技术支持

- 查看项目文档: `/docs` 目录
- WeKnora 官方 Issues
- 团队内部技术讨论

---

## 🎯 下一步

完成 Week 1 后，进入 **Week 2: 租户管理服务开发**

查看: [开发路线图](./docs/roadmap.md#week-3-租户管理服务)

---

**文档版本**: v1.0
**创建日期**: 2025-10-31
**维护者**: sale champion hub
