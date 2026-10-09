import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, Users, Brain, Shield, MapPin, Bell, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { SilkBackground } from '../components/SilkBackground';
import { IndiaEmblem } from '../components/IndiaEmblem';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f4f6fa] font-sans relative overflow-x-hidden">
      <SilkBackground />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-6">
            {['How it Works', 'For Government', 'Responsible AI'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                className="text-[13.5px] font-semibold text-slate-600 hover:text-slate-900 transition-colors">{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-700 hover:bg-slate-100 transition-colors">
              Sign In
            </button>
            <button onClick={() => navigate('/register')}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold transition-colors shadow-[0_2px_8px_rgba(220,38,38,0.2)]">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative max-w-[1200px] mx-auto px-6 pt-20 pb-24 lg:pt-28 lg:pb-32">
        {/* Decorative ribbon */}
        <div className="absolute right-0 top-0 w-[55%] h-[500px] pointer-events-none overflow-hidden opacity-60" style={{ zIndex: 0 }}>
          <svg viewBox="0 0 700 500" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="heroGrad" x1="0" y1="250" x2="700" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0" />
                <stop offset="40%" stopColor="#fb7185" stopOpacity="0.35" />
                <stop offset="75%" stopColor="#e11d48" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#be123c" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="heroSheer" x1="0" y1="200" x2="700" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fda4af" stopOpacity="0" />
                <stop offset="50%" stopColor="#fb7185" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#fda4af" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="heroGlint" x1="0" y1="0" x2="700" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="55%" stopColor="#fff" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fda4af" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path d="M 0,280 C 150,260 300,340 450,320 C 560,305 640,220 700,160 L 700,280 C 640,340 560,420 450,430 C 300,445 150,360 0,280 Z" fill="url(#heroGrad)" />
            <path d="M 0,240 C 140,220 290,295 430,275 C 540,258 630,175 700,110 L 700,190 C 630,252 540,330 430,345 C 290,362 140,280 0,240 Z" fill="url(#heroSheer)" />
            <path d="M 0,268 C 148,248 298,325 448,306 C 558,290 638,204 700,142" stroke="url(#heroGlint)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        <div className="relative z-10 max-w-[680px]">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200/80 text-red-700 text-[12px] font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            AI-Powered Queue Intelligence
          </div>

          <h1 className="text-[48px] lg:text-[64px] font-black text-slate-900 tracking-tight leading-[1.05] mb-5">
            Skip<span className="text-[#dc2626]">the</span>Line
            <span className="block text-[32px] lg:text-[40px] font-black text-slate-700 mt-1">Skip the Queue.</span>
            <span className="block text-[32px] lg:text-[40px] font-black text-[#dc2626]">Reach Your Turn.</span>
          </h1>

          <p className="text-[17px] text-slate-600 leading-relaxed mb-8 max-w-[560px]">
            An AI-powered government queue intelligence and virtual token platform that tells citizens
            <strong className="text-slate-800"> when to arrive</strong> — instead of making them wait.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => navigate('/register')}
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-[15px] transition-all shadow-[0_6px_20px_rgba(220,38,38,0.3)] hover:shadow-[0_8px_28px_rgba(220,38,38,0.38)] hover:-translate-y-0.5">
              Get Your Token <ChevronRight className="w-5 h-5" />
            </button>
            <a href="#how-it-works"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl border-2 border-slate-300 bg-white/80 hover:bg-white text-slate-700 font-bold text-[15px] transition-all hover:-translate-y-0.5">
              How It Works <ArrowRight className="w-4.5 h-4.5" />
            </a>
          </div>

          {/* Live stats strip */}
          <div className="flex items-center gap-6 mt-10 flex-wrap">
            {[
              { value: '4,821', label: 'Offices connected' },
              { value: '38K+',  label: 'Citizens served daily' },
              { value: '27 min',label: 'Avg wait saved' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="text-[22px] font-black text-slate-900">{s.value}</div>
                <div className="text-[12px] text-slate-500 font-medium leading-tight max-w-[70px]">{s.label}</div>
              </div>
            ))}
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full ml-1">DEMO DATA</span>
          </div>
        </div>

        {/* Hero visual — queue flow card */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden xl:block z-10 w-[320px]">
          <div className="bg-white/95 backdrop-blur-md rounded-[28px] border border-slate-200/80 shadow-[0_24px_60px_rgba(0,0,0,0.1)] p-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Your Queue Status</div>
            {/* Queue flow */}
            <div className="space-y-3 mb-5">
              {[
                { step: 'JOIN QUEUE', sub: 'Passport Services', done: true  },
                { step: 'AI PREDICTION', sub: '92% confidence', done: true  },
                { step: 'RECOMMENDED ARRIVAL', sub: '2:27 PM', done: false, active: true },
                { step: 'YOUR TURN', sub: 'Counter 01', done: false },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black ${s.done ? 'bg-emerald-500 text-white' : s.active ? 'bg-red-600 text-white ring-4 ring-red-100' : 'bg-slate-100 text-slate-400'}`}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  {i < 3 && <div className={`absolute left-[35px] w-[1.5px] h-3 ${s.done ? 'bg-emerald-300' : 'bg-slate-200'}`} style={{ marginTop: '26px' }} />}
                  <div>
                    <div className={`text-[12.5px] font-bold ${s.active ? 'text-red-700' : s.done ? 'text-slate-500' : 'text-slate-800'}`}>{s.step}</div>
                    <div className="text-[11px] text-slate-400">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Token display */}
            <div className="bg-[#f8fafc] rounded-2xl border border-slate-200/80 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wide">Your Token</span>
                <span className="text-[10.5px] font-bold text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">WAITING</span>
              </div>
              <div className="text-[40px] font-black text-slate-900 leading-none">A-184</div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <div className="text-[10px] text-slate-400">Estimated turn</div>
                  <div className="text-[16px] font-black text-slate-900">2:42 PM</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Arrive by</div>
                  <div className="text-[16px] font-black text-[#dc2626]">2:27 PM</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ─────────────────────────────────────────────────────── */}
      <section className="bg-[#171717] py-20 px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <div className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-4">The Problem</div>
          <h2 className="text-[32px] lg:text-[44px] font-black text-white leading-tight mb-5">
            Waiting isn't the only problem.
            <span className="block text-[#dc2626]">Not knowing when you'll be served is.</span>
          </h2>
          <p className="text-[16px] text-slate-400 leading-relaxed">
            Citizens arrive early, wait for hours, and still don't know when they'll be called.
            SkipTheLine gives everyone a precise, AI-predicted arrival time — so they can wait from
            anywhere, not in a physical queue.
          </p>
        </div>

        <div className="max-w-[1000px] mx-auto mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { stat: '3.2 hours', label: 'Average time spent at government offices', color: 'text-red-400' },
            { stat: '68%',       label: 'Citizens who arrive without knowing their wait time', color: 'text-amber-400' },
            { stat: '₹480',      label: 'Estimated daily productivity loss per waiting citizen', color: 'text-slate-300' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-[24px] p-6 text-center">
              <div className={`text-[36px] font-black ${s.color} leading-none mb-2`}>{s.stat}</div>
              <div className="text-[13px] text-slate-400 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[12px] font-bold text-red-600 uppercase tracking-widest mb-3">How It Works</div>
            <h2 className="text-[32px] lg:text-[40px] font-black text-slate-900 tracking-tight">Four steps. No waiting in line.</h2>
          </div>

          {/* Route motif */}
          <div className="flex items-start justify-between gap-4 flex-wrap md:flex-nowrap">
            {[
              { n: '01', title: 'Choose a Service', desc: 'Find your nearest government office and select the service you need. See live queue conditions before joining.', icon: <MapPin className="w-6 h-6" /> },
              { n: '02', title: 'Join Remotely',    desc: 'Take a virtual token from anywhere. No need to be physically present in the queue.', icon: <Users className="w-6 h-6" /> },
              { n: '03', title: 'Get AI ETA',       desc: 'Our AI model predicts your estimated turn time and tells you exactly when to leave home.', icon: <Brain className="w-6 h-6" /> },
              { n: '04', title: 'Arrive & Be Served',desc: 'Arrive near your predicted turn. Walk in and get served — no waiting, no uncertainty.', icon: <CheckCircle2 className="w-6 h-6" /> },
            ].map((s, i) => (
              <div key={s.n} className="flex-1 min-w-[220px] relative">
                <div className="bg-white/95 rounded-[24px] border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center flex-shrink-0">{s.icon}</div>
                    <span className="text-[13px] font-black text-slate-300">{s.n}</span>
                  </div>
                  <h3 className="text-[15px] font-black text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-6 h-6">
                    <ArrowRight className="w-4 h-4 text-red-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Government ───────────────────────────────────────────────── */}
      <section id="for-government" className="py-20 px-6 bg-[#f1efeb]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[12px] font-bold text-red-600 uppercase tracking-widest mb-3">For Government</div>
            <h2 className="text-[32px] lg:text-[40px] font-black text-slate-900 tracking-tight">Queue intelligence for every role.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { role: 'Citizens',         icon: <Users className="w-5 h-5" />,  color: 'bg-blue-50 text-blue-600',    points: ['Virtual tokens', 'AI ETA', 'Live updates', 'Track from anywhere'] },
              { role: 'Officers',         icon: <Clock className="w-5 h-5" />,  color: 'bg-emerald-50 text-emerald-600', points: ['Call next token', 'Complete / Hold / No-show', 'Counter management', 'Queue visibility'] },
              { role: 'Office Admins',    icon: <Brain className="w-5 h-5" />,  color: 'bg-amber-50 text-amber-600',  points: ['Live counter status', 'Congestion forecast', 'Analytics', 'Verification copilot'] },
              { role: 'Central Govt',     icon: <MapPin className="w-5 h-5" />, color: 'bg-red-50 text-red-600',      points: ['National overview', 'State/district drilldown', 'Congestion alerts', 'Regional analytics'] },
            ].map(r => (
              <div key={r.role} className="bg-white/95 rounded-[24px] border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5">
                <div className={`w-9 h-9 rounded-xl ${r.color} flex items-center justify-center mb-3`}>{r.icon}</div>
                <h3 className="text-[14.5px] font-black text-slate-900 mb-3">{r.role}</h3>
                <ul className="space-y-1.5">
                  {r.points.map(p => (
                    <li key={p} className="flex items-center gap-2 text-[12.5px] text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Responsible AI ───────────────────────────────────────────────── */}
      <section id="responsible-ai" className="py-20 px-6">
        <div className="max-w-[900px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[12px] font-bold text-red-600 uppercase tracking-widest mb-3">Responsible AI</div>
            <h2 className="text-[32px] lg:text-[40px] font-black text-slate-900 tracking-tight mb-4">AI that assists. Humans that decide.</h2>
            <p className="text-[15px] text-slate-500 leading-relaxed">
              SkipTheLine's AI predicts wait times and detects congestion — but every critical decision
              is made by a human. Our Verification Copilot surfaces AI findings, but approval or
              rejection is always the verifier's call.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <Brain className="w-5 h-5" />, title: 'Predictive, not prescriptive', desc: 'AI provides estimates and probabilities. It does not override human judgment.' },
              { icon: <Shield className="w-5 h-5" />, title: 'Human-in-the-loop',            desc: 'Verification, counter management, and all governance decisions require human authorisation.' },
              { icon: <Bell className="w-5 h-5" />, title: 'Transparent confidence',          desc: 'Every AI prediction shows its confidence level and expected range so users understand the uncertainty.' },
            ].map(f => (
              <div key={f.title} className="bg-white/95 rounded-[24px] border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-center mb-3">{f.icon}</div>
                <h3 className="text-[14px] font-black text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-[12.5px] text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="bg-[#171717] py-24 px-6">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="text-[36px] lg:text-[48px] font-black text-white leading-tight mb-5">
            Ready to skip the line?
          </h2>
          <p className="text-[15px] text-slate-400 mb-8">
            Join thousands of citizens and government offices already using SkipTheLine across India.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={() => navigate('/register')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-[15px] transition-all shadow-[0_6px_24px_rgba(220,38,38,0.35)] hover:-translate-y-0.5">
              Get Your Token <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-bold text-[15px] hover:bg-white/10 transition-all">
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#111111] px-6 py-10 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Logo dark />
          </div>
          <div className="flex items-center gap-3">
            <IndiaEmblem className="w-8 h-12 opacity-50" />
            <p className="text-[12px] text-slate-500">Government Services for a Better Tomorrow.</p>
          </div>
          <p className="text-[12px] text-slate-600">© 2026 SkipTheLine. Hackathon Demo.</p>
        </div>
      </footer>
    </div>
  );
}
