import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { buildQueueWsPath } from '../services/websocket/WebSocketService';
import type { WSEvent } from '../types';

/**
 * Subscribes to live queue updates for a given queueId.
 * On each event, invalidates the relevant query cache so React Query refetches.
 */
export function useQueueWebSocket(queueId: string | undefined): void {
  const qc = useQueryClient();

  const onEvent = (event: WSEvent) => {
    if (event.type === 'QUEUE_UPDATED' || event.type === 'COUNTER_UPDATED') {
      qc.invalidateQueries({ queryKey: ['queue', queueId] });
    }
    if (event.type === 'ETA_UPDATED') {
      qc.invalidateQueries({ queryKey: ['token'] });
    }
    if (event.type === 'CONGESTION_UPDATED') {
      qc.invalidateQueries({ queryKey: ['congestion'] });
    }
  };

  useWebSocket({
    path: buildQueueWsPath(queueId ?? ''),
    onEvent,
    enabled: !!queueId,
  });
}
