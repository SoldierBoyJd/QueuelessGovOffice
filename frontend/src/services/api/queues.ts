import { apiClient } from './client';
import { toQueue } from './adapters';
import type { Queue } from '../../types';

export const queuesApi = {
  /** Live queue for a whole office (privacy-safe; staff of the office also see citizen names). */
  getOfficeQueue: async (officeId: string): Promise<Queue> => {
    const { data } = await apiClient.get(`/offices/${officeId}/queue`, { params: { limit: 100 } });
    return toQueue(data, officeId);
  },
};
