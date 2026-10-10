import { apiClient } from './client';
import type { VerificationApplication, VerificationStatus } from '../../types';
import { MOCK_VERIFICATION } from '../../mock/data';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const verificationApi = {
  get: async (id: string): Promise<VerificationApplication> => {
    if (DEMO) return { ...MOCK_VERIFICATION, id };
    return apiClient.get<VerificationApplication>(`/verification/${id}`).then(r => r.data);
  },

  list: async (): Promise<VerificationApplication[]> => {
    if (DEMO) return [MOCK_VERIFICATION];
    return apiClient.get<VerificationApplication[]>('/verification').then(r => r.data);
  },

  decide: async (id: string, decision: VerificationStatus, note?: string): Promise<void> => {
    if (DEMO) return;
    await apiClient.post(`/verification/${id}/decide`, { decision, note });
  },
};
