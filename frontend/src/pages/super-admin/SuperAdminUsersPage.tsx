import { useState } from 'react';
import { Search } from 'lucide-react';
import { DEMO_USERS } from '../../stores/authStore';
import type { Role } from '../../types';

const ROLE_STYLE: Record<Role, string> = {
  CITIZEN:      'bg-slate-50 border-slate-200/80 text-slate-600',
  OFFICER:      'bg-blue-50 border-blue-200/80 text-blue-700',
  OFFICE_ADMIN: 'bg-purple-50 border-purple-200/80 text-purple-700',
  CENTRAL_ADMIN:'bg-amber-50 border-amber-200/80 text-amber-700',
  SUPER_ADMIN:  'bg-red-50 border-red-200/80 text-red-700',
};

const EXTRA_USERS = [
  { id: 'u1', name: 'Rahul Patel',    email: 'rahul.patel@gmail.com',       role: 'CITIZEN' as Role,       verificationStatus: 'NOT_REQUIRED', avatarInitials: 'RP', createdAt: '2026-08-10T00:00:00Z' },
  { id: 'u2', name: 'Sneha Kapoor',   email: 'sneha@gmail.com',             role: 'CITIZEN' as Role,       verificationStatus: 'NOT_REQUIRED', avatarInitials: 'SK', createdAt: '2026-07-22T00:00:00Z' },
  { id: 'u3', name: 'Amit Verma',     email: 'amit.verma@gov.in',           role: 'OFFICER' as Role,       verificationStatus: 'APPROVED',     avatarInitials: 'AV', createdAt: '2025-09-01T00:00:00Z' },
  { id: 'u4', name: 'Deepak Singh',   email: 'deepak.singh@gov.in',         role: 'OFFICER' as Role,       verificationStatus: 'APPROVED',     avatarInitials: 'DS', createdAt: '2025-10-15T00:00:00Z' },
  { id: 'u5', name: 'Kavya Nair',     email: 'kavya.nair@gov.in',           role: 'OFFICER' as Role,       verificationStatus: 'APPROVED',     avatarInitials: 'KN', createdAt: '2025-11-01T00:00:00Z' },
  { id: 'u6', name: 'Arun Mishra',    email: 'arun.mishra@gov.in',          role: 'OFFICER' as Role,       verificationStatus: 'UNDER_REVIEW', avatarInitials: 'AM', createdAt: '2026-09-27T00:00:00Z' },
];

const ALL_USERS = [...Object.values(DEMO_USERS), ...EXTRA_USERS];

export default function SuperAdminUsersPage() {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');

  const filtered = ALL_USERS.filter(u => {
    const q = query.toLowerCase();
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchR = roleFilter === 'ALL' || u.role === roleFilter;
    return matchQ && matchR;
  });

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
        <p className="text-[13px] text-slate-500 mt-0.5">{ALL_USERS.length} registered users</p>
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
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Verification</div>
          <div className="col-span-2 text-right">Joined</div>
        </div>
        <div className="divide-y divide-slate-50">
          {filtered.map(u => (
            <div key={u.id} className="grid grid-cols-12 min-w-[560px] items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
              <div className="col-span-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-[11px] font-black flex items-center justify-center flex-shrink-0">{u.avatarInitials}</div>
                <span className="text-[13px] font-bold text-slate-900">{u.name}</span>
              </div>
              <div className="col-span-3 text-[12.5px] text-slate-500 truncate">{u.email}</div>
              <div className="col-span-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${ROLE_STYLE[u.role]}`}>
                  {u.role.replace('_', ' ')}
                </span>
              </div>
              <div className={`col-span-2 text-[12.5px] ${VS_STYLE[u.verificationStatus]}`}>
                {VS_LABEL[u.verificationStatus]}
              </div>
              <div className="col-span-2 text-right text-[12px] text-slate-400">
                {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-slate-400">No users match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
