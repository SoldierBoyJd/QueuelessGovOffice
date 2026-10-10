import { RefreshCw, Server, Database, Zap, Wifi, Brain } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { parseApiError } from '../../services/api/client';
import type { SystemComponentStatus } from '../../types';

const STATUS_STYLE: Record<SystemComponentStatus, { dot: string; pill: string; label: string; bg: string }> = {
  HEALTHY:  { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border-emerald-200/80 text-emerald-700', label: 'Healthy',  bg: 'border-l-emerald-400' },
  DEGRADED: { dot: 'bg-amber-500 animate-pulse', pill: 'bg-amber-50 border-amber-200/80 text-amber-700', label: 'Degraded', bg: 'border-l-amber-400' },
  DOWN:     { dot: 'bg-red-500',    pill: 'bg-red-50 border-red-200/80 text-red-700',             label: 'Down',     bg: 'border-l-red-500'   },
  NOT_CONFIGURED: { dot: 'bg-slate-300', pill: 'bg-slate-50 border-slate-200/80 text-slate-500', label: 'Not configured', bg: 'border-l-slate-300' },
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
const WS_BASE = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000';

const ICONS: Record<string, React.ReactNode> = {
  'API': <Server className="w-5 h-5" />, 'PostgreSQL': <Database className="w-5 h-5" />,
  'Realtime (WebSocket)': <Wifi className="w-5 h-5" />, 'ETA engine (baseline)': <Zap className="w-5 h-5" />,
  'ML ETA model': <Brain className="w-5 h-5" />, 'OCR / document analysis': <Server className="w-5 h-5" />,
};

export default function SuperAdminSystemPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'health'], queryFn: adminApi.systemHealth, refetchInterval: 15_000,
  });
  const components = data?.components ?? [];
  const refreshing = isFetching;
  const handleRefresh = () => { void refetch(); };

  if (isLoading) return <LoadingState message="Checking components…" />;
  if (error) return <ErrorState message={parseApiError(error).message} onRetry={handleRefresh} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">System Health</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Live component status and configuration</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-slate-50 text-slate-700 font-bold text-[12.5px] transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Component cards */}
        <div className="lg:col-span-2">
          <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Infrastructure Components</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {components.map(c => {
              const s = STATUS_STYLE[c.status];
              const Icon = ICONS[c.name] ?? <Server className="w-5 h-5" />;
              return (
                <div key={c.name} className={`bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 border-l-4 ${s.bg} shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.status === 'HEALTHY' ? 'bg-slate-50 text-slate-500' : c.status === 'DEGRADED' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                      {Icon}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${s.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                    </span>
                  </div>
                  <div className="text-[14px] font-bold text-slate-900">{c.name}</div>
                  {c.detail && <div className="text-[11.5px] text-slate-400 mt-0.5">{c.detail}</div>}
                  <div className="flex items-center gap-4 mt-3">
                    {c.latencyMs != null && (
                      <div>
                        <div className="text-[10.5px] text-slate-400 font-semibold">LATENCY</div>
                        <div className={`text-[14px] font-black ${c.latencyMs > 200 ? 'text-amber-600' : 'text-slate-900'}`}>{c.latencyMs}ms</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[10.5px] text-slate-400 font-semibold">LAST CHECKED</div>
                      <div className="text-[12.5px] font-semibold text-slate-700">
                        {new Date(c.lastChecked).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Environment info */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Client Environment</h3>
          <div className="space-y-3">
            {[
              { key: 'VITE_API_BASE_URL',    value: API_BASE },
              { key: 'VITE_WS_BASE_URL',     value: WS_BASE },
              { key: 'Overall status',       value: data?.status ?? '—' },
              { key: 'Mode',                 value: import.meta.env.MODE },
            ].map(e => (
              <div key={e.key} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50/80">
                <span className="text-[11.5px] font-mono font-semibold text-slate-500">{e.key}</span>
                <span className="text-[12px] font-mono font-bold text-slate-800">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
