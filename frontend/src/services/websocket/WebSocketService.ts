/**
 * Office realtime socket (WS /api/v1/ws/offices/{officeId}).
 *
 * Protocol: the first client frame must be {"type":"auth","token":"<jwt>"} so the token never appears in a
 * URL. The server answers {"type":"connected"}; afterwards events are hints ("queue.updated",
 * "token.eta_updated", "token.status_changed", "counter.status_changed", "notification.created") and clients
 * are expected to refetch REST state — including after every (re)connect.
 */

export type WsStatus = 'LIVE' | 'RECONNECTING' | 'OFFLINE';

export interface ServerEvent {
  type: string;
  office_id?: string | null;
  event_id?: string;
  occurred_at?: string;
  data?: Record<string, unknown>;
}

type EventListener = (event: ServerEvent) => void;
type StatusListener = (status: WsStatus) => void;

const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
const WS_ORIGIN: string = import.meta.env.VITE_WS_BASE_URL ?? API_BASE.replace(/^http/, 'ws').replace(/\/api\/.*$/, '');
const API_PATH = (() => {
  try { return new URL(API_BASE).pathname.replace(/\/$/, ''); } catch { return '/api/v1'; }
})();

const PING_MS = 25_000;
const MAX_RETRIES = 10;
/** Close codes from the server that retrying cannot fix. 4401 = bad/expired token. */
const FATAL_CODES = new Set([4403, 4404]);

export class OfficeSocket {
  private socket: WebSocket | null = null;
  private officeId = '';
  private token = '';
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closedByUs = true;
  private eventListeners = new Set<EventListener>();
  private statusListeners = new Set<StatusListener>();
  private authFailListeners = new Set<() => void>();
  private openListeners = new Set<() => void>();

  connect(officeId: string, token: string): void {
    this.disconnect();
    this.officeId = officeId;
    this.token = token;
    this.closedByUs = false;
    this.retryCount = 0;
    this.open();
  }

  disconnect(): void {
    this.closedByUs = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.retryTimer = this.pingTimer = null;
    const s = this.socket;
    this.socket = null;
    if (s) { s.onopen = s.onmessage = s.onclose = s.onerror = null; s.close(); }
    this.emitStatus('OFFLINE');
  }

  onEvent(l: EventListener): () => void { this.eventListeners.add(l); return () => this.eventListeners.delete(l); }
  onStatus(l: StatusListener): () => void { this.statusListeners.add(l); return () => this.statusListeners.delete(l); }
  onAuthFailed(l: () => void): () => void { this.authFailListeners.add(l); return () => this.authFailListeners.delete(l); }
  /** Fires after the server confirmed the connection — the moment to refetch REST state. */
  onConnected(l: () => void): () => void { this.openListeners.add(l); return () => this.openListeners.delete(l); }

  private open(): void {
    this.emitStatus('RECONNECTING');
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${WS_ORIGIN}${API_PATH}/ws/offices/${this.officeId}`);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = ws;

    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: this.token }));

    ws.onmessage = (e: MessageEvent) => {
      let msg: ServerEvent;
      try { msg = JSON.parse(e.data as string) as ServerEvent; } catch { return; }
      if (msg.type === 'connected') {
        this.retryCount = 0;
        this.emitStatus('LIVE');
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, PING_MS);
        this.openListeners.forEach(l => l());
        return;
      }
      if (msg.type === 'pong') return;
      this.eventListeners.forEach(l => l(msg));
    };

    ws.onclose = (e: CloseEvent) => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      if (this.closedByUs) return;
      if (e.code === 4401) { this.emitStatus('OFFLINE'); this.authFailListeners.forEach(l => l()); return; }
      if (FATAL_CODES.has(e.code)) { this.emitStatus('OFFLINE'); return; }
      this.scheduleRetry();
    };

    ws.onerror = () => ws.close();
  }

  private scheduleRetry(): void {
    if (this.closedByUs) return;
    if (this.retryCount >= MAX_RETRIES) { this.emitStatus('OFFLINE'); return; }
    this.emitStatus('RECONNECTING');
    const delay = Math.min(1000 * 2 ** this.retryCount, 30_000);
    this.retryCount += 1;
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private emitStatus(s: WsStatus): void { this.statusListeners.forEach(l => l(s)); }
}

export const officeSocket = new OfficeSocket();
