import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { buildOfficeWsPath } from '../services/websocket/WebSocketService';
import type { WSEvent } from '../types';

/**
 * Subscribes to office-level updates (counter state, congestion).
 */
export function useOfficeWebSocket(officeId: string | undefined): void {
  const qc = useQueryClient();

  const onEvent = (event: WSEvent) => {
    if (event.type === 'COUNTER_UPDATED') {
      qc.invalidateQueries({ queryKey: ['counters', officeId] });
      qc.invalidateQueries({ queryKey: ['queue'] });
    }
    if (event.type === 'CONGESTION_UPDATED') {
      qc.invalidateQueries({ queryKey: ['congestion', officeId] });
    }
  };

  useWebSocket({
    path: buildOfficeWsPath(officeId ?? ''),
    onEvent,
    enabled: !!officeId,
  });
}
