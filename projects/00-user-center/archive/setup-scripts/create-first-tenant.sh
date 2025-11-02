#!/bin/bash

# 创建第一个租户的脚本
# 使用方法: ./scripts/create-first-tenant.sh

set -e

echo "🚀 开始创建第一个租户..."

# 加载环境变量
if [ -f .env ]; then
    source .env
else
    echo "❌ 错误: 找不到 .env 文件"
    echo "请先运行: cp .env.example .env"
    exit 1
fi

# 配置
LOGTO_ENDPOINT="${ENDPOINT:-http://localhost:3001}"
CUSTOM_API_ENDPOINT="${CUSTOM_API_ENDPOINT:-http://localhost:3003}"

# 等待服务就绪
echo "⏳ 等待服务启动..."
for i in {1..30}; do
    if curl -s "${LOGTO_ENDPOINT}/api/health" > /dev/null 2>&1; then
        echo "✅ Logto 服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 错误: Logto 服务启动超时"
        exit 1
    fi
    sleep 2
done

for i in {1..30}; do
    if curl -s "${CUSTOM_API_ENDPOINT}/health" > /dev/null 2>&1; then
        echo "✅ Custom API 服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ 错误: Custom API 服务启动超时"
        exit 1
    fi
    sleep 2
done

echo ""
echo "=========================================="
echo "📝 请按照以下步骤创建第一个租户:"
echo "=========================================="
echo ""
echo "1. 访问管理控制台:"
echo "   ${ADMIN_ENDPOINT:-http://localhost:3002}"
echo ""
echo "2. 首次访问会引导你创建管理员账号"
echo "   建议使用强密码（包含大小写字母、数字、特殊字符）"
echo ""
echo "3. 登录后，创建第一个组织(Organization):"
echo "   - 点击 'Organizations' 菜单"
echo "   - 点击 'Create organization'"
echo "   - 输入组织名称，例如: '测试公司'"
echo "   - 保存后获得 organization_id"
echo ""
echo "4. 创建第一个应用(Application):"
echo "   - 点击 'Applications' 菜单"
echo "   - 点击 'Create application'"
echo "   - 选择应用类型: 'Traditional Web' 或 'SPA'"
echo "   - 输入应用名称，例如: 'AI知识库'"
echo "   - 配置 Redirect URI: http://localhost:8080/callback"
echo "   - 保存后获得 client_id 和 client_secret"
echo ""
echo "5. 为组织创建用户:"
echo "   - 在 'Users' 菜单创建用户"
echo "   - 在 'Organizations' 中将用户添加到组织"
echo "   - 分配角色(Role)"
echo ""
echo "=========================================="
echo "🔑 重要信息保存:"
echo "=========================================="
echo ""
echo "请将以下信息保存到子项目的 .env 文件中:"
echo ""
echo "# 用户中心配置"
echo "USER_CENTER_ENDPOINT=${CUSTOM_API_ENDPOINT}"
echo "USER_CENTER_API_KEY=${SERVICE_API_KEY}"
echo ""
echo "# 应用配置(从Logto管理控制台获取)"
echo "LOGTO_ENDPOINT=${LOGTO_ENDPOINT}"
echo "LOGTO_APP_ID=<your_client_id>"
echo "LOGTO_APP_SECRET=<your_client_secret>"
echo ""
echo "=========================================="
echo ""
echo "💡 提示:"
echo "- 可以使用Logto管理控制台的 'API Resources' 创建资源和权限"
echo "- 权限格式: <resource>:<action>, 例如: kb:read, kb:write"
echo "- 在 'Roles' 中创建角色并分配权限"
echo ""
echo "✅ 准备完成！现在可以访问管理控制台进行配置。"
