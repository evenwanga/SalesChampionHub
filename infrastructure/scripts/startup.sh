#!/bin/bash

# SalesChampionHub 共享基础设施层一键启动脚本
# 按正确顺序启动所有服务并验证健康状态

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 SalesChampionHub 基础设施层启动脚本"
echo "================================================"
echo ""

# 1. 启动共享基础设施
echo "📦 步骤 1/3: 启动共享基础设施 (PostgreSQL, Redis, Kong)..."
cd "$INFRA_DIR"
docker-compose up -d

echo "⏳ 等待服务启动..."
sleep 10

# 2. 同步Kong配置
echo ""
echo "🔄 步骤 2/3: 同步Kong配置..."
bash "$SCRIPT_DIR/sync-kong.sh"

# 3. 验证服务状态
echo ""
echo "🏥 步骤 3/3: 验证服务健康状态..."
echo ""

services=("saleschampion-postgres" "saleschampion-redis" "kong-gateway")
all_healthy=true

for service in "${services[@]}"; do
    status=$(docker ps --filter "name=$service" --format "{{.Status}}")
    if echo "$status" | grep -q "healthy"; then
        echo "✅ $service: 健康"
    elif echo "$status" | grep -q "Up"; then
        echo "⚠️  $service: 运行中 (等待健康检查)"
    else
        echo "❌ $service: 未运行"
        all_healthy=false
    fi
done

echo ""
echo "================================================"

if [ "$all_healthy" = true ]; then
    echo "✅ 所有核心服务已启动!"
    echo ""
    echo "📍 服务访问地址:"
    echo "   Kong Gateway:    http://localhost:80"
    echo "   Kong Admin API:  http://localhost:8001"
    echo "   PostgreSQL:      localhost:5432"
    echo "   Redis:           localhost:6379"
    echo ""
    echo "💡 下一步: 启动子项目服务"
    echo "   cd ../projects/00-user-center && docker-compose up -d"
    echo "   cd ../projects/01-ai-knowledge-base && docker-compose up -d"
else
    echo "⚠️  部分服务启动失败，请检查日志"
    echo "   docker-compose logs -f"
    exit 1
fi
