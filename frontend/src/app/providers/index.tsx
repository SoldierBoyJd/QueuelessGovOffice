import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useLiveStore } from '../../stores/liveStore';
import { officeSocket } from '../../services/websocket/WebSocketService';
import { alertUser, getTravelMinutes, registerServiceWorker } from '../../services/alerts';

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

/**
 * Citizen alerts: (1) a system notification for every new server notification (called, turn approaching ...),
 * (2) a "leave now" reminder when the recommended arrival time minus the citizen's travel time is reached.
 */
function CitizenAlerts() {
  const role = useAuthStore(s => s.user?.role);
  const notifications = useLiveStore(s => s.notifications);
  const token = useLiveStore(s => s.token);

  useEffect(() => { void registerServiceWorker(); }, []);

  useEffect(() => {
    if (role !== 'CITIZEN') return;
    const seenKey = 'stl-seen-notifs';
    let seen: string[] = [];
    try { seen = JSON.parse(sessionStorage.getItem(seenKey) ?? '[]') as string[]; } catch { /* ignore */ }
    const fresh = notifications.filter(n => !n.read && !seen.includes(n.id) && Date.now() - new Date(n.timestamp).getTime() < 3 * 60_000);
    // First load: remember everything silently so old notifications do not all fire at once.
    const firstLoad = seen.length === 0 && sessionStorage.getItem(seenKey) === null;
    if (!firstLoad) fresh.slice(0, 2).forEach(n => void alertUser(n.title, n.message, n.id));
    try { sessionStorage.setItem(seenKey, JSON.stringify([...seen, ...notifications.map(n => n.id)].slice(-200))); } catch { /* ignore */ }
  }, [notifications, role]);

  useEffect(() => {
    if (role !== 'CITIZEN' || !token || token.status !== 'WAITING' || !token.prediction.arriveByIso) return;
    const leaveAt = new Date(token.prediction.arriveByIso).getTime() - getTravelMinutes() * 60_000;
    const key = `stl-leave-${token.id}`;
    const fire = () => {
      try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
      void alertUser('Time to leave', `Token ${token.displayNumber}: leave now to reach ${token.officeName} before your turn.`, key);
    };
    const delay = leaveAt - Date.now();
    if (delay <= 0) { if (delay > -10 * 60_000) fire(); return; }
    const t = setTimeout(fire, Math.min(delay, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [role, token?.id, token?.status, token?.prediction.arriveByIso]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <LiveSync />
        <CitizenAlerts />
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
}
