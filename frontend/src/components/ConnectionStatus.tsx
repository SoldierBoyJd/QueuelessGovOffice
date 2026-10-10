import React, { useState, useEffect } from 'react';

interface ConnectionStatusProps {
  status: 'LIVE' | 'RECONNECTING' | 'OFFLINE';
  lastUpdated?: string;
  dark?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, lastUpdated, dark }) => {
  const [secAgo, setSecAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => setSecAgo(Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000));
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const configs = {
    LIVE:         { dot: 'bg-emerald-500', text: dark ? 'text-emerald-400' : 'text-emerald-600', label: 'LIVE' },
    RECONNECTING: { dot: 'bg-amber-500 animate-pulse', text: dark ? 'text-amber-400' : 'text-amber-600', label: 'RECONNECTING' },
    OFFLINE:      { dot: 'bg-red-500', text: dark ? 'text-red-400' : 'text-red-600', label: 'OFFLINE' },
  };
  const cfg = configs[status];

  const staleLabel = lastUpdated && status === 'LIVE' && secAgo > 30
    ? `· updated ${secAgo}s ago`
    : null;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      <span className={`text-[11.5px] font-bold tracking-wide ${cfg.text}`}>{cfg.label}</span>
      {staleLabel && (
        <span className={`text-[10.5px] font-medium ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{staleLabel}</span>
      )}
    </div>
  );
};
