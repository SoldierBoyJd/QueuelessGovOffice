/**
 * Browser alerts for citizens: system notification + short beep.
 * Uses the service worker registration when available (required for notifications on phones).
 */
const TRAVEL_KEY = 'stl-travel-min';

export function getTravelMinutes(): number {
  try {
    const v = Number(localStorage.getItem(TRAVEL_KEY));
    return Number.isFinite(v) && v >= 0 ? v : 20;
  } catch { return 20; }
}

export function setTravelMinutes(min: number): void {
  try { localStorage.setItem(TRAVEL_KEY, String(Math.max(0, Math.round(min)))); } catch { /* storage unavailable */ }
}

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined';
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function enableNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD && location.hostname !== 'localhost') return;
  try { await navigator.serviceWorker.register('/sw.js'); } catch { /* not fatal */ }
}

function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.22].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = i === 0 ? 880 : 1175;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.18);
    });
    setTimeout(() => void ctx.close(), 800);
  } catch { /* autoplay blocked */ }
}

export async function alertUser(title: string, body: string, tag: string): Promise<void> {
  beep();
  if (notificationPermission() !== 'granted') return;
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(title, { body, tag, icon: '/favicon.svg' });
    else new Notification(title, { body, tag, icon: '/favicon.svg' });
  } catch { /* ignore */ }
}
