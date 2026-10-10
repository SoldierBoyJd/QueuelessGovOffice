import React from 'react';
import type { Queue } from '../types';

interface QueueSnapshotCardProps {
  queue: Queue;
}

/** Office-wide counts for citizens (hourly analytics are staff-only on the API). */
export const QueueSnapshotCard: React.FC<QueueSnapshotCardProps> = ({ queue }) => {
  const rows = [
    { label: 'Waiting', value: queue.totalWaiting, bar: 'bg-amber-500' },
    { label: 'At a counter', value: queue.totalServing, bar: 'bg-blue-500' },
    { label: 'Completed today', value: queue.totalCompleted, bar: 'bg-emerald-500' },
    { label: 'No-shows today', value: queue.totalNoShow, bar: 'bg-red-400' },
  ];
  const max = Math.max(1, ...rows.map(r => r.value));

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
      <h3 className="text-[14.5px] font-bold text-slate-900 pb-3">Office Today</h3>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="font-semibold text-slate-600">{r.label}</span>
              <span className="font-black text-slate-900">{r.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${r.bar} transition-all`} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-4">{queue.activeCounters} counter{queue.activeCounters === 1 ? '' : 's'} active</p>
    </div>
  );
};
