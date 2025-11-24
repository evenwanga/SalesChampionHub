#!/bin/bash
# ==========================================
# AI 知识库前端 - 开发模式启动脚本 (Hot Reload)
# ==========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}AI 知识库前端 - 开发模式启动${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查 .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}警告: .env 文件不存在，复制示例配置...${NC}"
    cp .env.example .env
fi

# 停止生产容器（如果运行中）
if docker ps | grep -q "kb-frontend"; then
    echo -e "${YELLOW}检测到生产容器正在运行，正在停止...${NC}"
    docker stop kb-frontend
    docker rm kb-frontend
fi

# 启动开发容器
echo -e "${YELLOW}启动开发容器 (支持热重载)...${NC}"
docker-compose -f docker-compose.dev.yml up -d

echo -e "${YELLOW}等待服务启动...${NC}"
sleep 5

# 检查日志
echo -e "${GREEN}容器已启动！${NC}"
echo -e "${YELLOW}访问地址: http://localhost:3000${NC}"
echo -e "${YELLOW}查看日志: docker-compose -f docker-compose.dev.yml logs -f${NC}"
