import { apiClient } from './client';
import { toNotification } from './adapters';
import type { AppNotification } from '../../types';

export const notificationsApi = {
  list: async (): Promise<AppNotification[]> => {
    const { data } = await apiClient.get('/notifications', { params: { limit: 100 } });
    return data.items.map(toNotification);
  },
  markRead: (id: string) => apiClient.post(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => apiClient.post('/notifications/read-all').then(r => r.data),
};
