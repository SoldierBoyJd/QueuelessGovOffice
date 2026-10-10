import { apiClient } from './client';
import type { Office, Department, Service } from '../../types';
import { MOCK_OFFICES } from '../../mock/data';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export const officesApi = {
  list: async (): Promise<Office[]> => {
    if (DEMO) return MOCK_OFFICES;
    return apiClient.get<Office[]>('/offices').then(r => r.data);
  },

  get: async (id: string): Promise<Office> => {
    if (DEMO) {
      const o = MOCK_OFFICES.find(x => x.id === id);
      if (o) return o;
    }
    return apiClient.get<Office>(`/offices/${id}`).then(r => r.data);
  },

  getDepartments: async (officeId: string): Promise<Department[]> => {
    if (DEMO) return MOCK_OFFICES.find(o => o.id === officeId)?.departments ?? [];
    return apiClient.get<Department[]>(`/offices/${officeId}/departments`).then(r => r.data);
  },

  getServices: async (officeId: string, departmentId: string): Promise<Service[]> => {
    if (DEMO) {
      const dept = MOCK_OFFICES.find(o => o.id === officeId)?.departments.find(d => d.id === departmentId);
      return dept?.services ?? [];
    }
    return apiClient.get<Service[]>(`/offices/${officeId}/departments/${departmentId}/services`).then(r => r.data);
  },
};
