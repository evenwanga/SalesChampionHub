# 用户中心配置指南（超简单版）

> 本指南将带您一步步完成Logto的所有配置，无需任何技术背景！

## 📋 配置前准备

您已经完成：
- ✅ 创建了管理员账号
- ✅ 所有服务正在运行

现在只需要 **5分钟** 完成剩余配置！

---

## 🎯 配置步骤

### 方案A：自动化脚本（推荐）

**一键完成所有配置！**

1. **打开终端**，进入项目目录：
   ```bash
   cd /Users/wangyiwen/produce/SalesChampionHub/projects/00-user-center
   ```

2. **获取管理员令牌**（这是唯一需要手动的步骤）：

   a. 访问 http://localhost:3002

   b. 使用您的管理员账号登录

   c. 点击右上角头像 → **Settings**

   d. 左侧菜单点击 **Admin console** → **Access tokens**

   e. 点击 **Create** 按钮

   f. 复制生成的长串字符（这就是您的访问令牌）

3. **运行配置脚本**：
   ```bash
   ./scripts/setup-logto.sh
   ```

4. **按提示粘贴令牌**，然后按回车

5. **完成！** 🎉 脚本会自动创建：
   - API资源（Knowledge Base API）
   - M2M应用（用于Custom API）
   - 三个角色（Owner, Admin, Member）
   - 测试组织
   - 自动更新环境变量

---

### 方案B：手动配置（如果脚本失败）

<details>
<summary>点击展开手动配置步骤</summary>

#### 步骤1: 创建API Resource

1. 访问 http://localhost:3002 并登录

2. 左侧菜单 → **API resources**

3. 点击右上角 **+ Create API resource**

4. 填写：
   - **API name**: `Knowledge Base API`
   - **API identifier**: `https://api.saleschampionhub.com/kb`
   - **Access token TTL**: `3600`

5. 点击 **Create**

6. 进入刚创建的API → **Permissions** 标签

7. 点击 **+ Create permission**，创建4个权限：
   - `read` - Read knowledge base
   - `write` - Write knowledge base
   - `delete` - Delete knowledge base
   - `admin` - Admin knowledge base

#### 步骤2: 创建M2M应用

1. 左侧菜单 → **Applications**

2. 点击 **+ Create application**

3. 选择 **Machine-to-machine**

4. 填写：
   - **Application name**: `User Center Custom API`
   - **Description**: `M2M application for custom API service`

5. 点击 **Create**

6. **重要！** 记录以下信息：
   - **App ID**: 类似 `abc123def456`
   - **App secret**: 类似 `xyz789uvw012`

7. 打开文件 `custom-api/.env`，更新：
   ```bash
   LOGTO_M2M_APP_ID=<你的App ID>
   LOGTO_M2M_APP_SECRET=<你的App Secret>
   ```

#### 步骤3: 创建角色

1. 左侧菜单 → **Roles**

2. 点击 **+ Create role**，创建3个角色：

   **角色1: Owner**
   - Name: `owner`
   - Description: `Organization owner with full access`
   - Type: `User`

   **角色2: Admin**
   - Name: `admin`
   - Description: `Organization administrator`
   - Type: `User`

   **角色3: Member**
   - Name: `member`
   - Description: `Organization member`
   - Type: `User`

#### 步骤4: 创建测试组织

1. 左侧菜单 → **Organizations**

2. 点击 **+ Create organization**

3. 填写：
   - **Organization name**: `测试组织`
   - **Description**: `用于开发测试的默认组织`

4. 点击 **Create**

5. **记录组织ID**（类似 `org_abc123`）

#### 步骤5: 初始化组织配额

打开终端，运行：
```bash
docker-compose exec postgres psql -U postgres -d logto -c \
  "SELECT initialize_tenant_defaults('org_abc123', 'free');"
```
（将 `org_abc123` 替换为您的组织ID）

</details>

---

## 🔄 配置完成后

**重启Custom API服务以应用新配置：**
```bash
docker-compose restart custom-api
```

**验证配置：**
```bash
curl http://localhost:3003/health
```

应该返回：
```json
{
  "status": "healthy",
  "timestamp": "...",
  "services": {
    "database": "up",
    "redis": "up"
  }
}
```

---

## 📊 配置摘要

配置完成后，您将拥有：

✅ **API Resources**
- Knowledge Base API（包含read/write/delete/admin权限）

✅ **Applications**
- User Center Custom API（M2M应用）

✅ **Roles**
- Owner（拥有者）
- Admin（管理员）
- Member（成员）

✅ **Organizations**
- 测试组织（Free计划）

---

## ❓ 常见问题

### Q: 获取不到访问令牌？
**A**: 确保您使用的是管理员账号登录，并且在正确的位置：Settings → Admin console → Access tokens

### Q: 脚本运行失败？
**A**: 使用方案B手动配置，或者联系技术支持

### Q: 如何添加更多组织？
**A**:
1. 在Logto控制台创建新组织
2. 运行数据库命令初始化配额：
   ```bash
   docker-compose exec postgres psql -U postgres -d logto -c \
     "SELECT initialize_tenant_defaults('新组织ID', '计划类型');"
   ```
   计划类型可选：`free`, `pro`, `enterprise`

### Q: 如何给用户分配角色？
**A**:
1. 进入 Organizations → 选择组织
2. 点击 Members 标签
3. 添加用户并分配角色

---

## 🚀 下一步

配置完成后，您可以：

1. **开发Custom API扩展功能**
2. **集成前端应用**
3. **配置SSO/社交登录**
4. **自定义品牌样式**

需要帮助？随时询问！ 😊
