/**
 * In-app notification service.
 * Bridges incoming WebSocket events → demoStore notifications.
 */
import type { WSEvent, AppNotification } from '../../types';

type Handler = (n: AppNotification) => void;

class NotificationService {
  private handlers = new Set<Handler>();

  handle(event: WSEvent): void {
    if (event.type !== 'NOTIFICATION') return;
    const payload = event.payload as Partial<AppNotification>;
    const n: AppNotification = {
      id:        payload.id        ?? `n-${Date.now()}`,
      type:      payload.type      ?? 'INFO',
      title:     payload.title     ?? 'Update',
      message:   payload.message   ?? '',
      timestamp: payload.timestamp ?? event.timestamp,
      read:      false,
    };
    this.handlers.forEach(h => h(n));
  }

  onNotification(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

export const notificationService = new NotificationService();
