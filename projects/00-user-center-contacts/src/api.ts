import type { ContactOrg } from './types'

const API_BASE = 'http://localhost:3003/api/v1'

export async function fetchContacts(): Promise<ContactOrg[]> {
  const resp = await fetch(`${API_BASE}/contacts`)
  if (!resp.ok) throw new Error(`加载失败 ${resp.status}`)
  const json = await resp.json()
  return json.data || []
}

export async function createOrg(payload: { name: string; description?: string; parentOrganizationId?: string }) {
  const resp = await fetch(`${API_BASE}/contacts/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`创建失败 ${resp.status}`)
}

export async function createUser(payload: { username: string; name?: string; email?: string; password?: string }) {
  const resp = await fetch(`${API_BASE}/contacts/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`创建用户失败 ${resp.status}`)
  const json = await resp.json()
  return json.data?.id as string
}

export async function addUserToOrg(orgId: string, userId: string) {
  const resp = await fetch(`${API_BASE}/contacts/organizations/${orgId}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!resp.ok) throw new Error(`添加用户失败 ${resp.status}`)
}

export async function removeUser(orgId: string, userId: string) {
  const resp = await fetch(`${API_BASE}/contacts/organizations/${orgId}/users/${userId}`, {
    method: 'DELETE',
  })
  if (!resp.ok) throw new Error(`移除用户失败 ${resp.status}`)
}
