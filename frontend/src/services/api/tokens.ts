import { apiClient } from './client';
import type { Token } from '../../types';
import { MOCK_ACTIVE_TOKEN } from '../../mock/data';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export interface CreateTokenRequest {
  officeId: string;
  serviceId: string;
  departmentId: string;
}

export const tokensApi = {
  create: async (data: CreateTokenRequest): Promise<Token> => {
    if (DEMO) return MOCK_ACTIVE_TOKEN;
    return apiClient.post<Token>('/tokens', data).then(r => r.data);
  },

  get: async (tokenId: string): Promise<Token> => {
    if (DEMO) return MOCK_ACTIVE_TOKEN;
    return apiClient.get<Token>(`/tokens/${tokenId}`).then(r => r.data);
  },

  cancel: async (tokenId: string): Promise<void> => {
    if (DEMO) return;
    await apiClient.post(`/tokens/${tokenId}/cancel`);
  },

  getHistory: async (): Promise<Token[]> => {
    if (DEMO) return [MOCK_ACTIVE_TOKEN];
    return apiClient.get<Token[]>('/tokens/history').then(r => r.data);
  },
};
