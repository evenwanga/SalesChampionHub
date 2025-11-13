-- ==========================================
-- 迁移: 添加 is_active 列到 knowledge_bases 表
-- 日期: 2025-11-12
-- 描述: 为知识库表添加激活状态字段，用于控制知识库的启用/停用
-- ==========================================

-- 添加 is_active 列，默认值为 true
ALTER TABLE knowledge_bases
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 为现有记录设置默认值
UPDATE knowledge_bases
SET is_active = true
WHERE is_active IS NULL;

-- 添加非空约束
ALTER TABLE knowledge_bases
ALTER COLUMN is_active SET NOT NULL;

-- 添加索引以优化按状态查询
CREATE INDEX IF NOT EXISTS idx_kb_is_active ON knowledge_bases(is_active) WHERE deleted_at IS NULL;

-- 添加注释
COMMENT ON COLUMN knowledge_bases.is_active IS '知识库激活状态：true=激活，false=停用';

-- 验证结果
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'knowledge_bases'
        AND column_name = 'is_active'
    ) THEN
        RAISE NOTICE '✓ is_active 列添加成功';
    ELSE
        RAISE EXCEPTION '✗ is_active 列添加失败';
    END IF;
END $$;
