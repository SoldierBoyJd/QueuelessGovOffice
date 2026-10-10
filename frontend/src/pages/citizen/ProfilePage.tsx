import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api/auth';
import { parseApiError } from '../../services/api/client';
import { toast } from '../../components/ui/Toast';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({ name: name.trim(), phone: phone.trim() });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast.error('Could not save profile', parseApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[640px] flex flex-col gap-5 mt-1">
      <div>
        <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Profile</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage your account details</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 text-slate-700 text-[24px] font-black flex items-center justify-center shadow-inner">
            {user?.avatarInitials ?? 'JD'}
          </div>
          <div>
            <h3 className="text-[18px] font-black text-slate-900">{user?.name}</h3>
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11.5px] font-semibold border border-slate-200/80">
              <Shield className="w-3 h-3" /> {user?.role?.replace('_', ' ') ?? 'CITIZEN'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { icon: User, label: 'Full name', value: name, type: 'text', onChange: setName, readOnly: false },
            { icon: Mail, label: 'Email address', value: user?.email ?? '', type: 'email', onChange: undefined, readOnly: true },
            { icon: Phone, label: 'Phone number', value: phone, type: 'tel', onChange: setPhone, readOnly: false },
          ].map(f => {
            const Icon = f.icon;
            return (
              <div key={f.label}>
                <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-slate-400" />{f.label}</span>
                </label>
                <input type={f.type} value={f.value} readOnly={f.readOnly} onChange={e => f.onChange?.(e.target.value)}
                  className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
              </div>
            );
          })}
        </div>

        <button onClick={handleSave}
          className="mt-5 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13.5px] transition-colors shadow-[0_4px_12px_rgba(220,38,38,0.2)]">
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Account section */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        {[
          { label: 'Verification status', value: user?.verificationStatus?.replace(/_/g, ' ') ?? 'Not Required' },
          { label: 'Account created', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 cursor-pointer">
            <span className="text-[13px] font-medium text-slate-600">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-slate-900">{item.value}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200/80 bg-red-50/80 text-red-700 font-bold text-[13px] hover:bg-red-100/80 transition-all w-full">
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
