-- 数据库初始化脚本
-- 在Logto初始化前运行

-- ==================== 创建扩展 ====================
-- UUID生成
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 加密函数
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================== 设置 ====================
-- 设置时区
SET timezone = 'Asia/Shanghai';

-- ==================== 数据库性能优化 ====================
-- 调整连接参数
ALTER DATABASE logto SET max_connections = 200;
ALTER DATABASE logto SET shared_buffers = '256MB';
ALTER DATABASE logto SET effective_cache_size = '1GB';
ALTER DATABASE logto SET maintenance_work_mem = '64MB';
ALTER DATABASE logto SET checkpoint_completion_target = 0.9;
ALTER DATABASE logto SET wal_buffers = '16MB';
ALTER DATABASE logto SET default_statistics_target = 100;
ALTER DATABASE logto SET random_page_cost = 1.1;
ALTER DATABASE logto SET effective_io_concurrency = 200;
ALTER DATABASE logto SET work_mem = '4MB';
ALTER DATABASE logto SET min_wal_size = '1GB';
ALTER DATABASE logto SET max_wal_size = '4GB';

-- ==================== 完成 ====================
\echo 'Database initialization completed successfully!'
