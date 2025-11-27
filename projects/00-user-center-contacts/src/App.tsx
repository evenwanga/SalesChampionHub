import { useEffect, useMemo, useState } from 'react'
import './app.css'
import { addUserToOrg, createOrg, createUser, fetchContacts, removeUser } from './api'
import type { ContactOrg } from './types'

type Status = { text: string; type: 'info' | 'error' }

const buildTree = (flat: ContactOrg[]) => {
  const map: Record<string, ContactOrg> = {}
  flat.forEach((org) => {
    map[org.tenant_id] = { ...org, children: [] }
  })
  const roots: ContactOrg[] = []
  flat.forEach((org) => {
    const parent = org.parent_id && map[org.parent_id]
    if (parent) {
      parent.children!.push(map[org.tenant_id])
    } else {
      roots.push(map[org.tenant_id])
    }
  })
  return roots
}

const TreeNode: React.FC<{
  org: ContactOrg
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
  onRemoveUser: (orgId: string, userId: string) => void
}> = ({ org, expanded, onToggle, onRemoveUser }) => {
  const isOpen = expanded[org.tenant_id] ?? true
  return (
    <div>
      <div className="node">
        <button className="toggle" aria-label="toggle" onClick={() => onToggle(org.tenant_id)}>
          {isOpen ? '▼' : '▶'}
        </button>
        <span>📁</span>
        <div>
          <div className="label">{org.organization_name || org.tenant_id}</div>
          <div className="meta">{org.users.length} 人</div>
        </div>
      </div>
      {isOpen && (
        <div className="children">
          {org.users.length === 0 ? (
            <div className="empty">暂无用户</div>
          ) : (
            org.users.map((u) => (
              <div key={u.user_id} className="node">
                <span>👤</span>
                <div>
                  <div className="label">{u.name || u.username || u.user_id}</div>
                  <div className="meta">
                    最近活跃：{formatDate(u.last_active)} | 操作 {u.activity_count || 0}
                  </div>
                </div>
                <button className="toggle" onClick={() => onRemoveUser(org.tenant_id, u.user_id)}>
                  移除
                </button>
              </div>
            ))
          )}
          {org.children && org.children.length > 0 && (
            <div>
              {org.children.map((child) => (
                <TreeNode
                  key={child.tenant_id}
                  org={child}
                  expanded={expanded}
                  onToggle={onToggle}
                  onRemoveUser={onRemoveUser}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleString()
}

function App() {
  const [contacts, setContacts] = useState<ContactOrg[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<Status>({ text: '加载中...', type: 'info' })
  const [orgForm, setOrgForm] = useState({ name: '', description: '', parent: '' })
  const [userForm, setUserForm] = useState({ username: '', name: '', email: '', password: '', orgId: '' })
  const tree = useMemo(() => buildTree(contacts), [contacts])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setStatus({ text: '加载中...', type: 'info' })
      const data = await fetchContacts()
      setContacts(data)
      setStatus({ text: `已加载 ${data.length} 个组织`, type: 'info' })
    } catch (e: any) {
      setStatus({ text: e.message || '加载失败', type: 'error' })
    }
  }

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const submitOrg = async () => {
    if (!orgForm.name.trim()) {
      setStatus({ text: '请输入组织名称', type: 'error' })
      return
    }
    try {
      await createOrg({
        name: orgForm.name.trim(),
        description: orgForm.description.trim() || undefined,
        parentOrganizationId: orgForm.parent.trim() || undefined,
      })
      setOrgForm({ name: '', description: '', parent: '' })
      setStatus({ text: '组织已创建', type: 'info' })
      load()
    } catch (e: any) {
      setStatus({ text: e.message || '创建组织失败', type: 'error' })
    }
  }

  const submitUser = async () => {
    if (!userForm.username.trim() || !userForm.orgId.trim()) {
      setStatus({ text: '用户名与组织ID必填', type: 'error' })
      return
    }
    try {
      const userId = await createUser({
        username: userForm.username.trim(),
        name: userForm.name.trim() || undefined,
        email: userForm.email.trim() || undefined,
        password: userForm.password || undefined,
      })
      await addUserToOrg(userForm.orgId.trim(), userId)
      setUserForm({ username: '', name: '', email: '', password: '', orgId: '' })
      setStatus({ text: '用户已创建并加入组织', type: 'info' })
      load()
    } catch (e: any) {
      setStatus({ text: e.message || '创建用户失败', type: 'error' })
    }
  }

  const handleRemoveUser = async (orgId: string, userId: string) => {
    if (!confirm('确认从组织移除该用户？')) return
    try {
      await removeUser(orgId, userId)
      setStatus({ text: '已移除用户', type: 'info' })
      load()
    } catch (e: any) {
      setStatus({ text: e.message || '移除失败', type: 'error' })
    }
  }

  return (
    <div className="app">
      <div className="header">
        <div className="title">
          <span role="img" aria-label="logo">📒</span>
          <div>
            <h1>通讯录管理</h1>
            <p className="subtitle">基于 Logto 的组织与用户信息</p>
          </div>
        </div>
        <button className="btn" onClick={load}>刷新</button>
      </div>

      <div className="status" style={{ color: status.type === 'error' ? '#b91c1c' : '#6b7280' }}>
        {status.text}
      </div>

      <div className="grid">
        <div className="card">
          <h3>创建组织</h3>
          <div className="form-grid">
            <label>名称<input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} /></label>
            <label>描述<input value={orgForm.description} onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })} /></label>
            <label>父组织ID<input value={orgForm.parent} onChange={(e) => setOrgForm({ ...orgForm, parent: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn primary" onClick={submitOrg}>创建组织</button>
          </div>
        </div>

        <div className="card">
          <h3>创建用户并加入组织</h3>
          <div className="form-grid">
            <label>用户名<input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} /></label>
            <label>姓名<input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></label>
            <label>邮箱<input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></label>
            <label>密码<input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></label>
            <label>组织ID<input value={userForm.orgId} onChange={(e) => setUserForm({ ...userForm, orgId: e.target.value })} /></label>
          </div>
          <div className="form-actions">
            <button className="btn primary" onClick={submitUser}>创建并加入</button>
          </div>
        </div>
      </div>

      <div className="card tree">
        <h3>组织树</h3>
        {tree.length === 0 ? (
          <div className="empty">暂无组织/用户数据</div>
        ) : (
          tree.map((org) => (
            <TreeNode
              key={org.tenant_id}
              org={org}
              expanded={expanded}
              onToggle={toggle}
              onRemoveUser={handleRemoveUser}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default App
