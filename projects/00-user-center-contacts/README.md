# 00-user-center-contacts

基于 React + Vite 的通讯录管理前端，调用 user-center custom-api（Logto 管理 API 代理）实现组织/用户的创建与树状展示。

## 开发
```bash
cd projects/00-user-center-contacts
npm install
npm run dev
```

## 构建
```bash
npm run build
```

## 环境变量
- `VITE_API_BASE`：后端接口地址，默认 `http://localhost:3003/api/v1`
- `VITE_API_KEY`：可选，服务间调用的 Bearer Token

## 功能
- 树状组织视图（可展开/折叠），显示用户及活跃信息
- 创建组织（可选父组织 ID），树状层级依赖后端返回的 `parent_id`
- 创建用户并加入指定组织
- 从组织移除用户

## 依赖后端接口（custom-api）
- GET `/contacts`：返回组织 + 用户，包含 `parent_id`
- POST `/contacts/organizations`：创建组织（支持 `parentOrganizationId`）
- POST `/contacts/users`：创建用户
- POST `/contacts/organizations/:orgId/users`：用户加入组织
- DELETE `/contacts/organizations/:orgId/users/:userId`：移除用户
