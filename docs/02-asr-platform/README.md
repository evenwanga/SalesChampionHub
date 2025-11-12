# 子项目2: ASR语音分析平台

> **CPU友好型**销售通话分析系统 - 基于Whisper的智能语音转文本与话术分析平台

---

## 📋 项目概览

### 项目信息

- **项目名称**: ASR语音分析平台
- **项目编号**: 02-asr-speech-analysis
- **项目类型**: 销售通话分析与质量评估
- **项目规模**: Level 2 (10-12个故事)
- **技术约束**: ⚡ CPU优先 - 无GPU依赖
- **项目状态**: 📝 规划阶段 (Phase 1 完成)

### 核心价值

ASR语音分析平台为销售团队提供：
- ✅ **准确识别**: 基于Whisper模型，中文准确率 >90%
- ✅ **销售专注**: 内置销售话术库和质量评估算法
- ✅ **实时反馈**: 支持实时转录和即时质量评分
- ✅ **成本可控**: CPU推理方案，无需GPU硬件
- ✅ **数据安全**: 多租户隔离，基于RLS的数据保护

### 关键指标 (KPIs)

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| **转录准确率 (CER)** | >90% | - |
| **转录延迟** | <2秒 | - |
| **批量处理速度** | 音频时长/处理时长 > 2 | - |
| **话术识别召回率** | >85% | - |
| **CPU占用** | <80% | - |

---

## 📚 文档索引

### 核心文档

1. **[PRD.md](./PRD.md)** - 产品需求文档
   - 产品定义和目标
   - 功能需求（用户故事、API设计）
   - 非功能性需求
   - 集成需求
   - 成功指标

2. **[technical-design.md](./technical-design.md)** - 技术架构设计
   - 系统架构
   - 核心模块设计
   - 数据库设计
   - CPU优化策略
   - 部署架构

3. **[CPU-friendly-ASR-models-comparison.md](./CPU-friendly-ASR-models-comparison.md)** - CPU友好型模型评估
   - 候选模型对比（Whisper、Paraformer、SenseVoice）
   - 性能基准测试
   - 推荐方案
   - 成本分析

4. **[implementation-roadmap.md](./implementation-roadmap.md)** - 实施路线图
   - Epic分解 (7个Epic)
   - 时间表 (6周MVP)
   - 验收标准
   - 风险管理

---

## 🏗️ 系统架构

### 技术栈

| 组件 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| **编程语言** | Go | 1.25+ | 高性能、并发友好 |
| **ASR引擎** | Whisper (ONNX) | Large-v3 | 开源、多语言、CPU优化 |
| **备选引擎** | Paraformer | - | 中文专优 |
| **推理框架** | ONNX Runtime | 1.18+ | CPU优化、量化支持 |
| **音频处理** | FFmpeg | 6.0+ | 格式转换、降噪 |
| **数据库** | PostgreSQL | 16 | 与子项目0共享 |
| **缓存** | Redis | 7 | 与子项目0共享 |
| **消息队列** | Redis Streams | 7 | 异步任务 |
| **对象存储** | MinIO | Latest | S3兼容 |
| **Web框架** | Gin | 1.10+ | RESTful API |

### 架构图

```
┌─────────────────────────────────────────┐
│        子项目0: 用户中心 (认证)         │
└──────────────┬──────────────────────────┘
               │ JWT + RBAC
               ↓
┌─────────────────────────────────────────┐
│           API网关 (Gin)                 │
│  [认证] [RLS] [限流]                    │
└─────────┬───────────┬───────────┬───────┘
          │           │           │
     ┌────▼────┐ ┌────▼────┐ ┌───▼────┐
     │音频管理 │ │转录服务 │ │分析服务│
     └────┬────┘ └────┬────┘ └───┬────┘
          │           │           │
     ┌────▼────┐ ┌────▼────┐ ┌───▼────┐
     │FFmpeg   │ │Whisper  │ │NLP引擎 │
     │引擎     │ │ONNX推理 │ │关键词  │
     └─────────┘ └─────────┘ └────────┘
               │
     ┌─────────┼─────────┐
     │         │         │
  ┌──▼──┐  ┌──▼───┐  ┌──▼───┐
  │MinIO│  │PG+RLS│  │Redis │
  └─────┘  └──────┘  └──────┘
```

