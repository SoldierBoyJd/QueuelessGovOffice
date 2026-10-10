import { useState } from 'react';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { parseApiError } from '../../services/api/client';

const TYPE_STYLE: Record<string, string> = {
  SYSTEM: 'bg-slate-50 border-slate-200/80 text-slate-500',
  HUMAN:  'bg-blue-50 border-blue-200/80 text-blue-700',
  AI:     'bg-purple-50 border-purple-200/80 text-purple-700',
};

export default function SuperAdminAuditPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => adminApi.auditLogs(),
    refetchInterval: 30_000,
  });
  const logs = (data?.items ?? []).map(l => ({ id: l.id, ts: l.timestamp, actor: l.actor, action: l.action.replace(/_/g, ' ').toLowerCase(), resource: l.detail ?? '', type: l.type }));

  const filtered = logs.filter(l => {
    const q = query.toLowerCase();
    const matchQ = !q || l.actor.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.resource.toLowerCase().includes(q);
    const matchT = typeFilter === 'ALL' || l.type === typeFilter;
    return matchQ && matchT;
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Audit Logs</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Platform activity and change history</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="liquid-glass-search rounded-xl px-3.5 py-2 flex items-center gap-2.5 flex-1 min-w-[560px]">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search actors, actions, resources…"
            className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL','HUMAN','SYSTEM'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl border text-[11.5px] font-bold transition-all ${typeFilter === t ? 'bg-red-600 border-red-600 text-white' : 'border-slate-200/80 bg-white/90 text-slate-600 hover:bg-slate-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-x-auto">
        <div className="grid grid-cols-12 min-w-[560px] px-5 py-3 border-b border-slate-100 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-2">Time</div>
          <div className="col-span-3">Actor</div>
          <div className="col-span-4">Action</div>
          <div className="col-span-2">Detail</div>
          <div className="col-span-1 text-right">Type</div>
        </div>
        <div className="divide-y divide-slate-50">
          {isLoading && <LoadingState compact message="Loading audit log…" />}
          {error && <ErrorState compact message={parseApiError(error).message} onRetry={() => void refetch()} />}
          {filtered.map(l => (
            <div key={l.id} className="grid grid-cols-12 min-w-[560px] items-center px-5 py-3 hover:bg-slate-50/50 transition-colors">
              <div className="col-span-2 text-[11.5px] text-slate-400 font-medium">
                {new Date(l.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                <div className="text-[10.5px] text-slate-300">{new Date(l.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
              </div>
              <div className="col-span-3 text-[12px] font-semibold text-slate-700 truncate">{l.actor}</div>
              <div className="col-span-4 text-[12.5px] text-slate-800 capitalize">{l.action}</div>
              <div className="col-span-2 text-[11px] text-slate-400 font-mono truncate" title={l.resource}>{l.resource}</div>
              <div className="col-span-1 flex justify-end">
                <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${TYPE_STYLE[l.type] ?? TYPE_STYLE.SYS}`}>{l.type}</span>
              </div>
            </div>
          ))}
          {!isLoading && !error && filtered.length === 0 && <div className="px-5 py-10 text-center text-[13px] text-slate-400">No logs match.</div>}
        </div>
      </div>
    </div>
  );
}
