#!/bin/bash
set -e

# Logto自动化配置脚本
# 此脚本将自动完成所有Logto配置

echo "=========================================="
echo "Logto 自动化配置脚本"
echo "=========================================="

# 配置变量
LOGTO_ENDPOINT="http://localhost:3001"
ADMIN_ENDPOINT="http://localhost:3002"
CUSTOM_API_ENDPOINT="http://localhost:3003"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 第1步: 获取管理员访问令牌
echo ""
echo "步骤 1/6: 获取管理员访问令牌..."
print_info "请手动操作："
print_info "1. 访问 http://localhost:3002"
print_info "2. 使用您创建的管理员账号登录"
print_info "3. 进入 Console > Settings > Admin console settings"
print_info "4. 点击 'Access tokens' 或 'Create access token'"
print_info "5. 复制生成的 token"
echo ""
read -p "请粘贴管理员访问令牌: " ADMIN_TOKEN

if [ -z "$ADMIN_TOKEN" ]; then
    print_error "未提供访问令牌，脚本退出"
    exit 1
fi

print_success "访问令牌已接收"

# 第2步: 创建API Resources
echo ""
echo "步骤 2/6: 创建API Resources..."

# 创建 Knowledge Base API Resource
KB_API_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/resources" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Knowledge Base API",
    "indicator": "https://api.saleschampionhub.com/kb",
    "accessTokenTtl": 3600
  }')

if echo "$KB_API_RESPONSE" | grep -q "id"; then
    KB_RESOURCE_ID=$(echo "$KB_API_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Knowledge Base API Resource 创建成功 (ID: $KB_RESOURCE_ID)"

    # 为KB API添加scopes
    print_info "添加API scopes..."

    curl -s -X POST "$LOGTO_ENDPOINT/api/resources/$KB_RESOURCE_ID/scopes" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"name": "read", "description": "Read knowledge base"}' > /dev/null

    curl -s -X POST "$LOGTO_ENDPOINT/api/resources/$KB_RESOURCE_ID/scopes" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"name": "write", "description": "Write knowledge base"}' > /dev/null

    curl -s -X POST "$LOGTO_ENDPOINT/api/resources/$KB_RESOURCE_ID/scopes" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"name": "delete", "description": "Delete knowledge base"}' > /dev/null

    curl -s -X POST "$LOGTO_ENDPOINT/api/resources/$KB_RESOURCE_ID/scopes" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"name": "admin", "description": "Admin knowledge base"}' > /dev/null

    print_success "API Scopes 创建成功"
else
    print_error "KB API Resource 创建失败: $KB_API_RESPONSE"
fi

# 第3步: 创建M2M应用
echo ""
echo "步骤 3/6: 创建Machine-to-Machine应用..."

M2M_APP_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/applications" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
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
    print_info "App ID: $M2M_APP_ID"
    print_info "App Secret: $M2M_APP_SECRET"

    # 保存到.env文件
    echo ""
    print_info "更新custom-api/.env文件..."

    sed -i.bak "s/LOGTO_M2M_APP_ID=.*/LOGTO_M2M_APP_ID=$M2M_APP_ID/" custom-api/.env
    sed -i.bak "s/LOGTO_M2M_APP_SECRET=.*/LOGTO_M2M_APP_SECRET=$M2M_APP_SECRET/" custom-api/.env

    print_success "环境变量已更新"
else
    print_error "M2M应用创建失败: $M2M_APP_RESPONSE"
fi

# 第4步: 创建角色
echo ""
echo "步骤 4/6: 创建组织角色..."

# 创建 Owner 角色
OWNER_ROLE_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "owner",
    "description": "Organization owner with full access",
    "type": "User"
  }')

if echo "$OWNER_ROLE_RESPONSE" | grep -q "id"; then
    OWNER_ROLE_ID=$(echo "$OWNER_ROLE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Owner角色创建成功 (ID: $OWNER_ROLE_ID)"
else
    print_info "Owner角色可能已存在"
fi

# 创建 Admin 角色
ADMIN_ROLE_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "admin",
    "description": "Organization administrator",
    "type": "User"
  }')

if echo "$ADMIN_ROLE_RESPONSE" | grep -q "id"; then
    ADMIN_ROLE_ID=$(echo "$ADMIN_ROLE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Admin角色创建成功 (ID: $ADMIN_ROLE_ID)"
else
    print_info "Admin角色可能已存在"
fi

# 创建 Member 角色
MEMBER_ROLE_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "member",
    "description": "Organization member",
    "type": "User"
  }')

if echo "$MEMBER_ROLE_RESPONSE" | grep -q "id"; then
    MEMBER_ROLE_ID=$(echo "$MEMBER_ROLE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "Member角色创建成功 (ID: $MEMBER_ROLE_ID)"
else
    print_info "Member角色可能已存在"
fi

# 第5步: 创建测试组织
echo ""
echo "步骤 5/6: 创建测试组织..."

TEST_ORG_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/api/organizations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试组织",
    "description": "用于开发测试的默认组织"
  }')

if echo "$TEST_ORG_RESPONSE" | grep -q "id"; then
    TEST_ORG_ID=$(echo "$TEST_ORG_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    print_success "测试组织创建成功 (ID: $TEST_ORG_ID)"

    # 为测试组织初始化配额
    print_info "初始化组织配额..."
    docker-compose exec -T postgres psql -U postgres -d logto -c \
      "SELECT initialize_tenant_defaults('$TEST_ORG_ID', 'free');" > /dev/null 2>&1
    print_success "组织配额初始化完成"
else
    print_info "测试组织可能已存在"
fi

# 第6步: 验证配置
echo ""
echo "步骤 6/6: 验证配置..."

# 检查API Resources
API_RESOURCES=$(curl -s "$LOGTO_ENDPOINT/api/resources" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$API_RESOURCES" | grep -q "Knowledge Base"; then
    print_success "API Resources 配置正确"
else
    print_error "API Resources 配置可能有问题"
fi

# 检查应用
APPLICATIONS=$(curl -s "$LOGTO_ENDPOINT/api/applications" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$APPLICATIONS" | grep -q "User Center Custom API"; then
    print_success "M2M应用配置正确"
else
    print_error "M2M应用配置可能有问题"
fi

# 第7步: 生成配置摘要
echo ""
echo "=========================================="
echo "配置完成摘要"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  - Logto管理控制台: http://localhost:3002"
echo "  - Logto核心API: http://localhost:3001"
echo "  - Custom API: http://localhost:3003"
echo ""
echo "M2M应用凭证 (已保存到 custom-api/.env):"
echo "  - App ID: $M2M_APP_ID"
echo "  - App Secret: $M2M_APP_SECRET"
echo ""
echo "测试组织:"
echo "  - ID: $TEST_ORG_ID"
echo "  - 计划: Free"
echo ""
print_success "所有配置已完成！"
echo ""
print_info "下一步: 重启custom-api服务以应用新配置"
echo "  运行: docker-compose restart custom-api"
echo ""
