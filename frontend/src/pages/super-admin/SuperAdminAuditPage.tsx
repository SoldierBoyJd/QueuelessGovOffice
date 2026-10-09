import { useState } from 'react';
import { Search } from 'lucide-react';

const AUDIT_LOGS = [
  { id: 'a1',  ts: '2026-09-29T08:58:00Z', actor: 'admin@skiptheline.gov.in', action: 'Logged in',                              resource: 'Auth',         type: 'AUTH' },
  { id: 'a2',  ts: '2026-09-29T08:55:00Z', actor: 'AI Copilot v1',            action: 'Document analysis complete',              resource: 'Verification', type: 'AI'   },
  { id: 'a3',  ts: '2026-09-29T08:50:00Z', actor: 'aditi.mehta@gov.in',       action: 'Counter 03 paused',                       resource: 'Counter',      type: 'ADMIN'},
  { id: 'a4',  ts: '2026-09-29T08:48:00Z', actor: 'System',                   action: 'ETA recalculated for tok-184',            resource: 'Queue',        type: 'SYS'  },
  { id: 'a5',  ts: '2026-09-29T08:40:00Z', actor: 'priya.sharma@gov.in',      action: 'Token A-183 completed',                   resource: 'Token',        type: 'OPER' },
  { id: 'a6',  ts: '2026-09-29T08:35:00Z', actor: 'System',                   action: 'WebSocket reconnected — 1284 clients',    resource: 'WebSocket',    type: 'SYS'  },
  { id: 'a7',  ts: '2026-09-29T08:24:00Z', actor: 'jainam.doshi@gmail.com',   action: 'Token A-184 created',                     resource: 'Token',        type: 'USER' },
  { id: 'a8',  ts: '2026-09-29T08:10:00Z', actor: 'aditi.mehta@gov.in',       action: 'Verification application reviewed',       resource: 'Verification', type: 'ADMIN'},
  { id: 'a9',  ts: '2026-09-29T08:00:00Z', actor: 'System',                   action: 'Office open — Rajkot District Office',    resource: 'Office',       type: 'SYS'  },
  { id: 'a10', ts: '2026-09-28T17:30:00Z', actor: 'admin@skiptheline.gov.in', action: 'Feature flag sms_notifications disabled', resource: 'Config',       type: 'AUTH' },
  { id: 'a11', ts: '2026-09-28T16:00:00Z', actor: 'vikram.nair@nic.in',       action: 'Central analytics report exported',       resource: 'Analytics',    type: 'ADMIN'},
  { id: 'a12', ts: '2026-09-28T14:00:00Z', actor: 'rahul.patel@gmail.com',    action: 'Verification application submitted',      resource: 'Verification', type: 'USER' },
];

const TYPE_STYLE: Record<string, string> = {
  AUTH:  'bg-red-50 border-red-200/80 text-red-700',
  AI:    'bg-purple-50 border-purple-200/80 text-purple-700',
  ADMIN: 'bg-amber-50 border-amber-200/80 text-amber-700',
  SYS:   'bg-slate-50 border-slate-200/80 text-slate-500',
  OPER:  'bg-blue-50 border-blue-200/80 text-blue-700',
  USER:  'bg-emerald-50 border-emerald-200/80 text-emerald-700',
};

export default function SuperAdminAuditPage() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filtered = AUDIT_LOGS.filter(l => {
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
        <div className="liquid-glass-search rounded-xl px-3.5 py-2 flex items-center gap-2.5 flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search actors, actions, resources…"
            className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL','AUTH','AI','ADMIN','SYS','OPER','USER'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl border text-[11.5px] font-bold transition-all ${typeFilter === t ? 'bg-red-600 border-red-600 text-white' : 'border-slate-200/80 bg-white/90 text-slate-600 hover:bg-slate-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-2">Time</div>
          <div className="col-span-3">Actor</div>
          <div className="col-span-4">Action</div>
          <div className="col-span-2">Resource</div>
          <div className="col-span-1 text-right">Type</div>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map(l => (
            <div key={l.id} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-slate-50/50 transition-colors">
              <div className="col-span-2 text-[11.5px] text-slate-400 font-medium">
                {new Date(l.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                <div className="text-[10.5px] text-slate-300">{new Date(l.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
              </div>
              <div className="col-span-3 text-[12px] font-semibold text-slate-700 truncate">{l.actor}</div>
              <div className="col-span-4 text-[12.5px] text-slate-800">{l.action}</div>
              <div className="col-span-2 text-[12px] text-slate-500 font-medium">{l.resource}</div>
              <div className="col-span-1 flex justify-end">
                <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${TYPE_STYLE[l.type] ?? TYPE_STYLE.SYS}`}>{l.type}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="px-5 py-10 text-center text-[13px] text-slate-400">No logs match.</div>}
        </div>
      </div>
    </div>
  );
}
