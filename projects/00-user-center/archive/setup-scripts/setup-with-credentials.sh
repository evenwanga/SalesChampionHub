#!/bin/bash
set -e

# 使用管理员用户名和密码直接配置Logto

echo "=========================================="
echo "Logto 配置脚本（使用用户名密码）"
echo "=========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

echo ""
print_info "此脚本将使用您的管理员账号直接登录并配置Logto"
echo ""

# 获取管理员凭证
read -p "请输入管理员用户名: " ADMIN_USERNAME
read -sp "请输入管理员密码: " ADMIN_PASSWORD
echo ""

if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
    print_error "用户名或密码不能为空"
    exit 1
fi

LOGTO_ENDPOINT="http://localhost:3001"

# 尝试登录获取令牌
print_info "正在登录..."

# 首先获取登录页面信息
LOGIN_RESPONSE=$(curl -s -X POST "$LOGTO_ENDPOINT/oidc/auth" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=admin-console" \
  -d "redirect_uri=http://localhost:3002/callback" \
  -d "response_type=code" \
  -d "scope=openid profile email" \
  -d "state=random_state" || echo "failed")

if [ "$LOGIN_RESPONSE" = "failed" ]; then
    print_error "无法连接到Logto，请确保服务正在运行"
    exit 1
fi

print_info "提示：由于Logto的安全机制，直接通过API登录较为复杂"
echo ""
print_info "建议使用以下更简单的方法："
echo ""
echo "方法1: 使用Logto CLI创建M2M应用（最简单）"
echo "----------------------------------------"
echo "1. 确保已安装Logto CLI："
echo "   npm install -g @logto/cli"
echo ""
echo "2. 使用CLI创建M2M应用："
echo "   logto app create --name \"Custom API M2M\" --type m2m"
echo ""
echo "3. CLI会自动输出App ID和Secret"
echo ""

echo "方法2: 手动在控制台创建（最可靠）"
echo "----------------------------------------"
echo "1. 访问 http://localhost:3002"
echo "2. 登录后，左侧菜单点击 'Applications'"
echo "3. 点击右上角 '+ Create application'"
echo "4. 选择 'Machine-to-machine'"
echo "5. 输入名称：User Center Custom API"
echo "6. 点击 Create"
echo "7. 复制显示的 App ID 和 App secret"
echo ""
echo "然后运行以下命令更新配置："
echo ""
echo "  sed -i '' 's/LOGTO_M2M_APP_ID=.*/LOGTO_M2M_APP_ID=你的AppID/' custom-api/.env"
echo "  sed -i '' 's/LOGTO_M2M_APP_SECRET=.*/LOGTO_M2M_APP_SECRET=你的AppSecret/' custom-api/.env"
echo ""

echo "方法3: 使用curl获取令牌（高级）"
echo "----------------------------------------"
print_info "参考文档 SETUP_GUIDE.md 中的手动配置部分"
echo ""

read -p "是否查看详细的手动配置步骤？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cat << 'EOF'

=== 详细手动配置步骤 ===

步骤1: 创建API Resource
------------------------
1. 访问 http://localhost:3002
2. 左侧菜单 → API resources
3. 点击 + Create API resource
4. 填写：
   - API name: Knowledge Base API
   - API identifier: https://api.saleschampionhub.com/kb
   - Access token TTL: 3600
5. 点击 Create
6. 进入该API → Permissions 标签
7. 添加4个权限：
   - read (Read knowledge base)
   - write (Write knowledge base)
   - delete (Delete knowledge base)
   - admin (Admin knowledge base)

步骤2: 创建M2M应用
------------------
1. 左侧菜单 → Applications
2. 点击 + Create application
3. 选择 Machine-to-machine
4. 名称：User Center Custom API
5. 点击 Create
6. **重要** 复制并保存：
   - App ID
   - App secret

步骤3: 更新环境变量
-------------------
编辑文件: custom-api/.env

LOGTO_M2M_APP_ID=<你的App ID>
LOGTO_M2M_APP_SECRET=<你的App secret>

步骤4: 创建角色（可选）
-----------------------
1. 左侧菜单 → Roles
2. 创建3个角色：
   - owner (Organization owner)
   - admin (Organization admin)
   - member (Organization member)

步骤5: 创建测试组织（可选）
---------------------------
1. 左侧菜单 → Organizations
2. 创建组织：测试组织

步骤6: 初始化组织配额
---------------------
docker-compose exec postgres psql -U postgres -d logto -c \
  "SELECT initialize_tenant_defaults('组织ID', 'free');"

步骤7: 重启服务
--------------
docker-compose restart custom-api

EOF
fi

echo ""
print_success "配置说明已显示完毕"
print_info "推荐使用方法2（手动在控制台创建），最简单可靠！"
