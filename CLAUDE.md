# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 **BMAD (BMad Method)** 框架仓库,用于 AI 辅助的软件开发生命周期管理。BMAD 通过专门的 AI 代理、工作流和任务来编排整个开发过程。

**重要配置:**
- 用户名: sale champion hub
- 沟通语言: 中文
- 文档输出语言: 中文
- 输出目录: `{project-root}/docs`

## 激活 BMAD 代理和工作流

### 使用斜杠命令

BMAD 代理和工作流已安装为 Claude Code 斜杠命令。使用方式:

```bash
# 查看所有可用命令
/

# 激活特定代理
/bmad:bmm:agents:pm              # 产品经理
/bmad:bmm:agents:architect       # 架构师
/bmad:bmm:agents:dev             # 开发人员
/bmad:bmm:agents:sm              # Scrum Master
/bmad:bmm:agents:analyst         # 业务分析师
/bmad:bmm:agents:tea             # 测试架构师
/bmad:bmm:agents:ux-designer     # UX 设计师
/bmad:bmm:agents:game-designer   # 游戏设计师 (可选)
/bmad:bmm:agents:game-dev        # 游戏开发者 (可选)
/bmad:bmm:agents:game-architect  # 游戏架构师 (可选)

# 执行核心工作流
/bmad:core:agents:bmad-master    # BMAD 主控制器

# 执行工作流
/bmad:bmm:workflows:workflow-status  # 检查项目状态 (总是从这里开始!)
/bmad:bmm:workflows:workflow-init    # 初始化新项目
/bmad:bmm:workflows:prd              # 创建产品需求文档
/bmad:bmm:workflows:architecture     # 创建架构设计
/bmad:bmm:workflows:dev-story        # 执行开发故事
```

## BMAD 方法论架构

### 四个开发阶段

BMAD 遵循四阶段开发流程,根据项目规模 (Level 0-4) 自适应:

```
前置条件: 项目文档化 (针对棕地项目)
    ↓
阶段 1: 分析 (可选)
    - brainstorm-project/game: 头脑风暴
    - research: 市场/技术研究
    - product-brief/game-brief: 产品简介
    ↓
阶段 2: 规划 (必需)
    - Level 0-1: tech-spec only
    - Level 2-4: PRD + Epic 分解
    - 游戏项目: GDD + Narrative (可选)
    - UX 设计: create-ux-design (条件性)
    ↓
阶段 3: 解决方案设计 (Level 2-4)
    - create-architecture: 系统架构
    - solutioning-gate-check: 门禁检查
    ↓
阶段 4: 实施 (迭代式)
    - sprint-planning: 初始化 sprint 跟踪
    - epic-tech-context: 创建 epic 上下文
    - create-story: 起草故事文件
    - story-context: 生成实施上下文
    - dev-story: 实施故事
    - code-review: 代码审查
    - retrospective: 回顾总结
```

### 项目规模级别

- **Level 0**: 单一原子性变更
- **Level 1**: 1-10 个故事
- **Level 2**: 5-15 个故事,需要轻量架构
- **Level 3**: 12-40 个故事,需要完整架构
- **Level 4**: 40+ 个故事,企业级规模

### 故事状态机 (Phase 4)

```
BACKLOG → DRAFTED → READY-FOR-DEV → IN-PROGRESS → REVIEW → DONE
```

状态由 `sprint-status.yaml` 文件跟踪。

#### 详细状态转换条件

### 📝 故事生命周期状态转换

#### 1️⃣ BACKLOG → DRAFTED

**工作流**: `create-story`
**执行代理**: SM (Scrum Master)
**斜杠命令**: `/bmad:bmm:workflows:create-story`

**何时触发**:
- 上一个故事状态为 Done 或 Approved
- Sprint 有新工作容量
- 团队准备开始下一个计划的故事

**必需前置条件**:
- ✅ Epic 必须先通过 `epic-tech-context` 工作流被 contexted
- ✅ 故事必须在 `epics.md` 中明确定义和枚举
- ⚠️ **关键**: 如果故事未在 epics.md 中枚举,工作流将 HALT 并提示运行 `correct-course`

**产出**:
- 故事文件: `{story_dir}/story-{epic}.{story}.md`
- 包含用户故事、验收标准、任务和开发说明
- 状态设置为 "Draft"

---

#### 2️⃣ DRAFTED → READY-FOR-DEV

**工作流**: `story-ready`
**执行代理**: SM (Scrum Master)
**斜杠命令**: `/bmad:bmm:workflows:story-ready`

**何时触发**:
- 故事文件已创建并草拟完成
- SM 或用户审查故事并确认准备好开发
- 故事准备移交给开发团队

**必需前置条件**:
- ✅ `create-story` 工作流已完成
- ✅ 故事文件格式正确且包含清晰的验收标准

**推荐步骤** (非强制):
- 🔧 运行 `story-context` 工作流生成实施上下文 XML
- 这将为 DEV 代理提供动态专业知识注入

