import { useLiveStore } from '../../stores/liveStore';
import { CheckCircle2, Clock, Hash } from 'lucide-react';
import { useMyOffice } from '../../hooks/useMyOffice';
import { useAuthStore } from '../../stores/authStore';

export default function OfficerOfficersPage() {
  const { counters } = useLiveStore();
  const { data: office } = useMyOffice();
  const myCounterId = useAuthStore(st => st.user?.counterId);
  const officers = counters.filter(c => c.officerName);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Officers On Duty</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{office?.name ?? ''} · {officers.length} officers assigned</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {officers.map(c => {
          const initials = (c.officerName ?? '??').split(' ').map(n => n[0]).join('').toUpperCase();
          const statusColor = c.status === 'ACTIVE' ? 'bg-emerald-500' : c.status === 'PAUSED' ? 'bg-amber-500' : 'bg-slate-400';
          const statusText  = c.status === 'ACTIVE' ? 'text-emerald-600' : c.status === 'PAUSED' ? 'text-amber-600' : 'text-slate-500';
          const statusLabel = c.status === 'ACTIVE' ? 'Active' : c.status === 'PAUSED' ? 'Paused' : 'Off duty';
          const isMe = c.id === myCounterId;
          const avgMin = Math.floor((c.avgServiceSeconds ?? 0) / 60);
          const avgSec = (c.avgServiceSeconds ?? 0) % 60;

          return (
            <div key={c.id}
              className={`bg-white/95 backdrop-blur-md rounded-[24px] border shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 ${isMe ? 'border-l-4 border-l-red-500 border-y border-r border-slate-100/90' : 'border-slate-100/90'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-slate-200 text-slate-700 font-black text-[15px] flex items-center justify-center flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <div className="text-[14px] font-black text-slate-900">
                      {c.officerName}
                      {isMe && <span className="ml-2 text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">YOU</span>}
                    </div>
                    <div className="text-[12px] text-slate-400 mt-0.5">{c.name} · {c.serviceName ?? 'All services'}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 text-[11.5px] font-bold ${statusText}`}>
                  <span className={`w-2 h-2 rounded-full ${statusColor}`} />{statusLabel}
                </div>
              </div>

              {/* Current */}
              <div className="px-3.5 py-3 rounded-2xl bg-slate-50/80 border border-slate-100 mb-4">
                {c.currentTokenDisplay ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide">Serving</div>
                      <div className="text-[18px] font-black text-slate-900">{c.currentTokenDisplay}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-slate-400 text-center py-1">{c.status === 'ACTIVE' ? 'Idle — awaiting next token' : 'Not serving'}</p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center bg-slate-50/60 rounded-xl p-2">
                  <div className="flex items-center justify-center mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></div>
                  <div className="text-[15px] font-black text-slate-900">{c.tokensServedToday}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Served</div>
                </div>
                <div className="text-center bg-slate-50/60 rounded-xl p-2">
                  <div className="flex items-center justify-center mb-1"><Clock className="w-3.5 h-3.5 text-blue-500" /></div>
                  <div className="text-[12px] font-black text-slate-900">{c.avgServiceSeconds > 0 ? `${avgMin}m ${avgSec}s` : '—'}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Avg</div>
                </div>
                <div className="text-center bg-slate-50/60 rounded-xl p-2">
                  <div className="flex items-center justify-center mb-1"><Hash className="w-3.5 h-3.5 text-slate-400" /></div>
                  <div className="text-[15px] font-black text-slate-900">{c.name.replace('Counter ', '')}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Counter</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
