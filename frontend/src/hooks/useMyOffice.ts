import { useQuery } from '@tanstack/react-query';
import { officesApi } from '../services/api/offices';
import { useAuthStore } from '../stores/authStore';

/** The signed-in staff member's office (name, address, hours). */
export function useMyOffice() {
  const officeId = useAuthStore(s => s.user?.officeId);
  return useQuery({
    queryKey: ['office', officeId],
    queryFn: () => officesApi.get(officeId!),
    enabled: !!officeId,
    staleTime: 60_000,
  });
}
