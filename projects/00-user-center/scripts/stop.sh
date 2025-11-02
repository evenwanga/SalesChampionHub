#!/bin/bash

# 用户中心停止脚本

set -e

echo "🛑 停止用户中心服务..."

# 停止服务
docker-compose down

echo ""
echo "✅ 用户中心服务已停止"
echo ""
echo "💡 提示:"
echo "  - 数据已保存在Docker volumes中"
echo "  - 重启服务: ./scripts/start.sh"
echo "  - 完全清理（包括数据）: docker-compose down -v"
echo ""
