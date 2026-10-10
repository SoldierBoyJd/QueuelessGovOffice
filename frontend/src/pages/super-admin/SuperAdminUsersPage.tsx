import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { officesApi } from '../../services/api/offices';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { toast } from '../../components/ui/Toast';
import { parseApiError } from '../../services/api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Role } from '../../types';

const ROLE_STYLE: Record<Role, string> = {
  CITIZEN:      'bg-slate-50 border-slate-200/80 text-slate-600',
  OFFICER:      'bg-blue-50 border-blue-200/80 text-blue-700',
  OFFICE_ADMIN: 'bg-purple-50 border-purple-200/80 text-purple-700',
  CENTRAL_ADMIN:'bg-amber-50 border-amber-200/80 text-amber-700',
  SUPER_ADMIN:  'bg-red-50 border-red-200/80 text-red-700',
};

export default function SuperAdminUsersPage() {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();
  const me = useAuthStore(st => st.user?.id);
  const { data: filtered = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'users', query, roleFilter],
    queryFn: () => adminApi.users({ ...(query.trim() ? { q: query.trim() } : {}), ...(roleFilter !== 'ALL' ? { role: roleFilter } : {}) }),
    placeholderData: prev => prev,
  });

  const { data: offices = [] } = useQuery({ queryKey: ['offices-all'], queryFn: () => officesApi.list() });
  const officeName = (id?: string) => offices.find(o => o.id === id)?.name;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'OFFICER' as 'OFFICER' | 'OFFICE_ADMIN', officeId: '' });
  const [moving, setMoving] = useState<{ id: string; role: 'OFFICER' | 'OFFICE_ADMIN'; officeId: string } | null>(null);

  const createUser = async () => {
    if (!form.officeId) { toast.error('Select an office'); return; }
    setBusy('create');
    try {
      await adminApi.createStaff(form);
      toast.success('User created');
      setShowForm(false);
      setForm({ fullName: '', email: '', password: '', role: 'OFFICER', officeId: '' });
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (e) {
      toast.error('Could not create user', parseApiError(e).message);
    } finally { setBusy(null); }
  };

  const saveMove = async () => {
    if (!moving || !moving.officeId) { toast.error('Select an office'); return; }
    setBusy(moving.id);
    try {
      await adminApi.changeRole(moving.id, moving.role, moving.officeId);
      toast.success('User updated');
      setMoving(null);
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (e) {
      toast.error('Could not update user', parseApiError(e).message);
    } finally { setBusy(null); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    setBusy(id);
    try {
      await adminApi.setUserActive(id, active);
      toast.success(active ? 'User activated' : 'User deactivated');
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (e) {
      toast.error('Could not update user', parseApiError(e).message);
    } finally {
      setBusy(null);
    }
  };

  const VS_LABEL: Record<string, string> = {
    NOT_REQUIRED: 'N/A', PENDING: 'Pending', UNDER_REVIEW: 'In Review',
    APPROVED: 'Approved', REJECTED: 'Rejected', MORE_INFO_REQUIRED: 'More Info',
  };
  const VS_STYLE: Record<string, string> = {
    NOT_REQUIRED: 'text-slate-400', PENDING: 'text-slate-500',
    UNDER_REVIEW: 'text-amber-600 font-bold', APPROVED: 'text-emerald-600 font-bold',
    REJECTED: 'text-red-600 font-bold', MORE_INFO_REQUIRED: 'text-blue-600 font-bold',
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">User Management</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">{filtered.length} user{filtered.length === 1 ? '' : 's'} shown</p>
      </div>

      <div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-[12.5px] font-bold inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add user
        </button>
        {showForm && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2 bg-white/95 rounded-2xl border border-slate-100 p-4">
            <input placeholder="Full name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-[13px]" />
            <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-[13px]" />
            <input placeholder="Password (min 8)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-[13px]" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'OFFICER' | 'OFFICE_ADMIN' })} className="border border-slate-200 rounded-lg px-3 py-2 text-[13px]">
              <option value="OFFICER">Officer</option>
              <option value="OFFICE_ADMIN">Office Admin</option>
            </select>
            <select value={form.officeId} onChange={e => setForm({ ...form, officeId: e.target.value })} className="border border-slate-200 rounded-lg px-3 py-2 text-[13px]">
              <option value="">Select office…</option>
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button disabled={busy === 'create' || !form.fullName || !form.email || form.password.length < 8} onClick={() => void createUser()}
              className="md:col-span-5 px-3 py-2 rounded-lg bg-slate-900 text-white text-[12.5px] font-bold disabled:opacity-40">Create user</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="liquid-glass-search rounded-xl px-3.5 py-2 flex items-center gap-2.5 flex-1 min-w-[560px]">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or email…"
            className="w-full bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['ALL','CITIZEN','OFFICER','OFFICE_ADMIN','CENTRAL_ADMIN','SUPER_ADMIN'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-xl border text-[11.5px] font-bold transition-all ${roleFilter === r ? 'bg-red-600 border-red-600 text-white' : 'border-slate-200/80 bg-white/90 text-slate-600 hover:bg-slate-50'}`}>
              {r === 'ALL' ? 'All' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-x-auto">
        <div className="grid grid-cols-12 min-w-[560px] px-5 py-3 border-b border-slate-100 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-3">User</div>
          <div className="col-span-2">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Verification</div>
          <div className="col-span-1 text-right">Joined</div>
          <div className="col-span-2 text-right">Access</div>
        </div>
        <div className="divide-y divide-slate-50">
          {isLoading && <LoadingState compact message="Loading users…" />}
          {error && <ErrorState compact message={parseApiError(error).message} onRetry={() => void refetch()} />}
          {filtered.map(u => (
            <div key={u.id} className="grid grid-cols-12 min-w-[560px] items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
              <div className="col-span-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-[11px] font-black flex items-center justify-center flex-shrink-0">{u.avatarInitials}</div>
                <span className="text-[13px] font-bold text-slate-900">{u.name}</span>
              </div>
              <div className="col-span-2 text-[12.5px] text-slate-500 truncate">{u.email}</div>
              <div className="col-span-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${ROLE_STYLE[u.role]}`}>
                  {u.role.replace('_', ' ')}
                </span>
                {officeName(u.officeId) && <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">{officeName(u.officeId)}</div>}
              </div>
              <div className={`col-span-2 text-[12.5px] ${VS_STYLE[u.verificationStatus]}`}>
                {VS_LABEL[u.verificationStatus]}
              </div>
              <div className="col-span-1 text-right text-[12px] text-slate-400">
                {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
              <div className="col-span-2 flex justify-end gap-1.5">
                {(u.role === 'OFFICER' || u.role === 'OFFICE_ADMIN') && (
                  <button onClick={() => setMoving({ id: u.id, role: u.role as 'OFFICER' | 'OFFICE_ADMIN', officeId: u.officeId ?? '' })}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-[10.5px] font-bold text-slate-600 hover:bg-slate-50">Move</button>
                )}
                <button
                  disabled={busy === u.id || u.id === me}
                  onClick={() => void toggleActive(u.id, !u.isActive)}
                  className={`px-2 py-1 rounded-lg border text-[10.5px] font-bold transition-colors disabled:opacity-40 ${u.isActive ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                >
                  {u.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
          {moving && (
            <div className="px-5 py-3 bg-amber-50/60 flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-bold text-slate-700">Change role / office:</span>
              <select value={moving.role} onChange={e => setMoving({ ...moving, role: e.target.value as 'OFFICER' | 'OFFICE_ADMIN' })} className="border border-slate-200 rounded-lg px-2 py-1 text-[12px]">
                <option value="OFFICER">Officer</option>
                <option value="OFFICE_ADMIN">Office Admin</option>
              </select>
              <select value={moving.officeId} onChange={e => setMoving({ ...moving, officeId: e.target.value })} className="border border-slate-200 rounded-lg px-2 py-1 text-[12px]">
                <option value="">Select office…</option>
                {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button onClick={() => void saveMove()} disabled={busy === moving.id} className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[12px] font-bold disabled:opacity-40">Save</button>
              <button onClick={() => setMoving(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-[12px] font-bold text-slate-600">Cancel</button>
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-slate-400">No users match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
