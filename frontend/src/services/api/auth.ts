import { apiClient } from './client';
import { toUser } from './adapters';
import type { User } from '../../types';

export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { token: string; user: User; }
export interface RegisterRequest { name: string; email: string; phone?: string; password: string; }

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const r = await apiClient.post('/auth/login', data);
    return { token: r.data.access_token, user: toUser(r.data.user) };
  },

  me: () => apiClient.get('/users/me').then(r => toUser(r.data)),

  register: (data: RegisterRequest) =>
    apiClient.post('/auth/register', {
      full_name: data.name,
      email: data.email,
      password: data.password,
      ...(data.phone?.trim() ? { phone: data.phone.trim() } : {}),
    }).then(r => toUser(r.data.user)),

  updateProfile: (data: { name?: string; phone?: string }) =>
    apiClient.patch('/users/me', {
      ...(data.name !== undefined ? { full_name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
    }).then(r => toUser(r.data)),

  logout: () => apiClient.post('/auth/logout').then(r => r.data),
};
