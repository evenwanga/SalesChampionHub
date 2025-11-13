-- ==========================================
-- 迁移: 添加 created_at 和 updated_at 到 knowledge_base_mounts 表
-- 日期: 2025-11-12
-- 描述: 添加时间戳字段以支持审计和GORM模型
-- ==========================================

-- 添加 created_at 列
ALTER TABLE knowledge_base_mounts
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now();

-- 添加 updated_at 列
ALTER TABLE knowledge_base_mounts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now();

-- 为现有记录设置时间戳（使用 mounted_at 作为 created_at 的初始值）
UPDATE knowledge_base_mounts
SET
    created_at = COALESCE(mounted_at, now()),
    updated_at = COALESCE(mounted_at, now())
WHERE created_at IS NULL OR updated_at IS NULL;

-- 添加非空约束
ALTER TABLE knowledge_base_mounts
ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE knowledge_base_mounts
ALTER COLUMN updated_at SET NOT NULL;

-- 添加注释
COMMENT ON COLUMN knowledge_base_mounts.created_at IS '记录创建时间';
COMMENT ON COLUMN knowledge_base_mounts.updated_at IS '记录最后更新时间';

-- 验证结果
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'knowledge_base_mounts'
        AND column_name IN ('created_at', 'updated_at')
    ) THEN
        RAISE NOTICE '✓ 时间戳字段添加成功';
    ELSE
        RAISE EXCEPTION '✗ 时间戳字段添加失败';
    END IF;
END $$;
