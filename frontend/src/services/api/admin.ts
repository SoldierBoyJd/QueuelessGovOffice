import { apiClient } from './client';
import { toUser, toAuditEntry, toSystemComponent, toModel } from './adapters';
import type { AIModel, AuditLogEntry, Role, SystemComponent, User } from '../../types';

export interface AdminUser extends User { isActive: boolean }

export interface ModelEvaluation {
  sample_size: number;
  mean_absolute_error_minutes: number | null;
  median_absolute_error_minutes: number | null;
  range_coverage: number | null;
}

export const adminApi = {
  users: async (params: { q?: string; role?: Role } = {}): Promise<AdminUser[]> => {
    const { data } = await apiClient.get('/admin/users', { params: { limit: 100, ...params } });
    return data.items.map((u: Record<string, unknown>) => ({ ...toUser(u), isActive: u.is_active as boolean }));
  },

  userCount: async (): Promise<number> => {
    const { data } = await apiClient.get('/admin/users', { params: { limit: 1 } });
    return data.pagination.total;
  },

  createOfficer: (body: { fullName: string; email: string; password: string; officeId: string; counterId?: string }) =>
    apiClient.post('/admin/users', {
      full_name: body.fullName, email: body.email, password: body.password,
      role: 'OFFICER', office_id: body.officeId, ...(body.counterId ? { counter_id: body.counterId } : {}),
    }).then(r => toUser(r.data)),

  /** Rename a counter and/or change the service it handles (`null` = all services). */
  updateCounter: (id: string, body: { name?: string; serviceId?: string | null }) =>
    apiClient.patch(`/admin/counters/${id}`, {
      ...(body.name ? { name: body.name } : {}),
      ...(body.serviceId === null ? { clear_service: true } : body.serviceId ? { service_id: body.serviceId } : {}),
    }).then(r => r.data),

  /** Pin an officer to a counter (`null` unassigns). */
  assignCounter: (userId: string, counterId: string | null) =>
    apiClient.patch(`/admin/users/${userId}`, counterId ? { counter_id: counterId } : { clear_counter: true }).then(r => r.data),

  setUserActive: (id: string, isActive: boolean) =>
    apiClient.patch(`/admin/users/${id}`, { is_active: isActive }).then(r => toUser(r.data)),

  auditLogs: async (): Promise<{ items: AuditLogEntry[]; total: number }> => {
    const { data } = await apiClient.get('/admin/audit-logs', { params: { limit: 100 } });
    return { items: data.items.map(toAuditEntry), total: data.pagination.total };
  },

  systemHealth: async (): Promise<{ status: string; components: SystemComponent[] }> => {
    const { data } = await apiClient.get('/admin/system/health');
    return { status: data.status, components: data.components.map(toSystemComponent) };
  },

  models: async (): Promise<{ models: AIModel[]; evaluation: ModelEvaluation | null }> => {
    const { data } = await apiClient.get('/admin/models');
    return { models: data.items.map(toModel), evaluation: null };
  },
};
