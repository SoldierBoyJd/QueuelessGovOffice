import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

// Demo users for each role
export const DEMO_USERS: Record<string, User> = {
  citizen: {
    id: 'usr-citizen-01',
    name: 'Jainam Doshi',
    email: 'jainam.doshi@gmail.com',
    role: 'CITIZEN',
    verificationStatus: 'NOT_REQUIRED',
    avatarInitials: 'JD',
    createdAt: '2026-01-15T00:00:00Z',
  },
  officer: {
    id: 'usr-officer-01',
    name: 'Priya Sharma',
    email: 'priya.sharma@gov.in',
    role: 'OFFICER',
    verificationStatus: 'APPROVED',
    officeId: 'off-001',
    counterId: 'ctr-001',
    avatarInitials: 'PS',
    createdAt: '2025-06-01T00:00:00Z',
  },
  office_admin: {
    id: 'usr-admin-01',
    name: 'Aditi Mehta',
    email: 'aditi.mehta@gov.in',
    role: 'OFFICE_ADMIN',
    verificationStatus: 'APPROVED',
    officeId: 'off-001',
    avatarInitials: 'AM',
    createdAt: '2025-03-01T00:00:00Z',
  },
  central_admin: {
    id: 'usr-central-01',
    name: 'Vikram Nair',
    email: 'vikram.nair@nic.in',
    role: 'CENTRAL_ADMIN',
    verificationStatus: 'APPROVED',
    avatarInitials: 'VN',
    createdAt: '2025-01-01T00:00:00Z',
  },
  super_admin: {
    id: 'usr-super-01',
    name: 'Sys Admin',
    email: 'admin@skiptheline.gov.in',
    role: 'SUPER_ADMIN',
    verificationStatus: 'APPROVED',
    avatarInitials: 'SA',
    createdAt: '2024-12-01T00:00:00Z',
  },
};

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
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    { name: 'stl-auth' }
  )
);
