# Agent任务：实现Embedding接口

**优先级：** P0 - 关键阻塞问题  
**预计工作量：** 2小时  
**影响范围：** 搜索和RAG核心功能

---

## 任务背景

### 问题描述
前端在执行搜索和RAG问答时，需要先将查询文本转换为1024维向量。前端调用 `POST /api/v1/embedding` 接口，但后端Go服务（端口8080）未暴露此接口，导致返回404错误。

### 现状分析
- ✅ Embedding服务（bge-embedding）运行正常，端口8100
- ✅ 前端已实现调用逻辑：`src/services/searchService.ts` 第221-236行
- ❌ Go后端未提供API网关层的embedding接口
- ❌ 前端无法直接访问embedding服务（跨域、认证问题）

### 架构现状
```
前端 (3000) → Kong (80) → Go后端 (8080) → [X 缺失] → Embedding服务 (8100)
```

### 期望架构
```
前端 (3000) → Kong (80) → Go后端 (8080) → Embedding服务 (8100)
                                ↓
                          [新增代理接口]
```

---

## 实现目标

在Go后端添加Embedding代理接口，将前端请求转发到embedding服务。

**接口规格：**
- 路径：`POST /api/v1/embedding`
- 认证：需要JWT Token（与其他接口一致）
- 请求体：`{ "text": "查询文本" }`
- 响应体：`{ "success": true, "data": { "embedding": [float...], "dimension": 1024 } }`

---

## 实现步骤

### 步骤1：创建Embedding Handler

**文件：** `projects/01-ai-knowledge-base/internal/handler/embedding_handler.go`

```go
package handler

import (
	"github.com/SalesChampionHub/ai-knowledge-base/internal/middleware"
	"github.com/SalesChampionHub/ai-knowledge-base/internal/service"
	"github.com/gin-gonic/gin"
)

type EmbeddingHandler struct {
	embeddingService service.EmbeddingClient
}

func NewEmbeddingHandler(embeddingService service.EmbeddingClient) *EmbeddingHandler {
	return &EmbeddingHandler{
		embeddingService: embeddingService,
	}
}

// GenerateEmbedding godoc
// @Summary 生成文本向量
// @Description 将文本转换为1024维向量，用于语义搜索和RAG。使用BGE-large-zh模型
// @Tags 向量化
// @Accept json
// @Produce json
// @Param request body EmbeddingRequest true "文本向量化请求"
// @Success 200 {object} middleware.SuccessResponse{data=EmbeddingResponse} "向量生成成功"
// @Failure 400 {object} middleware.ErrorResponse "请求参数错误"
// @Failure 500 {object} middleware.ErrorResponse "服务器内部错误"
// @Security BearerAuth
// @Router /embedding [post]
func (h *EmbeddingHandler) GenerateEmbedding(c *gin.Context) {
	var req EmbeddingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		middleware.RespondBadRequest(c, "Invalid request: "+err.Error())
		return
	}

	if req.Text == "" {
		middleware.RespondBadRequest(c, "Text is required")
		return
	}

	// 限制文本长度（BGE模型最大512 tokens）
	if len(req.Text) > 2000 {
		middleware.RespondBadRequest(c, "Text too long (max 2000 characters)")
		return
	}

	embedding, err := h.embeddingService.EmbedText(c.Request.Context(), req.Text)
	if err != nil {
		middleware.RespondInternalError(c, "Failed to generate embedding: "+err.Error())
		return
	}

	middleware.RespondWithSuccess(c, EmbeddingResponse{
		Embedding: embedding,
		Dimension: len(embedding),
	})
}

// Request/Response DTOs

type EmbeddingRequest struct {
	Text string `json:"text" binding:"required" example:"如何使用知识库搜索功能？"`
}

type EmbeddingResponse struct {
	Embedding []float32 `json:"embedding" swaggertype:"array,number" example:"[0.1,0.2,...]"`
	Dimension int       `json:"dimension" example:"1024"`
}
```

### 步骤2：注册路由

**文件：** `projects/01-ai-knowledge-base/cmd/server/main.go`

**位置：** 在 `authenticated` 路由组中添加（约第295行之后）