**产出**:
- 故事状态字段更新为 "ready-for-dev"
- `sprint-status.yaml` 同步更新

---

#### 3️⃣ READY-FOR-DEV → IN-PROGRESS

**工作流**: `dev-story`
**执行代理**: DEV (Developer)
**斜杠命令**: `/bmad:bmm:workflows:dev-story`

**何时触发**:
- 故事状态为 "ready-for-dev"
- DEV 代理准备开始实施
- 开发人员开始编码工作

**必需前置条件**:
- ✅ 故事文件存在: `story-{epic}.{story}.md`
- 🔧 强烈推荐: 故事上下文 XML 存在: `story-{epic}.{story}-context.xml`

**工作流程**:
1. DEV 加载故事规范和上下文 XML
2. 获取 "what" (从故事) 和 "how" (从上下文)
3. 开始任务迭代实施
4. 状态自动更新为 "in-progress"

---

#### 4️⃣ IN-PROGRESS → REVIEW

**工作流**: `dev-story`
**执行代理**: DEV (Developer)
**斜杠命令**: `/bmad:bmm:workflows:dev-story` (完成时自动)

**何时触发**:
- 所有任务/子任务已完成并标记为勾选 ✓
- 所有验收标准已实现
- DEV 代理认为工作已完成

**必需完成条件**:
- ✅ 生产代码满足所有验收标准
- ✅ 单元、集成和 E2E 测试已编写并通过
- ✅ 所有测试通过 (新建 + 现有)
- ✅ 代码质量检查通过
- ✅ 文档已更新
- ✅ 所需的迁移脚本已创建
- ✅ Dev Agent Record 已填写完整
- ✅ File List 和 Change Log 已更新

**产出**:
- DEV 代理更新状态为 "Ready for Review"
- 完成说明添加到故事文件

---

#### 5️⃣ REVIEW → IN-PROGRESS (回退)

**工作流**: `dev-story`
**执行代理**: DEV (Developer)
**斜杠命令**: `/bmad:bmm:workflows:dev-story` (修复时重新运行)

**何时触发**:
- `code-review` 工作流发现问题需要修复
- 审查操作项已添加到故事任务中
- DEV 代理需要进行迭代修复

**工作流特性**:
- 🔄 可恢复实施: 工作流智能从未完成任务恢复,而非重新开始
- 📝 审查操作项已添加到故事任务中
- 🔁 DEV 代理可以多次运行 `dev-story` 进行迭代修复

**注意**:
- 这是正常的审查-修复循环的一部分
- 每次运行都会从中断处继续,不会丢失之前的工作

---

#### 6️⃣ REVIEW → DONE

**工作流**: `story-done`
**执行代理**: DEV 或 SM
**斜杠命令**: `/bmad:bmm:workflows:story-done`

**何时触发**:
- Code review 已完成并批准
- 所有审查操作项已解决
- 用户确认符合 Definition of Done (DoD)
- 所有验收标准已验证通过

**必需前置条件**:
- ✅ 故事状态必须为 "review"
- ✅ DoD 完成清单:
  - 所有验收标准满足
  - 代码已审查并批准
  - 所有测试通过
  - 无遗留问题

**产出**:
- 完成说明添加到 Dev Agent Record (包含完成日期)
- 故事状态更新为 "done"
- `sprint-status.yaml` 同步更新为 "done"

---

### 🎯 Epic 生命周期状态转换

#### BACKLOG → CONTEXTED

**工作流**: `epic-tech-context`
**执行代理**: SM (Scrum Master)
**斜杠命令**: `/bmad:bmm:workflows:create-story` (首次会提示)

**何时触发**:
- Epic 在 `epics.md` 中已定义
- 准备开始起草该 Epic 的故事
- 需要为 Epic 创建技术上下文

**产出**:
- 创建文件: `epic-{N}-context.md`
- 包含 Epic 级别的技术指导和约束
- Epic 状态在 `sprint-status.yaml` 中更新为 "contexted"

**重要性**:
- ⚠️ Epic 必须先被 contexted,其故事才能被 drafted
- 这确保所有故事有统一的技术基础和指导

---

### 🔄 Retrospective 状态转换

#### OPTIONAL → COMPLETED

**工作流**: `retrospective`
**执行代理**: SM (Scrum Master)
**斜杠命令**: `/bmad:bmm:workflows:retrospective`

**何时触发**:
- Epic 的所有故事都已完成 (状态 = done)
- Epic 工作结束,准备总结学习

**产出**:
- 回顾会议记录
- 学习和改进点已记录
- Epic 完成标记
- Retrospective 状态更新为 "completed"

**价值**:
- 📚 持续学习循环: 将改进反馈到下一个 Epic
- 🔍 识别模式和最佳实践
- 🚀 团队持续改进

---

### 💡 关键工作流程原则

