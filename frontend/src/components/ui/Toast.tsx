import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import type { NotificationType } from '../../types';

export interface ToastMessage {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastInput = Omit<ToastMessage, 'id'>;

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const CONFIG: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>; bg: string; border: string; title: string; icon_cls: string }> = {
  SUCCESS: { icon: CheckCircle2,  bg: 'bg-emerald-50', border: 'border-emerald-200/80', title: 'text-emerald-900', icon_cls: 'text-emerald-600' },
  WARNING: { icon: AlertTriangle, bg: 'bg-amber-50',   border: 'border-amber-200/80',   title: 'text-amber-900',  icon_cls: 'text-amber-600'   },
  ERROR:   { icon: XCircle,       bg: 'bg-red-50',     border: 'border-red-200/80',     title: 'text-red-900',    icon_cls: 'text-red-600'     },
  INFO:    { icon: Info,          bg: 'bg-blue-50',    border: 'border-blue-200/80',    title: 'text-blue-900',   icon_cls: 'text-blue-600'    },
};

const ToastItem: React.FC<ToastProps> = ({ toast: t, onDismiss }) => {
  const cfg = CONFIG[t.type];
  const Icon = cfg.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), t.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-lg max-w-[360px] w-full ${cfg.bg} ${cfg.border}`}
      style={{ animation: 'slideInRight 0.2s ease-out' }}>
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.icon_cls}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold ${cfg.title}`}>{t.title}</p>
        {t.message && <p className="text-[12px] text-slate-600 mt-0.5 leading-snug">{t.message}</p>}
      </div>
      <button onClick={() => onDismiss(t.id)} className="text-slate-400 hover:text-slate-700 flex-shrink-0 transition-colors ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ── Global toast function (callable from anywhere) ────────────────────────────

let _push: ((input: ToastInput) => void) | null = null;

function push(input: ToastInput) {
  _push?.({ ...input });
}

export const toast = {
  show:    (input: ToastInput)                         => push(input),
  success: (title: string, message?: string)           => push({ type: 'SUCCESS', title, message }),
  error:   (title: string, message?: string)           => push({ type: 'ERROR',   title, message }),
  warning: (title: string, message?: string)           => push({ type: 'WARNING', title, message }),
  info:    (title: string, message?: string)           => push({ type: 'INFO',    title, message }),
};

// ── Container component ───────────────────────────────────────────────────────

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const add = useCallback((input: ToastInput) => {
    const msg: ToastMessage = { ...input, id: `t-${Date.now()}-${Math.random()}` };
    setToasts(prev => [msg, ...prev].slice(0, 5));
  }, []);

  useEffect(() => {
    _push = add;
    return () => { _push = null; };
  }, [add]);

  const dismiss = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={dismiss} />
        </div>
      ))}
      <style>{`@keyframes slideInRight { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
};
