/**
 * Demo store — drives the hackathon demo flow.
 * All dashboard pages subscribe to this store for live state.
 * Changes here trigger UI updates across Citizen, Officer, and Admin views.
 */
import { create } from 'zustand';
import type { Token, Counter, Queue, AppNotification } from '../types';
import {
  MOCK_ACTIVE_TOKEN,
  MOCK_COUNTERS,
  MOCK_QUEUE,
  MOCK_NOTIFICATIONS,
} from '../mock/data';

interface DemoState {
  token: Token;
  counters: Counter[];
  queue: Queue;
  notifications: AppNotification[];
  wsStatus: 'LIVE' | 'RECONNECTING' | 'OFFLINE';

  // Officer actions
  completeCurrentToken: () => void;
  holdCurrentToken: () => void;
  noShowCurrentToken: () => void;
  callNextToken: () => void;

  // Admin counter actions
  pauseCounter: (counterId: string) => void;
  resumeCounter: (counterId: string) => void;
  closeCounter: (counterId: string) => void;

  // Notification actions
  markNotificationRead: (id: string) => void;
  addNotification: (n: AppNotification) => void;

  // Connection
  setWsStatus: (s: 'LIVE' | 'RECONNECTING' | 'OFFLINE') => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  token: MOCK_ACTIVE_TOKEN,
  counters: MOCK_COUNTERS,
  queue: MOCK_QUEUE,
  notifications: MOCK_NOTIFICATIONS,
  wsStatus: 'LIVE',

  completeCurrentToken: () => {
    const { queue, token } = get();
    // Move first SERVING token to COMPLETED, shift queue
    const updatedTokens = queue.tokens.map((t) =>
      t.status === 'SERVING' && t.tokenId === 'tok-183'
        ? { ...t, status: 'COMPLETED' as const }
        : t
    );
    // Reduce peopleAhead for citizen
    const newPeopleAhead = Math.max(0, token.peopleAhead - 1);
    const newWait = Math.max(0, token.prediction.estimatedWaitMinutes - 8);
    set({
      queue: {
        ...queue,
        tokens: updatedTokens,
        totalCompleted: queue.totalCompleted + 1,
        totalServing: Math.max(0, queue.totalServing - 1),
        totalWaiting: Math.max(0, queue.totalWaiting - 1),
        lastUpdated: new Date().toISOString(),
      },
      token: {
        ...token,
        peopleAhead: newPeopleAhead,
        prediction: {
          ...token.prediction,
          estimatedWaitMinutes: newWait,
          estimatedTurnTime: newWait <= 0 ? 'Now' : token.prediction.estimatedTurnTime,
        },
      },
    });
  },

  holdCurrentToken: () => {
    const { queue } = get();
    const updatedTokens = queue.tokens.map((t) =>
      t.tokenId === 'tok-183' ? { ...t, status: 'HOLD' as const } : t
    );
    set({ queue: { ...queue, tokens: updatedTokens, lastUpdated: new Date().toISOString() } });
  },

  noShowCurrentToken: () => {
    const { queue } = get();
    const updatedTokens = queue.tokens.map((t) =>
      t.tokenId === 'tok-183' ? { ...t, status: 'NO_SHOW' as const } : t
    );
    set({
      queue: {
        ...queue,
        tokens: updatedTokens,
        totalNoShow: queue.totalNoShow + 1,
        lastUpdated: new Date().toISOString(),
      },
    });
  },

  callNextToken: () => {
    const { queue } = get();
    const nextWaiting = queue.tokens.find((t) => t.status === 'WAITING' && !t.isCurrentUser);
    if (!nextWaiting) return;
    const updatedTokens = queue.tokens.map((t) =>
      t.tokenId === nextWaiting.tokenId ? { ...t, status: 'SERVING' as const } : t
    );
    set({
      queue: {
        ...queue,
        tokens: updatedTokens,
        totalServing: queue.totalServing + 1,
        totalWaiting: Math.max(0, queue.totalWaiting - 1),
        lastUpdated: new Date().toISOString(),
      },
    });
  },

  pauseCounter: (counterId) => {
    const { counters, token } = get();
    const updated = counters.map((c) =>
      c.id === counterId ? { ...c, status: 'PAUSED' as const, currentTokenDisplay: undefined, currentCitizenName: undefined } : c
    );
    const activeCount = updated.filter((c) => c.status === 'ACTIVE').length;
    // ETA degrades when counter 03 paused
    const etaChange = counterId === 'ctr-003' ? 22 : 0;
    const newWait = token.prediction.estimatedWaitMinutes + etaChange;
    const notification: AppNotification = {
      id: `n-${Date.now()}`,
      type: 'WARNING',
      title: 'ETA Updated',
      message: `Your estimated turn moved from ${token.prediction.estimatedTurnTime} → 3:04 PM. Counter ${counterId === 'ctr-003' ? '03' : ''} temporarily unavailable.`,
      timestamp: new Date().toISOString(),
      read: false,
      tokenId: token.id,
    };
    set({
      counters: updated,
      token: {
        ...token,
        prediction: {
          ...token.prediction,
          estimatedWaitMinutes: newWait,
          estimatedTurnTime: etaChange > 0 ? '3:04 PM' : token.prediction.estimatedTurnTime,
        },
      },
      queue: {
        ...get().queue,
        activeCounters: activeCount,
        lastUpdated: new Date().toISOString(),
      },
      notifications: [notification, ...get().notifications],
    });
  },

  resumeCounter: (counterId) => {
    const { counters, token } = get();
    const updated = counters.map((c) =>
      c.id === counterId ? { ...c, status: 'ACTIVE' as const } : c
    );
    const activeCount = updated.filter((c) => c.status === 'ACTIVE').length;
    // ETA improves when counter reopens
    const etaImprovement = counterId === 'ctr-003' ? 15 : 0;
    const newWait = Math.max(10, token.prediction.estimatedWaitMinutes - etaImprovement);
    set({
      counters: updated,
      token: {
        ...token,
        prediction: {
          ...token.prediction,
          estimatedWaitMinutes: newWait,
          estimatedTurnTime: etaImprovement > 0 ? '2:49 PM' : token.prediction.estimatedTurnTime,
        },
      },
      queue: {
        ...get().queue,
        activeCounters: activeCount,
        lastUpdated: new Date().toISOString(),
      },
    });
  },

  closeCounter: (counterId) => {
    const { counters } = get();
    const updated = counters.map((c) =>
      c.id === counterId ? { ...c, status: 'CLOSED' as const, currentTokenDisplay: undefined } : c
    );
    set({ counters: updated });
  },

  markNotificationRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    }));
  },

  addNotification: (n) => {
    set((s) => ({ notifications: [n, ...s.notifications] }));
  },

  setWsStatus: (s) => set({ wsStatus: s }),
}));