#### 1. 严格的规划执行
`create-story` 工作流不会创建未在 `epics.md` 中明确规划的故事。这可防止范围蔓延并确保所有工作都通过规划流程得到适当批准。如果尝试创建未规划的故事,工作流将 HALT 并引导你运行 `correct-course` 工作流。

#### 2. Epic 上下文优先
Epic 应在其故事可以被 `drafted` 之前先被 `contexted`。这确保所有故事基于一致的技术基础和架构约束。

#### 3. 顺序默认,并行可选
Epic 内的故事通常按顺序工作,但根据团队容量,多个故事可以同时处于 `in-progress` 状态,支持并行开发。

#### 4. 审查流程是必需的
故事应在标记为 `done` 之前经过 `review`。这确保代码质量、测试覆盖率和最佳实践的遵守。

#### 5. 学习转移机制
SM 通常在前一个故事 `done` 后起草下一个故事,融合从前一个故事中获得的学习经验和见解。

#### 6. 可恢复实施
如果 `dev-story` 工作流在具有未完成任务的故事上再次运行(例如,在 code-review 发现问题后),它会智能地从中断处恢复,而不是重新开始。这使得审查-修复循环高效且不会丢失工作。

#### 7. 不可变的需求
在开发期间,验收标准、主要描述和其他规划部分保持不可变。只有特定部分可以修改:
- ✅ 任务/子任务复选框
- ✅ Dev Agent Record
- ✅ File List
- ✅ Change Log
- ✅ Status

如果需求本身有问题,应该通过 `correct-course` 工作流处理,而不是在开发期间直接修改。

## 目录结构

```
SalesChampionHub/
├── .claude/
│   ├── commands/bmad/        # Claude Code 斜杠命令
│   │   ├── bmm/
│   │   │   ├── agents/       # 所有 BMM 代理
│   │   │   └── workflows/    # 所有 BMM 工作流
│   │   └── core/
│   │       ├── agents/       # 核心代理 (bmad-master)
│   │       └── workflows/    # 核心工作流
│   └── agents/
├── .cursor/
│   └── rules/bmad/           # Cursor AI 规则
├── bmad/
│   ├── core/                 # BMAD 核心平台
│   │   ├── agents/          # 核心代理定义
│   │   ├── workflows/       # 核心工作流
│   │   └── config.yaml      # 核心配置 (用户设置)
│   ├── bmm/                  # BMad 方法模块
│   │   ├── agents/          # BMM 代理定义
│   │   ├── workflows/       # BMM 工作流
│   │   │   ├── 1-analysis/          # 阶段 1: 分析
│   │   │   ├── 2-plan-workflows/    # 阶段 2: 规划
│   │   │   ├── 3-solutioning/       # 阶段 3: 解决方案设计
│   │   │   └── 4-implementation/    # 阶段 4: 实施
│   │   ├── testarch/        # 测试架构组件
│   │   ├── config.yaml      # BMM 配置
│   │   └── README.md        # BMM 文档 (核心阅读)
│   ├── _cfg/                # 代理和工作流配置
│   └── docs/                # BMAD 文档
└── docs/                    # 项目输出文档
    └── stories/             # 用户故事输出
```

## 关键概念

### 工作流状态文件

- **bmm-workflow-status.md**: 跟踪当前阶段、进度和下一步行动
- **sprint-status.yaml**: Phase 4 实施跟踪 (所有 epic、故事和回顾)

### 运行时资源加载

BMAD 代理遵循 "运行时加载" 原则 - 仅在执行菜单项或工作流需要时加载文件。**例外**: 配置文件必须在启动时加载。

### 动态专业知识注入

使用 `story-context` 工作流为每个故事提供针对性的技术指导,替代静态文档。

### 及时设计 (Just-In-Time Design)

技术规范在实施期间一次创建一个 epic,而不是全部提前创建,允许学习和适应。

## 工作流程最佳实践

### 1. 始终从 workflow-status 开始

```bash
/bmad:bmm:workflows:workflow-status
```

这是所有 BMAD 工作流的**通用入口点**。它会:
- 检查现有工作流状态
- 显示当前阶段和进度
- 推荐下一步行动
- 引导新用户规划工作流方法

### 2. 棕地项目必须先文档化

如果项目有现有代码但缺乏文档,**必须**先运行:

```bash
/bmad:bmm:workflows:document-project
```

这会分析现有代码库并创建全面的项目文档。

### 3. 尊重项目规模

- Level 0-1: 仅使用 tech-spec,跳过 Phase 3
- Level 2-4: 需要完整的 PRD + Architecture
- 不要为小项目过度文档化

### 4. 维护流程完整性

- Sprint Planning 必须在 Phase 4 开始时运行
- Epic 必须在起草故事之前进行上下文化
- 故事必须在实施之前创建上下文
- 每个阶段在下一个阶段开始之前完成

### 5. 持续学习循环

- 每个 epic 完成后运行 retrospective
- 将学习内容融入下一个故事草稿
- 根据团队反馈更新工作流

## 常见陷阱和解决方案

