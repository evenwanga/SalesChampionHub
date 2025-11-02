# 开发路线图 - 多租户统一用户中心

**项目**: 00-user-center
**基于框架**: Logto (推荐)
**预计周期**: 10-12周
**开始日期**: TBD（技术选型确认后）
**优先级**: 最高（所有子项目的依赖）

---

## 📅 开发计划总览

```
Phase 0: 框架选型与验证 (1-2周)
    └── Week 1-2: POC开发与技术评审

Phase 1: 核心功能开发 (4-6周)
    ├── Week 3-4: 租户管理
    ├── Week 5-6: 用户管理
    ├── Week 7: 权限系统
    └── Week 8: API开发

Phase 2: 高级功能 (3-4周)
    ├── Week 9: SSO集成
    ├── Week 10: MFA
    ├── Week 11: 审计日志
    └── Week 12: 管理后台

Phase 3: 测试与优化 (2周)
    ├── Week 13: 测试
    └── Week 14: 优化与部署

Total: 10-14周
```

**关键路径**: Phase 0 → Phase 1 (Week 3-8) 是其他子项目的依赖

---

## 🎯 Phase 0: 框架选型与验证 (1-2周)

### Week 1: POC 开发

#### 🎯 目标
- Logto 本地部署成功
- 验证核心功能可用
- 评估定制化难度

#### ✅ 任务清单

**Day 1-2: 环境搭建**
- [ ] Logto Docker 部署
  ```bash
  docker-compose up -d
  ```
- [ ] 访问管理控制台: `http://localhost:3002`
- [ ] 访问核心服务: `http://localhost:3001`
- [ ] 阅读 Logto 官方文档

**Day 3-4: 功能验证**
- [ ] 创建测试应用（Application）
- [ ] 创建测试组织（Organization）
- [ ] 创建测试用户
- [ ] 测试用户登录流程
- [ ] 测试 OIDC 认证流程
- [ ] 获取并解析 JWT Token
- [ ] 验证组织级 RBAC

**Day 5: 定制化评估**
- [ ] 测试 Organizations API
- [ ] 测试自定义字段（custom_data）
- [ ] 评估权限系统扩展能力
- [ ] 评估 UI 定制化难度
- [ ] 列出需要开发的功能

#### 📦 交付物
- ✅ POC 演示环境
- ✅ 功能验证报告
- ✅ 定制化评估文档
- ✅ 技术风险清单

---

### Week 2: 技术评审与决策

#### 🎯 目标
- 技术方案评审通过
- 确定最终技术选型
- 明确开发范围

#### ✅ 任务清单

**Day 1-2: 技术评审**
- [ ] 准备评审材料
- [ ] 演示 POC
- [ ] 对比三个框架的优劣
- [ ] 评审会议

**Day 3: 技术选型决策**
- [ ] 确定最终选择（Logto / Casdoor / Keycloak）
- [ ] 如选择 Logto，继续下一阶段
- [ ] 如选择其他，调整开发计划

**Day 4-5: 项目规划**
- [ ] 细化需求清单
- [ ] 制定详细开发计划
- [ ] 分配开发资源
- [ ] 搭建开发环境

#### 📦 交付物
- ✅ 技术选型决策文档
- ✅ 详细开发计划
- ✅ 开发环境

---

## 🏗️ Phase 1: 核心功能开发 (4-6周)

**重点**: 这个阶段完成后，其他子项目即可开始集成

### Week 3-4: 租户管理

#### 🎯 目标
- 租户 CRUD 完整实现
- 租户配额系统就绪
- 租户状态管理

#### ✅ 任务清单

**Day 1-3: 基于 Logto Organizations 的租户管理**
- [ ] 设计租户数据模型
  ```typescript
  interface OrganizationCustomData {
    plan: 'free' | 'pro' | 'enterprise';
    quota: { ... };
    status: 'trial' | 'active' | 'suspended';
  }
  ```
- [ ] 实现租户创建 API
  ```typescript
  POST /api/v1/tenants
  ```
