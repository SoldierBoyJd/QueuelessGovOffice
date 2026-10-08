import { useState } from 'react';
import { CheckCircle2, PauseCircle, UserX, ChevronRight, Clock, Users, TrendingUp, Hash } from 'lucide-react';
import { useDemoStore } from '../../stores/demoStore';
import { useAuthStore } from '../../stores/authStore';

export default function OfficerDashboardPage() {
  const { user } = useAuthStore();
  const {
    queue, counters,
    completeCurrentToken, holdCurrentToken, noShowCurrentToken, callNextToken,
  } = useDemoStore();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // My counter (officer is assigned to ctr-001)
  const myCounter = counters.find(c => c.id === 'ctr-001') ?? counters[0];
  const currentToken = queue.tokens.find(t => t.tokenId === myCounter?.currentTokenId || t.status === 'SERVING');
  const waitingTokens = queue.tokens.filter(t => t.status === 'WAITING');
  const nextTokens = waitingTokens.slice(0, 5);

  const doAction = async (key: string, fn: () => void) => {
    setActionLoading(key);
    await new Promise(r => setTimeout(r, 500));
    fn();
    setActionLoading(null);
  };

  const statusStyle = {
    ACTIVE: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
    PAUSED: 'text-amber-600 bg-amber-50 border-amber-200/80',
    CLOSED: 'text-slate-500 bg-slate-50 border-slate-200/80',
    BREAK:  'text-blue-600 bg-blue-50 border-blue-200/80',
  }[myCounter?.status ?? 'ACTIVE'];

  const tokenStatusStyle: Record<string, string> = {
    COMPLETED: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
    SERVING:   'text-blue-600 bg-blue-50 border-blue-200/60',
    WAITING:   'text-slate-500 bg-slate-50 border-slate-200/60',
    HOLD:      'text-amber-600 bg-amber-50 border-amber-200/60',
    NO_SHOW:   'text-red-600 bg-red-50 border-red-200/60',
    CALLED:    'text-purple-600 bg-purple-50 border-purple-200/60',
  };

  const avgMin = Math.floor(myCounter?.avgServiceSeconds / 60 ?? 0);
  const avgSec = (myCounter?.avgServiceSeconds ?? 0) % 60;

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Officer Dashboard</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {user?.name} · {myCounter?.name ?? 'Counter 01'} · Rajkot District Office
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full border text-[12px] font-bold flex items-center gap-1.5 ${statusStyle}`}>
          <span className="w-2 h-2 rounded-full bg-current" />
          {myCounter?.status ?? 'ACTIVE'}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Waiting',   value: queue.totalWaiting,   icon: <Users className="w-4 h-4" />,     color: 'text-amber-600' },
          { label: 'Serving',   value: queue.totalServing,    icon: <Hash className="w-4 h-4" />,      color: 'text-blue-600' },
          { label: 'Completed', value: queue.totalCompleted,  icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600' },
          { label: 'Avg service', value: `${avgMin}m ${avgSec}s`, icon: <Clock className="w-4 h-4" />, color: 'text-slate-600' },
        ].map(s => (
          <div key={s.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4">
            <div className={`flex items-center gap-1.5 ${s.color} mb-2`}>
              {s.icon}
              <span className="text-[11.5px] font-bold uppercase tracking-wide">{s.label}</span>
            </div>
            <div className="text-[28px] font-black text-slate-900 tracking-tight">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Current token — left 7 cols */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Currently serving */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border-l-4 border-l-red-500 border-y border-r border-slate-100/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
            <div className="text-[11.5px] font-bold text-slate-400 uppercase tracking-widest mb-4">Currently Serving</div>

            {currentToken ? (
              <>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="text-[48px] font-black text-slate-900 tracking-tight leading-none">{currentToken.displayNumber}</div>
                    <div className="text-[14px] font-bold text-slate-600 mt-1.5">{currentToken.citizenName}</div>
                    <div className="text-[12.5px] text-slate-400 mt-0.5">{currentToken.serviceName ?? 'Passport Services'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 font-medium">Counter</div>
                    <div className="text-[18px] font-black text-slate-900">{myCounter?.name}</div>
                    <div className="text-[11.5px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />Service in progress
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => doAction('complete', completeCurrentToken)}
                    disabled={actionLoading !== null}
                    className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] transition-all shadow-[0_4px_12px_rgba(34,197,94,0.25)] disabled:opacity-50 group"
                  >
                    <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {actionLoading === 'complete' ? 'Processing…' : 'COMPLETE'}
                  </button>
                  <button
                    onClick={() => doAction('hold', holdCurrentToken)}
                    disabled={actionLoading !== null}
                    className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[13px] transition-all shadow-[0_4px_12px_rgba(245,158,11,0.25)] disabled:opacity-50 group"
                  >
                    <PauseCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {actionLoading === 'hold' ? 'Processing…' : 'HOLD'}
                  </button>
                  <button
                    onClick={() => doAction('noshow', noShowCurrentToken)}
                    disabled={actionLoading !== null}
                    className="flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[13px] transition-all disabled:opacity-50 group"
                  >
                    <UserX className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {actionLoading === 'noshow' ? 'Processing…' : 'NO-SHOW'}
                  </button>
                </div>

                <button
                  onClick={() => doAction('next', callNextToken)}
                  disabled={actionLoading !== null || waitingTokens.length === 0}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[13px] transition-colors disabled:opacity-40"
                >
                  Call Next Token <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-[14px] font-bold text-slate-600 mb-1">No token currently serving</div>
                <p className="text-[12.5px] text-slate-400 mb-4">Click below to call the next token from the queue.</p>
                <button
                  onClick={() => doAction('next', callNextToken)}
                  disabled={waitingTokens.length === 0}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13.5px] transition-colors shadow-[0_4px_12px_rgba(220,38,38,0.2)] disabled:opacity-40"
                >
                  Call Next Token
                </button>
              </div>
            )}
          </div>

          {/* Full queue table */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14.5px] font-bold text-slate-900">Current Queue</h3>
              <span className="text-[12px] text-slate-400 font-medium">{queue.totalWaiting} waiting</span>
            </div>
            <div className="grid grid-cols-12 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide px-2 py-2 border-b border-slate-100">
              <div className="col-span-2">Token</div>
              <div className="col-span-4">Citizen</div>
              <div className="col-span-3">Service</div>
              <div className="col-span-2">Wait</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            <div className="divide-y divide-slate-50 mt-1">
              {queue.tokens.slice(0, 10).map(t => (
                <div key={t.tokenId} className={`grid grid-cols-12 items-center px-2 py-2.5 rounded-lg hover:bg-slate-50/60 transition-colors ${t.isCurrentUser ? 'bg-red-50/40' : ''}`}>
                  <div className={`col-span-2 font-black text-[13px] ${t.isCurrentUser ? 'text-red-600' : 'text-slate-900'}`}>{t.displayNumber}</div>
                  <div className="col-span-4 text-[12.5px] font-medium text-slate-700">{t.citizenName ?? '—'}</div>
                  <div className="col-span-3 text-[12px] text-slate-500">{t.serviceName ?? 'Passport Services'}</div>
                  <div className="col-span-2 text-[12px] text-slate-500">{t.waitMinutes ? `${t.waitMinutes}m` : '—'}</div>
                  <div className="col-span-1 flex justify-end">
                    <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${tokenStatusStyle[t.status] ?? tokenStatusStyle.WAITING}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — next tokens + counters */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Next up */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-3">Next in Queue</h3>
            <div className="space-y-2">
              {nextTokens.length === 0 ? (
                <p className="text-[12.5px] text-slate-400 text-center py-4">Queue is empty.</p>
              ) : nextTokens.map((t, i) => (
                <div key={t.tokenId} className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-colors ${i === 0 ? 'bg-red-50/60 border border-red-200/60' : 'hover:bg-slate-50/60'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[13px] font-black ${i === 0 ? 'text-red-600' : 'text-slate-500'}`}>#{i + 1}</span>
                    <div>
                      <div className={`text-[14px] font-black ${i === 0 ? 'text-red-700' : 'text-slate-800'}`}>{t.displayNumber}</div>
                      <div className="text-[11.5px] text-slate-400">{t.citizenName} · {t.serviceName ?? 'Passport Services'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] font-bold text-slate-700">{t.estimatedTime}</div>
                    <div className="text-[11px] text-slate-400">{t.waitMinutes}m wait</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Counters overview */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-3">Counter Overview</h3>
            <div className="space-y-2">
              {counters.slice(0, 6).map(c => {
                const s = { ACTIVE: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active' }, PAUSED: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'Paused' }, CLOSED: { dot: 'bg-slate-400', text: 'text-slate-500', label: 'Closed' }, BREAK: { dot: 'bg-blue-400', text: 'text-blue-500', label: 'Break' } }[c.status] ?? { dot: 'bg-slate-400', text: 'text-slate-500', label: c.status };
                const isMe = c.id === 'ctr-001';
                return (
                  <div key={c.id} className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl ${isMe ? 'bg-red-50/50 border border-red-200/50' : 'hover:bg-slate-50/60'} transition-colors`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      <div>
                        <span className={`text-[13px] font-bold ${isMe ? 'text-red-700' : 'text-slate-800'}`}>{c.name}</span>
                        {isMe && <span className="ml-2 text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">YOU</span>}
                        {c.officerName && <div className="text-[11px] text-slate-400">{c.officerName}</div>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11.5px] font-bold ${s.text}`}>{s.label}</span>
                      {c.currentTokenDisplay && <div className="text-[11px] text-slate-400">→ {c.currentTokenDisplay}</div>}
                      {!c.currentTokenDisplay && c.status === 'ACTIVE' && <div className="text-[11px] text-slate-400">Idle</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Productivity */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-3">My Stats Today</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Served', value: myCounter?.tokensServedToday ?? 22, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                { label: 'Avg time', value: `${avgMin}m ${avgSec}s`, icon: <Clock className="w-4 h-4 text-blue-500" /> },
                { label: 'No-shows', value: queue.totalNoShow, icon: <UserX className="w-4 h-4 text-red-500" /> },
                { label: 'Throughput', value: `${myCounter?.tokensServedToday ?? 22}/day`, icon: <TrendingUp className="w-4 h-4 text-slate-500" /> },
              ].map(s => (
                <div key={s.label} className="bg-slate-50/80 rounded-2xl p-3 flex items-center gap-2.5">
                  {s.icon}
                  <div>
                    <div className="text-[10.5px] text-slate-400 font-semibold">{s.label}</div>
                    <div className="text-[15px] font-black text-slate-900">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
