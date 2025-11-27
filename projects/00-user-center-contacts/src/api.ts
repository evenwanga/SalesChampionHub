import type { ContactOrg } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3003/api/v1'
const API_KEY = import.meta.env.VITE_API_KEY

function headers(json = false) {
  const h: Record<string, string> = {}
  if (json) h['Content-Type'] = 'application/json'
  if (API_KEY) h['Authorization'] = `Bearer ${API_KEY}`
  return h
}

async function fetchJSON(url: string, init?: RequestInit) {
  const resp = await fetch(url, init)
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`请求失败 ${resp.status}: ${text || resp.statusText}`)
  }
  return resp.json()
}

export async function fetchContacts(): Promise<ContactOrg[]> {
  const json = await fetchJSON(`${API_BASE}/contacts`, { headers: headers() })
  return json.data || []
}

export async function createOrg(payload: { name: string; description?: string; parentOrganizationId?: string }) {
  await fetchJSON(`${API_BASE}/contacts/organizations`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(payload),
  })
}

export async function createUser(payload: { username: string; name?: string; email?: string; password?: string }) {
  const json = await fetchJSON(`${API_BASE}/contacts/users`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify(payload),
  })
  return json.data?.id as string
}

export async function addUserToOrg(orgId: string, userId: string) {
  await fetchJSON(`${API_BASE}/contacts/organizations/${orgId}/users`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ userId }),
  })
}

export async function removeUser(orgId: string, userId: string) {
  await fetchJSON(`${API_BASE}/contacts/organizations/${orgId}/users/${userId}`, {
    method: 'DELETE',
    headers: headers(),
  })
}