| 陷阱 | 解决方案 |
|------|----------|
| 跳过 sprint-planning | 始终在 Phase 4 开始时运行 - 它创建状态文件 |
| 没有 epic 上下文就创建故事 | 在 create-story 之前运行 epic-tech-context |
| 跳过 story-context 生成 | 始终在 create-story 后运行以获得更好的开发指导 |
| 不更新 sprint-status.yaml | 随着工作进展更新状态 |
| 认为 Level 2 跳过 Phase 3 | Level 2 **确实**需要架构 (只是更轻量) |
| 没有文档就规划棕地项目 | 如果未文档化,首先运行 document-project |
| 不运行 retrospective | 每个 epic 后完成以进行学习转移 |

## 绿地 vs 棕地路径

### 绿地项目 (新代码)

```
Phase 1 (可选) → Phase 2 → Phase 3 (Level 2-4) → Phase 4
```

### 棕地项目 (现有代码)

```
文档化前置条件 (如果未文档化) → Phase 1 (可选) → Phase 2 → Phase 3 (Level 2-4) → Phase 4
```

## 代理角色和职责

| 代理 | 角色 | 主要工作流 |
|------|------|------------|
| **Analyst** | 业务分析和研究 | brainstorm-project, research, product-brief, document-project |
| **PM** | 产品规划和需求 | prd, tech-spec |
| **Architect** | 技术架构和设计 | create-architecture, solutioning-gate-check |
| **SM** | Sprint 和故事管理 | sprint-planning, create-story, story-context, code-review |
| **DEV** | 代码实施 | dev-story |
| **TEA** | 测试架构 | 9 个测试工作流 (framework, CI/CD, test-design 等) |
| **UX Designer** | 用户体验设计 | create-ux-design |
| **Game Designer** | 游戏设计 | brainstorm-game, game-brief, gdd, narrative |

## 测试架构 (TEA)

BMAD 包含全面的测试架构系统,跨越 9 个工作流:

1. Framework setup (框架设置)
2. CI/CD integration (CI/CD 集成)
3. Test design (测试设计)
4. ATDD (验收测试驱动开发)
5. Automation (自动化)
6. Traceability (可追溯性)
7. NFR assessment (非功能需求评估)
8. Quality gates (质量门禁)
9. Test review (测试审查)

详见: `bmad/bmm/testarch/README.md`

## 关键文档

**必读:**
- `bmad/bmm/README.md` - BMM 模块概述
- `bmad/bmm/workflows/README.md` - **v6 工作流完整指南** (启动前必读!)
- `bmad/bmm/testarch/README.md` - 测试架构师指南

**代理文档:**
- `bmad/core/agents/bmad-master.md` - 主控制器代理
- `bmad/docs/claude-code-instructions.md` - Claude Code 使用说明

## 语言和沟通

- 所有代理交互使用**中文**
- 文档输出使用**中文**
- 专业术语保持英文以确保精确性
- 代理人设中定义的沟通风格优先

## 关键工作流快速参考

```bash
# 通用入口点 (从这里开始!)
/bmad:bmm:workflows:workflow-status

# 初始化新项目
/bmad:bmm:workflows:workflow-init

# 文档化前置条件 (棕地项目未文档化时 或 完成后清理)
/bmad:bmm:workflows:document-project

# Phase 1: 分析 (可选)
/bmad:bmm:workflows:brainstorm-project    # 软件构思
/bmad:bmm:workflows:research              # 市场/技术研究
/bmad:bmm:workflows:product-brief         # 产品简介

# Phase 2: 规划 (必需)
/bmad:bmm:workflows:prd                   # Level 2-4 软件项目
/bmad:bmm:workflows:tech-spec-sm          # Level 0-1 软件项目
/bmad:bmm:workflows:gdd                   # 游戏项目 (所有级别)
/bmad:bmm:workflows:create-ux-design      # UI 密集型项目

# Phase 3: 解决方案设计 (Level 2-4)
/bmad:bmm:workflows:architecture          # 系统架构
/bmad:bmm:workflows:solutioning-gate-check # 门禁检查

# Phase 4: 实施 (基于 Sprint)
/bmad:bmm:workflows:sprint-planning       # 首先: 初始化 sprint 跟踪
/bmad:bmm:workflows:create-story          # 起草故事文件
/bmad:bmm:workflows:story-context         # 创建故事上下文
/bmad:bmm:workflows:story-ready           # 批准故事进行开发
/bmad:bmm:workflows:dev-story             # 实施故事
/bmad:bmm:workflows:code-review           # 质量验证
/bmad:bmm:workflows:story-done            # 标记故事完成
/bmad:bmm:workflows:retrospective         # Epic 完成后
/bmad:bmm:workflows:correct-course        # 如果出现问题

# 游戏开发 (可选代理和工作流)
/bmad:bmm:workflows:brainstorm-game       # 游戏构思
/bmad:bmm:workflows:game-brief            # 游戏简介
/bmad:bmm:workflows:narrative             # 游戏叙事设计

# 其他实用工具
/bmad:core:workflows:party-mode           # 多代理群聊讨论
/bmad:core:workflows:brainstorming        # CIS 头脑风暴会话
```

