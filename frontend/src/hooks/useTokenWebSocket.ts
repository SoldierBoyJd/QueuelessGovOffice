import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useDemoStore } from '../stores/demoStore';
import { buildTokenWsPath } from '../services/websocket/WebSocketService';
import { notificationService } from '../services/notifications/notificationService';
import type { WSEvent } from '../types';

/**
 * Subscribes to token-level updates (ETA changes, status changes).
 * Pushes meaningful events to the in-app notification store.
 */
export function useTokenWebSocket(tokenId: string | undefined): void {
  const qc = useQueryClient();
  const addNotification = useDemoStore(s => s.addNotification);

  const onEvent = (event: WSEvent) => {
    if (event.type === 'TOKEN_UPDATED' || event.type === 'ETA_UPDATED') {
      qc.invalidateQueries({ queryKey: ['token', tokenId] });
    }
    if (event.type === 'NOTIFICATION') {
      notificationService.handle(event);
    }
  };

  // Bridge notification service → demoStore
  notificationService.onNotification(addNotification);

  useWebSocket({
    path: buildTokenWsPath(tokenId ?? ''),
    onEvent,
    enabled: !!tokenId,
  });
}
