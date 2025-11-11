#!/bin/bash

# ============================================================================
# Logto Integration Test Script
# 测试 AI 知识库与 Logto 的完整集成
# ============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOGTO_ENDPOINT="${LOGTO_ENDPOINT:-http://localhost:3001}"
KB_API="${KB_API:-http://localhost:8080}"
M2M_APP_ID="${LOGTO_M2M_APP_ID:-72wzce5b87ulbii8wvv66}"
M2M_APP_SECRET="${LOGTO_M2M_APP_SECRET:-F3QBJ67JDinqCu6yttE7DecCXkwF9zaR}"
API_RESOURCE="${LOGTO_API_RESOURCE:-https://api.saleschampionhub.com/kb}"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_test() {
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# Test 1: 获取 M2M 访问令牌
# ============================================================================
test_get_m2m_token() {
    print_header "测试 1: 获取 M2M 访问令牌"
    print_test "从 Logto 获取 M2M 令牌..."

    RESPONSE=$(curl -s -X POST "${LOGTO_ENDPOINT}/oidc/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=client_credentials" \
        -d "client_id=${M2M_APP_ID}" \
        -d "client_secret=${M2M_APP_SECRET}" \
        -d "resource=${API_RESOURCE}" \
        -d "scope=read write")

    ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token // empty')

    if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
        print_error "无法获取访问令牌"
        echo "响应: $RESPONSE"
        return 1
    fi

    print_success "成功获取访问令牌 (长度: ${#ACCESS_TOKEN})"
    print_info "令牌前缀: ${ACCESS_TOKEN:0:50}..."

    # Export for other tests
    export ACCESS_TOKEN
    return 0
}

# ============================================================================
# Test 2: 验证令牌格式 (JWT)
# ============================================================================
test_verify_token_format() {
    print_header "测试 2: 验证令牌格式"
    print_test "检查 JWT 令牌结构..."

    # JWT should have 3 parts separated by dots
    TOKEN_PARTS=$(echo "$ACCESS_TOKEN" | tr '.' '\n' | wc -l)

    if [ "$TOKEN_PARTS" -eq 3 ]; then
        print_success "JWT 令牌格式正确 (3 部分)"
    else
        print_error "JWT 令牌格式错误 (部分数: $TOKEN_PARTS)"
        return 1
    fi

    # Decode header (first part)
    HEADER=$(echo "$ACCESS_TOKEN" | cut -d'.' -f1)
    HEADER_DECODED=$(echo "$HEADER" | base64 -d 2>/dev/null || echo "{}")

    print_info "JWT Header: $HEADER_DECODED"

    # Decode payload (second part)
    PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d'.' -f2)
    # Add padding if needed
    PADDED_PAYLOAD="${PAYLOAD}$(printf '=%.0s' {1..4})"
    PAYLOAD_DECODED=$(echo "$PADDED_PAYLOAD" | base64 -d 2>/dev/null || echo "{}")

    print_info "JWT Payload: $PAYLOAD_DECODED"

    return 0
}

# ============================================================================
# Test 3: 测试健康检查端点 (无需认证)
# ============================================================================
test_health_check() {
    print_header "测试 3: 健康检查端点"
    print_test "访问 /health 端点..."

    RESPONSE=$(curl -s -w "\n%{http_code}" "${KB_API}/health")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "健康检查成功 (HTTP 200)"
        print_info "响应: $(echo "$BODY" | jq -c '.')"
    else
        print_error "健康检查失败 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
        return 1
    fi

    return 0
}

# ============================================================================
# Test 4: 测试未认证访问 (应该失败)
# ============================================================================
test_unauthorized_access() {
    print_header "测试 4: 未认证访问"
    print_test "尝试访问受保护端点 (无令牌)..."

    RESPONSE=$(curl -s -w "\n%{http_code}" "${KB_API}/api/v1/me")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "401" ]; then
        print_success "正确拒绝未认证请求 (HTTP 401)"
        print_info "错误信息: $(echo "$BODY" | jq -c '.error // .')"
    else
        print_error "未正确拒绝未认证请求 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
        return 1
    fi

    return 0
}

# ============================================================================
# Test 5: 测试认证访问 /me 端点
# ============================================================================
test_authenticated_me() {
    print_header "测试 5: 认证访问 /me 端点"
    print_test "使用 Logto 令牌访问 /me..."

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        "${KB_API}/api/v1/me")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "成功获取用户信息 (HTTP 200)"
        print_info "用户信息: $(echo "$BODY" | jq -c '.data // .')"
    else
        print_error "无法获取用户信息 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
        return 1
    fi

    return 0
}

# ============================================================================
# Test 6: 创建知识库
# ============================================================================
test_create_kb() {
    print_header "测试 6: 创建知识库"
    print_test "创建测试知识库..."

    KB_NAME="Logto Integration Test KB - $(date +%s)"
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -X POST "${KB_API}/api/v1/knowledge-bases" \
        -d "{
            \"name\": \"${KB_NAME}\",
            \"description\": \"用于测试 Logto 集成的知识库\",
            \"embedding_model\": \"bge-large-zh\",
            \"similarity_threshold\": 0.7
        }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
        print_success "成功创建知识库 (HTTP $HTTP_CODE)"
        KB_ID=$(echo "$BODY" | jq -r '.data.id // empty')
        export KB_ID
        print_info "知识库 ID: $KB_ID"
        print_info "知识库名称: $KB_NAME"
    else
        print_error "无法创建知识库 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
        return 1
    fi

    return 0
}

