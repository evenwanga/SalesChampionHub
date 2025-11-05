# API集成说明

## 认证流程

### 完整认证链路
1. **前端登录** → Logto OAuth/OIDC (http://localhost:3001)
2. **获取Token** → Logto AccessToken (无需配置API Resource)
3. **调用API** → 前端将Token添加到 `Authorization: Bearer <token>` header
4. **API验证** → 知识库API调用用户中心 `/api/v1/auth/verify-token` 验证Token
5. **返回数据** → 验证通过后处理请求并返回数据

### 前端配置

#### 1. Vite代理配置 (vite.config.ts)
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8080',  // 后端知识库API
    changeOrigin: true,
  },
}
```

#### 2. Axios自动添加Token (src/services/api.ts)
```typescript
// Token从window.__logtoAccessToken自动获取
api.interceptors.request.use(async (config) => {
  const token = (window as any).__logtoAccessToken
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

#### 3. ProtectedRoute获取Token (src/components/ProtectedRoute.tsx)
```typescript
// 登录后自动获取并存储Token
useEffect(() => {
  if (isAuthenticated && !isLoading) {
    getAccessToken()
      .then((token) => {
        (window as any).__logtoAccessToken = token
        setTokenReady(true)
      })
  }
}, [isAuthenticated, isLoading, getAccessToken])
```

## 测试API调用

### 方法1：浏览器控制台测试
登录后，在浏览器控制台中执行：
```javascript
// 测试获取知识库列表
fetch('/api/v1/knowledge-bases')
  .then(res => res.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err))
```

### 方法2：在组件中使用服务
```typescript
import knowledgeBaseService from '@/services/knowledgeBaseService'

// 在React组件中
const loadData = async () => {
  try {
    const kbs = await knowledgeBaseService.listKBs()
    console.log('Knowledge Bases:', kbs)
  } catch (error) {
    console.error('Failed to load:', error)
  }
}
```

## API端点

### 后端服务地址
- **直接访问**: http://localhost:8080/api/v1
- **通过Vite代理**: http://localhost:3000/api/v1 (开发环境推荐)
- **通过Kong网关**: http://localhost/api/v1 (生产环境)

### 可用API列表
- `GET /api/v1/knowledge-bases` - 获取知识库列表
- `POST /api/v1/knowledge-bases` - 创建知识库
- `GET /api/v1/knowledge-bases/{id}` - 获取单个知识库
- `GET /api/v1/documents?kb_id=xxx` - 获取文档列表
- `POST /api/v1/search` - 语义搜索
- `POST /api/v1/ask` - RAG问答

完整API文档：http://localhost:8080/swagger/index.html

## 错误处理

### 401 Unauthorized
- 原因：Token无效或已过期
- 解决：axios拦截器会自动重定向到登录页

### 403 Forbidden
- 原因：用户无权访问该资源
- 解决：检查用户权限配置

### 500 Internal Server Error
- 原因：后端服务异常
- 解决：查看后端日志 `docker logs kb-api-server`

## 下一步

现在所有配置已就绪，可以：
1. 测试登录流程
2. 在组件中调用API服务
3. 开发知识库管理页面
4. 开发文档上传功能
5. 开发搜索和AI助手功能
