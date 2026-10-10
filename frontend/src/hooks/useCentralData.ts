import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/api/analytics';

/** Network-wide data for central/super admins. Refreshed every 15s. */
export function useCentralData() {
  const offices = useQuery({ queryKey: ['central', 'offices'], queryFn: analyticsApi.centralOffices, refetchInterval: 15_000 });
  const regions = useQuery({ queryKey: ['central', 'regions'], queryFn: analyticsApi.regions, refetchInterval: 15_000 });
  const overview = useQuery({ queryKey: ['central', 'overview'], queryFn: analyticsApi.centralOverview, refetchInterval: 15_000 });
  return {
    offices: offices.data ?? [],
    regions: regions.data ?? [],
    overview: overview.data,
    isLoading: offices.isLoading || regions.isLoading || overview.isLoading,
    error: offices.error ?? regions.error ?? overview.error,
    refetch: () => { void offices.refetch(); void regions.refetch(); void overview.refetch(); },
  };
}
