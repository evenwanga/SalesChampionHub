-- 测试数据插入脚本
-- 用于补充 documents 和 document_chunks，验证检索与 RAG 链路
-- 
-- 注意：此脚本假设已存在至少一个知识库（KB）
-- 运行前请确认 knowledge_bases 表中有数据

-- ============================================
-- 第一步：获取现有知识库ID（用于插入文档）
-- ============================================
-- 假设使用第一个知识库，实际运行时需要替换为真实的 kb_id
-- 示例：SELECT id FROM knowledge_bases LIMIT 1;

-- ============================================
-- 第二步：插入测试文档
-- ============================================

-- 文档1：产品介绍
INSERT INTO documents (
    id, 
    kb_id, 
    filename, 
    file_type, 
    file_size, 
    file_path,
    status,
    chunk_count,
    uploaded_by,
    created_at,
    updated_at
) VALUES (
    'doc_test_product_intro_001',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),  -- 使用最新的知识库
    '产品介绍.md',
    'md',
    2048,
    '/uploads/test/产品介绍.md',
    'completed',
    3,
    'test_user_001',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 文档2：技术文档
INSERT INTO documents (
    id, 
    kb_id, 
    filename, 
    file_type, 
    file_size, 
    file_path,
    status,
    chunk_count,
    uploaded_by,
    created_at,
    updated_at
) VALUES (
    'doc_test_tech_guide_002',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    '技术指南.md',
    'md',
    3072,
    '/uploads/test/技术指南.md',
    'completed',
    4,
    'test_user_001',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 文档3：常见问题
INSERT INTO documents (
    id, 
    kb_id, 
    filename, 
    file_type, 
    file_size, 
    file_path,
    status,
    chunk_count,
    uploaded_by,
    created_at,
    updated_at
) VALUES (
    'doc_test_faq_003',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    'FAQ常见问题.md',
    'md',
    1536,
    '/uploads/test/FAQ常见问题.md',
    'completed',
    2,
    'test_user_001',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 第三步：插入文档块（document_chunks）
-- ============================================

-- 文档1的块
INSERT INTO document_chunks (
    id,
    document_id,
    kb_id,
    chunk_index,
    content,
    content_length,
    created_at
) VALUES 
(
    'chunk_test_001',
    'doc_test_product_intro_001',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    0,
    '销冠中心是一个企业级销售管理平台，提供完整的销售流程管理、客户关系管理和数据分析功能。平台采用现代化的微服务架构，支持多租户和组织隔离，确保数据安全和隐私保护。',
    128,
    NOW()
),
(
    'chunk_test_002',
    'doc_test_product_intro_001',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    1,
    '核心功能包括：客户管理、销售线索跟踪、销售机会管理、报价单管理、合同管理、销售预测、数据分析和报表。系统集成了人工智能辅助功能，可以智能推荐销售策略，预测客户需求。',
    116,
    NOW()
),
(
    'chunk_test_003',
    'doc_test_product_intro_001',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    2,
    '销冠中心支持移动端访问，销售人员可以随时随地更新客户信息、记录销售活动、查看销售数据。平台还提供丰富的API接口，方便与其他企业系统集成。',
    94,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 文档2的块
INSERT INTO document_chunks (
    id,
    document_id,
    kb_id,
    chunk_index,
    content,
    content_length,
    created_at
) VALUES 
(
    'chunk_test_004',
    'doc_test_tech_guide_002',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    0,
    '技术架构：销冠中心采用前后端分离架构，前端使用 React + TypeScript，后端使用 Go 和 Node.js 微服务。数据存储使用 PostgreSQL 关系数据库和 Redis 缓存。',
    108,
    NOW()
),
(
    'chunk_test_005',
    'doc_test_tech_guide_002',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    1,
    'AI 知识库模块使用 BGE 嵌入模型进行向量化，支持语义搜索和 RAG（检索增强生成）功能。向量存储使用 pgvector 扩展，支持高效的相似度搜索。',
    102,
    NOW()
),
(
    'chunk_test_006',
    'doc_test_tech_guide_002',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    2,
    '认证与授权：系统集成 Logto 认证服务，支持多种登录方式（用户名密码、短信验证码、社交登录）。权限管理采用 RBAC 模型，支持租户级、组织级和用户级的细粒度权限控制。',
    110,
    NOW()
),
(
    'chunk_test_007',
    'doc_test_tech_guide_002',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    3,
    'API 网关：使用 Kong Gateway 作为统一入口，提供路由、认证、限流、日志等功能。所有服务通过网关访问，确保安全性和可观测性。',
    89,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 文档3的块
INSERT INTO document_chunks (
    id,
    document_id,
    kb_id,
    chunk_index,
    content,
    content_length,
    created_at
) VALUES 
(
    'chunk_test_008',
    'doc_test_faq_003',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    0,
    'Q: 如何创建知识库？\nA: 登录系统后，进入知识库管理页面，点击"创建知识库"按钮，填写知识库名称和描述，选择挂载范围（租户、组织或个人），即可创建新的知识库。创建后可以上传文档进行向量化处理。',
    125,
    NOW()
),
(
    'chunk_test_009',
    'doc_test_faq_003',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    1,
    'Q: 支持哪些文档格式？\nA: 目前支持 PDF、Word（.docx）、Markdown（.md）、纯文本（.txt）等格式。上传文档后系统会自动进行文本提取、分块和向量化处理，处理完成后即可进行语义搜索和智能问答。',
    122,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 第四步：插入测试向量（vectors）
-- ============================================
-- 注意：这里插入的是示例向量，实际应该是 1024 维的真实嵌入向量
-- 为了测试，我们使用随机向量

INSERT INTO vectors (
    id,
    chunk_id,
    kb_id,
    embedding,
    created_at
) VALUES 
(
    'vec_test_001',
    'chunk_test_001',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,  -- 随机 1024 维向量
    NOW()
),
(
    'vec_test_002',
    'chunk_test_002',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,
    NOW()
),
(
    'vec_test_003',
    'chunk_test_003',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,
    NOW()
),
(
    'vec_test_004',
    'chunk_test_004',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,
    NOW()
),
(
    'vec_test_005',
    'chunk_test_005',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,
    NOW()
),
(
    'vec_test_006',
    'chunk_test_006',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,
    NOW()
),
(
    'vec_test_007',
    'chunk_test_007',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,
    NOW()
),
(
    'vec_test_008',
    'chunk_test_008',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,
    NOW()
),
(
    'vec_test_009',
    'chunk_test_009',
    (SELECT id FROM knowledge_bases ORDER BY created_at DESC LIMIT 1),
    (SELECT array_agg(random()) FROM generate_series(1, 1024))::vector,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 验证数据插入
-- ============================================

-- 检查文档数量
SELECT 'Documents count:' as info, COUNT(*) as count FROM documents WHERE id LIKE 'doc_test_%';

-- 检查文档块数量
SELECT 'Document chunks count:' as info, COUNT(*) as count FROM document_chunks WHERE id LIKE 'chunk_test_%';

-- 检查向量数量
SELECT 'Vectors count:' as info, COUNT(*) as count FROM vectors WHERE id LIKE 'vec_test_%';

-- 显示插入的文档
SELECT 
    d.id,
    d.filename,
    d.file_type,
    d.chunk_count,
    d.status,
    COUNT(c.id) as actual_chunks
FROM documents d
LEFT JOIN document_chunks c ON d.id = c.document_id
WHERE d.id LIKE 'doc_test_%'
GROUP BY d.id, d.filename, d.file_type, d.chunk_count, d.status
ORDER BY d.id;

-- ============================================
-- 清理测试数据（可选）
-- ============================================
-- 如果需要删除测试数据，取消下面注释

-- DELETE FROM vectors WHERE id LIKE 'vec_test_%';
-- DELETE FROM document_chunks WHERE id LIKE 'chunk_test_%';
-- DELETE FROM documents WHERE id LIKE 'doc_test_%';

