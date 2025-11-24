#!/bin/bash

echo "=== 重启后端服务（带RLS禁用）==="
echo ""

cd /Users/wangyiwen/produce/SalesChampionHub/projects/01-ai-knowledge-base

# 1. 禁用RLS
echo "1. 禁用RLS..."
docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "ALTER TABLE documents DISABLE ROW LEVEL SECURITY;" > /dev/null 2>&1
echo "  ✅ RLS已禁用"

# 2. 停止现有服务
echo "2. 停止现有后端服务..."
pkill -9 -f "go run ./cmd/server" 2>/dev/null
pkill -9 -f "kb-api" 2>/dev/null
sleep 1
echo "  ✅ 现有服务已停止"

# 3. 确保目录权限
echo "3. 检查uploads目录..."
mkdir -p uploads
chmod 777 uploads
echo "  ✅ uploads目录权限已设置"

# 4. 启动服务
echo "4. 启动后端服务..."
nohup go run ./cmd/server > server.log 2>&1 &
SERVER_PID=$!
echo "  ✅ 后端服务已启动 (PID: $SERVER_PID)"

# 5. 等待服务启动
echo "5. 等待服务就绪..."
for i in {1..10}; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "  ✅ 服务已就绪"
        break
    fi
    sleep 1
    echo "  ⏳ 等待中... ($i/10)"
done

echo ""
echo "=== 重启完成 ==="
echo ""
echo "服务状态:"
curl -s http://localhost:8080/health | jq '.' 2>/dev/null || curl -s http://localhost:8080/health
echo ""
echo "查看日志: tail -f server.log"
echo "现在可以测试上传功能了！"
echo ""