## 核心工作流程执行原则

1. **工作流是 YAML 驱动的**: 每个工作流都有一个 `workflow.yaml` 配置文件,定义步骤、输入和输出
2. **代理遵循严格的激活顺序**: 加载配置 → 显示菜单 → 等待用户输入 → 执行
3. **菜单触发器使用星号 (*)**: 如 `*help`, `*prd`, `*exit`
4. **保存输出后完成每个工作流步骤**: 永远不要批处理多个步骤
5. **工作流路径基于项目上下文**: 绿地 vs 棕地,Level 0-4,软件 vs 游戏

## v6 核心创新

1. **规模自适应规划**: 项目根据复杂性 (Level 0-4) 自动路由
2. **及时设计**: 技术规范在实施期间创建,而非全部提前
3. **动态专业知识注入**: 故事上下文提供针对性技术指导
4. **持续学习循环**: 回顾将改进反馈到工作流中

## 项目上下文

这个仓库名为 **SalesChampionHub**，是一个完整的销售管理与训练生态系统，由9个相互关联的子项目组成，为销售团队提供从招聘、培训到绩效管理的完整解决方案。

### 项目配置

- 用户/团队: "sale champion hub"
- 首选语言: 中文
- 文档输出到 `docs/` 目录
- 开发方法: BMAD v6

### 项目架构

```
SalesChampionHub 生态系统
├── 子项目0: 多租户统一用户中心 ✅ 已完成 (98%)
├── 子项目1: AI知识库管理平台 (待开发)
├── 子项目2: ASR语音分析平台 (待开发)
├── 子项目3: 数字人角色构建平台 (待开发)
├── 子项目4: 岗上评估系统 (待开发)
├── 子项目5: 员工画像管理系统 (待开发)
├── 子项目6: 智能资源分配系统 (待开发)
├── 子项目7: AI陪练系统 (待开发)
└── 子项目8: 销售招聘画像评估系统 (待开发)
```

### 当前状态

**阶段**: Phase 1 完成，准备进入 Phase 2

**已完成**:
- ✅ **子项目0: 多租户统一用户中心** (2025-10-31)
  - 技术方案: Logto v1.33.0 + PostgreSQL 16 + Redis 7
  - 完成度: 98%
  - 状态: 已部署，可投入使用
  - 文档: `projects/00-user-center/README.md`
  - 功能: 提供统一的身份认证、权限管理、多租户隔离

**进行中**:
- 🔄 准备启动子项目1（AI知识库管理平台）

**下一步行动**:
1. 运行 `/bmad:bmm:workflows:workflow-status` 检查项目状态
2. 运行 `/bmad:bmm:workflows:prd` 为子项目1创建需求文档
3. 运行 `/bmad:bmm:workflows:architecture` 设计子项目1架构

### 集成信息

所有下游子项目可使用以下配置与用户中心集成:

```bash
# OIDC配置
LOGTO_ENDPOINT=http://localhost:3001
LOGTO_M2M_APP_ID=rd0j6xvios5fa68ymbjeg
LOGTO_M2M_APP_SECRET=q49wZVhuqKzoCS7jpkRTQr8VDvMR3S5l

# Custom API配置
USER_CENTER_API=http://localhost:3003
SERVICE_API_KEY=d77b773ada0b34d318342f09968a896eb095b4a7cd9d94d3046001ac7ebddb14

# API Resource
RESOURCE_IDENTIFIER=https://api.saleschampionhub.com/kb
```

### 项目文档

- **项目总览**: `docs/项目总览.md`
- **架构讨论**: `docs/architecture-planning-discussion.md`
- **子项目0详细文档**: `projects/00-user-center/README.md`

---

# SalesChampionHub 应用架构指南

本节描述 SalesChampionHub 实际应用代码的架构、开发命令和关键设计模式。

## 系统架构概览

### 三层架构模式

```
infrastructure/ (Layer 0 - 共享基础设施)
    ↓
projects/00-user-center/ (Layer 1 - 认证授权)
    ↓
projects/01-ai-knowledge-base/ (Layer 2 - 业务服务)
    ↓
projects/02-09/ (Layer 3 - 其他业务服务)
```

**关键原则**: 下层服务NEVER直接调用上层服务。所有依赖必须向下流动。

## 开发命令速查

### 基础设施层 (必须首先启动)

```bash
# 启动共享基础设施
cd infrastructure
./scripts/startup.sh

# 验证服务状态
docker ps | grep -E "saleschampion-postgres|saleschampion-redis|kong-gateway"

# 检查 PostgreSQL 数据库
docker exec saleschampion-postgres psql -U postgres -c "\l"

# 检查 Kong 路由配置
curl http://localhost:8001/routes

# 同步 Kong 配置（修改 kong/kong.yml 后）
cd infrastructure
./scripts/sync-kong.sh

# 查看Kong日志
docker-compose logs -f kong
```

