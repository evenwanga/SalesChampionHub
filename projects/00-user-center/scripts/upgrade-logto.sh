#!/bin/bash
set -e

# Logto版本升级脚本
# 从 v1.20.0 升级到 v1.33.0

echo "=========================================="
echo "Logto 版本升级脚本"
echo "从 v1.20.0 升级到 v1.33.0"
echo "=========================================="

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 确认升级
echo ""
print_info "此脚本将执行以下操作："
echo "  1. 备份当前数据库"
echo "  2. 停止Logto服务"
echo "  3. 更新到v1.33.0"
echo "  4. 运行数据库迁移"
echo "  5. 重启所有服务"
echo ""
read -p "是否继续？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "升级已取消"
    exit 0
fi

# 第1步: 备份数据库
echo ""
echo "步骤 1/5: 备份数据库..."
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
docker-compose exec -T postgres pg_dump -U postgres logto > "backups/$BACKUP_FILE" 2>/dev/null || mkdir -p backups && docker-compose exec -T postgres pg_dump -U postgres logto > "backups/$BACKUP_FILE"

if [ -f "backups/$BACKUP_FILE" ]; then
    print_success "数据库已备份到: backups/$BACKUP_FILE"
else
    print_error "数据库备份失败"
    exit 1
fi

# 第2步: 停止Logto和Custom API
echo ""
echo "步骤 2/5: 停止服务..."
docker-compose stop logto custom-api
print_success "服务已停止"

# 第3步: 更新docker-compose.yml
echo ""
echo "步骤 3/5: 更新Logto版本..."

# 备份原配置
cp docker-compose.yml docker-compose.yml.backup

# 更新版本
sed -i.tmp 's/ghcr.io\/logto-io\/logto:1.20.0/ghcr.io\/logto-io\/logto:1.33.0/' docker-compose.yml
rm -f docker-compose.yml.tmp

print_success "docker-compose.yml已更新到v1.33.0"

# 第4步: 拉取新镜像并运行迁移
echo ""
echo "步骤 4/5: 拉取新镜像..."
docker-compose pull logto
print_success "新镜像已拉取"

print_info "运行数据库迁移..."

# 使用Logto CLI运行迁移
if command -v logto &> /dev/null; then
    logto db alteration deploy latest --db-url "postgresql://postgres:53e6a972e01f768238a06948d6675d32@localhost:5433/logto"
    print_success "数据库迁移完成"
else
    print_info "未找到Logto CLI，将在容器启动时自动迁移"
fi

# 第5步: 重启所有服务
echo ""
echo "步骤 5/5: 重启服务..."
docker-compose up -d postgres redis logto custom-api

print_info "等待服务启动..."
sleep 15

# 检查服务状态
LOGTO_STATUS=$(docker-compose ps logto --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [ "$LOGTO_STATUS" = "running" ]; then
    print_success "Logto服务运行正常"
else
    print_error "Logto服务状态异常: $LOGTO_STATUS"
    print_info "检查日志: docker-compose logs logto"
fi

# 验证升级
echo ""
echo "=========================================="
echo "升级完成验证"
echo "=========================================="

# 测试API
echo ""
print_info "测试Custom API..."
HEALTH_CHECK=$(curl -s http://localhost:3003/health 2>/dev/null || echo "failed")

if echo "$HEALTH_CHECK" | grep -q "healthy"; then
    print_success "Custom API运行正常"
else
    print_error "Custom API可能有问题"
    print_info "检查日志: docker-compose logs custom-api"
fi

# 显示服务状态
echo ""
print_info "当前服务状态:"
docker-compose ps

echo ""
echo "=========================================="
print_success "升级到v1.33.0完成！"
echo "=========================================="
echo ""
print_info "访问地址:"
echo "  - Logto管理控制台: http://localhost:3002"
echo "  - Logto核心API: http://localhost:3001"
echo "  - Custom API: http://localhost:3003"
echo ""
print_info "备份文件位置:"
echo "  - 数据库备份: backups/$BACKUP_FILE"
echo "  - 配置备份: docker-compose.yml.backup"
echo ""
print_info "如遇问题，可回滚到之前版本:"
echo "  1. docker-compose stop logto custom-api"
echo "  2. cp docker-compose.yml.backup docker-compose.yml"
echo "  3. docker-compose up -d"
echo "  4. 如需恢复数据: cat backups/$BACKUP_FILE | docker-compose exec -T postgres psql -U postgres logto"
echo ""
