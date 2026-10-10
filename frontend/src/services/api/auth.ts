import { apiClient } from './client';
import type { User } from '../../types';

export interface LoginRequest  { email: string; password: string; }
export interface LoginResponse { access_token: string; token_type: string; user: User; }

export const authApi = {
  login:          (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data).then(r => r.data),

  me:             () =>
    apiClient.get<User>('/auth/me').then(r => r.data),

  register:       (data: { name: string; email: string; phone?: string; password: string }) =>
    apiClient.post<{ message: string }>('/auth/register', data).then(r => r.data),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword:  (token: string, password: string) =>
    apiClient.post<{ message: string }>('/auth/reset-password', { token, password }).then(r => r.data),

  logout:         () =>
    apiClient.post('/auth/logout').then(r => r.data),
};
