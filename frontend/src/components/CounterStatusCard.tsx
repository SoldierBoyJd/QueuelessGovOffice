import React from 'react';
import type { Counter } from '../types';

interface CounterStatusCardProps {
  counters?: Counter[];
}

const STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  ACTIVE:  { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active' },
  PAUSED:  { dot: 'bg-amber-500',   text: 'text-amber-600',   label: 'Paused' },
  CLOSED:  { dot: 'bg-slate-400',   text: 'text-slate-500',   label: 'Closed' },
  BREAK:   { dot: 'bg-blue-400',    text: 'text-blue-500',    label: 'Break' },
};

export const CounterStatusCard: React.FC<CounterStatusCardProps> = ({ counters }) => {
  const display = (counters ?? []).slice(0, 4);

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
      <div className="flex items-center justify-between pb-3.5">
        <h3 className="text-[14.5px] font-bold text-slate-900">Counter Status</h3>
        <button className="text-[12px] font-semibold text-red-600 hover:text-red-700 transition-colors">View All</button>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {display.map((c) => {
          const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.CLOSED;
          return (
            <div key={c.id} className="bg-[#f8fafc] border border-slate-100/90 rounded-2xl p-2.5 flex flex-col justify-between min-h-[92px] hover:border-slate-200 transition-all">
              <div>
                <div className="text-[11px] font-medium text-slate-500">{c.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  <span className={`text-[11px] font-bold ${s.text}`}>{s.label}</span>
                </div>
              </div>
              <div className="mt-2">
                {c.currentTokenDisplay ? (
                  <>
                    <div className="text-[10px] text-slate-400 font-medium">Serving</div>
                    <div className="text-[13.5px] font-black text-slate-900 leading-tight">{c.currentTokenDisplay}</div>
                  </>
                ) : (
                  <div className="text-[11px] text-slate-400 font-medium pt-3">
                    {c.status === 'ACTIVE' ? 'Idle' : 'No service'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {display.length === 0 && (
          <div className="col-span-4 text-center text-[12px] text-slate-400 py-4">No counters available.</div>
        )}
      </div>
    </div>
  );
};
