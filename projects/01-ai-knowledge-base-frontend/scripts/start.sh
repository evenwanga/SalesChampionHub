#!/bin/bash
# ==========================================
# AI 知识库前端 - Docker 启动脚本
# ==========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}AI 知识库管理平台 - 前端启动${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}警告: .env 文件不存在${NC}"
    echo -e "${YELLOW}将使用默认配置启动${NC}"
    echo ""
fi

# 检查 Docker 网络
echo -e "${YELLOW}检查 Docker 网络...${NC}"
if ! docker network ls | grep -q "infrastructure_saleschampion_network"; then
    echo -e "${RED}错误: Docker 网络 'infrastructure_saleschampion_network' 不存在${NC}"
    echo -e "${YELLOW}请先启动基础设施层：${NC}"
    echo -e "  cd ../../infrastructure"
    echo -e "  docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✓ Docker 网络检查通过${NC}"
echo ""

# 构建镜像
echo -e "${YELLOW}构建 Docker 镜像...${NC}"
docker-compose build --no-cache

# 启动容器
echo -e "${YELLOW}启动容器...${NC}"
docker-compose up -d

# 等待容器启动
echo -e "${YELLOW}等待容器启动...${NC}"
sleep 5

# 检查容器状态
echo ""
echo -e "${GREEN}容器状态:${NC}"
docker-compose ps

# 检查健康状态
echo ""
echo -e "${YELLOW}检查健康状态...${NC}"
sleep 3

if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ 前端服务健康检查通过${NC}"
else
    echo -e "${RED}✗ 前端服务健康检查失败${NC}"
    echo -e "${YELLOW}查看日志:${NC}"
    docker-compose logs --tail=20
    exit 1
fi

# 成功消息
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✓ 前端启动成功！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}访问地址:${NC}"
echo -e "  前端应用: ${GREEN}http://localhost:3000${NC}"
echo -e "  健康检查: ${GREEN}http://localhost:3000/health${NC}"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo -e "  查看日志:   ${GREEN}docker-compose logs -f${NC}"
echo -e "  停止服务:   ${GREEN}docker-compose stop${NC}"
echo -e "  重启服务:   ${GREEN}docker-compose restart${NC}"
echo -e "  删除服务:   ${GREEN}docker-compose down${NC}"
echo ""
