export interface ContactUser {
  user_id: string
  username?: string
  name?: string
  email?: string
  phone?: string
  avatar?: string
  activity_count?: number
  last_active?: string
}

export interface ContactOrg {
  tenant_id: string
  organization_name?: string
  parent_id?: string
  users: ContactUser[]
  children?: ContactOrg[]
}
