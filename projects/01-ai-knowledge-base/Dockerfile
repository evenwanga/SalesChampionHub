# 多阶段构建：编译阶段
FROM golang:1.25.3-alpine AS builder

# 安装必要的构建工具
RUN apk add --no-cache git

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

# 编译应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/server ./cmd/server

# 运行阶段：使用更小的镜像
FROM alpine:latest

# 安装CA证书和wget（用于健康检查）
RUN apk --no-cache add ca-certificates wget

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
