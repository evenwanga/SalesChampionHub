#!/bin/sh
# ==========================================
# Docker 入口脚本 - 运行时环境变量注入
# ==========================================

set -e

# 生成运行时环境配置文件
cat <<EOF > /usr/share/nginx/html/env-config.js
// 运行时环境配置 - 由 Docker 容器启动时生成
window.__ENV__ = {
  VITE_LOGTO_ENDPOINT: '${VITE_LOGTO_ENDPOINT}',
  VITE_LOGTO_APP_ID: '${VITE_LOGTO_APP_ID}',
  VITE_LOGTO_REDIRECT_URI: '${VITE_LOGTO_REDIRECT_URI}',
  VITE_LOGTO_POST_LOGOUT_REDIRECT_URI: '${VITE_LOGTO_POST_LOGOUT_REDIRECT_URI}',
  VITE_LOGTO_API_RESOURCE: '${VITE_LOGTO_API_RESOURCE}',
  VITE_API_BASE_URL: '${VITE_API_BASE_URL:-http://localhost:8080/api/v1}'
};
EOF

echo "✅ Environment configuration generated:"
cat /usr/share/nginx/html/env-config.js

# 执行 CMD
exec "$@"
