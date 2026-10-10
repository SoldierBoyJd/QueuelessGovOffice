import { useState } from 'react';
import { CheckCircle2, Star, MessageSquare, AlertCircle } from 'lucide-react';

type Category = 'General' | 'Queue Experience' | 'AI Prediction' | 'App Issue' | 'Suggestion';
const CATEGORIES: Category[] = ['General', 'Queue Experience', 'AI Prediction', 'App Issue', 'Suggestion'];

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [category, setCategory] = useState<Category>('General');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a rating.'); return; }
    if (message.trim().length < 10) { setError('Please write at least 10 characters.'); return; }
    setError('');
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-5 mt-1 max-w-[560px] mx-auto w-full">
        <div className="bg-white/95 backdrop-blur-md rounded-[28px] border border-slate-100/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-[22px] font-black text-slate-900 mb-2">Thank you!</h2>
          <p className="text-[13.5px] text-slate-500 leading-relaxed">
            Your feedback has been recorded. It helps us improve SkipTheLine for everyone.
          </p>
          <button
            onClick={() => { setSubmitted(false); setRating(0); setMessage(''); setCategory('General'); }}
            className="mt-6 px-6 py-2.5 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-slate-50 text-slate-700 font-bold text-[13px] transition-colors"
          >
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 mt-1 max-w-[620px] mx-auto w-full">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-5 h-5 text-slate-400" />
          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Feedback</span>
        </div>
        <h1 className="text-[24px] font-black text-slate-900 tracking-tight">Share your experience</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Help us improve SkipTheLine for all citizens</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Rating */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <label className="block text-[13px] font-bold text-slate-700 mb-3">Overall experience</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button"
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    n <= (hovered || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200 fill-slate-100'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-[13px] font-bold text-slate-600">
                {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
              </span>
            )}
          </div>
        </div>

        {/* Category */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <label className="block text-[13px] font-bold text-slate-700 mb-3">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 rounded-xl border text-[12.5px] font-semibold transition-all ${
                  category === c
                    ? 'bg-red-600 border-red-600 text-white shadow-[0_2px_8px_rgba(220,38,38,0.15)]'
                    : 'border-slate-200/80 bg-white/90 text-slate-600 hover:bg-slate-50'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Your feedback</label>
          <p className="text-[12px] text-slate-400 mb-3">Tell us what worked well or what could be improved.</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="e.g. The AI prediction was accurate and I arrived just in time for my token…"
            className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium resize-none"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11.5px] text-slate-400">{message.length} characters</span>
            {message.length > 0 && message.length < 10 && (
              <span className="text-[11.5px] text-red-500 font-semibold">Minimum 10 characters</span>
            )}
          </div>
        </div>

        {/* Optional email */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
            Email <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <p className="text-[12px] text-slate-400 mb-2">If you'd like us to follow up on your feedback.</p>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-800 placeholder-slate-400 outline-none font-medium" />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200/80">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-[12.5px] text-red-700 font-semibold">{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-[14px] transition-colors shadow-[0_4px_12px_rgba(220,38,38,0.25)] disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
