/**
 * Centralized Axios client.
 * All API calls go through here — never scatter fetch() across components.
 */
import axios from 'axios';
import type { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT from localStorage ─────────────────────────
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('stl-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token: string | undefined = parsed?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore parse errors
  }
  return config;
});

// ── Response interceptor: normalise errors ────────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      // Clear persisted auth and redirect to login
      localStorage.removeItem('stl-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Typed error helper ────────────────────────────────────────────────────────
export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}

export function parseApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as Record<string, unknown> | undefined;
    const message =
      (typeof data?.detail === 'string' ? data.detail : null) ??
      (typeof data?.message === 'string' ? data.message : null) ??
      HTTP_MESSAGES[status] ??
      'Something went wrong. Please try again.';
    return { status, message };
  }
  return { status: 0, message: 'Network error. Check your connection.' };
}

const HTTP_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to access this resource.",
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The resource may already exist.',
  422: 'Validation failed. Please check your input.',
  500: 'Server error. Please try again later.',
};
