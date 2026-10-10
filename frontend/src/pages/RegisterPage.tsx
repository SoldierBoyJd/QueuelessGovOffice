import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SilkBackground } from '../components/SilkBackground';
import { useAuthStore, DEFAULT_ROUTE_FOR_ROLE } from '../stores/authStore';
import { authApi } from '../services/api/auth';
import { parseApiError } from '../services/api/client';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await authApi.register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      // Registration does not sign in; do it now with the credentials just created.
      const { user, token } = await authApi.login({ email: form.email, password: form.password });
      login(user, token);
      navigate(DEFAULT_ROUTE_FOR_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <SilkBackground />
      <div className="w-full max-w-[440px] relative z-10">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="liquid-glass-card rounded-[24px] sm:rounded-[28px] p-5 sm:p-8">
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight mb-1">Create account</h1>
          <p className="text-[13px] text-slate-500 mb-6">Citizens can register directly. Government roles require verification.</p>

          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200/80 mb-5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Full name', type: 'text', placeholder: 'Your full name' },
              { key: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com' },
              { key: 'phone', label: 'Phone number', type: 'tel', placeholder: '+91 98765 43210' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">{f.label}</label>
                <input type={f.type} value={form[f.key as keyof typeof form]}
                  onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} required={f.key !== 'phone'}
                  className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
              </div>
            ))}
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Min. 8 characters" required
                  className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 pr-10 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Confirm password</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="Repeat password" required
                className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
            </div>

            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-blue-700">This account will be registered as a <strong>Citizen</strong>. Government officer and admin roles require separate verification through your office.</p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13.5px] tracking-wide transition-colors disabled:opacity-60 shadow-[0_4px_12px_rgba(220,38,38,0.25)]">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-[12.5px] text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-red-600 hover:text-red-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