### 子项目0 (用户中心 - Logto)

```bash
# 启动用户中心（依赖 infrastructure）
cd projects/00-user-center
./scripts/start.sh

# 访问 Logto 管理控制台
open http://localhost:3002

# 查看日志
docker-compose logs -f

# 检查健康状态
curl http://localhost:3003/health
```

### 子项目1 (AI知识库 - Go)

```bash
cd projects/01-ai-knowledge-base

# 本地开发构建
go build -o bin/server cmd/server/main.go

# 生成 Swagger 文档（修改API后）
swag init -g cmd/server/main.go -o docs/swagger

# 运行测试
go test ./... -v

# 运行特定测试包
go test ./internal/service -run TestKBService -v

# 测试覆盖率
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# 启动服务器（本地）
./bin/server

# 启动服务器（Docker）
./scripts/start.sh

# 数据库迁移
docker exec -i saleschampion-postgres psql -U postgres -d knowledge_platform < migrations/init/01_init_schema.sql

# 检查数据库表结构
docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "\dt"

# 检查 RLS 策略
docker exec saleschampion-postgres psql -U postgres -d knowledge_platform -c "SELECT * FROM pg_policies;"

# 访问 Swagger UI
open http://localhost:8080/swagger/index.html
```

## 关键架构模式（子项目1）

### 1. 多租户数据隔离（三重保护）

**机制1: Row-Level Security (RLS)**
```sql
-- PostgreSQL 自动过滤所有查询
CREATE POLICY tenant_document_access ON documents
USING (
    kb_id IN (
        SELECT DISTINCT kb_id FROM knowledge_base_mounts
        WHERE is_active = true AND (
            (mount_type = 'tenant' AND tenant_id = current_setting('app.current_tenant')::text)
            OR (mount_type = 'organization' AND organization_id = current_setting('app.current_organization')::text)
            OR (mount_type = 'user' AND user_id = current_setting('app.current_user')::text)
        )
    )
);
```

**机制2: 三级挂载系统**
```
知识库可以挂载到:
├── Tenant Level   (所有租户用户可访问)
├── Organization Level (组织内用户可访问)
└── User Level     (仅特定用户可访问)

权限优先级: User > Organization > Tenant
```

**机制3: 应用层中间件**
```go
// 每个认证请求自动设置 RLS 上下文
func (m *RLSMiddleware) SetRLSContext() gin.HandlerFunc {
    return func(c *gin.Context) {
        user := GetUserContext(c)
        // 设置 PostgreSQL 会话变量
        db.Exec("SET LOCAL app.current_tenant = ?", user.TenantID)
        db.Exec("SET LOCAL app.current_user = ?", user.ID)
        db.Exec("SET LOCAL app.current_organization = ?", user.OrganizationID)
    }
}
```

### 2. 认证流程（关键链路）

```
Client Request → Kong Gateway (port 80)
    ↓
AuthMiddleware (internal/middleware/auth.go)
    ├─ 1. Extract JWT from Authorization header
    ├─ 2. Check Redis cache (5min TTL)
    ├─ 3. If miss: Call User Center API (/api/v1/auth/verify-token)
    └─ 4. Set user context in Gin
    ↓
RLSMiddleware (internal/middleware/rls.go)
    └─ Set PostgreSQL session variables
    ↓
Handler executes (automatic RLS filtering)
```

**NEVER 绕过此流程** - 数据安全依赖完整的认证链。

### 3. 代码分层架构（严格执行）

```
cmd/server/main.go              # 入口点，依赖注入
    ↓
internal/handler/               # HTTP 层，Swagger 注解
    ↓ (只调用 service)
internal/service/               # 业务逻辑层
    ↓ (只调用 repository)
internal/repository/            # 数据访问层
    ↓
PostgreSQL + Redis
```

**禁止跨层调用**: Handler 不能直接调用 Repository

### 4. 向量搜索实现

**维度**: 1024 (BGE-large-zh 模型)

**查询模式**:
```sql
SELECT
    v.chunk_id, c.content,
    (v.embedding <=> $1::vector) as distance  -- 余弦距离运算符
FROM vectors v
JOIN document_chunks c ON v.chunk_id = c.id
WHERE v.kb_id = ANY($2::varchar[])
ORDER BY distance ASC  -- 距离越小越相似
LIMIT $3;
```

**距离转相似度**:
```go
// 余弦距离 [0,2] → 相似度 [1,0]
similarity = 1.0 - (distance / 2.0)
```

## 添加新 API 端点（完整流程）

### 1. 定义数据模型 (internal/models/)
```go
type MyNewModel struct {
    ID        string    `json:"id" gorm:"primaryKey"`
    Name      string    `json:"name" gorm:"not null"`
    CreatedAt time.Time `json:"created_at"`
}
```

