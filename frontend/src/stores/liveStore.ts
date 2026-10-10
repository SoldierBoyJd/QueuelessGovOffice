/**
 * Live store — the single client-side mirror of backend state for the signed-in user.
 *
 * `refresh()` pulls what the current role needs from the REST API; the realtime socket (see LiveSync) only
 * tells us *when* to refresh. Pages read from here and call the async actions below; every action calls the
 * API and then refreshes, so the UI always shows server truth (never an optimistic guess).
 */
import { create } from 'zustand';
import type { AppNotification, Counter, Queue, Token } from '../types';
import { useAuthStore } from './authStore';
import { tokensApi } from '../services/api/tokens';
import { queuesApi } from '../services/api/queues';
import { officesApi } from '../services/api/offices';
import { officersApi, countersApi, type OfficerCurrent } from '../services/api/officers';
import { notificationsApi } from '../services/api/notifications';
import { parseApiError } from '../services/api/client';
import { EMPTY_QUEUE } from '../services/api/adapters';
import type { WsStatus } from '../services/websocket/WebSocketService';

interface LiveState {
  token: Token | null;
  queue: Queue;
  counters: Counter[];
  notifications: AppNotification[];
  /** Officer only: the counter's current/next token. */
  officer: OfficerCurrent | null;
  /** Officer only: why `officer` is null (e.g. no counter assigned). */
  officerError: string | null;
  wsStatus: WsStatus;
  loaded: boolean;
  lastSyncedAt: string | null;

  refresh: () => Promise<void>;
  reset: () => void;
  setWsStatus: (s: WsStatus) => void;

  // Officer actions (act on the signed-in officer's counter)
  callNext: () => Promise<{ empty: boolean }>;
  startCurrent: () => Promise<void>;
  completeCurrent: () => Promise<void>;
  holdCurrent: () => Promise<void>;
  resumeCurrent: () => Promise<void>;
  noShowCurrent: () => Promise<void>;

  // Office-admin counter actions
  pauseCounter: (id: string, reason?: string) => Promise<void>;
  resumeCounter: (id: string) => Promise<void>;
  closeCounter: (id: string) => Promise<void>;
  openCounter: (id: string) => Promise<void>;

  // Citizen actions
  cancelToken: () => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const INITIAL = {
  token: null,
  queue: EMPTY_QUEUE,
  counters: [] as Counter[],
  notifications: [] as AppNotification[],
  officer: null,
  officerError: null,
  loaded: false,
  lastSyncedAt: null,
};

let inflight: Promise<void> | null = null;
let queued = false;

export const useLiveStore = create<LiveState>((set, get) => {
  /** Run an API mutation, then re-sync. Errors propagate to the caller (which shows a toast). */
  const mutate = async <T,>(fn: () => Promise<T>): Promise<T> => {
    const out = await fn();
    await get().refresh();
    return out;
  };

  const currentTokenId = () => {
    const id = get().officer?.currentToken?.id;
    if (!id) throw new Error('There is no token at your counter.');
    return id;
  };

  return {
    ...INITIAL,
    wsStatus: 'OFFLINE',

    setWsStatus: (s) => set({ wsStatus: s }),
    reset: () => { set({ ...INITIAL }); },

    // Coalesces overlapping calls: while one sync runs, at most one more is queued behind it.
    refresh: () => {
      if (inflight) { queued = true; return inflight; }
      inflight = (async () => {
        try { await sync(set); }
        finally {
          inflight = null;
          if (queued) { queued = false; void get().refresh(); }
        }
      })();
      return inflight;
    },

    callNext: async () => {
      const r = await mutate(() => officersApi.callNext(get().officer?.counterId));
      return { empty: r.empty };
    },
    startCurrent:    () => mutate(() => officersApi.start(currentTokenId())).then(() => undefined),
    completeCurrent: () => mutate(() => officersApi.complete(currentTokenId())).then(() => undefined),
    holdCurrent:     () => mutate(() => officersApi.hold(currentTokenId())).then(() => undefined),
    resumeCurrent:   () => mutate(() => officersApi.resume(currentTokenId())).then(() => undefined),
    noShowCurrent:   () => mutate(() => officersApi.noShow(currentTokenId())).then(() => undefined),

    pauseCounter:  (id, reason) => mutate(() => countersApi.pause(id, reason)).then(() => undefined),
    resumeCounter: (id) => mutate(() => countersApi.resume(id)).then(() => undefined),
    closeCounter:  (id) => mutate(() => countersApi.close(id, true)).then(() => undefined),
    openCounter:   (id) => mutate(() => countersApi.open(id)).then(() => undefined),

    cancelToken: async () => {
      const id = get().token?.id;
      if (!id) return;
      await mutate(() => tokensApi.cancel(id));
    },

    markNotificationRead: async (id) => {
      const target = get().notifications.find(n => n.id === id);
      if (!target || target.read) return;
      set(s => ({ notifications: s.notifications.map(n => (n.id === id ? { ...n, read: true } : n)) }));
      try { await notificationsApi.markRead(id); }
      catch { await get().refresh(); }
    },

    markAllNotificationsRead: async () => {
      set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }));
      try { await notificationsApi.markAllRead(); }
      catch { await get().refresh(); }
    },
  };
});

type Setter = (partial: Partial<LiveState>) => void;

async function sync(set: Setter): Promise<void> {
  const { user, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !user) { set({ ...INITIAL }); return; }

  const who = { id: user.id, name: user.name };
  const patch: Partial<LiveState> = {};

  const notifications = notificationsApi.list().then(n => { patch.notifications = n; }).catch(() => undefined);

  try {
    if (user.role === 'CITIZEN') {
      const token = await tokensApi.getActive(who);
      patch.token = token;
      patch.queue = token ? await queuesApi.getOfficeQueue(token.officeId) : EMPTY_QUEUE;
      patch.counters = [];
    } else if ((user.role === 'OFFICER' || user.role === 'OFFICE_ADMIN') && user.officeId) {
      const [queue, counters] = await Promise.all([
        queuesApi.getOfficeQueue(user.officeId),
        officesApi.getCounters(user.officeId),
      ]);
      patch.queue = queue;
      patch.counters = counters;
      if (user.role === 'OFFICER') {
        try {
          patch.officer = await officersApi.current();
          patch.officerError = null;
        } catch (e) {
          patch.officer = null;
          patch.officerError = parseApiError(e).message;
        }
      }
    }
  } catch {
    // Keep the last good state; the socket status / next refresh will recover.
  }

  await notifications;
  set({ ...patch, loaded: true, lastSyncedAt: new Date().toISOString() });
}
