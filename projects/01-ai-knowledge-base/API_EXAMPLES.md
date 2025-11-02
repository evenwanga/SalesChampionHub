# API使用示例

> **💡 提示**：强烈推荐使用 [Swagger UI](http://localhost:8080/swagger/index.html) 来测试API！
>
> Swagger UI提供：
> - ✅ 全中文界面
> - ✅ 在线交互测试
> - ✅ 自动生成请求示例
> - ✅ 实时查看响应
>
> 访问地址：**http://localhost:8080/swagger/index.html**

## 认证获取

所有API调用需要先从子项目0获取JWT Token。

```bash
# 从用户中心获取Token
curl -X POST http://localhost:3003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@example.com",
    "password": "password"
  }'

# 响应示例
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {...}
  }
}
```

## 1. 创建知识库

```bash
curl -X POST http://localhost:8080/api/v1/knowledge-bases \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "产品知识库",
    "description": "产品相关的所有文档和资料",
    "visibility": "private",
    "tags": ["product", "documentation"],
    "settings": {
      "max_file_size": 10485760,
      "allowed_extensions": [".pdf", ".docx", ".txt", ".md"]
    }
  }'
```

**成功响应 (201 Created)**:
```json
{
  "success": true,
  "data": {
    "knowledge_base": {
      "id": "kb_a1b2c3d4",
      "name": "产品知识库",
      "description": "产品相关的所有文档和资料",
      "owner_id": "user_001",
      "visibility": "private",
      "tags": ["product", "documentation"],
      "document_count": 0,
      "total_size_bytes": 0,
      "created_at": "2025-11-02T10:00:00Z",
      "updated_at": "2025-11-02T10:00:00Z"
    }
  }
}
```

## 2. 获取知识库列表

```bash
# 获取所有知识库（支持分页和过滤）
curl -X GET "http://localhost:8080/api/v1/knowledge-bases?limit=10&offset=0&visibility=private" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "knowledge_bases": [
      {
        "id": "kb_a1b2c3d4",
        "name": "产品知识库",
        "owner_id": "user_001",
        ...
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

## 3. 获取知识库详情

```bash
curl -X GET http://localhost:8080/api/v1/knowledge-bases/kb_a1b2c3d4 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "knowledge_base": {
      "id": "kb_a1b2c3d4",
      "name": "产品知识库",
      ...
    },
    "stats": {
      "document_count": 42,
      "total_size_bytes": 52428800,
      "status_breakdown": {
        "completed": 40,
        "processing": 2
      }
    }
  }
}
```

## 4. 更新知识库

```bash
curl -X PUT http://localhost:8080/api/v1/knowledge-bases/kb_a1b2c3d4 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "产品知识库(更新)",
    "description": "新的描述信息"
  }'
```

## 5. 挂载知识库到租户

```bash
curl -X POST http://localhost:8080/api/v1/mounts/tenant \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "kb_a1b2c3d4",
    "tenant_id": "tenant_001",
    "permissions": {
      "can_read": true,
      "can_write": false,
      "can_delete": false
    }
  }'
```

**成功响应 (201 Created)**:
```json
{
  "success": true,
  "data": {
    "mount": {
      "id": 1,
      "kb_id": "kb_a1b2c3d4",
      "mount_type": "tenant",
      "tenant_id": "tenant_001",
      "mounted_by": "user_001",
      "mounted_at": "2025-11-02T10:05:00Z",
      "permissions": {
        "can_read": true,
        "can_write": false,
        "can_delete": false
      },
      "is_active": true
    }
  }
}
```

## 6. 挂载到组织

```bash
curl -X POST http://localhost:8080/api/v1/mounts/organization \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "kb_a1b2c3d4",
    "tenant_id": "tenant_001",
    "organization_id": "org_001",
    "permissions": {
      "can_read": true,
      "can_write": true,
      "can_delete": false
    }
  }'
```

## 7. 挂载到特定用户

```bash
curl -X POST http://localhost:8080/api/v1/mounts/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "kb_id": "kb_a1b2c3d4",
    "tenant_id": "tenant_001",
    "organization_id": "org_001",
    "user_id": "user_vip",
    "permissions": {
      "can_read": true,
      "can_write": true,
      "can_delete": true
    }
  }'
```

## 8. 获取用户可访问的知识库

```bash
curl -X GET http://localhost:8080/api/v1/user/accessible-kbs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "knowledge_bases": [
      {
        "id": "kb_a1b2c3d4",
        "name": "产品知识库",
        ...
      },
      {
        "id": "kb_e5f6g7h8",
        "name": "技术文档库",
        ...
      }
    ],
    "total": 2,
    "user": {
      "tenant_id": "tenant_001",
      "organization_id": "org_001",
      "user_id": "user_001"
    }
  }
}
```

## 9. 获取知识库统计

```bash
curl -X GET http://localhost:8080/api/v1/knowledge-bases/kb_a1b2c3d4/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "document_count": 42,
    "total_size_bytes": 52428800,
    "status_breakdown": {
      "completed": 38,
      "processing": 3,
      "failed": 1
    }
  }
}
```

## 10. 删除知识库

```bash
curl -X DELETE http://localhost:8080/api/v1/knowledge-bases/kb_a1b2c3d4 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "message": "Knowledge base deleted successfully"
  }
}
```

## 11. 取消挂载

```bash
curl -X DELETE http://localhost:8080/api/v1/mounts/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "message": "Mount removed successfully"
  }
}
```

## 错误响应示例

### 401 未授权
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization token is required"
  },
  "meta": {
    "timestamp": "2025-11-02T10:00:00Z",
    "request_id": "req_xxx",
    "path": "/api/v1/knowledge-bases"
  }
}
```

### 404 未找到
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Knowledge base not found"
  },
  "meta": {
    "timestamp": "2025-11-02T10:00:00Z",
    "request_id": "req_xxx",
    "path": "/api/v1/knowledge-bases/kb_notexist"
  }
}
```

### 400 参数错误
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request: name is required"
  },
  "meta": {
    "timestamp": "2025-11-02T10:00:00Z",
    "request_id": "req_xxx"
  }
}
```

## 完整工作流示例

```bash
#!/bin/bash

# 1. 登录获取Token
TOKEN=$(curl -s -X POST http://localhost:3003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"password"}' \
  | jq -r '.data.token')

# 2. 创建知识库
KB_ID=$(curl -s -X POST http://localhost:8080/api/v1/knowledge-bases \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试知识库","description":"测试用"}' \
  | jq -r '.data.knowledge_base.id')

echo "Created KB: $KB_ID"

# 3. 挂载到租户
curl -s -X POST http://localhost:8080/api/v1/mounts/tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kb_id\":\"$KB_ID\",\"tenant_id\":\"tenant_001\",\"permissions\":{\"can_read\":true}}" \
  | jq .

# 4. 查看可访问的知识库
curl -s -X GET http://localhost:8080/api/v1/user/accessible-kbs \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

---

## 使用Postman Collection

可以导入以下JSON到Postman：

```json
{
  "info": {
    "name": "AI Knowledge Base API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [{
      "key": "token",
      "value": "{{jwt_token}}",
      "type": "string"
    }]
  },
  "variable": [{
    "key": "base_url",
    "value": "http://localhost:8080"
  }]
}
```