---

## 🎯 核心功能

### 模块划分

#### 模块A: 音频管理
- 音频上传 (支持WAV/MP3/M4A/AAC)
- 格式转换 (自动转为WAV 16kHz mono)
- 音频预处理
- 元数据提取

#### 模块B: 语音转文本 (ASR)
- 离线批量转录
- 实时流式转录 (Phase 2)
- 多语言支持 (中英文)
- 自定义词典

#### 模块C: 话术分析
- 关键词提取 (TF-IDF + 销售词典)
- 话术模式识别 (SPIN、价值主张、异议处理)
- 销售阶段识别
- 情感分析 (Phase 3)

#### 模块D: 质量评估
- 四维度评分 (开场白、需求挖掘、异议处理、成交)
- 加权总分计算
- 改进建议生成
- 对比分析

#### 模块E: 数据管理
- 转录结果存储
- 分析报告存储
- 历史查询
- 全文搜索

---

## 🚀 开发路线图

### Phase 1: 需求分析 ✅ (已完成)

**时长**: 1周
**交付物**:
- ✅ PRD文档
- ✅ 技术架构设计
- ✅ 模型评估报告
- ✅ 实施路线图

### Phase 2: 基础设施 (1周)

**Epic-1**: 基础设施搭建
- Story 1.1: 数据库架构 (2天)
- Story 1.2: MinIO存储 (1天)
- Story 1.3: 用户中心集成 (2天)

### Phase 3: 核心功能 (2周)

**Epic-2**: 音频管理服务
- Story 2.1: 音频上传 (2天)
- Story 2.2: 音频预处理 (3天)

**Epic-3**: ASR转录引擎
- Story 3.1: Whisper集成 (3天)
- Story 3.2: 任务队列 (3天)
- Story 3.3: 转录API (2天)

### Phase 4: 分析能力 (2周)

**Epic-4**: 话术分析
- Story 4.1: 关键词和话术识别 (3天)
- Story 4.2: 质量评分 (2天)

**Epic-5**: 统计报告
- Story 5.1: 统计和报告 (2天)
- Story 5.2: 批量和搜索 (2天)

### Phase 5: MVP发布 (1周)

- 集成测试
- 性能测试
- 安全测试
- 文档完善
- 部署上线

### Phase 6: 增强功能 (4周)

**Epic-6**: 实时转录 (2周)
**Epic-7**: 说话人分离和情感分析 (3周)

---

## 📊 模型推荐

### 方案A: 双模型架构 (推荐⭐⭐⭐⭐⭐)

**策略**: 根据语言自动选择模型

- **中文任务**: Paraformer-large-onnx
  - RTF: 0.65
  - CER: 4.5%
  - 成本: ¥0.011/分钟

- **英文/多语言**: Whisper-large-v3-int8
  - RTF: 1.85
  - CER: 5%
  - 成本: ¥0.031/分钟

### 方案B: Whisper单模型 (MVP推荐⭐⭐⭐⭐)

**策略**: 仅使用Whisper Large-v3

- **模型**: whisper-large-v3-int8.onnx
- **RTF**: 1.85
- **CER**: 5% (中文)
- **成本**: ¥0.03/分钟
- **优势**: 架构简单、多语言、生态成熟

### CPU优化策略

1. **INT8量化**: 模型大小 -75%，推理速度 +2.5x
2. **多线程推理**: ONNX Runtime使用8核
3. **批处理**: 提高CPU利用率
4. **缓存优化**: Redis缓存Mel-spectrogram
5. **水平扩展**: 多Worker并行处理

---

## 💰 成本估算

### 硬件需求

| 资源 | 配置 | 数量 | 月成本 |
|------|------|------|--------|
| **Worker服务器** | 16核32GB | 4 | ¥4,000 |
| **API服务器** | 8核16GB | 2 | ¥1,600 |
| **存储** | 2TB SSD | 1 | ¥400 |
| **网络** | 1Gbps | - | ¥200 |

**总计**: ¥6,200/月 (100小时音频/天)

### 运营成本

| 项目 | 单价 | 月度 (100小时/天) |
|------|------|------------------|
| **转录** | ¥0.03/分钟 | ¥5,400 |
| **存储** | ¥0.001/分钟 | ¥180 |
| **人工审核** | ¥0.01/分钟 | ¥1,800 |

