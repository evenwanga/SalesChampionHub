#!/bin/bash

# RAG Workflow Test Script
# Tests the complete RAG pipeline: Upload → Process → Search → Ask

set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"
USER_CENTER_URL="${USER_CENTER_URL:-http://localhost:3003}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   AI Knowledge Base - RAG Workflow Test          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print test step
print_step() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 0: Check services health
print_step "Step 0: Checking services health"
if curl -sf "$BASE_URL/health" > /dev/null; then
    print_success "API Server is healthy"
else
    print_error "API Server is not accessible at $BASE_URL"
    exit 1
fi

if curl -sf "http://localhost:8100/health" > /dev/null; then
    print_success "BGE Embedding Service is healthy"
else
    print_error "BGE Embedding Service is not accessible"
    exit 1
fi

# Step 1: Get JWT Token from User Center
print_step "Step 1: Getting JWT token from User Center"
echo "Please provide login credentials:"
read -p "Email: " USER_EMAIL
read -sp "Password: " USER_PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$USER_CENTER_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null || echo "")

if [ -z "$JWT_TOKEN" ]; then
    print_error "Failed to get JWT token. Please check your credentials."
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

print_success "Got JWT token: ${JWT_TOKEN:0:20}..."

# Step 2: Create Knowledge Base
print_step "Step 2: Creating Knowledge Base"
KB_NAME="Test KB $(date +%s)"
KB_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/knowledge-bases" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$KB_NAME\",
    \"description\": \"Test knowledge base for RAG workflow\",
    \"embedding_model\": \"bge-large-zh\",
    \"is_public\": false
  }")

KB_ID=$(echo "$KB_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

if [ -z "$KB_ID" ]; then
    print_error "Failed to create knowledge base"
    echo "Response: $KB_RESPONSE"
    exit 1
fi

print_success "Created Knowledge Base: $KB_ID"

# Step 3: Create test document
print_step "Step 3: Creating test document"
TEST_DOC="/tmp/test_rag_document.txt"
cat > "$TEST_DOC" << 'EOF'
人工智能知识库管理系统

人工智能（Artificial Intelligence，AI）是计算机科学的一个重要分支，致力于研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统。

知识库系统的核心功能包括：
1. 文档上传和管理
2. 智能文本解析
3. 向量化存储
4. 语义搜索
5. 智能问答

本系统使用的技术栈：
- BGE-large-zh 嵌入模型（1024维向量）
- 千问（Qwen）大语言模型
- PostgreSQL 数据库（pgvector扩展）
- Redis 缓存
- Go语言后端
- Docker容器化部署

RAG（Retrieval-Augmented Generation）技术：
RAG是一种结合了信息检索和生成式AI的技术。它首先从知识库中检索相关信息，然后将检索到的信息作为上下文，让大语言模型生成更准确、更有根据的回答。

这种方法的优势在于：
- 减少模型幻觉
- 提供可追溯的信息来源
- 支持知识实时更新
- 降低模型训练成本
EOF

print_success "Created test document: $TEST_DOC"

# Step 4: Upload document
print_step "Step 4: Uploading document to Knowledge Base"
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/documents" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@$TEST_DOC" \
  -F "kb_id=$KB_ID" \
  -F "check_duplicate=true")

DOC_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

if [ -z "$DOC_ID" ]; then
    print_error "Failed to upload document"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

print_success "Uploaded document: $DOC_ID"

# Step 5: Wait for document processing
print_step "Step 5: Waiting for document processing (parsing, chunking, embedding)"
MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    DOC_STATUS=$(curl -s -X GET "$BASE_URL/api/v1/documents/$DOC_ID" \
      -H "Authorization: Bearer $JWT_TOKEN" | \
      python3 -c "import sys, json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null || echo "")

    if [ "$DOC_STATUS" = "completed" ]; then
        print_success "Document processing completed"
        break
    elif [ "$DOC_STATUS" = "failed" ]; then
        print_error "Document processing failed"
        exit 1
    fi

    echo -ne "  Processing... ($((WAIT_COUNT+1))s)       \r"
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT+1))
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    print_error "Document processing timeout"
    exit 1
fi

# Step 6: Generate query embedding
print_step "Step 6: Generating query embedding"
QUERY_TEXT="什么是RAG技术？"
echo "Query: $QUERY_TEXT"

EMBEDDING_RESPONSE=$(curl -s -X POST "http://localhost:8100/embeddings" \
  -H "Content-Type: application/json" \
  -d "{\"texts\": [\"$QUERY_TEXT\"], \"normalize\": true}")

QUERY_VECTOR=$(echo "$EMBEDDING_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data['embeddings'][0]))" 2>/dev/null || echo "")

if [ -z "$QUERY_VECTOR" ]; then
    print_error "Failed to generate query embedding"
    exit 1
fi

print_success "Generated query embedding (1024 dimensions)"

# Step 7: Semantic Search
print_step "Step 7: Performing semantic search"
SEARCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/search" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"kb_ids\": [\"$KB_ID\"],
    \"query_text\": \"$QUERY_TEXT\",
    \"query_vector\": $QUERY_VECTOR,
    \"top_k\": 3
  }")

RESULT_COUNT=$(echo "$SEARCH_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin)['data']['results']))" 2>/dev/null || echo "0")

if [ "$RESULT_COUNT" = "0" ]; then
    print_error "No search results found"
    exit 1
fi

print_success "Found $RESULT_COUNT relevant chunks"

# Display search results
echo "$SEARCH_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for i, result in enumerate(data['data']['results'][:3], 1):
    print(f'  Result {i}: Similarity={result[\"similarity\"]:.4f}')
    print(f'    Content: {result[\"content\"][:100]}...')
" 2>/dev/null || true

# Step 8: RAG Question Answering
print_step "Step 8: Generating answer with RAG (Qwen LLM)"
ASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/ask" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"kb_ids\": [\"$KB_ID\"],
    \"question\": \"$QUERY_TEXT\",
    \"query_vector\": $QUERY_VECTOR,
    \"top_k\": 3
  }")

ANSWER=$(echo "$ASK_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['answer'])" 2>/dev/null || echo "")

if [ -z "$ANSWER" ]; then
    print_error "Failed to generate answer"
    echo "Response: $ASK_RESPONSE"
    exit 1
fi

print_success "Generated answer with RAG"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Answer:${NC}"
echo "$ANSWER"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Display sources
echo ""
SOURCES=$(echo "$ASK_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Sources used: {len(data[\"data\"][\"sources\"])}')
for i, source in enumerate(data['data']['sources'][:3], 1):
    print(f'  {i}. {source[\"filename\"]} (chunk {source[\"chunk_index\"]}, similarity: {source[\"similarity\"]:.4f})')
" 2>/dev/null || echo "")
echo "$SOURCES"

# Summary
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          RAG Workflow Test PASSED ✓               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Test Summary:"
echo "  - Knowledge Base ID: $KB_ID"
echo "  - Document ID: $DOC_ID"
echo "  - Search Results: $RESULT_COUNT chunks"
echo "  - RAG Answer: Generated successfully"
echo ""
echo "Clean up:"
echo "  To delete test data, run:"
echo "    curl -X DELETE $BASE_URL/api/v1/knowledge-bases/$KB_ID -H \"Authorization: Bearer $JWT_TOKEN\""
