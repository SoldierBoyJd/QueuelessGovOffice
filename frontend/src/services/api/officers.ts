import { apiClient } from './client';
import { toToken, toCounter } from './adapters';
import type { Token, Counter } from '../../types';

export interface OfficerCurrent {
  counterId: string;
  counterName: string;
  counterStatus: string;
  currentToken: Token | null;
  nextToken: Token | null;
}

export const officersApi = {
  current: async (counterId?: string): Promise<OfficerCurrent> => {
    const { data } = await apiClient.get('/officer/queue/current', { params: counterId ? { counter_id: counterId } : {} });
    return {
      counterId: data.counter_id,
      counterName: data.counter_name,
      counterStatus: data.counter_status,
      currentToken: data.current_token ? toToken(data.current_token) : null,
      nextToken: data.next_token ? toToken(data.next_token) : null,
    };
  },

  callNext: async (counterId?: string): Promise<{ empty: boolean; token: Token | null }> => {
    const { data } = await apiClient.post('/officer/queue/call-next', counterId ? { counter_id: counterId } : {});
    return { empty: data.result === 'QUEUE_EMPTY', token: data.token ? toToken(data.token) : null };
  },

  start:    (tokenId: string) => apiClient.post(`/officer/tokens/${tokenId}/start`).then(r => toToken(r.data)),
  complete: (tokenId: string) => apiClient.post(`/officer/tokens/${tokenId}/complete`).then(r => toToken(r.data)),
  hold:     (tokenId: string) => apiClient.post(`/officer/tokens/${tokenId}/hold`, {}).then(r => toToken(r.data)),
  resume:   (tokenId: string) => apiClient.post(`/officer/tokens/${tokenId}/resume`).then(r => toToken(r.data)),
  noShow:   (tokenId: string) => apiClient.post(`/officer/tokens/${tokenId}/no-show`, {}).then(r => toToken(r.data)),
};

export const countersApi = {
  pause: (id: string, reason?: string): Promise<Counter> =>
    apiClient.post(`/counters/${id}/pause`, reason ? { reason } : {}).then(r => toCounter(r.data)),
  resume: (id: string): Promise<Counter> =>
    apiClient.post(`/counters/${id}/resume`, {}).then(r => toCounter(r.data)),
  close: (id: string, releaseActiveToken = true): Promise<Counter> =>
    apiClient.post(`/counters/${id}/close`, { release_active_token: releaseActiveToken }).then(r => toCounter(r.data)),
  open: (id: string): Promise<Counter> =>
    apiClient.post(`/counters/${id}/open`, {}).then(r => toCounter(r.data)),
};
