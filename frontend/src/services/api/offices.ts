import { apiClient } from './client';
import { toOffice, groupDepartments, toService, toCounter } from './adapters';
import type { Office, Department, Service, Counter } from '../../types';

export const officesApi = {
  /** Public directory. Services are not included (use `get` / `listWithServices`). */
  list: async (params: { q?: string; state?: string } = {}): Promise<Office[]> => {
    const out: Office[] = [];
    let offset = 0;
    for (;;) {
      const { data } = await apiClient.get('/offices', { params: { ...params, limit: 100, offset } });
      out.push(...data.items.map((o: Record<string, unknown>) => toOffice(o)));
      offset += data.items.length;
      if (!data.items.length || offset >= data.pagination.total) break;
    }
    return out;
  },

  /** Every office with its services attached (one extra call per office). */
  listWithServices: async (): Promise<Office[]> => {
    const offices = await officesApi.list();
    return Promise.all(offices.map(async o => {
      const { data } = await apiClient.get(`/offices/${o.id}/services`);
      return { ...o, departments: groupDepartments(o.id, data.items) };
    }));
  },

  get: async (id: string): Promise<Office> => {
    const [office, services] = await Promise.all([
      apiClient.get(`/offices/${id}`),
      apiClient.get(`/offices/${id}/services`),
    ]);
    return toOffice(office.data, services.data.items);
  },

  getDepartments: async (officeId: string): Promise<Department[]> => {
    const { data } = await apiClient.get(`/offices/${officeId}/services`);
    return groupDepartments(officeId, data.items);
  },

  getServices: async (officeId: string): Promise<Service[]> => {
    const { data } = await apiClient.get(`/offices/${officeId}/services`);
    return data.items.map(toService);
  },

  getCounters: async (officeId: string): Promise<Counter[]> => {
    const { data } = await apiClient.get(`/offices/${officeId}/counters`);
    return data.items.map(toCounter);
  },
};
