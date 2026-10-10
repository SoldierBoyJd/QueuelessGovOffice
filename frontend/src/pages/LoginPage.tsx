import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SilkBackground } from '../components/SilkBackground';
import { useAuthStore, DEFAULT_ROUTE_FOR_ROLE } from '../stores/authStore';
import { authApi } from '../services/api/auth';
import { parseApiError } from '../services/api/client';

// Accounts created by `backend/scripts/seed_demo.py`. Shown in dev builds only.
const DEMO_PASSWORD = 'DemoPass#2026';
const DEMO_CREDENTIALS = [
  { label: 'Citizen',       email: 'citizen@demo.skiptheline.test' },
  { label: 'Officer',       email: 'officer@demo.skiptheline.test' },
  { label: 'Office Admin',  email: 'admin@demo.skiptheline.test' },
  { label: 'Central Admin', email: 'central@demo.skiptheline.test' },
  { label: 'Super Admin',   email: 'super@demo.skiptheline.test' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async (em: string, pw: string) => {
    setError('');
    setLoading(true);
    try {
      const { user, token } = await authApi.login({ email: em.trim(), password: pw });
      login(user, token);
      navigate(DEFAULT_ROUTE_FOR_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void signIn(email, password);
  };

  const quickLogin = (em: string) => { void signIn(em, DEMO_PASSWORD); };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <SilkBackground />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        {/* Card */}
        <div className="liquid-glass-card rounded-[24px] sm:rounded-[28px] p-5 sm:p-8">
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight mb-1">Sign in</h1>
          <p className="text-[13px] text-slate-500 mb-6">Access your SkipTheLine account.</p>

          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200/80 mb-5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 pr-10 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link to="/forgot-password" className="text-[12px] font-semibold text-red-600 hover:text-red-700">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13.5px] tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(220,38,38,0.25)]"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-[12.5px] text-slate-500 mt-5">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-red-600 hover:text-red-700">
              Create one
            </Link>
          </p>
        </div>

        {/* Demo Quick Login (dev builds only) */}
        {import.meta.env.DEV && <div className="mt-5 liquid-glass-card rounded-[24px] p-5">
          <p className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            Demo — Quick Login
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.email}
                onClick={() => quickLogin(cred.email)}
                disabled={loading}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/80 border border-transparent hover:border-slate-200/80 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center">
                    {cred.label.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="text-[12.5px] font-bold text-slate-800">{cred.label}</div>
                    <div className="text-[11px] text-slate-400">{cred.email}</div>
                  </div>
                </div>
                <span className="text-[11.5px] text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Login →</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3 text-center">Seeded by <span className="font-bold text-slate-600">backend/scripts/seed_demo.py</span></p>
        </div>}
      </div>
    </div>
  );
}
