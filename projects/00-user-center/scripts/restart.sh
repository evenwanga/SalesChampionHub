#!/bin/bash

# 用户中心重启脚本

set -e

echo "🔄 重启用户中心服务..."

# 停止服务
./scripts/stop.sh

# 等待一下
sleep 3

# 启动服务
./scripts/start.sh
