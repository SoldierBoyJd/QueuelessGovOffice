import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SilkBackground } from '../components/SilkBackground';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // The API has no self-service reset yet, so we do not pretend an email was sent.
    setLoading(true);
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      <SilkBackground />
      <div className="w-full max-w-[400px] relative z-10">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="liquid-glass-card rounded-[24px] sm:rounded-[28px] p-5 sm:p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-[20px] font-black text-slate-900 mb-2">Reset isn't available online yet</h1>
              <p className="text-[13px] text-slate-500 mb-6">Self-service password reset is not enabled. No email was sent to <strong className="text-slate-700">{email}</strong>. Please contact your office administrator to have your password reset.</p>
              <Link to="/login" className="block w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13.5px] text-center transition-colors">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-red-600" />
              </div>
              <h1 className="text-[22px] font-black text-slate-900 tracking-tight mb-1">Reset password</h1>
              <p className="text-[13px] text-slate-500 mb-6">Enter your account email. We'll send a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13.5px] transition-colors disabled:opacity-60 shadow-[0_4px_12px_rgba(220,38,38,0.25)]">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-[12.5px] text-slate-500 mt-5">
                <Link to="/login" className="font-semibold text-red-600 hover:text-red-700">← Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
