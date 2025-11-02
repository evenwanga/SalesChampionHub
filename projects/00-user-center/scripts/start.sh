#!/bin/bash

# ============================================
# 子项目0: 多租户统一用户中心 - 启动脚本
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$PROJECT_DIR")")"

echo "🏢 子项目0: 多租户统一用户中心"
echo "============================================"
echo ""

# 1. 检查基础设施依赖
echo "📋 步骤 1/4: 检查基础设施依赖..."

required_services=("saleschampion-postgres" "saleschampion-redis")
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

# 2. 检查环境配置
echo "⚙️  步骤 2/4: 检查环境配置..."

if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "⚠️  .env 文件不存在，从 .env.example 复制..."
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        echo "✅ 已创建 .env 文件，请检查配置"
    else
        echo "❌ .env.example 文件不存在"
        exit 1
    fi
else
    echo "✅ 环境配置文件存在"
fi
echo ""

# 3. 初始化Logto数据库
echo "🗄️  步骤 3/4: 检查Logto数据库初始化状态..."

DB_CHECK=$(docker exec saleschampion-postgres psql -U postgres -d logto -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='applications';" 2>/dev/null || echo "0")

if [ "$DB_CHECK" = "0" ]; then
    echo "⚠️  Logto数据库未初始化，正在初始化..."
    cd "$PROJECT_DIR"
    docker-compose run --rm --entrypoint "npm run cli db seed" logto
    echo "✅ 数据库初始化完成"

    # 启用RLS
    echo "🔒 启用Row-Level Security..."
    docker exec saleschampion-postgres psql -U postgres -d logto << 'EOF'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;
EOF
    echo "✅ RLS已启用"
else
    echo "✅ Logto数据库已初始化"
fi
echo ""

# 4. 启动服务
echo "🚀 步骤 4/4: 启动用户中心服务..."
cd "$PROJECT_DIR"
docker-compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 15

# 5. 验证服务状态
echo ""
echo "🏥 验证服务健康状态..."

services=("logto-core" "user-center-custom-api")
all_healthy=true

for service in "${services[@]}"; do
    if docker ps --filter "name=$service" --format "{{.Status}}" | grep -q "Up"; then
        echo "✅ $service: 运行中"
    else
        echo "❌ $service: 未运行"
        all_healthy=false
    fi
done

echo ""
echo "============================================"

if [ "$all_healthy" = true ]; then
    echo "✅ 用户中心服务启动成功!"
    echo ""
    echo "📍 服务访问地址:"
    echo "   Logto Console:     http://localhost:3002"
    echo "   Logto API:         http://localhost:3001"
    echo "   Custom API:        http://localhost:3003"
    echo "   Health Check:      http://localhost:3003/health"
    echo ""
    echo "📝 查看日志:"
    echo "   docker-compose logs -f"
else
    echo "⚠️  部分服务启动失败，请检查日志"
    echo "   docker-compose logs"
    exit 1
fi