- [ ] 实现租户信息获取 API
- [ ] 实现租户更新 API
- [ ] 实现租户删除（软删除）

**Day 4-6: 租户配额系统**
- [ ] 创建配额数据库表
  ```sql
  CREATE TABLE tenant_quotas (...)
  ```
- [ ] 实现配额检查中间件
  ```typescript
  async function checkQuota(orgId, resourceType)
  ```
- [ ] 实现配额使用统计
- [ ] 配额超限告警
- [ ] 配额管理 API

**Day 7-8: 租户生命周期管理**
- [ ] 租户状态机实现
  - PENDING → ACTIVE
  - ACTIVE → SUSPENDED
  - SUSPENDED → ACTIVE
  - ACTIVE → ARCHIVED
- [ ] 租户暂停/恢复 API
- [ ] 租户归档流程

**Day 9-10: 测试**
- [ ] 单元测试
- [ ] 集成测试
- [ ] 多租户隔离测试

#### 📦 交付物
- ✅ 租户管理服务代码
- ✅ 租户配额系统
- ✅ API 文档
- ✅ 测试用例

---

### Week 5-6: 用户管理

#### 🎯 目标
- 用户注册/登录流程完整
- 用户信息管理
- 密码策略实施

#### ✅ 任务清单

**Day 1-3: 用户认证流程**
- [ ] 基于 Logto 实现用户注册
- [ ] 邮箱验证集成
- [ ] 密码策略配置
  ```typescript
  const passwordPolicy = {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true
  }
  ```
- [ ] 用户登录流程（OAuth 2.1 / OIDC）
- [ ] Token 生成与验证

**Day 4-6: 用户管理 API**
- [ ] 用户邀请功能
  ```typescript
  POST /api/v1/tenants/{orgId}/invitations
  ```
- [ ] 用户信息 CRUD
- [ ] 用户组织关系管理
- [ ] 用户状态管理（激活/停用）

**Day 7-8: 扩展功能**
- [ ] 社交登录集成（可选）
  - Google
  - GitHub
- [ ] 密码重置流程
- [ ] 用户个人资料管理

**Day 9-10: 测试**
- [ ] 认证流程测试
- [ ] 安全测试（密码策略）
- [ ] 邮件发送测试

#### 📦 交付物
- ✅ 用户认证服务
- ✅ 用户管理 API
- ✅ 邮件模板
- ✅ 测试报告

---

### Week 7: 权限系统

#### 🎯 目标
- 组织级 RBAC 实现
- 权限校验 API 就绪
- 预定义角色完成

#### ✅ 任务清单

**Day 1-2: 角色定义**
- [ ] 定义组织级预定义角色
  ```typescript
  const ROLES = {
    owner: { ... },
    admin: { ... },
    member: { ... }
  }
  ```
- [ ] 定义应用级角色（知识库示例）
  ```typescript
  const APP_ROLES = {
    kb_admin: { permissions: ['kb:*', 'doc:*'] },
    kb_editor: { permissions: ['kb:read', 'doc:*'] },
    kb_viewer: { permissions: ['kb:read', 'doc:read'] }
  }
  ```
- [ ] 在 Logto 中创建角色

**Day 3-4: 权限校验 API ⭐ 核心**
- [ ] 实现 Token 验证 API
  ```typescript
  POST /api/v1/auth/verify-token
  ```
- [ ] 实现权限检查 API
  ```typescript
  POST /api/v1/auth/check-permission
  ```
- [ ] 实现批量权限检查
  ```typescript
  POST /api/v1/auth/check-permissions
  ```
- [ ] 权限缓存机制（Redis）

**Day 5: 角色管理 API**
- [ ] 分配角色 API
  ```typescript
  POST /api/v1/tenants/{orgId}/users/{userId}/roles
  ```
- [ ] 撤销角色 API
- [ ] 查询用户权限 API

#### 📦 交付物
- ✅ 权限系统代码
- ✅ 权限校验 API ⭐
- ✅ 角色管理 API
- ✅ Redis 缓存配置

---

### Week 8: API 开发与文档

