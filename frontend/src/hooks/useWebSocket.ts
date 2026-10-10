/**
 * Generic WebSocket hook — connect, listen, get status.
 * In DEMO mode, status comes from demoStore instead of a real WS connection.
 */
import { useEffect, useRef } from 'react';
import { getWsService } from '../services/websocket/WebSocketService';
import { useDemoStore } from '../stores/demoStore';
import type { WSEvent } from '../types';

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

interface UseWebSocketOptions {
  path: string;
  onEvent: (event: WSEvent) => void;
  enabled?: boolean;
}

export function useWebSocket({ path, onEvent, enabled = true }: UseWebSocketOptions): void {
  const setWsStatus = useDemoStore(s => s.setWsStatus);
  const serviceRef = useRef(getWsService(path));

  useEffect(() => {
    if (!enabled) return;
    if (DEMO) return; // demo mode uses demoStore simulation

    const svc = serviceRef.current;
    const offMsg    = svc.onMessage(onEvent);
    const offStatus = svc.onStatus(setWsStatus);
    svc.connect(path);

    return () => {
      offMsg();
      offStatus();
      svc.disconnect();
    };
  }, [path, enabled]);
}
