import React from 'react';
import { AlertTriangle, RefreshCw, Lock, SearchX, AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  status?: number;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  status,
  message,
  onRetry,
  compact = false,
}) => {
  const config = getConfig(status);
  const display = message ?? config.message;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-20 px-6'}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${config.bg}`}>
        <config.Icon className={`w-7 h-7 ${config.color}`} />
      </div>
      <h3 className="text-[16px] font-black text-slate-900 mb-1">{config.title}</h3>
      <p className="text-[13px] text-slate-500 max-w-[380px] leading-relaxed">{display}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-slate-50 text-slate-700 font-bold text-[13px] transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  );
};

function getConfig(status?: number) {
  if (status === 403) return { Icon: Lock,          title: 'Access denied',      message: "You don't have permission to access this resource.",         bg: 'bg-red-50',     color: 'text-red-600'   };
  if (status === 404) return { Icon: SearchX,       title: 'Not found',          message: 'The resource you were looking for does not exist.',          bg: 'bg-slate-50',   color: 'text-slate-500' };
  if (status === 401) return { Icon: Lock,          title: 'Session expired',    message: 'Your session has expired. Please sign in again.',           bg: 'bg-amber-50',   color: 'text-amber-600' };
  if (status === 409) return { Icon: AlertCircle,   title: 'Conflict',           message: 'A conflict occurred. The resource may already exist.',      bg: 'bg-amber-50',   color: 'text-amber-600' };
  return               { Icon: AlertTriangle,       title: 'Something went wrong', message: 'An unexpected error occurred. Please try again.',         bg: 'bg-red-50',     color: 'text-red-600'   };
}
