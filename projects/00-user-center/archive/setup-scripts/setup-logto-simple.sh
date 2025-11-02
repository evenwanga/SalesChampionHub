#!/bin/bash
set -e

# Logto简化配置脚本 - 使用浏览器Cookie自动认证

echo "=========================================="
echo "Logto 自动化配置脚本（简化版）"
echo "=========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

echo ""
print_info "请按照以下步骤操作："
echo ""
echo "1. 打开浏览器访问: http://localhost:3002"
echo "2. 使用您的管理员账号登录"
echo "3. 登录后，按 F12 打开开发者工具"
echo "4. 在开发者工具中："
echo "   - 点击 'Console' (控制台) 标签"
echo "   - 粘贴以下代码并按回车："
echo ""
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │ localStorage.getItem('logto:admin')            │"
echo "   └─────────────────────────────────────────────────┘"
echo ""
echo "5. 复制输出的整个字符串（包括引号）"
echo ""
read -p "准备好了吗？按回车继续..." dummy

echo ""
read -p "请粘贴刚才复制的字符串: " ADMIN_DATA

# 解析令牌
ACCESS_TOKEN=$(echo "$ADMIN_DATA" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    print_error "无法解析访问令牌"
    echo ""
    print_info "让我们尝试另一种方法..."
    echo ""
    echo "请在浏览器开发者工具的Console中运行:"
    echo ""
    echo "   ┌─────────────────────────────────────────────────┐"
    echo "   │ JSON.parse(localStorage.getItem('logto:admin'))│"
    echo "   │   .accessToken                                  │"
    echo "   └─────────────────────────────────────────────────┘"
    echo ""
    read -p "然后粘贴输出的令牌（只要令牌，不要引号）: " ACCESS_TOKEN
fi

if [ -z "$ACCESS_TOKEN" ]; then
    print_error "仍然无法获取令牌，请使用手动配置方法"
    print_info "参考文档: SETUP_GUIDE.md"
    exit 1
fi

print_success "访问令牌已获取！"

# API 基础地址
LOGTO_ENDPOINT="http://localhost:3001"

# 创建API Resource
echo ""
print_info "创建API Resource..."

KB_API_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/resources" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Knowledge Base API",
    "indicator": "https://api.saleschampionhub.com/kb",
    "accessTokenTtl": 3600
  }')

if echo "$KB_API_RESPONSE" | grep -q "id"; then
    KB_RESOURCE_ID=$(echo "$KB_API_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Knowledge Base API Resource 创建成功"

    # 添加scopes
    for scope in "read:Read knowledge base" "write:Write knowledge base" "delete:Delete knowledge base" "admin:Admin knowledge base"; do
        SCOPE_NAME=$(echo $scope | cut -d: -f1)
        SCOPE_DESC=$(echo $scope | cut -d: -f2-)
        curl -s -X POST "$LOGTO_ENDPOINT/api/resources/$KB_RESOURCE_ID/scopes" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "Content-Type: application/json" \
          -d "{\"name\": \"$SCOPE_NAME\", \"description\": \"$SCOPE_DESC\"}" > /dev/null
    done
    print_success "API Scopes 已添加"
else
    print_info "API Resource 可能已存在，跳过"
fi

# 创建M2M应用
echo ""
print_info "创建M2M应用..."

M2M_APP_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/applications" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Center Custom API",
    "type": "MachineToMachine",
    "description": "M2M application for custom API service"
  }')

if echo "$M2M_APP_RESPONSE" | grep -q "id"; then
    M2M_APP_ID=$(echo "$M2M_APP_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    M2M_APP_SECRET=$(echo "$M2M_APP_RESPONSE" | grep -o '"secret":"[^"]*"' | head -1 | cut -d'"' -f4)

    print_success "M2M应用创建成功"

    # 更新.env文件
    if [ -f "custom-api/.env" ]; then
        sed -i.bak "s/LOGTO_M2M_APP_ID=.*/LOGTO_M2M_APP_ID=$M2M_APP_ID/" custom-api/.env
        sed -i.bak "s/LOGTO_M2M_APP_SECRET=.*/LOGTO_M2M_APP_SECRET=$M2M_APP_SECRET/" custom-api/.env
        print_success "环境变量已更新"

        echo ""
        print_info "M2M应用凭证:"
        echo "  App ID: $M2M_APP_ID"
        echo "  App Secret: ${M2M_APP_SECRET:0:20}..."
    fi
else
    print_info "M2M应用可能已存在，跳过"
fi

# 创建角色
echo ""
print_info "创建用户角色..."

for role in "owner:Organization owner with full access" "admin:Organization administrator" "member:Organization member"; do
    ROLE_NAME=$(echo $role | cut -d: -f1)
    ROLE_DESC=$(echo $role | cut -d: -f2-)

    ROLE_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/roles" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"$ROLE_NAME\", \"description\": \"$ROLE_DESC\", \"type\": \"User\"}")

    if echo "$ROLE_RESPONSE" | grep -q "id"; then
        print_success "角色 '$ROLE_NAME' 创建成功"
    else
        print_info "角色 '$ROLE_NAME' 可能已存在"
    fi
done

# 创建测试组织
echo ""
print_info "创建测试组织..."

ORG_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/organizations" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试组织",
    "description": "用于开发测试的默认组织"
  }')

if echo "$ORG_RESPONSE" | grep -q "id"; then
    TEST_ORG_ID=$(echo "$ORG_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "测试组织创建成功 (ID: $TEST_ORG_ID)"

    # 初始化组织配额
    print_info "初始化组织配额..."
    docker-compose exec -T postgres psql -U postgres -d logto -c \
      "SELECT initialize_tenant_defaults('$TEST_ORG_ID', 'free');" > /dev/null 2>&1
    print_success "组织配额初始化完成"
else
    print_info "测试组织可能已存在"
fi

echo ""
echo "=========================================="
print_success "配置完成！"
echo "=========================================="
echo ""
print_info "下一步："
echo "  1. 重启Custom API: docker-compose restart custom-api"
echo "  2. 升级到v1.33.0: ./scripts/upgrade-logto.sh"
echo ""
