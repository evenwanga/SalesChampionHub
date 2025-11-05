#!/bin/bash

# ==========================================
# 用户中心服务健康检查脚本
# ==========================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查计数器
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}用户中心服务健康检查${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ==========================================
# 1. 容器运行状态检查
# ==========================================
echo -e "${BLUE}[1/10] 检查容器运行状态...${NC}"

if docker ps --filter "name=logto-core" --format "{{.Names}}\t{{.Status}}" | grep -q "Up.*healthy"; then
    echo -e "${GREEN}✅ Logto Core 容器运行正常${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Logto Core 容器状态异常${NC}"
    docker ps --filter "name=logto-core" --format "{{.Names}}\t{{.Status}}"
    ((FAILED++))
fi

if docker ps --filter "name=user-center-custom-api" --format "{{.Names}}\t{{.Status}}" | grep -q "Up"; then
    echo -e "${GREEN}✅ Custom API 容器运行正常${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  Custom API 容器可能未启动或状态异常${NC}"
    ((WARNINGS++))
fi

echo ""

# ==========================================
# 2. Logto Core API 健康检查
# ==========================================
echo -e "${BLUE}[2/10] 检查 Logto Core API...${NC}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/status 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "204" ]; then
    echo -e "${GREEN}✅ Logto Core API 响应正常 (HTTP $HTTP_CODE)${NC}"
    ((PASSED++))
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}❌ 无法连接到 Logto Core API (端口 3001)${NC}"
    ((FAILED++))
else
    echo -e "${RED}❌ Logto Core API 返回异常状态码: $HTTP_CODE${NC}"
    ((FAILED++))
fi

echo ""

# ==========================================
# 3. OIDC 配置检查
# ==========================================
echo -e "${BLUE}[3/10] 检查 OIDC 配置...${NC}"

ISSUER=$(curl -s http://localhost:3001/oidc/.well-known/openid-configuration 2>/dev/null | grep -o '"issuer":"[^"]*"' | cut -d'"' -f4)

if [ "$ISSUER" = "http://localhost:3001/oidc" ]; then
    echo -e "${GREEN}✅ OIDC 配置正确${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ OIDC 配置异常，issuer: $ISSUER${NC}"
    ((FAILED++))
fi

echo ""

# ==========================================
# 4. Admin Console 检查
# ==========================================
echo -e "${BLUE}[4/10] 检查 Admin Console...${NC}"

ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null || echo "000")

if [ "$ADMIN_CODE" = "200" ] || [ "$ADMIN_CODE" = "302" ]; then
    echo -e "${GREEN}✅ Admin Console 可访问 (HTTP $ADMIN_CODE)${NC}"
    ((PASSED++))
elif [ "$ADMIN_CODE" = "000" ]; then
    echo -e "${RED}❌ 无法连接到 Admin Console (端口 3002)${NC}"
    ((FAILED++))
else
    echo -e "${RED}❌ Admin Console 返回异常: $ADMIN_CODE${NC}"
    ((FAILED++))
fi

echo ""

# ==========================================
# 5. 数据库连接检查
# ==========================================
echo -e "${BLUE}[5/10] 检查数据库连接...${NC}"

if docker exec saleschampion-postgres psql -U postgres -d logto -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 数据库连接正常${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 无法连接到数据库或数据库不存在${NC}"
    ((FAILED++))
fi

echo ""

# ==========================================
# 6. 数据表完整性检查
# ==========================================
echo -e "${BLUE}[6/10] 检查数据表完整性...${NC}"

TABLE_COUNT=$(docker exec saleschampion-postgres psql -U postgres -d logto -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('applications', 'users', '_logto_configs');" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" = "3" ]; then
    echo -e "${GREEN}✅ 关键数据表完整${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 关键数据表不完整 (期望3个，实际$TABLE_COUNT个)${NC}"
    ((FAILED++))
fi

echo ""

# ==========================================
# 7. Custom API 健康检查
# ==========================================
echo -e "${BLUE}[7/10] 检查 Custom API...${NC}"

CUSTOM_RESPONSE=$(curl -s http://localhost:3003/health 2>/dev/null || echo "error")

if echo "$CUSTOM_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Custom API 健康检查通过${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  Custom API 响应异常或未启动${NC}"
    ((WARNINGS++))
fi

echo ""

# ==========================================
# 8. 容器日志检查
# ==========================================
echo -e "${BLUE}[8/10] 检查容器日志...${NC}"

ERROR_COUNT=$(docker logs logto-core --since 5m 2>&1 | grep -i "error\|fatal" | wc -l | tr -d ' \n')

if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 最近5分钟无错误日志${NC}"
    ((PASSED++))
elif [ "$ERROR_COUNT" -lt 5 ]; then
    echo -e "${YELLOW}⚠️  发现 $ERROR_COUNT 条错误日志${NC}"
    ((WARNINGS++))
else
    echo -e "${RED}❌ 发现大量错误日志 ($ERROR_COUNT 条)${NC}"
    ((FAILED++))
fi

echo ""

# ==========================================
# 9. 数据持久化检查
# ==========================================
echo -e "${BLUE}[9/10] 检查数据持久化...${NC}"

if [ -d "/Users/wangyiwen/produce/SalesChampionHub/docker_data/postgres" ]; then
    FILE_COUNT=$(ls -1 /Users/wangyiwen/produce/SalesChampionHub/docker_data/postgres | wc -l)
    if [ "$FILE_COUNT" -gt 5 ]; then
        echo -e "${GREEN}✅ 数据持久化目录正常 ($FILE_COUNT 个文件/目录)${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  数据目录文件较少 ($FILE_COUNT 个)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ 数据持久化目录不存在${NC}"
    ((FAILED++))
fi

echo ""

# ==========================================
# 10. 网络配置检查
# ==========================================
echo -e "${BLUE}[10/10] 检查容器网络...${NC}"

NETWORK_CONTAINERS=$(docker network inspect infrastructure_saleschampion_network 2>/dev/null | grep -c "logto-core\|saleschampion-postgres" || echo "0")

if [ "$NETWORK_CONTAINERS" -ge 2 ]; then
    echo -e "${GREEN}✅ 容器网络配置正常${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ 容器网络配置异常${NC}"
    ((FAILED++))
fi

echo ""

# ==========================================
# 汇总结果
# ==========================================
TOTAL=$((PASSED + FAILED + WARNINGS))
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}健康检查完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "总检查项: ${BLUE}$TOTAL${NC}"
echo -e "通过:     ${GREEN}$PASSED${NC}"
echo -e "警告:     ${YELLOW}$WARNINGS${NC}"
echo -e "失败:     ${RED}$FAILED${NC}"
echo ""

# 判断整体健康状态
if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ 服务完全健康${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}⚠️  服务运行正常，但有 $WARNINGS 个警告${NC}"
    echo -e "${YELLOW}========================================${NC}"
    exit 0
elif [ $FAILED -le 2 ]; then
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}⚠️  服务部分异常，需要关注${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo "建议操作:"
    echo "1. 查看详细日志: docker logs logto-core --tail 50"
    echo "2. 检查容器状态: docker ps -a"
    echo "3. 参考完整指南: projects/00-user-center/HEALTH_CHECK.md"
    exit 1
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ 服务严重异常，需要立即处理${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "紧急操作:"
    echo "1. 检查最近的修改操作"
    echo "2. 查看错误日志: docker logs logto-core --tail 100"
    echo "3. 如有备份，考虑恢复: docker exec -i saleschampion-postgres psql -U postgres -d logto < backup.sql"
    echo "4. 参考完整指南: projects/00-user-center/HEALTH_CHECK.md"
    exit 2
fi
