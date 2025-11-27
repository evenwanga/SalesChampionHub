import { useQuery } from '@tanstack/react-query'
import contactService from '@/services/contactService'
import type { ContactTenant } from '@/types/contacts'

export const useContacts = () => {
  return useQuery<ContactTenant[]>({
    queryKey: ['contacts'],
    queryFn: () => contactService.listContacts(),
    staleTime: 60 * 1000,
  })
}
