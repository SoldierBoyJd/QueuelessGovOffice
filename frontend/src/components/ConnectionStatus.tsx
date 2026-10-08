import React from 'react';

interface ConnectionStatusProps {
  status: 'LIVE' | 'RECONNECTING' | 'OFFLINE';
  lastUpdated?: string;
  dark?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, lastUpdated, dark }) => {
  const configs = {
    LIVE:         { dot: 'bg-emerald-500', text: dark ? 'text-emerald-400' : 'text-emerald-600', label: 'LIVE' },
    RECONNECTING: { dot: 'bg-amber-500 animate-pulse', text: dark ? 'text-amber-400' : 'text-amber-600', label: 'RECONNECTING' },
    OFFLINE:      { dot: 'bg-red-500', text: dark ? 'text-red-400' : 'text-red-600', label: 'OFFLINE' },
  };
  const cfg = configs[status];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`text-[11.5px] font-bold tracking-wide ${cfg.text}`}>{cfg.label}</span>
      {status === 'LIVE' && lastUpdated && (
        <span className={`text-[11px] font-medium ${dark ? 'text-slate-500' : 'text-slate-400'}`}>· {lastUpdated}</span>
      )}
    </div>
  );
};
