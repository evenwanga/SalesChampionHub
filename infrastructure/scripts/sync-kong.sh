#!/bin/bash

# Kong配置自动同步脚本
# 用于在Kong重启或配置更新后自动同步声明式配置

set -e

KONG_ADDR=${KONG_ADDR:-"http://kong-gateway:8001"}
CONFIG_FILE=${CONFIG_FILE:-"/workspace/kong.yml"}

echo "🔄 开始同步Kong配置..."
echo "📍 Kong Admin API: $KONG_ADDR"
echo "📄 配置文件: $CONFIG_FILE"

# 等待Kong完全启动
echo "⏳ 等待Kong Gateway启动..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker exec kong-gateway kong health 2>/dev/null | grep -q "healthy"; then
        echo "✅ Kong Gateway已就绪"
        break
    fi
    attempt=$((attempt + 1))
    echo "   尝试 $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Kong Gateway启动超时"
    exit 1
fi

# 同步配置
echo "📤 同步配置到Kong..."
docker exec kong-deck deck gateway sync --kong-addr $KONG_ADDR $CONFIG_FILE

if [ $? -eq 0 ]; then
    echo "✅ Kong配置同步成功!"
    echo ""
    echo "📊 查看配置状态:"
    docker exec kong-deck deck gateway dump --kong-addr $KONG_ADDR --output-file /tmp/kong-current.yml 2>&1 | grep -E "Created|Updated|Deleted|Summary"
else
    echo "❌ Kong配置同步失败"
    exit 1
fi

echo ""
echo "🎉 完成!"
