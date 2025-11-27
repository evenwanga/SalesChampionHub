import api from './api'
import type { ContactTenant } from '@/types/contacts'
import type { APIResponse } from '@/types'

class ContactService {
  async listContacts(): Promise<ContactTenant[]> {
    const response = await api.get<APIResponse<ContactTenant[]>>('/contacts')
    return response.data.data || []
  }
}

export default new ContactService()
