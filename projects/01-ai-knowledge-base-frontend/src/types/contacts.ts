export interface ContactUser {
  user_id: string
  activity_count: number
  last_active: string
}

export interface ContactTenant {
  tenant_id: string
  users: ContactUser[]
}
