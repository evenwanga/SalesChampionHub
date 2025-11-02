#!/bin/bash

# 用户中心启动脚本

set -e

echo "🚀 启动用户中心服务..."

# 检查.env文件
if [ ! -f .env ]; then
    echo "❌ 错误: .env 文件不存在"
    echo "请先运行: cp .env.example .env"
    exit 1
fi

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误: Docker未运行"
    echo "请先启动Docker"
    exit 1
fi

# 检查端口占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ 错误: 端口 $port 已被占用"
        echo "请检查并关闭占用该端口的进程"
        exit 1
    fi
}

echo "⏳ 检查端口..."
check_port 3001
check_port 3002
check_port 3003
check_port 5432
check_port 6379

echo "✅ 端口检查通过"

# 启动服务
echo "⏳ 启动Docker Compose服务..."
docker-compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务健康状态
echo ""
echo "⏳ 检查服务健康状态..."

check_health() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $name 服务已就绪"
            return 0
        fi
        echo "   等待 $name 服务启动... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ $name 服务启动超时"
    return 1
}

check_health "http://localhost:3001/api/health" "Logto核心"
check_health "http://localhost:3003/health" "Custom API"

echo ""
echo "=========================================="
echo "✅ 用户中心服务启动成功！"
echo "=========================================="
echo ""
echo "📝 服务访问地址:"
echo "  - Logto管理控制台: http://localhost:3002"
echo "  - Logto核心API:    http://localhost:3001"
echo "  - Custom API:      http://localhost:3003"
echo "  - PostgreSQL:      localhost:5432"
echo "  - Redis:           localhost:6379"
echo ""
echo "📖 下一步:"
echo "  1. 访问管理控制台创建第一个管理员账号"
echo "  2. 创建组织(Organization)和应用(Application)"
echo "  3. 运行: ./scripts/create-first-tenant.sh 查看详细指引"
echo ""
echo "🔧 常用命令:"
echo "  - 查看日志: docker-compose logs -f"
echo "  - 停止服务: ./scripts/stop.sh"
echo "  - 重启服务: ./scripts/restart.sh"
echo "  - 健康检查: ./scripts/health-check.sh"
echo ""
