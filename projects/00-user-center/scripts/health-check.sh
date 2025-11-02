#!/bin/bash

# 用户中心健康检查脚本

set -e

echo "🔍 检查用户中心服务健康状态..."
echo ""

# 检查Docker容器状态
echo "📦 Docker容器状态:"
docker-compose ps

echo ""
echo "=========================================="
echo "🏥 服务健康检查:"
echo "=========================================="

# 检查单个服务健康状态
check_service() {
    local url=$1
    local name=$2

    echo -n "  $name: "

    if curl -s "$url" > /dev/null 2>&1; then
        response=$(curl -s "$url")
        echo "✅ 正常"
        # echo "     $response"
    else
        echo "❌ 异常"
        return 1
    fi
}

# 检查各个服务
check_service "http://localhost:3001/api/health" "Logto核心API"
check_service "http://localhost:3003/health" "Custom API"

# 检查PostgreSQL
echo -n "  PostgreSQL: "
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ 正常"
else
    echo "❌ 异常"
fi

# 检查Redis
echo -n "  Redis: "
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ 正常"
else
    echo "❌ 异常"
fi

echo ""
echo "=========================================="
echo "📊 资源使用情况:"
echo "=========================================="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "💡 提示:"
echo "  - 查看详细日志: docker-compose logs -f [service]"
echo "  - 进入容器: docker-compose exec [service] sh"
echo "  - 查看数据库: docker-compose exec postgres psql -U postgres -d logto"
echo ""
