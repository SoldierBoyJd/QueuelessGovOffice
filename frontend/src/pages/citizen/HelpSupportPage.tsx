import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Phone, Mail, MessageSquare, Hash, Clock, MapPin, AlertTriangle } from 'lucide-react';

const FAQS = [
  {
    q: 'How do I take a virtual token?',
    a: 'Go to "Find Services", select an office and service, then click "Take Virtual Token". You will receive a token number, your estimated turn time, and a recommended arrival time.',
  },
  {
    q: 'Can I cancel my token?',
    a: 'Yes. Open "My Token" and tap "Cancel Token". You will be removed from the queue. Note that cancellation is immediate and you will need to take a new token to re-join.',
  },
  {
    q: 'What does the recommended arrival time mean?',
    a: "It's the time our AI suggests you leave for the office. Arriving at this time means you should reach approximately 15 minutes before your estimated turn, accounting for travel.",
  },
  {
    q: 'Why did my ETA change?',
    a: 'ETAs update automatically when queue conditions change — for example if a counter goes offline, if many people ahead of you cancel, or if service times are running longer than expected.',
  },
  {
    q: 'Is the AI prediction always accurate?',
    a: "The AI provides probabilistic estimates with a confidence level and expected range. It's highly accurate under normal conditions but cannot guarantee exact times — treat it as a reliable guide, not a precise schedule.",
  },
  {
    q: 'What happens if I miss my turn?',
    a: "If you don't show up within a grace window after being called, you may be marked as No-Show and removed from the queue. You will need to take a new token. Watch your notifications so you don't miss your call.",
  },
  {
    q: 'Can I use SkipTheLine for multiple services?',
    a: 'You can hold one active token at a time per office. Complete or cancel your current token before taking a new one for a different service.',
  },
  {
    q: 'What if the app shows "RECONNECTING"?',
    a: "Your live connection temporarily dropped. The app reconnects automatically — live queue data will resume shortly. Data shown during reconnection may be a few seconds old.",
  },
];

export default function HelpSupportPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-5 mt-1 max-w-[800px] mx-auto w-full">
      <div>
        <h1 className="text-[24px] font-black text-slate-900 tracking-tight">Help & Support</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Answers, contact options, and everything you need</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Hash className="w-5 h-5" />,     label: 'My Token',      action: () => navigate('/citizen/token'),         bg: 'bg-red-50 text-red-600 border-red-200/80' },
          { icon: <MapPin className="w-5 h-5" />,   label: 'Find Office',   action: () => navigate('/citizen/offices'),       bg: 'bg-blue-50 text-blue-600 border-blue-200/80' },
          { icon: <Clock className="w-5 h-5" />,    label: 'My History',    action: () => navigate('/citizen/history'),       bg: 'bg-slate-50 text-slate-600 border-slate-200/80' },
          { icon: <MessageSquare className="w-5 h-5" />, label: 'Feedback', action: () => navigate('/citizen/feedback'),     bg: 'bg-emerald-50 text-emerald-600 border-emerald-200/80' },
        ].map(item => (
          <button key={item.label} onClick={item.action}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border hover:shadow-sm transition-all ${item.bg}`}>
            {item.icon}
            <span className="text-[12.5px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>

      {/* FAQs */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-black text-slate-900">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
              >
                <span className="text-[13.5px] font-semibold text-slate-900 pr-4">{faq.q}</span>
                {open === i
                  ? <ChevronDown className="w-4 h-4 text-red-600 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              </button>
              {open === i && (
                <div className="px-5 pb-4">
                  <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50/70 rounded-xl px-4 py-3 border border-slate-100">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: <Phone className="w-5 h-5" />,   label: 'Phone Support', value: '1800-XXX-XXXX', sub: 'Mon–Fri, 9 AM – 6 PM', bg: 'bg-emerald-50 border-emerald-200/80 text-emerald-600' },
          { icon: <Mail className="w-5 h-5" />,    label: 'Email',         value: 'support@skiptheline.gov.in', sub: 'Response within 24 hours', bg: 'bg-blue-50 border-blue-200/80 text-blue-600' },
          { icon: <AlertTriangle className="w-5 h-5" />, label: 'Report Issue', value: 'File a complaint', sub: 'For urgent office issues', bg: 'bg-amber-50 border-amber-200/80 text-amber-600' },
        ].map(c => (
          <div key={c.label} className={`rounded-[20px] border p-5 ${c.bg}`}>
            <div className="mb-3">{c.icon}</div>
            <div className="text-[13px] font-black">{c.label}</div>
            <div className="text-[13.5px] font-bold mt-1 opacity-90">{c.value}</div>
            <div className="text-[11.5px] opacity-70 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
