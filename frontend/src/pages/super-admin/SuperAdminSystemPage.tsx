import { RefreshCw, Server, Database, Zap, Wifi, Brain } from 'lucide-react';
import { useState } from 'react';
import { MOCK_SYSTEM_COMPONENTS } from '../../mock/data';
import type { SystemComponentStatus } from '../../types';

const STATUS_STYLE: Record<SystemComponentStatus, { dot: string; pill: string; label: string; bg: string }> = {
  HEALTHY:  { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border-emerald-200/80 text-emerald-700', label: 'Healthy',  bg: 'border-l-emerald-400' },
  DEGRADED: { dot: 'bg-amber-500 animate-pulse', pill: 'bg-amber-50 border-amber-200/80 text-amber-700', label: 'Degraded', bg: 'border-l-amber-400' },
  DOWN:     { dot: 'bg-red-500',    pill: 'bg-red-50 border-red-200/80 text-red-700',             label: 'Down',     bg: 'border-l-red-500'   },
};

const ICONS: Record<string, React.ReactNode> = {
  'API Server': <Server className="w-5 h-5" />, 'Database (Postgres)': <Database className="w-5 h-5" />,
  'Redis Cache': <Zap className="w-5 h-5" />, 'WebSocket Server': <Wifi className="w-5 h-5" />,
  'AI Prediction API': <Brain className="w-5 h-5" />, 'File Storage (S3)': <Server className="w-5 h-5" />,
  'Notification Queue': <Zap className="w-5 h-5" />,
};

const FEATURE_FLAGS = [
  { key: 'ai_predictions',     label: 'AI ETA Predictions',       enabled: true  },
  { key: 'websocket_realtime', label: 'WebSocket Real-time',       enabled: true  },
  { key: 'congestion_forecast',label: 'Congestion Forecasting',    enabled: true  },
  { key: 'verification_ai',    label: 'AI Verification Copilot',   enabled: true  },
  { key: 'sms_notifications',  label: 'SMS Notifications',         enabled: false },
  { key: 'email_notifications',label: 'Email Notifications',       enabled: true  },
  { key: 'live_3d_queue',      label: '3D Queue Visualization',    enabled: false },
  { key: 'maintenance_mode',   label: 'Maintenance Mode',          enabled: false },
];

export default function SuperAdminSystemPage() {
  const [flags, setFlags] = useState(FEATURE_FLAGS);
  const [refreshing, setRefreshing] = useState(false);

  const toggleFlag = (key: string) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1200));
    setRefreshing(false);
  };

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
            {MOCK_SYSTEM_COMPONENTS.map(c => {
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
                    {c.latencyMs !== undefined && (
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

        {/* Feature flags */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Feature Flags</h3>
          <div className="space-y-3">
            {flags.map(f => (
              <div key={f.key} className="flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-slate-50/60 transition-colors">
                <div>
                  <div className="text-[13px] font-semibold text-slate-800">{f.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{f.key}</div>
                </div>
                <button onClick={() => toggleFlag(f.key)}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 ${f.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${f.enabled ? 'translate-x-5.5 left-0.5' : 'left-0.5 translate-x-0'}`}
                    style={{ transform: f.enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Environment info */}
        <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
          <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Environment</h3>
          <div className="space-y-3">
            {[
              { key: 'VITE_API_BASE_URL',    value: 'http://localhost:8000/api/v1' },
              { key: 'VITE_WS_BASE_URL',     value: 'ws://localhost:8000'          },
              { key: 'VITE_DEMO_MODE',       value: 'true'                         },
              { key: 'NODE_ENV',             value: 'development'                  },
              { key: 'App version',          value: '0.1.0-hackathon'              },
              { key: 'Build',                value: new Date().toLocaleDateString() },
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