#### 🎯 目标
- 完成所有对外 API
- API 文档完善
- SDK 开发（Go / TypeScript）

#### ✅ 任务清单

**Day 1-2: API 完善**
- [ ] 补充遗漏的 API 端点
- [ ] 统一错误处理
  ```typescript
  {
    "error": "error_code",
    "error_description": "...",
    "error_details": { ... }
  }
  ```
- [ ] 统一响应格式
- [ ] API 版本控制

**Day 3-4: SDK 开发**
- [ ] Go SDK 开发
  ```go
  client := usercenter.NewClient(&Config{
    Endpoint: "...",
    APIKey: "..."
  })
  ```
- [ ] TypeScript SDK 开发
- [ ] SDK 使用示例

**Day 5: 文档与测试**
- [ ] OpenAPI/Swagger 文档生成
- [ ] API 集成指南
- [ ] Postman Collection
- [ ] API 测试

#### 📦 交付物
- ✅ 完整的 API 端点
- ✅ Go SDK ⭐
- ✅ TypeScript SDK ⭐
- ✅ OpenAPI 文档
- ✅ 集成指南 ⭐

**🎉 里程碑1**: 核心功能完成，其他子项目可以开始集成！

---

## 🚀 Phase 2: 高级功能 (3-4周)

**说明**: 这个阶段可以与其他子项目并行开发

### Week 9: SSO 集成

#### 🎯 目标
- 企业 SSO 支持
- SAML 2.0 集成
- OIDC 身份联邦

#### ✅ 任务清单

**Day 1-3: SAML 2.0**
- [ ] SAML IdP 配置
- [ ] SAML 元数据上传
- [ ] SAML 登录流程测试

**Day 4-5: OIDC 联邦**
- [ ] 外部 OIDC 提供商集成
- [ ] Just-in-Time Provisioning

#### 📦 交付物
- ✅ SSO 配置功能
- ✅ SSO 登录流程

---

### Week 10: MFA 多因素认证

#### 🎯 目标
- TOTP 支持
- SMS/Email 验证
- MFA 管理

#### ✅ 任务清单

**Day 1-3: TOTP 实现**
- [ ] TOTP 生成与验证
- [ ] QR码生成
- [ ] 备份码

**Day 4-5: SMS/Email MFA**
- [ ] 短信验证集成
- [ ] 邮箱验证码
- [ ] MFA 管理界面

#### 📦 交付物
- ✅ MFA 功能
- ✅ MFA 管理 API

---

### Week 11: 审计日志

#### 🎯 目标
- 完整的审计日志系统
- 合规报告

#### ✅ 任务清单

**Day 1-3: 审计日志系统**
- [ ] 创建审计日志表
  ```sql
  CREATE TABLE api_audit_logs (...)
  CREATE TABLE login_history (...)
  ```
- [ ] 实现日志记录中间件
- [ ] 敏感操作审计

**Day 4-5: 日志查询与报告**
- [ ] 日志查询 API
- [ ] 合规报告生成
- [ ] 日志导出功能

#### 📦 交付物
- ✅ 审计日志系统
- ✅ 合规报告

---

### Week 12: 管理后台

#### 🎯 目标
- 租户管理界面
- 用户管理界面
- 统计仪表板

#### ✅ 任务清单

**Day 1-3: 管理界面开发**
- [ ] 租户列表和详情页
- [ ] 用户列表和详情页
- [ ] 配额管理界面
- [ ] 角色权限管理

**Day 4-5: 统计仪表板**
- [ ] 租户使用统计
- [ ] 用户活跃度统计
- [ ] API 调用统计
- [ ] 图表可视化

#### 📦 交付物
- ✅ 管理后台界面
- ✅ 统计仪表板

**🎉 里程碑2**: 高级功能完成

---

## 🧪 Phase 3: 测试与优化 (2周)

### Week 13: 全面测试

#### 🎯 目标
- 单元测试覆盖率 > 80%
- 集成测试通过
- 安全测试通过

#### ✅ 任务清单

