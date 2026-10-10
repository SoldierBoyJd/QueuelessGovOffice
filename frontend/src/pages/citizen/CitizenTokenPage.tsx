import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertTriangle, X, Info, BellRing } from 'lucide-react';
import { alertUser, enableNotifications, getTravelMinutes, notificationPermission, setTravelMinutes } from '../../services/alerts';
import { useLiveStore } from '../../stores/liveStore';
import { NoActiveToken } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { toast } from '../../components/ui/Toast';
import { parseApiError } from '../../services/api/client';

export default function CitizenTokenPage() {
  const navigate = useNavigate();
  const { token, notifications, loaded, cancelToken } = useLiveStore();
  const [cancelling, setCancelling] = useState(false);
  const [travel, setTravel] = useState(getTravelMinutes());
  const [perm, setPerm] = useState(notificationPermission());
  const [showCancel, setShowCancel] = useState(false);

  if (!loaded) return <LoadingState />;

  // Show empty state if no active token
  if (!token || token.status === 'COMPLETED' || token.status === 'CANCELLED') {
    return (
      <div className="max-w-[700px] mx-auto mt-1">
        <div className="bg-white/95 backdrop-blur-md rounded-[28px] border border-slate-100/90 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <NoActiveToken />
        </div>
      </div>
    );
  }

  const unreadNotifs = notifications.filter(n => !n.read);
  const latestEta = unreadNotifs.find(n => n.title.includes('ETA'));

  // Queue timeline dots: show 10 positions
  const totalAhead = token.peopleAhead;
  const dots = Array.from({ length: Math.min(10, totalAhead + 3) }, (_, i) => ({
    filled: i >= totalAhead,
    isUser: i === totalAhead,
    isCompleted: i < Math.max(0, totalAhead - 4),
  }));

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelToken();
      toast.success('Token cancelled', 'You have left the queue.');
      navigate('/citizen/home');
    } catch (e) {
      toast.error('Could not cancel token', parseApiError(e).message);
      setShowCancel(false);
    } finally {
      setCancelling(false);
    }
  };

  const STATUS_COLOR: Record<string, string> = {
    WAITING:   'text-amber-600 bg-amber-50 border-amber-200/80',
    CALLED:    'text-blue-600 bg-blue-50 border-blue-200/80',
    SERVING:   'text-emerald-600 bg-emerald-50 border-emerald-200/80',
    HOLD:      'text-slate-500 bg-slate-50 border-slate-200/80',
    CREATED:   'text-slate-500 bg-slate-50 border-slate-200/80',
    COMPLETED: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
    NO_SHOW:   'text-red-600 bg-red-50 border-red-200/80',
    CANCELLED: 'text-slate-400 bg-slate-50 border-slate-200/80',
  };
  const statusColorClass = STATUS_COLOR[token.status] ?? 'text-amber-600 bg-amber-50 border-amber-200/80';

  return (
    <div className="max-w-[700px] mx-auto flex flex-col gap-5 mt-1">
      {/* ETA Update Banner */}
      {latestEta && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-bold text-amber-800">{latestEta.title}</p>
            <p className="text-[12px] text-amber-700 mt-0.5">{latestEta.message}</p>
          </div>
          <button className="text-amber-400 hover:text-amber-600 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Token Card — boarding pass style */}
      <div className="bg-white/95 backdrop-blur-md rounded-[28px] border-l-4 border-l-red-500 border-y border-r border-slate-100/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Ticket Header */}
        <div className="px-7 pt-7 pb-5 border-b border-dashed border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Virtual Queue Token</div>
              <div className="text-[56px] font-black text-slate-900 tracking-tight leading-none">{token.displayNumber}</div>
              <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border text-[11.5px] font-bold ${statusColorClass}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {token.status}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Position</div>
              <div className="text-[40px] font-black text-slate-900 leading-none">{token.position > 0 ? token.position : '—'}</div>
              <div className="text-[12px] text-slate-500 mt-1">
                {token.status === 'CALLED' || token.status === 'SERVING' ? 'It is your turn' : token.position > 0 ? `${token.peopleAhead} people ahead` : 'Position pending'}
              </div>
            </div>
          </div>
        </div>

        {/* Times section */}
        <div className="px-7 py-5 border-b border-slate-100 grid grid-cols-2 gap-6">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estimated Turn</div>
            <div className="text-[32px] font-black text-slate-900 leading-none">{token.prediction.estimatedTurnTime}</div>
            <div className="text-[12px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              {token.prediction.upperBoundMinutes > 0 ? `Range: ${token.prediction.lowerBoundMinutes}–${token.prediction.upperBoundMinutes} min` : 'Estimate updates automatically'}{token.prediction.confidence > 0 ? ` · ${token.prediction.confidence}% confidence` : ''}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recommended Arrival</div>
            <div className="text-[32px] font-black text-red-600 leading-none">{token.prediction.recommendedArrival}</div>
            <div className="text-[12px] text-slate-400 mt-1.5">Arrive by this time to keep your turn</div>
          </div>
        </div>

        {/* Queue visualizer */}
        <div className="px-7 py-5 border-b border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Your position in queue</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {dots.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-4 h-4 rounded-full transition-all ${
                  d.isUser ? 'bg-red-600 ring-2 ring-red-300 scale-125' :
                  d.isCompleted ? 'bg-emerald-400' :
                  d.filled ? 'bg-slate-200' : 'bg-slate-600'
                }`} />
                {i < dots.length - 1 && (
                  <div className={`w-4 h-0.5 ${d.isCompleted ? 'bg-emerald-300' : d.isUser || i > dots.findIndex(x => x.isUser) ? 'bg-slate-200' : 'bg-slate-400'}`} style={{ display: 'none' }} />
                )}
              </div>
            ))}
            {totalAhead > 10 && (
              <span className="text-[11px] font-bold text-slate-400 ml-1">+{totalAhead - 7} more ahead</span>
            )}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10.5px] text-emerald-600 font-semibold">Completed</span>
            <span className="text-[10.5px] text-red-600 font-bold">← You →  </span>
            <span className="text-[10.5px] text-slate-400 font-semibold">Waiting</span>
          </div>
        </div>

        {/* Service info */}
        <div className="px-7 py-5 border-b border-slate-100 grid grid-cols-2 gap-4">
          {[
            { label: 'Service', value: token.serviceName },
            { label: 'Department', value: token.departmentName },
            { label: 'Office', value: token.officeName },
            { label: 'Counter', value: token.counterName ?? 'Not yet assigned' },
          ].map(f => (
            <div key={f.label}>
              <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide">{f.label}</div>
              <div className="text-[13px] font-bold text-slate-800 mt-0.5">{f.value}</div>
            </div>
          ))}
        </div>

        {/* AI prediction footer */}
        <div className="px-7 py-4 bg-slate-50/60">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <div className="w-3 h-3 rounded-full bg-slate-300 flex items-center justify-center">
              <span className="text-[8px] font-black text-white">i</span>
            </div>
            Estimate: {token.prediction.modelVersion} · Updates automatically
          </div>
        </div>
      </div>

      {/* Leave-now reminder */}
      {token.status === 'WAITING' && (
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <BellRing className="w-4 h-4 text-red-600" />
            <h3 className="text-[14.5px] font-bold text-slate-900">Leave-now reminder</h3>
          </div>
          <p className="text-[12.5px] text-slate-500 mb-3">
            Stay at home until it is time. We will alert you when you need to leave, based on your travel time to the office.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Travel time (min)</span>
              <input type="number" min={0} max={240} value={travel}
                onChange={e => { const v = Number(e.target.value); setTravel(v); setTravelMinutes(v); }}
                className="w-28 liquid-glass-search rounded-xl px-3 py-2 text-[13.5px] text-slate-800 outline-none font-medium" />
            </label>
            {token.prediction.arriveByIso && (
              <div className="text-[13px] text-slate-700">
                Leave by <strong>{new Date(new Date(token.prediction.arriveByIso).getTime() - travel * 60_000)
                  .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}</strong>
              </div>
            )}
            {perm !== 'granted' && perm !== 'unsupported' && (
              <button onClick={async () => setPerm(await enableNotifications())}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[12.5px] transition-colors">
                Enable alerts
              </button>
            )}
            {perm === 'granted' && (
              <button onClick={() => void alertUser('Test alert', 'Alerts are working on this device.', 'stl-test')}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-[12.5px] hover:bg-slate-50">
                Send test alert
              </button>
            )}
          </div>
          {perm === 'denied' && <p className="text-[11.5px] text-amber-700 mt-2">Notifications are blocked in your browser settings. Alerts will only beep while this page is open.</p>}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button onClick={() => navigate(`/citizen/offices/${token.officeId}`)}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200/80 bg-white/90 text-slate-700 font-bold text-[13px] hover:bg-slate-50 transition-all">
          <MapPin className="w-4 h-4" /> View Office
        </button>
        <button onClick={() => setShowCancel(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200/80 bg-red-50/80 text-red-700 font-bold text-[13px] hover:bg-red-100/80 transition-all">
          <X className="w-4 h-4" /> Cancel Token
        </button>
      </div>

      {/* Cancel modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] p-6 max-w-[380px] w-full shadow-2xl">
            <h3 className="text-[18px] font-black text-slate-900 mb-2">Cancel token?</h3>
            <p className="text-[13px] text-slate-500 mb-5">This will remove you from the queue. You will need to take a new token to re-join.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[13px] hover:bg-slate-50 transition-colors">Keep Token</button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] transition-colors disabled:opacity-60">
                {cancelling ? 'Cancelling…' : 'Cancel Token'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
