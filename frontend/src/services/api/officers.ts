import { apiClient } from './client';
import type { Token } from '../../types';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const officersApi = {
  callNext: async (): Promise<Token | null> => {
    if (DEMO) return null; // handled by demoStore
    return apiClient.post<Token>('/officer/queue/call-next').then(r => r.data);
  },

  startService: async (tokenId: string): Promise<void> => {
    if (DEMO) return;
    await apiClient.post(`/officer/tokens/${tokenId}/start`);
  },

  complete: async (tokenId: string): Promise<void> => {
    if (DEMO) return;
    await apiClient.post(`/officer/tokens/${tokenId}/complete`);
  },

  hold: async (tokenId: string): Promise<void> => {
    if (DEMO) return;
    await apiClient.post(`/officer/tokens/${tokenId}/hold`);
  },

  noShow: async (tokenId: string): Promise<void> => {
    if (DEMO) return;
    await apiClient.post(`/officer/tokens/${tokenId}/no-show`);
  },
};
