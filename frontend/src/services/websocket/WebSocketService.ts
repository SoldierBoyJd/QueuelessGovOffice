/**
 * Reusable WebSocket service with exponential backoff reconnection.
 * Used by useQueueWebSocket, useTokenWebSocket, useOfficeWebSocket hooks.
 */
import type { WSEvent } from '../../types';

type WSListener = (event: WSEvent) => void;
type StatusListener = (status: 'LIVE' | 'RECONNECTING' | 'OFFLINE') => void;

const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000';

class WebSocketService {
  private socket: WebSocket | null = null;
  private url = '';
  private listeners = new Set<WSListener>();
  private statusListeners = new Set<StatusListener>();
  private retryCount = 0;
  private maxRetries = 8;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  connect(path: string): void {
    this.intentionalClose = false;
    this.url = `${WS_BASE}${path}`;
    this._open();
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.close();
    this.socket = null;
  }

  send(data: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  onMessage(listener: WSListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private _open(): void {
    this._setStatus('RECONNECTING');
    try {
      this.socket = new WebSocket(this.url);
    } catch {
      this._scheduleRetry();
      return;
    }

    this.socket.onopen = () => {
      this.retryCount = 0;
      this._setStatus('LIVE');
    };

    this.socket.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data as string) as WSEvent;
        this.listeners.forEach(l => l(event));
      } catch {
        // ignore malformed messages
      }
    };

    this.socket.onclose = () => {
      if (!this.intentionalClose) this._scheduleRetry();
      else this._setStatus('OFFLINE');
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private _scheduleRetry(): void {
    if (this.retryCount >= this.maxRetries) {
      this._setStatus('OFFLINE');
      return;
    }
    this._setStatus('RECONNECTING');
    // Exponential backoff: 1s, 2s, 4s, 8s … capped at 30s
    const delay = Math.min(1000 * 2 ** this.retryCount, 30_000);
    this.retryCount++;
    this.retryTimer = setTimeout(() => this._open(), delay);
  }

  private _setStatus(s: 'LIVE' | 'RECONNECTING' | 'OFFLINE'): void {
    this.statusListeners.forEach(l => l(s));
  }
}

// ── Per-resource singleton factories ─────────────────────────────────────────

const instances = new Map<string, WebSocketService>();

export function getWsService(key: string): WebSocketService {
  if (!instances.has(key)) instances.set(key, new WebSocketService());
  return instances.get(key)!;
}

export function buildQueueWsPath(queueId: string)  { return `/ws/queues/${queueId}`; }
export function buildTokenWsPath(tokenId: string)  { return `/ws/tokens/${tokenId}`; }
export function buildOfficeWsPath(officeId: string){ return `/ws/offices/${officeId}`; }

export { WebSocketService };
