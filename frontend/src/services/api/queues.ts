import { apiClient } from './client';
import type { Queue } from '../../types';
import { MOCK_QUEUE } from '../../mock/data';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const queuesApi = {
  getLive: async (queueId: string): Promise<Queue> => {
    if (DEMO) return { ...MOCK_QUEUE, id: queueId };
    return apiClient.get<Queue>(`/queues/${queueId}/live`).then(r => r.data);
  },

  getByOfficeService: async (officeId: string, serviceId: string): Promise<Queue> => {
    if (DEMO) return MOCK_QUEUE;
    return apiClient.get<Queue>(`/queues`, { params: { officeId, serviceId } }).then(r => r.data);
  },
};
