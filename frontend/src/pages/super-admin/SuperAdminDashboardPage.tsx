import { Server, Database, Zap, Wifi, Brain, Users, Shield, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { useCentralData } from '../../hooks/useCentralData';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { parseApiError } from '../../services/api/client';
import type { SystemComponentStatus } from '../../types';

const STATUS_STYLE: Record<SystemComponentStatus, { dot: string; pill: string; label: string }> = {
  HEALTHY:  { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border-emerald-200/80 text-emerald-700', label: 'Healthy'  },
  DEGRADED: { dot: 'bg-amber-500 animate-pulse', pill: 'bg-amber-50 border-amber-200/80 text-amber-700', label: 'Degraded' },
  DOWN:     { dot: 'bg-red-500',    pill: 'bg-red-50 border-red-200/80 text-red-700',             label: 'Down'     },
  NOT_CONFIGURED: { dot: 'bg-slate-300', pill: 'bg-slate-50 border-slate-200/80 text-slate-500', label: 'Not configured' },
};

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  'API':                     <Server className="w-4 h-4" />,
  'PostgreSQL':              <Database className="w-4 h-4" />,
  'Realtime (WebSocket)':    <Wifi className="w-4 h-4" />,
  'ETA engine (baseline)':   <Zap className="w-4 h-4" />,
  'ML ETA model':            <Brain className="w-4 h-4" />,
  'OCR / document analysis': <Server className="w-4 h-4" />,
};

const fmtAgo = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function SuperAdminDashboardPage() {
  const health = useQuery({ queryKey: ['admin', 'health'], queryFn: adminApi.systemHealth, refetchInterval: 15_000 });
  const modelsQ = useQuery({ queryKey: ['admin', 'models'], queryFn: adminApi.models, refetchInterval: 60_000 });
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: () => adminApi.auditLogs(), refetchInterval: 30_000 });
  const userCount = useQuery({ queryKey: ['admin', 'user-count'], queryFn: adminApi.userCount, refetchInterval: 60_000 });
  const { overview } = useCentralData();

  const COMPONENTS = health.data?.components ?? [];
  const MODELS = modelsQ.data?.models ?? [];
  const healthy  = COMPONENTS.filter(c => c.status === 'HEALTHY').length;
  const degraded = COMPONENTS.filter(c => c.status === 'DEGRADED').length;
  const down     = COMPONENTS.filter(c => c.status === 'DOWN').length;
  const notConfigured = COMPONENTS.length - healthy - degraded - down;
  const events = (audit.data?.items ?? []).slice(0, 5);

  if (health.isLoading) return <LoadingState />;
  if (health.error) return <ErrorState message={parseApiError(health.error).message} onRetry={() => void health.refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Platform Overview</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">System health · AI models · Platform operations</p>
      </div>

      {/* System health summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Healthy',  value: healthy,  icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Degraded', value: degraded, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Down',     value: down,     icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600',     bg: 'bg-red-50'     },
          ...(notConfigured > 0 ? [{ label: 'Not configured', value: notConfigured, icon: <Shield className="w-4 h-4" />, color: 'text-slate-500', bg: 'bg-slate-100' }] : []),
        ].map(m => (
          <div key={m.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className={`w-8 h-8 rounded-xl ${m.bg} flex items-center justify-center ${m.color} mb-3`}>{m.icon}</div>
            <div className="text-[28px] font-black text-slate-900 tracking-tight leading-none">{m.value}</div>
            <div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide mt-1.5">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* System components */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">System Components</h3>
            <div className="divide-y divide-slate-100">
              {COMPONENTS.map(c => {
                const s = STATUS_STYLE[c.status];
                const Icon = COMPONENT_ICONS[c.name] ?? <Server className="w-4 h-4" />;
                return (
                  <div key={c.name} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.status === 'HEALTHY' ? 'bg-slate-50 text-slate-500' : c.status === 'DEGRADED' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                        {Icon}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-bold text-slate-900">{c.name}</div>
                        {c.detail && <div className="text-[11.5px] text-slate-400 mt-0.5">{c.detail}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {c.latencyMs != null && (
                        <div className="text-right">
                          <div className="text-[12px] text-slate-400 font-medium">Latency</div>
                          <div className={`text-[13px] font-black ${c.latencyMs > 200 ? 'text-amber-600' : 'text-slate-900'}`}>{c.latencyMs}ms</div>
                        </div>
                      )}
                      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${s.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform stats */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Platform Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total users',     value: (userCount.data ?? 0).toLocaleString(), icon: <Users className="w-4 h-4 text-blue-500" /> },
                { label: 'Active offices',  value: (overview?.officeCount ?? 0).toLocaleString(), icon: <Server className="w-4 h-4 text-emerald-500" /> },
                { label: 'Waiting now',     value: (overview?.totalWaiting ?? 0).toLocaleString(), icon: <Wifi className="w-4 h-4 text-purple-500" /> },
                { label: 'Completed (24h)', value: (overview?.completedLast24h ?? 0).toLocaleString(), icon: <Zap className="w-4 h-4 text-amber-500" /> },
              ].map(s => (
                <div key={s.label} className="bg-slate-50/80 rounded-2xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">{s.icon}<span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{s.label}</span></div>
                  <div className="text-[20px] font-black text-slate-900">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Active AI model */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-slate-600" />
              <h3 className="text-[14.5px] font-bold text-slate-900">ETA Methods</h3>
            </div>
            <div className="space-y-3">
              {MODELS.map(m => (
                <div key={m.id} className={`px-4 py-3.5 rounded-2xl border ${m.status === 'ACTIVE' ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-slate-50/50 border-slate-200/60'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[13px] font-bold text-slate-900">{m.name}</div>
                    <span className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${m.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200/80 text-emerald-600' : m.status === 'TRAINING' ? 'bg-blue-50 border-blue-200/80 text-blue-600' : 'bg-slate-50 border-slate-200/80 text-slate-500'}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-slate-500 font-mono">{m.version}</div>
                  <div className="flex items-center gap-3 mt-2">
                    {m.status === 'ACTIVE' && modelsQ.data?.evaluation?.mean_absolute_error_minutes != null && <span className="text-[11.5px] text-slate-500">Mean error: <strong className="text-slate-700">{modelsQ.data.evaluation.mean_absolute_error_minutes} min</strong></span>}
                    <span className="text-[11.5px] text-slate-400">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {Number.isNaN(new Date(m.lastTrained).getTime()) ? 'Not trained' : `Trained ${new Date(m.lastTrained).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security events */}
          <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-slate-600" />
              <h3 className="text-[14.5px] font-bold text-slate-900">Recent Activity</h3>
            </div>
            <div className="space-y-2.5">
              {events.length === 0 && <p className="text-[12.5px] text-slate-400 text-center py-3">No activity recorded yet.</p>}
              {events.map(e => (
                <div key={e.id} className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-slate-50/60">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-slate-400" />
                  <div className="flex-1">
                    <p className="text-[12.5px] text-slate-700 font-medium capitalize">{e.action.replace(/_/g, ' ').toLowerCase()} <span className="normal-case text-slate-400">· {e.actor}</span></p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{fmtAgo(e.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
