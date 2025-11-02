#!/bin/bash

# ============================================
# 子项目1: AI知识库管理平台 - 启动脚本
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$PROJECT_DIR")")"

echo "🧠 子项目1: AI知识库管理平台"
echo "============================================"
echo ""

# 1. 检查基础设施依赖
echo "📋 步骤 1/3: 检查基础设施依赖..."

required_services=("saleschampion-postgres" "saleschampion-redis" "kong-gateway")
missing_services=()

for service in "${required_services[@]}"; do
    if ! docker ps --format "{{.Names}}" | grep -q "^${service}$"; then
        missing_services+=("$service")
    fi
done

if [ ${#missing_services[@]} -gt 0 ]; then
    echo "❌ 缺少必需的基础设施服务: ${missing_services[*]}"
    echo ""
    echo "💡 请先启动共享基础设施:"
    echo "   cd $ROOT_DIR/infrastructure"
    echo "   ./scripts/startup.sh"
    echo ""
    exit 1
fi

echo "✅ 基础设施服务已就绪"
echo ""

# 检查用户中心服务（可选但推荐）
if ! docker ps --format "{{.Names}}" | grep -q "user-center-custom-api"; then
    echo "⚠️  用户中心服务未运行（知识库需要用户中心进行身份验证）"
    echo "💡 建议启动用户中心服务:"
    echo "   cd $ROOT_DIR/projects/00-user-center"
    echo "   ./scripts/start.sh"
    echo ""
    read -p "是否继续？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 2. 检查环境配置
echo "⚙️  步骤 2/3: 检查环境配置..."

if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "⚠️  .env 文件不存在，从 .env.example 复制..."
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        echo "⚠️  已创建 .env 文件，但需要更新配置！"
        echo ""
        echo "请确保以下配置正确:"
        echo "  - DB_HOST=saleschampion-postgres"
        echo "  - DB_PASSWORD=SalesChampion_PG_2024!Secure"
        echo "  - REDIS_HOST=saleschampion-redis"
        echo "  - USER_CENTER_API=http://kong-gateway:8000/api"
        echo ""
        read -p "配置已更新？按Enter继续..."
    else
        echo "❌ .env.example 文件不存在"
        exit 1
    fi
else
    echo "✅ 环境配置文件存在"
fi
echo ""

# 3. 启动服务
echo "🚀 步骤 3/3: 启动知识库服务..."
cd "$PROJECT_DIR"
docker-compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 4. 验证服务状态
echo ""
echo "🏥 验证服务健康状态..."

if docker ps --filter "name=kb-api-server" --format "{{.Status}}" | grep -q "healthy"; then
    echo "✅ kb-api-server: 健康"
    healthy=true
elif docker ps --filter "name=kb-api-server" --format "{{.Status}}" | grep -q "Up"; then
    echo "⚠️  kb-api-server: 运行中 (等待健康检查)"
    healthy=true
else
    echo "❌ kb-api-server: 未运行"
    healthy=false
fi

echo ""
echo "============================================"

if [ "$healthy" = true ]; then
    echo "✅ 知识库服务启动成功!"
    echo ""
    echo "📍 服务访问地址:"
    echo "   API (直连):        http://localhost:8080"
    echo "   API (通过Kong):   http://localhost/api/v1"
    echo "   Health Check:      http://localhost:8080/health"
    echo "   Swagger文档:       http://localhost:8080/swagger/index.html"
    echo ""
    echo "🧪 快速测试:"
    echo "   curl http://localhost/api/v1/ping"
    echo ""
    echo "📝 查看日志:"
    echo "   docker-compose logs -f"
else
    echo "⚠️  服务启动失败，请检查日志"
    echo "   docker-compose logs kb-api-server"
    exit 1
fi
