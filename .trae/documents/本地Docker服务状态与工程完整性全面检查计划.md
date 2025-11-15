## 范围与前提
- 覆盖开发(dev)、测试(test)、生产(prod)三套配置差异与依赖关系
- 针对本机 Docker Desktop 上已启动的容器进行状态与日志检查
- 不修改任何文件或配置；仅在得到确认后执行命令与生成报告

## 步骤一：服务状态检查
1. 列出正在运行容器
   - 执行：`docker ps`
   - 记录：容器ID、名称、端口映射、状态(Up/healthy)
2. 核查关键服务日志(每个容器取最近200行)
   - 执行：`docker logs --tail 200 <container>`
   - 目标容器：`kb-api-server`、`kb-bge-embedding`、`kb-frontend`、`saleschampion-redis`、`saleschampion-postgres`、`logto-core`、`kong-gateway`、`user-center-custom-api`
   - 判定规则：
     - 正常：健康探针 200、关键功能请求无错误
     - 异常：`5xx`、连接失败、认证错误、SQL异常、SSL握手错误等
3.（可选）接口健康探针验证
   - 执行：`curl` 本机端口或容器内：
     - `http://localhost:8080/health`（kb-api-server）
     - `http://localhost:8100/health`（kb-bge-embedding）
     - `http://localhost:3000/env-config.js` 与页面接口（kb-frontend）
     - Kong 管理端口 `:8001` 与代理端口 `:80/443/8000` 路由检测

## 步骤二：工程完整性检查
1. 验证目录结构与关键文件存在
   - Compose 文件：
     - `infrastructure/docker-compose.yml`
     - `projects/01-ai-knowledge-base/docker-compose.yml`
     - `projects/01-ai-knowledge-base-frontend/docker-compose.yml`
     - `projects/00-user-center/docker-compose.yml`
   - Dockerfile：
     - `projects/01-ai-knowledge-base-frontend/Dockerfile`
     - `projects/01-ai-knowledge-base/services/bge-embedding/Dockerfile`
     - `projects/01-ai-knowledge-base/Dockerfile`
     - `projects/00-user-center/custom-api/Dockerfile`
2. 组件清单核对（应当包含）
   - 数据库：PostgreSQL（`saleschampion-postgres`）
   - 缓存：Redis（`saleschampion-redis`）
   - 网关：Kong（`kong-gateway` + `kong-migrations`）
   - 认证：Logto（`logto-core`）与 `user-center-custom-api`
   - 应用：`kb-api-server`、`kb-bge-embedding`、`kb-frontend`
   - 网络：外部桥接 `infrastructure_saleschampion_network`

## 步骤三：进度分析
1. 对照需求/设计文档（按子项目）
   - 子项目0（用户中心）：`docs/api-specification.md`、`docs/technical-design.md`
   - 子项目1（AI知识库）：`docs/知识库挂载策略设计.md`、`docs/ARCHITECTURE_CHANGE.md`、`archive/development-docs/需求回顾与评估报告.md`
   - 跨项目：`docs/architecture-planning-discussion.md`
   - 前端集成：`FRONTEND_DESIGN.md`、`01-ai-knowledge-base-frontend/API_INTEGRATION_GUIDE.md`
   - 方法：逐项映射功能模块与接口契约，标注已完成/部分完成/未完成
2. 服务通信验证（接口层）
   - 前端→网关→后端：通过浏览器/API请求路径与 Kong 路由检查 2xx/4xx/5xx 比例
   - 后端→Redis/Postgres：应用日志与端口连通性（`nc -z <host> <port>` 或容器内 `psql`/`redis-cli`）
   - 后端→Logto：令牌校验接口与用户信息拉取
3. 数据库迁移状态与测试数据
   - 校验是否应用全部迁移：
     - 列存在性：`knowledge_base_mounts.created_at/updated_at`
       - `docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "\d+ knowledge_base_mounts"`
     - 函数存在性：`get_user_accessible_kbs`
       - `docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "\df get_user_accessible_kbs"`
   - 测试数据完整性：
     - `knowledge_bases`、`documents`、`document_chunks` 基本行数与索引覆盖
     - `docker exec ... psql -c "SELECT COUNT(*) FROM knowledge_bases;"` 等

## 步骤四：输出报告
- 工程状态摘要：服务运行、日志健康、接口连通、数据库与缓存连接、网络配置
- 已解决问题清单：按模块列出近期修复与优化点
- 现存问题清单：分类记录（功能、性能、安全、稳定性、数据一致性）与证据（日志片段/SQL结果）
- 后续建议与优先级：
  - P0：阻塞功能与数据正确性的错误（如SQL约束/缺列导致的 500）
  - P1：性能热点（如网关内存偏高、模型服务内存占用）与优化项
  - P2：工程化与测试（后端API集成测试落地、E2E测试、密钥管理）

## 环境差异覆盖
- 前端：dev 读取 `import.meta.env`，prod 运行时注入 `env-config.js`；`vite` 代理仅 dev 生效
- 后端与用户中心：未定义 `profiles`，以环境变量与部署方式区分；生产需替换密钥与域名、收敛暴露端口
- 基础设施：本地暴露 `5432/6379/80/443/8001/8002`；生产应最小暴露与强密码/证书

## 交付物
- 《Docker服务与工程状态检查报告》：包含原始命令输出摘录、分析结论、异常标注、建议与优先级
- 附录：命令清单与执行记录、日志与SQL校验片段

## 执行所需命令（确认后执行）
- 状态与日志：`docker ps`、`docker logs --tail 200 <container>`、`curl <health/url>`
- DB 校验：`docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "..."`
- 端口连通：`nc -z <host> <port>` 或容器内 `psql/redis-cli`

如果你确认此计划，我将按以上步骤执行并生成结构化检查报告。