-- =========================================
-- SalesChampionHub 共享数据库初始化脚本
-- =========================================

-- 创建 Kong 数据库
CREATE DATABASE kong
    WITH OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- 创建子项目0的数据库（用户中心）
CREATE DATABASE logto
    WITH OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- 创建子项目1的数据库（AI知识库）
CREATE DATABASE knowledge_platform
    WITH OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- 为知识库启用 pgvector 扩展
\c knowledge_platform;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMENT ON DATABASE knowledge_platform IS '子项目1: AI知识库管理平台';

-- 切换到 logto 数据库
\c logto;
COMMENT ON DATABASE logto IS '子项目0: 多租户统一用户中心';

-- 切换到 kong 数据库
\c kong;
COMMENT ON DATABASE kong IS 'Kong API Gateway 配置数据库';

-- 输出初始化完成信息
\c postgres;
SELECT
    datname AS "数据库名称",
    pg_size_pretty(pg_database_size(datname)) AS "大小",
    datcollate AS "排序规则"
FROM pg_database
WHERE datname IN ('kong', 'logto', 'knowledge_platform')
ORDER BY datname;
