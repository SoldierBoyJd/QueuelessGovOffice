import { apiClient } from './client';
import { toVerification } from './adapters';
import type { VerificationApplication } from '../../types';

export type Decision = 'APPROVE' | 'REJECT' | 'MORE_INFO';

export const verificationApi = {
  get: (id: string): Promise<VerificationApplication> =>
    apiClient.get(`/verification/applications/${id}`).then(r => toVerification(r.data)),

  list: async (status?: string): Promise<VerificationApplication[]> => {
    const { data } = await apiClient.get('/verification/applications', {
      params: { limit: 100, ...(status ? { status } : {}) },
    });
    return data.items.map(toVerification);
  },

  startReview: (id: string) =>
    apiClient.post(`/verification/applications/${id}/start-review`).then(r => toVerification(r.data)),

  decide: (id: string, decision: Decision, note?: string) =>
    apiClient.post(`/verification/applications/${id}/decision`, { decision, ...(note ? { note } : {}) })
      .then(r => toVerification(r.data)),
};
