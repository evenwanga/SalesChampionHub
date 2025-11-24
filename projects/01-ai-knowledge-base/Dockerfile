# 多阶段构建：编译阶段
# 使用Alpine以支持go-fitz（musl libc避免glibc兼容性问题）
FROM golang:1.25.3-alpine AS builder

# 启用Go工具链自动下载以支持go.mod中指定的版本
ENV GOTOOLCHAIN=auto

# 安装必要的构建工具和MuPDF开发库
# go-fitz需要CGO和MuPDF C库支持
RUN apk add --no-cache \
  git \
  gcc \
  g++ \
  musl-dev \
  mupdf-dev \
  pkgconfig

# 设置工作目录
WORKDIR /app

# 复制go mod文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 安装swag工具用于生成API文档
RUN go install github.com/swaggo/swag/cmd/swag@latest

# 复制源代码
COPY . .

# 生成Swagger文档
RUN /go/bin/swag init -g cmd/server/main.go -o docs/swagger

# 编译应用（启用CGO以支持go-fitz）
# 使用extlib构建标签以使用系统安装的MuPDF库，而不是预编译库
RUN CGO_ENABLED=1 GOOS=linux go build -tags extlib -a -o bin/server ./cmd/server

# 运行阶段：使用Alpine镜像（更小且兼容）
FROM alpine:latest

# 安装运行时依赖：MuPDF库、CA证书和wget（用于健康检查）
# go-fitz运行时需要MuPDF库
RUN apk --no-cache add \
  mupdf \
  ca-certificates \
  wget \
  font-noto-cjk

WORKDIR /root/

# 从构建阶段复制编译好的二进制文件
COPY --from=builder /app/bin/server .

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 -O /dev/null http://localhost:8080/health || exit 1

# 运行应用
CMD ["./server"]
