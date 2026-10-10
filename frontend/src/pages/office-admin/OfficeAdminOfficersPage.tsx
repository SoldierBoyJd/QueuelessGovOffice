import { useState } from 'react';
import { useLiveStore } from '../../stores/liveStore';
import { CheckCircle2, Clock, TrendingUp, UserCheck, UserMinus, Search } from 'lucide-react';
import { useMyOffice } from '../../hooks/useMyOffice';
import { useAuthStore } from '../../stores/authStore';
import { adminApi } from '../../services/api/admin';
import { parseApiError } from '../../services/api/client';
import { toast } from '../../components/ui/Toast';

export default function OfficeAdminOfficersPage() {
  const { counters, refresh } = useLiveStore();
  const { data: office } = useMyOffice();
  const officeId = useAuthStore(st => st.user?.officeId);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', counterId: '' });
  const freeCounters = counters.filter(c => !c.officerName && c.status !== 'CLOSED');

  const addOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeId) return;
    setSaving(true);
    try {
      await adminApi.createOfficer({ ...form, officeId, counterId: form.counterId || undefined });
      toast.success('Officer created', `${form.fullName} can now sign in with the password you set.`);
      setShowAdd(false);
      setForm({ fullName: '', email: '', password: '', counterId: '' });
      await refresh();
    } catch (err) {
      toast.error('Could not create officer', parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const officers = counters
    .filter(c => c.officerName)
    .filter(c => !query || c.officerName!.toLowerCase().includes(query.toLowerCase()));

  const activeCount = counters.filter(c => c.status === 'ACTIVE' && c.officerName).length;
  const totalOfficers = counters.filter(c => c.officerName).length;

  const STATUS_STYLE: Record<string, { dot: string; text: string; label: string; bg: string }> = {
    ACTIVE:  { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Active',    bg: 'bg-emerald-50/60'  },
    PAUSED:  { dot: 'bg-amber-500',   text: 'text-amber-600',   label: 'On Break',  bg: 'bg-amber-50/60'    },
    CLOSED:  { dot: 'bg-slate-400',   text: 'text-slate-500',   label: 'Off Duty',  bg: 'bg-slate-50/60'    },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Officers</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{office?.name ?? ''} · {activeCount}/{totalOfficers} on duty</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[12.5px] transition-colors shadow-[0_2px_8px_rgba(220,38,38,0.2)]">
          <UserCheck className="w-4 h-4" /> Add Officer
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Officers', value: totalOfficers, icon: <UserCheck className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'On Duty',        value: activeCount,   icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Off Duty',       value: totalOfficers - activeCount, icon: <UserMinus className="w-4 h-4" />, color: 'text-slate-500', bg: 'bg-slate-50' },
        ].map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center ${m.color} mb-3`}>{m.icon}</div>
            <div className="text-[28px] font-black text-slate-900 leading-none">{m.value}</div>
            <div className="text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide mt-1.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="liquid-glass-search rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search officers…"
          className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
      </div>

      {/* Officer cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {officers.map(c => {
          const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.CLOSED;
          const initials = (c.officerName ?? '??').split(' ').map(n => n[0]).join('').toUpperCase();
          const avgMin = Math.floor((c.avgServiceSeconds ?? 0) / 60);
          const avgSec = (c.avgServiceSeconds ?? 0) % 60;
          return (
            <div key={c.id} className={`bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-700 font-black text-[17px] flex items-center justify-center">{initials}</div>
                  <div>
                    <div className="text-[14px] font-black text-slate-900">{c.officerName}</div>
                    <div className="text-[12px] text-slate-400">{c.name}{c.serviceName ? ` · ${c.serviceName}` : ' · All services'}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 text-[11.5px] font-bold ${s.text}`}>
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
                </div>
              </div>

              <div className={`px-3.5 py-3 rounded-2xl ${s.bg} border border-slate-100 mb-4`}>
                {c.currentTokenDisplay ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Serving</div>
                      <div className="text-[18px] font-black text-slate-900">{c.currentTokenDisplay}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Service</div>
                      <div className="text-[12px] font-bold text-slate-700">{c.serviceName ?? 'All services'}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] text-slate-400 text-center py-0.5">
                    {c.status === 'ACTIVE' ? 'Idle — ready for next token' : 'Not currently serving'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="text-center bg-slate-50/60 rounded-xl p-2.5">
                  <div className="flex items-center justify-center mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></div>
                  <div className="text-[16px] font-black text-slate-900">{c.tokensServedToday}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Served</div>
                </div>
                <div className="text-center bg-slate-50/60 rounded-xl p-2.5">
                  <div className="flex items-center justify-center mb-1"><Clock className="w-3.5 h-3.5 text-blue-500" /></div>
                  <div className="text-[13px] font-black text-slate-900">{c.avgServiceSeconds > 0 ? `${avgMin}m ${avgSec}s` : '—'}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Avg time</div>
                </div>
                <div className="text-center bg-slate-50/60 rounded-xl p-2.5">
                  <div className="flex items-center justify-center mb-1"><TrendingUp className="w-3.5 h-3.5 text-slate-400" /></div>
                  <div className="text-[13px] font-black text-slate-900">{c.tokensServedToday > 0 ? `${Math.round(60 / (c.avgServiceSeconds / 60))}/h` : '—'}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Rate</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={addOfficer} className="bg-white rounded-[24px] p-6 max-w-[420px] w-full shadow-2xl flex flex-col gap-3.5">
            <h3 className="text-[18px] font-black text-slate-900">Add officer</h3>
            <p className="text-[12.5px] text-slate-500 -mt-2">Creates an officer account for {office?.name ?? 'your office'}. Share the initial password securely.</p>
            {([
              { k: 'fullName', label: 'Full name', type: 'text' },
              { k: 'email', label: 'Email', type: 'email' },
              { k: 'password', label: 'Initial password (min. 8 characters)', type: 'password' },
            ] as const).map(f => (
              <label key={f.k} className="block">
                <span className="block text-[12px] font-semibold text-slate-600 mb-1">{f.label}</span>
                <input required type={f.type} value={form[f.k]} minLength={f.k === 'password' ? 8 : 2}
                  onChange={e => setForm(v => ({ ...v, [f.k]: e.target.value }))}
                  className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-800 outline-none font-medium" />
              </label>
            ))}
            <label className="block">
              <span className="block text-[12px] font-semibold text-slate-600 mb-1">Counter (optional)</span>
              <select value={form.counterId} onChange={e => setForm(v => ({ ...v, counterId: e.target.value }))}
                className="w-full liquid-glass-search rounded-xl px-3 py-2.5 text-[13.5px] text-slate-800 outline-none font-medium">
                <option value="">Assign later</option>
                {freeCounters.map(c => <option key={c.id} value={c.id}>{c.name} — {c.serviceName ?? 'All services'}</option>)}
              </select>
            </label>
            <div className="flex gap-3 mt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[13px] hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] disabled:opacity-60">{saving ? 'Creating…' : 'Create officer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
