# ==========================================
# 多阶段构建 - AI 知识库管理平台前端
# ==========================================

# ==========================================
# 阶段 1: 构建阶段
# ==========================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖（使用 npm ci 以获得更可靠的构建）
RUN npm ci --legacy-peer-deps

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# ==========================================
# 阶段 2: 生产阶段
# ==========================================
FROM nginx:alpine

# 安装 gettext（用于 envsubst 环境变量替换）
RUN apk add --no-cache gettext

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 创建 env 配置模板
COPY env-config.template.js /usr/share/nginx/html/env-config.template.js

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# 使用自定义入口点
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
