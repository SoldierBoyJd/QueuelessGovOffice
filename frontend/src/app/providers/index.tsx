import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useLiveStore } from '../../stores/liveStore';
import { officeSocket } from '../../services/websocket/WebSocketService';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } },
});

const POLL_MS = 30_000;
const DEBOUNCE_MS = 250;

/**
 * Keeps the live store in sync with the backend for the signed-in user:
 *  - full refresh on sign-in / user change, and a clean reset on sign-out
 *  - one office WebSocket (staff: their office; citizens: the office of their active token)
 *  - every socket event (and every reconnect) triggers a debounced REST refresh
 *  - a slow poll as a safety net when the socket is down or the tab was asleep
 */
function LiveSync() {
  const userId = useAuthStore(s => s.user?.id);
  const role = useAuthStore(s => s.user?.role);
  const staffOfficeId = useAuthStore(s => s.user?.officeId);
  const authToken = useAuthStore(s => s.token);
  const citizenOfficeId = useLiveStore(s => s.token?.officeId);

  const officeId = role === 'CITIZEN' ? citizenOfficeId : staffOfficeId;

  // Sign-in / sign-out / account switch
  useEffect(() => {
    const { reset, refresh } = useLiveStore.getState();
    reset();
    if (userId) void refresh();
  }, [userId]);

  // Realtime socket for the relevant office
  useEffect(() => {
    if (!userId || !authToken || !officeId) { officeSocket.disconnect(); return; }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const refreshSoon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void useLiveStore.getState().refresh(); }, DEBOUNCE_MS);
    };

    const offs = [
      officeSocket.onStatus(s => useLiveStore.getState().setWsStatus(s)),
      officeSocket.onEvent(refreshSoon),
      officeSocket.onConnected(refreshSoon),
      officeSocket.onAuthFailed(() => {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }),
    ];
    officeSocket.connect(officeId, authToken);

    return () => {
      if (timer) clearTimeout(timer);
      offs.forEach(off => off());
      officeSocket.disconnect();
    };
  }, [userId, authToken, officeId]);

  // Safety net: slow poll + refresh when the tab becomes visible again
  useEffect(() => {
    if (!userId) return;
    const tick = () => { if (!document.hidden) void useLiveStore.getState().refresh(); };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [userId]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <LiveSync />
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
}