# ============================================================================
# Test 7: 获取知识库列表
# ============================================================================
test_list_kbs() {
    print_header "测试 7: 获取知识库列表"
    print_test "获取所有可访问的知识库..."

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        "${KB_API}/api/v1/knowledge-bases")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        KB_COUNT=$(echo "$BODY" | jq '.data | length')
        print_success "成功获取知识库列表 (HTTP 200)"
        print_info "知识库数量: $KB_COUNT"
    else
        print_error "无法获取知识库列表 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
        return 1
    fi

    return 0
}

# ============================================================================
# Test 8: 获取知识库详情
# ============================================================================
test_get_kb_details() {
    print_header "测试 8: 获取知识库详情"

    if [ -z "$KB_ID" ]; then
        print_error "跳过: 没有可用的知识库 ID"
        return 1
    fi

    print_test "获取知识库 $KB_ID 的详情..."

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        "${KB_API}/api/v1/knowledge-bases/${KB_ID}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ]; then
        print_success "成功获取知识库详情 (HTTP 200)"
        print_info "详情: $(echo "$BODY" | jq -c '.data')"
    else
        print_error "无法获取知识库详情 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
        return 1
    fi

    return 0
}

# ============================================================================
# Test 9: 测试无效令牌
# ============================================================================
test_invalid_token() {
    print_header "测试 9: 无效令牌"
    print_test "使用无效令牌访问 API..."

    INVALID_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpbnZhbGlkIn0.invalid"

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer ${INVALID_TOKEN}" \
        "${KB_API}/api/v1/me")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "401" ]; then
        print_success "正确拒绝无效令牌 (HTTP 401)"
        print_info "错误信息: $(echo "$BODY" | jq -c '.error // .')"
    else
        print_error "未正确拒绝无效令牌 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
        return 1
    fi

    return 0
}

# ============================================================================
# Test 10: 测试过期令牌 (模拟)
# ============================================================================
test_expired_token() {
    print_header "测试 10: 过期令牌检测"
    print_test "检查令牌过期时间..."

    PAYLOAD=$(echo "$ACCESS_TOKEN" | cut -d'.' -f2)
    PADDED_PAYLOAD="${PAYLOAD}$(printf '=%.0s' {1..4})"
    PAYLOAD_DECODED=$(echo "$PADDED_PAYLOAD" | base64 -d 2>/dev/null || echo "{}")

    EXP=$(echo "$PAYLOAD_DECODED" | jq -r '.exp // empty')

    if [ -n "$EXP" ]; then
        NOW=$(date +%s)
        TTL=$((EXP - NOW))
        print_success "令牌包含过期时间 (exp: $EXP)"
        print_info "令牌剩余有效期: $TTL 秒 ($(($TTL / 60)) 分钟)"
    else
        print_error "令牌缺少过期时间"
        return 1
    fi

    return 0
}

# ============================================================================
# Test 11: 清理测试数据
# ============================================================================
test_cleanup() {
    print_header "测试 11: 清理测试数据"

    if [ -z "$KB_ID" ]; then
        print_info "无需清理"
        return 0
    fi

    print_test "删除测试知识库 $KB_ID..."

    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -X DELETE "${KB_API}/api/v1/knowledge-bases/${KB_ID}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "204" ]; then
        print_success "成功删除测试知识库 (HTTP $HTTP_CODE)"
    else
        print_error "无法删除测试知识库 (HTTP $HTTP_CODE)"
        echo "响应: $BODY"
        return 1
    fi

    return 0
}

# ============================================================================
# Main execution
# ============================================================================
main() {
    clear
    print_header "🚀 AI 知识库 - Logto 集成测试"

    print_info "配置信息:"
    print_info "  Logto Endpoint: $LOGTO_ENDPOINT"
    print_info "  KB API: $KB_API"
    print_info "  M2M App ID: $M2M_APP_ID"
    print_info "  API Resource: $API_RESOURCE"

    echo ""

    # Run all tests
    test_get_m2m_token || true
    test_verify_token_format || true
    test_health_check || true
    test_unauthorized_access || true
    test_authenticated_me || true
    test_create_kb || true
    test_list_kbs || true
    test_get_kb_details || true
    test_invalid_token || true
    test_expired_token || true
    test_cleanup || true

    # Print summary
    print_header "📊 测试总结"

    echo -e "${GREEN}通过: $TESTS_PASSED${NC}"
    echo -e "${RED}失败: $TESTS_FAILED${NC}"
    echo -e "${BLUE}总计: $TESTS_TOTAL${NC}"

    SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    echo -e "\n${BLUE}成功率: ${SUCCESS_RATE}%${NC}"

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✓ 所有测试通过！Logto 集成成功！${NC}\n"
        exit 0
    else
        echo -e "\n${RED}✗ 部分测试失败，请检查错误信息${NC}\n"
        exit 1
    fi
}

# Run main function
main
