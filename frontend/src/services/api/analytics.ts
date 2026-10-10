import { apiClient } from './client';
import type { CongestionForecast } from '../../types';
import { MOCK_FORECAST, MOCK_REGION_SUMMARIES, MOCK_OFFICE_SUMMARIES } from '../../mock/data';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const analyticsApi = {
  getAdminAnalytics: async (officeId: string) => {
    if (DEMO) return {};
    return apiClient.get(`/admin/analytics`, { params: { officeId } }).then(r => r.data);
  },

  getCongestion: async (officeId: string): Promise<CongestionForecast> => {
    if (DEMO) return MOCK_FORECAST;
    return apiClient.get<CongestionForecast>(`/admin/congestion`, { params: { officeId } }).then(r => r.data);
  },

  getRegionalSummary: async () => {
    if (DEMO) return MOCK_REGION_SUMMARIES;
    return apiClient.get('/central/analytics/regions').then(r => r.data);
  },

  getOfficeSummaries: async () => {
    if (DEMO) return MOCK_OFFICE_SUMMARIES;
    return apiClient.get('/central/offices/summary').then(r => r.data);
  },
};