**Day 1-2: 单元测试**
- [ ] 补充单元测试
- [ ] 测试覆盖率检查
- [ ] 边界条件测试

**Day 3-4: 集成测试**
- [ ] 端到端流程测试
- [ ] 多租户并发测试
- [ ] 性能压测（JMeter/k6）

**Day 5: 安全测试**
- [ ] OWASP Top 10 检查
- [ ] SQL 注入测试
- [ ] XSS 测试
- [ ] CSRF 测试
- [ ] 密码策略测试

#### 📦 交付物
- ✅ 测试报告
- ✅ 性能基准
- ✅ 安全审计报告

---

### Week 14: 优化与部署

#### 🎯 目标
- 性能优化
- 生产环境部署
- 监控告警配置

#### ✅ 任务清单

**Day 1-2: 性能优化**
- [ ] 数据库查询优化
- [ ] Redis 缓存优化
- [ ] API 响应时间优化
- [ ] 连接池配置

**Day 3-4: 部署准备**
- [ ] Docker 镜像构建
- [ ] Kubernetes 配置
- [ ] 环境变量配置
- [ ] CI/CD 流程

**Day 5: 监控与文档**
- [ ] Prometheus 监控配置
- [ ] Grafana 仪表板
- [ ] 告警规则配置
- [ ] 运维文档完善
- [ ] 用户手册编写

#### 📦 交付物
- ✅ 生产环境部署
- ✅ 监控系统
- ✅ 完整文档

**🎉 里程碑3**: 项目交付，正式上线！

---

## 📊 里程碑与验收标准

### M0: 技术选型完成 (Week 2)
- ✅ POC 验证通过
- ✅ 技术方案评审通过
- ✅ 开发环境就绪

### M1: 核心功能完成 (Week 8) ⭐ 关键里程碑
- ✅ 租户管理功能完整
- ✅ 用户认证系统就绪
- ✅ 权限校验 API 可用
- ✅ Go/TypeScript SDK 就绪
- ✅ 其他子项目可以开始集成 ⭐

### M2: 高级功能完成 (Week 12)
- ✅ SSO 支持
- ✅ MFA 功能
- ✅ 审计日志
- ✅ 管理后台

### M3: 项目交付 (Week 14)
- ✅ 测试通过（单元+集成+安全）
- ✅ 性能达标
- ✅ 生产环境部署
- ✅ 文档完善

---

## 🔄 迭代计划

### v1.0 (当前计划 - 核心功能)
- 租户管理
- 用户认证
- 基础 RBAC
- 核心 API

### v1.1 (后续迭代 - 高级功能)
- SSO 集成
- MFA
- 审计日志
- 管理后台

### v2.0 (远期规划)
- 计费系统
- 高级分析
- 移动端 SDK
- GraphQL API

---

## ⚠️ 风险与依赖

### 关键风险

#### 风险1: 其他子项目等待时间长
**影响**: 阻塞整体进度
**缓解措施**:
- 优先完成 Week 3-8 核心功能
- 提供 Mock API 给其他团队测试
- 并行开发（Week 8 后）

#### 风险2: Logto 功能不满足需求
**影响**: 可能需要切换方案
**缓解措施**:
- Week 1-2 充分验证
- 准备 Plan B（Casdoor）
- 保持代码解耦，便于迁移

#### 风险3: 技术债务累积
**影响**: 后期维护困难
**缓解措施**:
- 代码审查
- 单元测试要求
- 定期重构

---

## 📈 进度跟踪

### 当前状态
- [ ] Phase 0: 框架选型与验证
- [ ] Phase 1: 核心功能开发
- [ ] Phase 2: 高级功能
- [ ] Phase 3: 测试与优化

### 周报
- **Week 0**: 项目规划完成，文档就绪
- **Week 1**: （待更新）
- **Week 2**: （待更新）
- ...

---

**文档版本**: v1.0
**创建日期**: 2025-10-31
**负责人**: SalesChampionHub Team
**最后更新**: 2025-10-31

**下一步**: 等待技术选型决策，启动 POC 开发
