import { apiClient } from './client';
import { toToken, tokenStatus } from './adapters';
import type { Token, TokenStatus, User } from '../../types';

export interface CreateTokenRequest {
  officeId: string;
  serviceId: string;
}

export interface TokenHistoryItem {
  id: string;
  displayNumber: string;
  serviceName: string;
  officeName: string;
  status: TokenStatus;
  createdAt: string;
  completedAt?: string;
}

type Who = Pick<User, 'id' | 'name'> | null;

export const tokensApi = {
  create: async (data: CreateTokenRequest, who: Who): Promise<Token> => {
    const r = await apiClient.post('/tokens', {
      office_id: data.officeId,
      service_id: data.serviceId,
      idempotency_key: crypto.randomUUID(),
    });
    return toToken(r.data, who);
  },

  get: (tokenId: string, who: Who) =>
    apiClient.get(`/tokens/${tokenId}`).then(r => toToken(r.data, who)),

  /** The citizen's one live token (WAITING/CALLED/SERVING/ON_HOLD) with full ETA detail, or null. */
  getActive: async (who: Who): Promise<Token | null> => {
    const { data } = await apiClient.get('/tokens', { params: { active_only: true, limit: 1 } });
    const first = data.items[0];
    return first ? tokensApi.get(first.id, who) : null;
  },

  cancel: (tokenId: string) => apiClient.post(`/tokens/${tokenId}/cancel`, {}).then(r => r.data),

  history: async (): Promise<TokenHistoryItem[]> => {
    const { data } = await apiClient.get('/tokens', { params: { limit: 100 } });
    return data.items.map((t: Record<string, string | null>): TokenHistoryItem => ({
      id: t.id as string,
      displayNumber: t.display_number as string,
      serviceName: t.service_name as string,
      officeName: t.office_name as string,
      status: tokenStatus(t.status as string),
      createdAt: t.created_at as string,
      completedAt: t.completed_at ?? undefined,
    }));
  },
};