### 2. 创建 Repository (internal/repository/)
```go
type MyRepository struct {
    db *gorm.DB
}

func (r *MyRepository) Create(ctx context.Context, model *MyNewModel) error {
    return r.db.WithContext(ctx).Create(model).Error
}
```

### 3. 创建 Service (internal/service/)
```go
type MyService struct {
    repo *repository.MyRepository
}

func (s *MyService) CreateItem(ctx context.Context, req *CreateRequest) (*MyNewModel, error) {
    // 业务逻辑
    return s.repo.Create(ctx, model)
}
```

### 4. 创建 Handler (internal/handler/)
```go
// @Summary     创建项目
// @Description 创建新的项目
// @Tags        my-items
// @Accept      json
// @Produce     json
// @Param       body body CreateRequest true "创建请求"
// @Success     200 {object} middleware.SuccessResponse{data=MyNewModel}
// @Failure     400 {object} middleware.ErrorResponse
// @Security    BearerAuth
// @Router      /my-items [post]
func (h *MyHandler) Create(c *gin.Context) {
    var req CreateRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        middleware.AbortWithError(c, 400, "INVALID_REQUEST", err.Error())
        return
    }

    result, err := h.service.CreateItem(c.Request.Context(), &req)
    if err != nil {
        middleware.AbortWithError(c, 500, "CREATE_FAILED", err.Error())
        return
    }

    middleware.RespondWithSuccess(c, result)
}
```

### 5. 注册路由 (cmd/server/main.go)
```go
authenticated := v1.Group("")
authenticated.Use(authMiddleware.Authenticate())
authenticated.Use(rlsMiddleware.SetRLSContext())
{
    myItems := authenticated.Group("/my-items")
    {
        myItems.POST("", myHandler.Create)
        myItems.GET("/:id", myHandler.Get)
    }
}
```

### 6. 重新生成 Swagger
```bash
swag init -g cmd/server/main.go -o docs/swagger
go build -o bin/server cmd/server/main.go
./bin/server
```

### 7. 测试 API
访问 http://localhost:8080/swagger/index.html

## 数据库关键设计

### Knowledge Base Mounting (M:N)

```sql
CREATE TABLE knowledge_base_mounts (
    id BIGSERIAL PRIMARY KEY,
    kb_id VARCHAR(50) REFERENCES knowledge_bases(id),
    mount_type VARCHAR(20),  -- 'tenant' | 'organization' | 'user'
    tenant_id VARCHAR(50),
    organization_id VARCHAR(50),
    user_id VARCHAR(50),
    permissions JSONB DEFAULT '{
        "can_read": true,
        "can_write": false,
        "can_delete": false
    }',
    is_active BOOLEAN DEFAULT true,

    -- 确保只有一个目标字段被设置
    CONSTRAINT chk_single_target CHECK (...)
);
```

**用户可访问的知识库查询**:
```sql
SELECT DISTINCT kb_id FROM knowledge_base_mounts
WHERE is_active = true AND (
    (mount_type = 'tenant' AND tenant_id = ?)
    OR (mount_type = 'organization' AND organization_id = ?)
    OR (mount_type = 'user' AND user_id = ?)
);
```

## 缓存策略

### Redis DB 分配
- DB 0: 用户中心缓存
- DB 1: 知识库缓存
- DB 2: Kong 缓存

### 缓存键模式
```
user_token:{token}                              # 5min TTL
kb_metadata:{kb_id}                             # 5min TTL
kb_stats:{kb_id}                                # 5min TTL
accessible_kbs:{tenant}:{org}:{user}            # 2min TTL
kb_permissions:{kb_id}:{tenant}:{org}:{user}    # 5min TTL
```

### 缓存失效规则
- KB 更新 → 失效 `kb_metadata:{kb_id}` + `kb_stats:{kb_id}`
- Mount 变更 → 失效所有 `accessible_kbs:*` 模式
- Unmount → 失效特定用户/组织/租户缓存

## 常见陷阱与解决方案

### 1. 忘记设置 RLS 上下文
❌ **错误**:
```go
func (h *Handler) GetData(c *gin.Context) {
    // 直接查询 - 可能返回空或错误数据
    data := h.service.GetData()
}
```

✅ **正确**:
```go
// 必须在路由中添加 RLS 中间件
authenticated.Use(authMiddleware.Authenticate())
authenticated.Use(rlsMiddleware.SetRLSContext())  // 必需!
```

### 2. Service 层直接写 SQL
❌ **错误**:
```go
func (s *Service) GetData() {
    s.db.Raw("SELECT * FROM documents").Scan(&data)  // 绕过分层
}
```

✅ **正确**:
```go
func (s *Service) GetData() {
    return s.repository.GetDocuments()  // 通过 repository
}
```

### 3. 信任路径参数中的 tenant_id
❌ **错误**:
```go
func (h *Handler) GetTenantData(c *gin.Context) {
    tenantID := c.Param("tenant_id")  // 不安全!
}
```

