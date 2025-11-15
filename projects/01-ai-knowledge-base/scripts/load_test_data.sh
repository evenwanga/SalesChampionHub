#!/bin/bash

# 加载测试数据到知识库数据库
# 用于补充 documents 和 document_chunks，验证检索与 RAG 链路

set -e  # 出错时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 数据库连接配置
DB_CONTAINER="${DB_CONTAINER:-saleschampion-postgres}"
DB_NAME="${DB_NAME:-knowledge_platform}"
DB_USER="${DB_USER:-postgres}"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}加载知识库测试数据${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 检查容器是否运行
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo -e "${RED}错误: 数据库容器 ${DB_CONTAINER} 未运行${NC}"
    echo "请先启动 Docker 服务"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SQL_FILE="${SCRIPT_DIR}/insert_test_data.sql"

# 检查 SQL 文件是否存在
if [ ! -f "${SQL_FILE}" ]; then
    echo -e "${RED}错误: SQL 文件不存在: ${SQL_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}步骤 1: 检查知识库表状态${NC}"
echo "----------------------------------------"

# 检查知识库数量
KB_COUNT=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM knowledge_bases;")
echo "当前知识库数量: ${KB_COUNT}"

if [ "${KB_COUNT}" -eq "0" ]; then
    echo -e "${YELLOW}警告: 没有找到知识库，需要先创建知识库${NC}"
    echo -e "${YELLOW}请先通过 API 或界面创建至少一个知识库${NC}"
    exit 1
fi

# 显示现有文档和块的数量
DOC_COUNT=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM documents;")
CHUNK_COUNT=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM document_chunks;")
VECTOR_COUNT=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM vectors;")

echo "当前文档数量: ${DOC_COUNT}"
echo "当前文档块数量: ${CHUNK_COUNT}"
echo "当前向量数量: ${VECTOR_COUNT}"
echo ""

echo -e "${GREEN}步骤 2: 执行测试数据插入${NC}"
echo "----------------------------------------"

# 执行 SQL 脚本
docker exec -i ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} < "${SQL_FILE}"

echo ""
echo -e "${GREEN}步骤 3: 验证数据插入${NC}"
echo "----------------------------------------"

# 检查插入后的数量
NEW_DOC_COUNT=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM documents;")
NEW_CHUNK_COUNT=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM document_chunks;")
NEW_VECTOR_COUNT=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM vectors;")

echo "新增文档数量: $((NEW_DOC_COUNT - DOC_COUNT))"
echo "新增文档块数量: $((NEW_CHUNK_COUNT - CHUNK_COUNT))"
echo "新增向量数量: $((NEW_VECTOR_COUNT - VECTOR_COUNT))"
echo ""

# 显示测试文档详情
echo -e "${GREEN}测试文档详情:${NC}"
docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c "
SELECT 
    d.filename,
    d.file_type,
    d.chunk_count,
    COUNT(c.id) as actual_chunks,
    COUNT(v.id) as vectors
FROM documents d
LEFT JOIN document_chunks c ON d.id = c.document_id
LEFT JOIN vectors v ON c.id = v.chunk_id
WHERE d.id LIKE 'doc_test_%'
GROUP BY d.id, d.filename, d.file_type, d.chunk_count
ORDER BY d.filename;
"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}测试数据加载完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo "1. 现在可以通过搜索 API 测试语义检索功能"
echo "2. 可以通过 RAG API 测试问答功能"
echo "3. 测试查询示例关键词：销售、知识库、技术架构、FAQ"
echo ""
echo "如需清理测试数据，请运行:"
echo "  docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c \"DELETE FROM vectors WHERE id LIKE 'vec_test_%';\""
echo "  docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c \"DELETE FROM document_chunks WHERE id LIKE 'chunk_test_%';\""
echo "  docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c \"DELETE FROM documents WHERE id LIKE 'doc_test_%';\""

