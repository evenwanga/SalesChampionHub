# Test Scripts

This directory contains test scripts for validating the AI Knowledge Base system.

## RAG Workflow Test

`test_rag_workflow.sh` - Complete end-to-end test of the RAG (Retrieval-Augmented Generation) workflow.

### What it tests:

1. **Service Health** - Validates API server and BGE embedding service are running
2. **Authentication** - Gets JWT token from User Center
3. **Knowledge Base** - Creates a test knowledge base
4. **Document Upload** - Uploads a test document
5. **Document Processing** - Waits for parsing, chunking, and embedding
6. **Semantic Search** - Tests vector similarity search
7. **RAG Q&A** - Tests question answering with Qwen LLM

### Prerequisites:

- All services running (docker-compose up)
- User Center accessible at http://localhost:3003
- Valid user account (email/password)
- Python 3 installed (for JSON parsing)

### Usage:

```bash
# Run the test
./scripts/test_rag_workflow.sh

# Or with custom URLs
BASE_URL=http://localhost:8080 USER_CENTER_URL=http://localhost:3003 ./scripts/test_rag_workflow.sh
```

### Example Output:

```
╔═══════════════════════════════════════════════════╗
║   AI Knowledge Base - RAG Workflow Test          ║
╚═══════════════════════════════════════════════════╝

▶ Step 0: Checking services health
✓ API Server is healthy
✓ BGE Embedding Service is healthy

▶ Step 1: Getting JWT token from User Center
Please provide login credentials:
Email: test@example.com
Password:
✓ Got JWT token: eyJhbGciOiJSUzI1NiIs...

▶ Step 2: Creating Knowledge Base
✓ Created Knowledge Base: kb_123456

▶ Step 3: Creating test document
✓ Created test document: /tmp/test_rag_document.txt

▶ Step 4: Uploading document to Knowledge Base
✓ Uploaded document: doc_789

▶ Step 5: Waiting for document processing
✓ Document processing completed

▶ Step 6: Generating query embedding
Query: 什么是RAG技术？
✓ Generated query embedding (1024 dimensions)

▶ Step 7: Performing semantic search
✓ Found 3 relevant chunks

▶ Step 8: Generating answer with RAG (Qwen LLM)
✓ Generated answer with RAG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer:
RAG（Retrieval-Augmented Generation）是一种结合了信息检索和生成式AI的技术...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╔═══════════════════════════════════════════════════╗
║          RAG Workflow Test PASSED ✓               ║
╚═══════════════════════════════════════════════════╝
```

### Cleanup:

The script provides cleanup commands at the end. To delete test data:

```bash
curl -X DELETE http://localhost:8080/api/v1/knowledge-bases/{KB_ID} \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

### Troubleshooting:

**"API Server is not accessible"**
- Ensure docker-compose services are running
- Check `docker ps` to verify kb-api-server is up

**"Failed to get JWT token"**
- Verify User Center is running
- Check credentials are correct
- Ensure User Center URL is accessible

**"Document processing timeout"**
- BGE service may be loading model (first request takes longer)
- Check BGE logs: `docker logs kb-bge-embedding`
- Increase MAX_WAIT in script if needed

**"Failed to generate answer"**
- Check Qwen API key is configured in .env
- Verify LLM_PROVIDER=qwen in environment
- Check API server logs for LLM errors
