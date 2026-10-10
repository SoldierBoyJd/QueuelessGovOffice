import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '../types';
import { apiClient } from '../services/api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const DEFAULT_ROUTE_FOR_ROLE: Record<Role, string> = {
  CITIZEN: '/citizen/home',
  OFFICER: '/officer/dashboard',
  OFFICE_ADMIN: '/office-admin/dashboard',
  CENTRAL_ADMIN: '/central/dashboard',
  SUPER_ADMIN: '/super-admin/dashboard',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        // Revoke the access token server-side (best effort), then drop local state.
        const token = useAuthStore.getState().token;
        if (token) {
          void apiClient.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    { name: 'stl-auth' }
  )
);