```go
// 在现有的查询统计路由后添加
authenticated.GET("/query-stats", searchHandler.GetQueryStats)

// ====== 新增 Embedding 接口 ======
authenticated.POST("/embedding", embeddingHandler.GenerateEmbedding)
// ================================
```

### 步骤3：初始化Handler

**文件：** `projects/01-ai-knowledge-base/cmd/server/main.go`

**位置：** 在初始化其他handlers的地方（约第202-204行）

```go
// Initialize handlers
kbHandler := handler.NewKBHandler(kbService)
searchHandler := handler.NewSearchHandler(searchService, ragService, kbService, queryLogRepo)
docHandler := handler.NewDocumentHandler(docService)

// ====== 新增 ======
embeddingHandler := handler.NewEmbeddingHandler(embeddingClient)
// =================
```

**注意：** `embeddingClient` 已经在main.go第154-171行初始化，可以直接使用。

---

## 验证方法

### 1. 后端验证

**启动后端服务：**
```bash
cd projects/01-ai-knowledge-base
go run cmd/server/main.go
```

**使用curl测试：**
```bash
# 获取Token（先登录）
TOKEN="your_jwt_token"

# 测试embedding接口
curl -X POST http://localhost:8080/api/v1/embedding \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "测试文本"}'
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "embedding": [0.123, 0.456, ...],  // 1024个浮点数
    "dimension": 1024
  }
}
```

### 2. 前端验证

**测试搜索功能：**
1. 启动前端：`cd projects/01-ai-knowledge-base-frontend && npm run dev`
2. 访问：http://localhost:3000/search
3. 选择知识库，输入查询
4. 点击搜索，观察Network面板

**预期结果：**
- `POST /api/v1/embedding` 返回200
- 返回1024维向量
- 搜索结果正常显示

**测试RAG问答：**
1. 访问：http://localhost:3000/assistant
2. 选择知识库，输入问题
3. 点击发送

**预期结果：**
- Embedding接口调用成功
- AI助手返回答案
- 显示相关文档来源

### 3. 集成测试

**检查完整流程：**
```bash
# 1. 检查embedding服务状态
curl http://localhost:8100/health

# 2. 检查后端API
curl http://localhost:8080/health

# 3. 测试embedding接口
# （使用上面的curl命令）

# 4. 检查日志
docker logs kb-api-server --tail 100
```

---

## 注意事项

### 1. 错误处理
- 如果embedding服务不可用，返回503错误
- 记录详细的错误日志便于调试
- 提供友好的错误信息给前端

### 2. 性能优化
- 考虑添加Redis缓存（相同文本返回缓存结果）
- 设置合理的超时时间（embedding服务约100-500ms）
- 监控embedding服务的响应时间

### 3. 安全考虑
- 限制请求频率（防止滥用）
- 验证文本长度（防止超长输入）
- 确保JWT认证正常工作

### 4. 后续优化
可以考虑添加批量接口：
```go
POST /api/v1/embeddings/batch
{
  "texts": ["文本1", "文本2", ...]
}
```

---

## 预期结果

完成后：
- ✅ 前端搜索功能可用
- ✅ RAG问答功能可用
- ✅ Embedding接口响应时间 < 500ms
- ✅ 错误处理完善
- ✅ 日志记录清晰

---

## 涉及文件清单

**新增文件：**
- `projects/01-ai-knowledge-base/internal/handler/embedding_handler.go`

**修改文件：**
- `projects/01-ai-knowledge-base/cmd/server/main.go` （约2处修改）

**相关文件（无需修改）：**
- `projects/01-ai-knowledge-base/internal/service/embedding_service.go` （已存在）
- `projects/01-ai-knowledge-base-frontend/src/services/searchService.ts` （前端调用）

---

## 完成标准

- [ ] embedding_handler.go 文件创建并通过编译
- [ ] 路由注册完成
- [ ] Handler初始化完成
- [ ] curl测试通过（返回1024维向量）
- [ ] 前端搜索功能测试通过
- [ ] 前端RAG问答功能测试通过
- [ ] 错误处理测试通过（无效输入、服务不可用等）
- [ ] 代码审查通过
- [ ] 文档更新（Swagger）

---

**任务完成后，请更新任务状态并测试端到端流程。**