✅ **正确**:
```go
func (h *Handler) GetTenantData(c *gin.Context) {
    tenantID := middleware.GetTenantID(c)  // 从 JWT 获取
}
```

### 4. 向量维度不匹配
❌ **错误**:
```go
embedding := []float32{0.1, 0.2}  // 维度错误
repo.CreateVector(embedding)       // 会失败
```

✅ **正确**:
```go
if len(embedding) != 1024 {
    return ErrInvalidEmbedding
}
```

### 5. 缓存失效不完整
❌ **错误**:
```go
func (s *Service) UpdateMount() {
    s.cache.InvalidateKBMetadata(kbID)  // 只失效 KB，不够
}
```

✅ **正确**:
```go
func (s *Service) UpdateMount() {
    s.cache.InvalidateKBMetadata(kbID)
    s.cache.InvalidateAccessibleKBs(tenantID, orgID, userID)  // 也失效访问列表
}
```

## 调试技巧

### 检查 RLS 上下文
```sql
-- 在 PostgreSQL 中执行
SELECT current_setting('app.current_tenant', true);
SELECT current_setting('app.current_user', true);
SELECT current_setting('app.current_organization', true);
```

### 验证 Mount 配置
```sql
SELECT * FROM knowledge_base_mounts
WHERE kb_id = 'kb_xxx' AND is_active = true;
```

### 测试向量搜索
```sql
SELECT
    chunk_id,
    content,
    embedding <=> '[0.1,0.2,...,0.n]'::vector as distance
FROM vectors
WHERE kb_id = 'kb_xxx'
ORDER BY distance
LIMIT 5;
```

### 查看 Kong 路由状态
```bash
curl http://localhost:8001/routes | jq
curl http://localhost:8001/services | jq
```

## 环境变量配置

### Infrastructure
```bash
POSTGRES_PASSWORD=SalesChampion_PG_2024
REDIS_PASSWORD=SalesChampion_Redis_2024
KONG_ADMIN_LISTEN=0.0.0.0:8001
```

### Sub-Project 1 (Knowledge Base)
```bash
# Database
DB_HOST=saleschampion-postgres
DB_PORT=5432
DB_NAME=knowledge_platform
DB_PASSWORD=SalesChampion_PG_2024

# Redis
REDIS_HOST=saleschampion-redis
REDIS_PORT=6379
REDIS_PASSWORD=SalesChampion_Redis_2024
REDIS_DB=1

# User Center Integration
USER_CENTER_API=http://kong-gateway:8000/api
USER_CENTER_API_KEY=<secret-key>
USER_CENTER_TIMEOUT=30

# Server
SERVER_PORT=8080
SERVER_MODE=debug
MAX_KB_QUERY_LIMIT=4

# Features
ENABLE_CACHE=true
CACHE_TTL_SECONDS=300
```

## 性能优化建议

### PostgreSQL
- 使用 pgvector HNSW 索引加速向量搜索
- 定期 VACUUM 和 ANALYZE
- 监控慢查询日志

### Redis
- 设置合理的 TTL 避免内存溢出
- 使用 Redis pipeline 批量操作
- 监控内存使用和命中率

### 应用层
- 异步记录查询日志（不阻塞主流程）
- 结果去重在内存中完成
- 限制单次查询的 KB 数量（默认 4 个）

## 待完成功能（路线图）

### 高优先级
1. **LLM 集成** - 替换 Mock 答案生成
   - 位置: `internal/service/rag_service.go:generateMockAnswer()`
   - 候选: OpenAI GPT-4, Anthropic Claude, 本地 LLM

2. **Embedding 服务** - 文本→向量转换
   - 推荐模型: BGE-large-zh, OpenAI text-embedding-3

### 中优先级
3. **文档上传和解析**
   - PDF/Word/Markdown 解析
   - 自动分块（Chunking）
   - 自动向量化

4. **流式响应** - SSE 支持
   - 实时流式 RAG 答案

## Git 工作流

### 分支策略
- `main` - 生产就绪代码
- `feature/*` - 功能开发
- `hotfix/*` - 生产修复

### 提交信息格式
```
feat: 添加多知识库搜索功能

- 实现 SearchService 和 HybridSearch
- 添加 /api/v1/search 端点
- 更新 Swagger 文档

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 重要端点速查

### Infrastructure
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Kong Admin: `http://localhost:8001`
- Kong Proxy: `http://localhost:80`

### Sub-Project 0 (User Center)
- Logto Console: `http://localhost:3002`
- Logto API: `http://localhost:3001`
- Custom API: `http://localhost:3003`

### Sub-Project 1 (Knowledge Base)
- API Server: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger/index.html`
- Health Check: `http://localhost:8080/health`

### Via Kong Gateway
- User Center: `http://localhost/api/v1/auth/*`
- Knowledge Base: `http://localhost/api/v1/knowledge-bases/*`
