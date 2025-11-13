-- ========================================
-- 修复 get_user_accessible_kbs 函数签名
-- ========================================
-- 问题：后端调用该函数时传递了4个参数（包括 limit），但函数定义只有3个参数
-- 解决：删除旧函数并创建新的4参数版本

-- 删除旧的函数定义
DROP FUNCTION IF EXISTS get_user_accessible_kbs(VARCHAR, VARCHAR, VARCHAR);

-- 创建新的函数定义（添加 p_limit 参数）
CREATE OR REPLACE FUNCTION get_user_accessible_kbs(
    p_tenant_id VARCHAR(50),
    p_organization_id VARCHAR(50),
    p_user_id VARCHAR(50),
    p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE(kb_id VARCHAR(50)) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT m.kb_id
    FROM knowledge_base_mounts m
    WHERE m.is_active = true
    AND (
        (m.mount_type = 'tenant' AND m.tenant_id = p_tenant_id)
        OR
        (m.mount_type = 'organization' AND m.organization_id = p_organization_id)
        OR
        (m.mount_type = 'user' AND m.user_id = p_user_id)
    )
    ORDER BY m.kb_id
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 添加函数注释
COMMENT ON FUNCTION get_user_accessible_kbs(VARCHAR, VARCHAR, VARCHAR, INTEGER) IS
'获取用户可访问的知识库ID列表，支持租户、组织和用户三级挂载。p_limit参数用于限制返回数量。';
