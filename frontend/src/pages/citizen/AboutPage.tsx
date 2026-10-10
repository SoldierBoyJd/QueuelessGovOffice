import { useNavigate } from 'react-router-dom';
import { Brain, Shield, Clock, CheckCircle2, ChevronRight, Zap, Map } from 'lucide-react';

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-5 mt-1 max-w-[860px] mx-auto w-full">
      {/* Hero */}
      <div className="bg-white/95 backdrop-blur-md rounded-[28px] border-l-4 border-l-red-500 border-y border-r border-slate-100/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-7">
        <div className="text-[11.5px] font-bold text-red-600 uppercase tracking-widest mb-2">About</div>
        <h1 className="text-[30px] font-black text-slate-900 tracking-tight leading-tight">SkipTheLine</h1>
        <p className="text-[16px] font-bold text-slate-600 mt-1">Skip the Queue. Reach Your Turn.</p>
        <p className="text-[14px] text-slate-500 leading-relaxed mt-3 max-w-[620px]">
          SkipTheLine is an AI-powered government queue intelligence and virtual token platform that tells citizens
          <strong className="text-slate-700"> when to arrive</strong> — instead of making them physically wait in line.
        </p>
        <button onClick={() => navigate('/citizen/offices')}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[13.5px] rounded-xl transition-colors shadow-[0_2px_8px_rgba(220,38,38,0.2)] w-fit">
          Find a Service <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mission */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
        <h2 className="text-[18px] font-black text-slate-900 mb-3">The Problem We Solve</h2>
        <p className="text-[13.5px] text-slate-600 leading-relaxed mb-4">
          Millions of citizens visit government offices every day — and spend hours waiting without knowing when they'll be served.
          The wait itself isn't the only problem. <strong className="text-slate-800">Not knowing when you'll be called</strong> forces people
          to stay physically present when they could be productive elsewhere.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: '3.2 hrs', label: 'Average time at a government office', color: 'text-red-600' },
            { value: '68%',     label: 'Citizens who arrive without ETA info', color: 'text-amber-600' },
            { value: '₹480',    label: 'Daily productivity loss per citizen',  color: 'text-slate-700' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50/80 rounded-2xl p-4 text-center">
              <div className={`text-[28px] font-black leading-none mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-[11.5px] text-slate-500 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
        <h2 className="text-[18px] font-black text-slate-900 mb-4">How SkipTheLine Works</h2>
        <div className="space-y-4">
          {[
            { n: '01', icon: <Map className="w-5 h-5" />,          title: 'Find your office',          desc: 'Search for nearby government offices. See live queue conditions and estimated wait times before joining.' },
            { n: '02', icon: <Zap className="w-5 h-5" />,          title: 'Take a virtual token',      desc: 'Join the queue remotely from anywhere. No physical presence required — you get a digital queue position.' },
            { n: '03', icon: <Brain className="w-5 h-5" />,        title: 'Get an AI-predicted ETA',   desc: 'Our model predicts your estimated turn time with confidence intervals. It tells you exactly when to leave home.' },
            { n: '04', icon: <CheckCircle2 className="w-5 h-5" />, title: 'Arrive near your turn',     desc: 'Walk in close to your predicted time and get served — no long waits, no uncertainty.' },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center flex-shrink-0">{s.icon}</div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10.5px] font-black text-slate-300">{s.n}</span>
                  <h3 className="text-[14px] font-black text-slate-900">{s.title}</h3>
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Responsible AI */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
        <h2 className="text-[18px] font-black text-slate-900 mb-4">Responsible AI</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Brain className="w-5 h-5" />,   title: 'Predictive, not prescriptive', desc: 'AI provides time estimates and probabilities. It never overrides human judgment or operational decisions.' },
            { icon: <Shield className="w-5 h-5" />,  title: 'Human-in-the-loop',            desc: 'Verification, counter management, and all governance decisions require human authorisation. AI only assists.' },
            { icon: <Clock className="w-5 h-5" />,   title: 'Transparent confidence',       desc: 'Every prediction shows its confidence level and expected range so you understand the uncertainty.' },
          ].map(f => (
            <div key={f.title} className="bg-slate-50/80 rounded-2xl p-4">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-600 flex items-center justify-center mb-3">{f.icon}</div>
              <h3 className="text-[13.5px] font-black text-slate-900 mb-1">{f.title}</h3>
              <p className="text-[12px] text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* For Government */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6">
        <h2 className="text-[18px] font-black text-slate-900 mb-4">Built for Every Role</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { role: 'Citizens',      points: ['Virtual tokens', 'AI ETA', 'Live updates'],            color: 'bg-blue-50 text-blue-700 border-blue-200/80'    },
            { role: 'Officers',      points: ['Queue controls', 'Call/Complete/Hold', 'Counter view'], color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
            { role: 'Office Admins', points: ['Counter mgmt', 'AI forecast', 'Analytics'],            color: 'bg-amber-50 text-amber-700 border-amber-200/80'   },
            { role: 'Central Govt', points: ['National map', 'Congestion alerts', 'Drilldown'],        color: 'bg-red-50 text-red-700 border-red-200/80'         },
          ].map(r => (
            <div key={r.role} className={`rounded-2xl border p-3.5 ${r.color}`}>
              <div className="text-[13px] font-black mb-2">{r.role}</div>
              <ul className="space-y-1">
                {r.points.map(p => (
                  <li key={p} className="flex items-center gap-1.5 text-[11.5px] opacity-80">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />{p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Version */}
      <div className="flex items-center justify-between px-5 py-4 bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div>
          <div className="text-[13px] font-bold text-slate-900">SkipTheLine</div>
          <div className="text-[11.5px] text-slate-400 mt-0.5">Version 0.1.0 · Hackathon Demo · Model: queue-xgb-v1</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
        </div>
      </div>
    </div>
  );
}
