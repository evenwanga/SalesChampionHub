#!/bin/bash

# 用户中心数据备份脚本

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/user_center_backup_${TIMESTAMP}.sql"

echo "💾 开始备份用户中心数据..."

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份PostgreSQL数据库
echo "⏳ 备份数据库..."
docker-compose exec -T postgres pg_dump -U postgres logto > "$BACKUP_FILE"

# 压缩备份文件
echo "⏳ 压缩备份文件..."
gzip "$BACKUP_FILE"

COMPRESSED_FILE="${BACKUP_FILE}.gz"
FILE_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)

echo ""
echo "✅ 备份完成！"
echo ""
echo "📁 备份文件: $COMPRESSED_FILE"
echo "📊 文件大小: $FILE_SIZE"
echo ""
echo "💡 恢复方法:"
echo "  gunzip -c $COMPRESSED_FILE | docker-compose exec -T postgres psql -U postgres logto"
echo ""

# 删除7天前的备份
echo "🧹 清理旧备份（保留7天）..."
find "$BACKUP_DIR" -name "user_center_backup_*.sql.gz" -mtime +7 -delete
echo "✅ 清理完成"
echo ""