**总计**: ¥7,380/月

---

## 🔐 安全设计

### 多租户隔离

**三层防护**:

1. **应用层**: JWT验证 + tenant_id检查
2. **数据库层**: Row-Level Security (RLS)
3. **存储层**: MinIO bucket按租户隔离

```sql
-- RLS策略示例
CREATE POLICY tenant_audio_access ON audio_files
USING (tenant_id = current_setting('app.current_tenant')::text);
```

### 数据加密

- **传输加密**: TLS 1.3
- **存储加密**: MinIO服务端加密
- **Token加密**: JWT HS256

### 审计日志

- 所有API调用记录
- 音频访问日志
- 管理操作日志

---

## 🧪 测试策略

### 测试覆盖

| 测试类型 | 覆盖率目标 | 工具 |
|---------|----------|------|
| **单元测试** | >80% | Go testing |
| **集成测试** | >70% | Testify |
| **API测试** | 100% | Postman |
| **性能测试** | - | JMeter |
| **安全测试** | - | OWASP ZAP |

### 关键测试场景

- ✅ 多租户隔离测试
- ✅ 转录准确率测试 (人工抽查)
- ✅ CPU性能基准测试
- ✅ 并发处理能力测试
- ✅ 故障恢复测试

---

## 📈 监控指标

### 系统指标

- CPU占用率
- 内存占用
- 磁盘IO
- 网络带宽

### 业务指标

- 转录任务数 (日/周/月)
- 转录总时长
- 平均质量评分
- 任务成功率
- 平均处理时间

### 告警规则

- CPU占用 >85% (持续5分钟)
- 内存占用 >90%
- 任务队列积压 >100
- 任务失败率 >5%

---

## 🔗 集成依赖

### 上游依赖

**子项目0: 用户中心**
- 用户认证 (JWT)
- 租户管理
- 权限控制 (RBAC)
- 组织管理

### 下游服务

**子项目7: AI陪练系统**
- 实时转录API
- 话术分析API
- 质量评分API

---

## 📝 快速开始

### 前置要求

- Go 1.25+
- Docker & Docker Compose
- 子项目0已启动
- Whisper模型文件

### 部署步骤

```bash
# 1. 克隆代码
git clone https://github.com/xxx/SalesChampionHub.git
cd SalesChampionHub/projects/02-asr-platform

# 2. 下载模型
./scripts/download-models.sh

# 3. 配置环境变量
cp .env.example .env
# 编辑.env配置

# 4. 启动服务
docker-compose up -d

# 5. 初始化数据库
./scripts/init-db.sh

# 6. 验证服务
curl http://localhost:8081/health
```

### API文档

访问 **http://localhost:8081/swagger/index.html** 查看交互式API文档。

---

## 🤝 贡献指南

### 开发工作流

1. 创建feature分支: `git checkout -b feature/xxx`
2. 开发并提交: 遵循Conventional Commits
3. 运行测试: `go test ./...`
4. 提交PR: 等待Code Review
5. 合并到main

### 代码规范

- Go代码风格: 遵循 `gofmt`
- 注释: 所有公开函数必须有注释
- 测试: 新功能必须包含单元测试
- Swagger: API变更必须更新Swagger注解

---

## 📚 参考资料

### 技术文档

- [Whisper GitHub](https://github.com/openai/whisper)
- [Paraformer (FunASR)](https://github.com/alibaba-damo-academy/FunASR)
- [ONNX Runtime文档](https://onnxruntime.ai/docs/)
- [FFmpeg文档](https://ffmpeg.org/documentation.html)

### 相关项目

- [子项目0 - 用户中心](/projects/00-user-center/README.md)
- [子项目1 - 知识库](/projects/01-ai-knowledge-base/README.md)

---

## 📞 支持

### 问题反馈

- **Issue追踪**: GitHub Issues
- **邮件**: support@saleschampionhub.com
- **文档**: 查看 `/docs/02-asr-platform/`

---

## 📄 许可证

MIT License

---

**文档版本**: v1.0
**最后更新**: 2025-11-12
**维护者**: sale champion hub
**项目状态**: 📝 规划阶段
