-- ========================================
-- 审计日志表 (Audit Logs)
-- ========================================
-- 用于记录所有敏感操作，满足安全合规要求
-- 创建时间: 2025-11-18

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- 用户上下文
    tenant_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    
    -- 操作信息
    action VARCHAR(100) NOT NULL,  -- login, logout, create_kb, delete_doc, etc.
    resource_type VARCHAR(50) NOT NULL,  -- knowledge_base, document, user, mount, system
    resource_id VARCHAR(255),  -- 资源ID，如果适用
    
    -- 操作详情 (JSON格式，灵活扩展)
    details JSONB DEFAULT '{}',
    
    -- 请求信息
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    
    -- 操作结果
    status VARCHAR(20) DEFAULT 'success',  -- success, failure, error
    error_message TEXT,
    
    -- 性能信息
    duration_ms INTEGER,
    
    -- 时间戳
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- 审计日志不允许修改和删除，只能追加
    CONSTRAINT chk_audit_status CHECK (status IN ('success', 'failure', 'error'))
);

-- 索引优化查询性能
CREATE INDEX idx_audit_tenant_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_status ON audit_logs(status);

-- 复合索引用于常见查询
CREATE INDEX idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user_action ON audit_logs(user_id, action, created_at DESC);

-- 注释
COMMENT ON TABLE audit_logs IS '审计日志表：记录所有敏感操作，满足安全合规要求';
COMMENT ON COLUMN audit_logs.tenant_id IS '租户ID';
COMMENT ON COLUMN audit_logs.user_id IS '用户ID';
COMMENT ON COLUMN audit_logs.username IS '用户名（冗余字段，便于查询）';
COMMENT ON COLUMN audit_logs.action IS '操作类型';
COMMENT ON COLUMN audit_logs.resource_type IS '资源类型';
COMMENT ON COLUMN audit_logs.resource_id IS '资源ID';
COMMENT ON COLUMN audit_logs.details IS '操作详情（JSON格式）';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP地址';
COMMENT ON COLUMN audit_logs.user_agent IS '用户代理字符串';
COMMENT ON COLUMN audit_logs.status IS '操作结果状态';
COMMENT ON COLUMN audit_logs.duration_ms IS '操作耗时（毫秒）';

-- ========================================
-- 审计日志查询辅助视图
-- ========================================

-- 创建视图：最近的审计日志（带用户友好的时间格式）
CREATE OR REPLACE VIEW v_recent_audit_logs AS
SELECT 
    id,
    tenant_id,
    user_id,
    username,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    status,
    error_message,
    duration_ms,
    created_at,
    -- 相对时间（便于展示）
    CASE 
        WHEN created_at > NOW() - INTERVAL '1 hour' 
            THEN EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER || '秒前'
        WHEN created_at > NOW() - INTERVAL '1 day'
            THEN EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER / 3600 || '小时前'
        ELSE TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS')
    END as relative_time
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- ========================================
-- 审计日志统计函数
-- ========================================

-- 获取用户操作统计
CREATE OR REPLACE FUNCTION get_user_audit_stats(
    p_tenant_id VARCHAR(255),
    p_user_id VARCHAR(255),
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_operations BIGINT,
    success_count BIGINT,
    failure_count BIGINT,
    error_count BIGINT,
    top_actions JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH action_stats AS (
        SELECT 
            action,
            COUNT(*) as count
        FROM audit_logs
        WHERE tenant_id = p_tenant_id
        AND user_id = p_user_id
        AND created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY action
        ORDER BY count DESC
        LIMIT 5
    )
    SELECT 
        COUNT(*)::BIGINT as total_operations,
        COUNT(*) FILTER (WHERE status = 'success')::BIGINT as success_count,
        COUNT(*) FILTER (WHERE status = 'failure')::BIGINT as failure_count,
        COUNT(*) FILTER (WHERE status = 'error')::BIGINT as error_count,
        (
            SELECT jsonb_agg(jsonb_build_object('action', action, 'count', count))
            FROM action_stats
        ) as top_actions
    FROM audit_logs
    WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- 获取租户操作统计
CREATE OR REPLACE FUNCTION get_tenant_audit_stats(
    p_tenant_id VARCHAR(255),
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_operations BIGINT,
    unique_users BIGINT,
    success_rate NUMERIC,
    top_users JSONB,
    top_actions JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            user_id,
            username,
            COUNT(*) as operation_count
        FROM audit_logs
        WHERE tenant_id = p_tenant_id
        AND created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY user_id, username
        ORDER BY operation_count DESC
        LIMIT 10
    ),
    action_stats AS (
        SELECT 
            action,
            COUNT(*) as count
        FROM audit_logs
        WHERE tenant_id = p_tenant_id
        AND created_at > NOW() - (p_days || ' days')::INTERVAL
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
    )
    SELECT 
        COUNT(*)::BIGINT as total_operations,
        COUNT(DISTINCT user_id)::BIGINT as unique_users,
        ROUND(
            COUNT(*) FILTER (WHERE status = 'success')::NUMERIC * 100.0 / 
            NULLIF(COUNT(*), 0),
            2
        ) as success_rate,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'user_id', user_id,
                'username', username,
                'count', operation_count
            ))
            FROM user_stats
        ) as top_users,
        (
            SELECT jsonb_agg(jsonb_build_object('action', action, 'count', count))
            FROM action_stats
        ) as top_actions
    FROM audit_logs
    WHERE tenant_id = p_tenant_id
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 审计日志数据保留策略
-- ========================================

-- 创建分区表函数（可选，用于大规模数据）
-- 注：初始版本使用单表，如果数据量大可以考虑按月分区

-- 删除旧的审计日志（保留策略：默认保留1年）
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
    p_retention_days INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 注释
COMMENT ON FUNCTION cleanup_old_audit_logs IS '清理旧的审计日志，默认保留1年';
COMMENT ON FUNCTION get_user_audit_stats IS '获取用户操作统计';
COMMENT ON FUNCTION get_tenant_audit_stats IS '获取租户操作统计';

-- ========================================
-- 审计日志完整性保护
-- ========================================

-- 防止修改和删除审计日志（仅允许INSERT）
-- 注：在应用层也需要实现相应的访问控制

-- 创建触发器函数，防止更新和删除
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '审计日志不允许修改或删除，只能追加';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trg_prevent_audit_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_audit_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- ========================================
-- 迁移完成
-- ========================================

