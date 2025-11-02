#!/bin/bash

# API测试脚本

set -e

# 从.env加载API密钥
if [ -f .env ]; then
    source .env
else
    echo "❌ 错误: .env 文件不存在"
    exit 1
fi

API_ENDPOINT="${CUSTOM_API_ENDPOINT:-http://localhost:3003}"
API_KEY="${SERVICE_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "❌ 错误: SERVICE_API_KEY 未配置"
    exit 1
fi

echo "🧪 测试用户中心API..."
echo "API Endpoint: $API_ENDPOINT"
echo ""

# 测试健康检查
echo "=========================================="
echo "1. 测试健康检查"
echo "=========================================="
echo "GET $API_ENDPOINT/health"
echo ""
curl -s "$API_ENDPOINT/health" | jq '.'
echo ""

# 测试Token验证（需要先有有效的token）
echo "=========================================="
echo "2. 测试Token验证"
echo "=========================================="
echo "提示: 需要先从Logto获取有效的access_token"
echo ""
read -p "输入access_token (留空跳过): " ACCESS_TOKEN
echo ""

if [ -n "$ACCESS_TOKEN" ]; then
    echo "POST $API_ENDPOINT/api/v1/auth/verify-token"
    curl -s -X POST "$API_ENDPOINT/api/v1/auth/verify-token" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $API_KEY" \
      -d "{\"token\": \"$ACCESS_TOKEN\"}" | jq '.'
    echo ""
else
    echo "跳过Token验证测试"
    echo ""
fi

# 测试租户查询
echo "=========================================="
echo "3. 测试租户查询"
echo "=========================================="
read -p "输入organization_id (留空跳过): " ORG_ID
echo ""

if [ -n "$ORG_ID" ]; then
    echo "GET $API_ENDPOINT/api/v1/tenants/$ORG_ID"
    curl -s "$API_ENDPOINT/api/v1/tenants/$ORG_ID" \
      -H "Authorization: Bearer $API_KEY" | jq '.'
    echo ""

    echo "GET $API_ENDPOINT/api/v1/tenants/$ORG_ID/quota"
    curl -s "$API_ENDPOINT/api/v1/tenants/$ORG_ID/quota" \
      -H "Authorization: Bearer $API_KEY" | jq '.'
    echo ""
else
    echo "跳过租户查询测试"
    echo ""
fi

echo "=========================================="
echo "✅ API测试完成"
echo "=========================================="
echo ""
echo "💡 提示:"
echo "  - 完整的API文档: docs/api-specification.md"
echo "  - 使用Postman或其他工具进行更详细的测试"
echo ""
