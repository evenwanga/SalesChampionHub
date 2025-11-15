# 知识库脚本工具集

本目录包含知识库系统的维护和测试脚本。

## 脚本列表

### 1. load_test_data.sh
自动加载测试数据到知识库数据库。

**功能**：
- 插入 3 个测试文档（产品介绍、技术指南、FAQ）
- 插入 9 个文档块
- 插入 9 个向量（1024维）
- 自动验证数据完整性

**使用方法**：
```bash
cd /Users/wangyiwen/produce/SalesChampionHub
./projects/01-ai-knowledge-base/scripts/load_test_data.sh
```

**环境变量**（可选）：
- `DB_CONTAINER`: 数据库容器名（默认：saleschampion-postgres）
- `DB_NAME`: 数据库名（默认：knowledge_platform）
- `DB_USER`: 数据库用户（默认：postgres）

**清理测试数据**：
```bash
docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "DELETE FROM vectors WHERE id LIKE 'vec_test_%';"
docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "DELETE FROM document_chunks WHERE id LIKE 'chunk_test_%';"
docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "DELETE FROM documents WHERE id LIKE 'doc_test_%';"
```

### 2. insert_test_data.sql
原始 SQL 脚本，包含所有测试数据插入语句。

**内容**：
- 文档表插入语句
- 文档块表插入语句
- 向量表插入语句（使用随机向量）
- 数据验证查询

**直接执行**（不推荐，使用 load_test_data.sh 更方便）：
```bash
docker exec -i saleschampion-postgres psql -U postgres -d knowledge_platform < insert_test_data.sql
```

### 3. start.sh
启动知识库服务（现有脚本）

### 4. test_rag_workflow.sh
测试 RAG 工作流程（现有脚本）

## 测试数据详情

加载的测试数据包括：

### 文档 1：产品介绍.md (3个块)
- 平台整体介绍
- 核心功能说明
- 移动端与集成能力

### 文档 2：技术指南.md (4个块)
- 技术架构概述
- AI 知识库模块
- 认证与授权
- API 网关

### 文档 3：FAQ常见问题.md (2个块)
- 如何创建知识库
- 支持的文档格式

## 测试场景

加载测试数据后，可以验证以下功能：

### 语义搜索
```bash
curl -X POST http://localhost:8080/api/v1/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kb_ids": ["YOUR_KB_ID"],
    "query": "如何创建知识库",
    "top_k": 5
  }'
```

### RAG 问答
```bash
curl -X POST http://localhost:8080/api/v1/rag/ask \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kb_ids": ["YOUR_KB_ID"],
    "question": "销冠中心支持哪些技术架构？",
    "top_k": 3
  }'
```

### 推荐测试查询关键词
- "销售管理"
- "知识库"
- "技术架构"
- "认证授权"
- "FAQ"
- "BGE嵌入"
- "API网关"

## 注意事项

1. **向量数据**：当前使用随机向量，不代表真实的语义嵌入。实际使用时应通过 BGE 模型生成真实向量。

2. **知识库要求**：执行脚本前需确保至少有一个知识库存在。

3. **权限隔离**：测试数据会关联到最新创建的知识库，受 RLS 策略保护。

4. **ID 前缀**：所有测试数据使用 `_test_` 前缀，便于识别和清理。

## 故障排查

### 问题：找不到知识库
```
警告: 没有找到知识库，需要先创建知识库
```
**解决**：先通过 API 或界面创建至少一个知识库。

### 问题：权限被拒绝
```
ERROR: permission denied for table documents
```
**解决**：确保使用正确的数据库用户和连接配置。

### 问题：外键约束失败
```
ERROR: violates foreign key constraint
```
**解决**：确保知识库 ID 存在，检查数据库状态。

## 相关文档

- [问题修复报告](../../../.trae/documents/问题修复报告-2025-11-15.md)
- [Docker服务与工程状态检查报告](../../../.trae/documents/Docker服务与工程状态检查报告-2025-11-15.md)

## 更新历史

- **2025-11-15**: 创建测试数据加载脚本
  - 新增 `load_test_data.sh`
  - 新增 `insert_test_data.sql`
  - 支持自动验证和报告
