import React from 'react';
import { CheckCircle2, Circle, ArrowRight, Loader2 } from 'lucide-react';
import type { Queue } from '../types';

interface LiveQueueCardProps {
  queue?: Queue;
}

export const LiveQueueCard: React.FC<LiveQueueCardProps> = ({ queue }) => {
  const tokens = queue?.tokens ?? [];
  const display = tokens.slice(-8); // show last 8 around current position

  const statusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />, text: 'Completed', cls: 'text-emerald-600' };
      case 'SERVING':   return { icon: <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />, text: 'Serving', cls: 'text-blue-600' };
      default:          return { icon: <Circle className="w-3.5 h-3.5 text-slate-400" />, text: 'Waiting', cls: 'text-slate-500' };
    }
  };

  return (
    <div className="w-full bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-[14.5px] font-bold text-slate-900">Live Queue</h3>
        <button className="text-[12px] font-semibold text-red-600 hover:text-red-700 transition-colors">View Full Queue</button>
      </div>
      <div className="grid grid-cols-3 text-[11.5px] font-semibold text-slate-400 py-1.5 px-2 border-b border-slate-100">
        <div>Token</div><div>Status</div><div className="text-right">Est. Time</div>
      </div>
      <div className="mt-1 space-y-1">
        {display.length === 0 ? (
          <p className="text-[12px] text-slate-400 text-center py-4">No tokens in queue.</p>
        ) : display.map((item) => {
          if (item.isCurrentUser) {
            return (
              <div key={item.tokenId} className="grid grid-cols-3 items-center px-2 py-2 rounded-xl bg-[#fff1f2] border border-[#fecdd3] relative overflow-hidden">
                <span className="absolute left-0 top-1 bottom-1 w-1 bg-red-600 rounded-r-full" />
                <div className="font-extrabold text-[13px] text-red-600 pl-2">{item.displayNumber}</div>
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100/80 border border-orange-200/80 text-orange-700 text-[11px] font-bold">
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />Your token
                  </span>
                </div>
                <div className="text-right font-black text-[13px] text-red-600">{item.estimatedTime}</div>
              </div>
            );
          }
          const s = statusLabel(item.status);
          return (
            <div key={item.tokenId} className="grid grid-cols-3 items-center px-2 py-1.5 rounded-lg hover:bg-slate-50/70 transition-colors">
              <div className="font-bold text-[13px] text-slate-800">{item.displayNumber}</div>
              <div className="flex items-center gap-1.5">{s.icon}<span className={`text-[12px] font-semibold ${s.cls}`}>{s.text}</span></div>
              <div className="text-right text-[12px] font-medium text-slate-500">{item.estimatedTime}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
