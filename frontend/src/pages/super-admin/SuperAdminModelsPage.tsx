import { Brain, Clock, TrendingUp, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api/admin';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { parseApiError } from '../../services/api/client';

const fmtTrained = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 'Never' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function SuperAdminModelsPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['admin', 'models'], queryFn: adminApi.models, refetchInterval: 60_000 });
  const MODELS = data?.models ?? [];
  const evaluation = data?.evaluation;

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={parseApiError(error).message} onRetry={() => void refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">AI Models</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">ETA methods in use and how well they perform</p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-blue-700">Waiting-time estimates assist citizens and staff; they never make administrative decisions. Error metrics below are measured against real waits and are not a percentage accuracy.</p>
      </div>

      {/* Model cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {MODELS.map(m => (
          <div key={m.id} className={`bg-white/95 backdrop-blur-md rounded-[24px] border shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 flex flex-col ${m.status === 'ACTIVE' ? 'border-l-4 border-l-emerald-400 border-y border-r border-slate-100/90' : 'border-slate-100/90'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${m.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                <Brain className="w-5 h-5" />
              </div>
              <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${m.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200/80 text-emerald-600' : m.status === 'TRAINING' ? 'bg-blue-50 border-blue-200/80 text-blue-600' : 'bg-slate-50 border-slate-200/80 text-slate-500'}`}>
                {m.status}
              </span>
            </div>
            <h3 className="text-[14.5px] font-bold text-slate-900 mb-0.5">{m.name}</h3>
            <div className="text-[11.5px] font-mono text-slate-400 mb-3">{m.version}</div>
            <p className="text-[12px] text-slate-500 leading-relaxed flex-1">{m.description}</p>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              {evaluation && m.status === 'ACTIVE' && evaluation.mean_absolute_error_minutes != null && (
                <div className="bg-slate-50/80 rounded-xl p-2.5">
                  <div className="flex items-center gap-1 mb-1"><TrendingUp className="w-3.5 h-3.5 text-slate-400" /><span className="text-[10.5px] text-slate-400 font-semibold uppercase">Mean error</span></div>
                  <div className="text-[16px] font-black text-slate-900">{evaluation?.mean_absolute_error_minutes} min</div>
                </div>
              )}
              <div className="bg-slate-50/80 rounded-xl p-2.5">
                <div className="flex items-center gap-1 mb-1"><Clock className="w-3.5 h-3.5 text-slate-400" /><span className="text-[10.5px] text-slate-400 font-semibold uppercase">Trained</span></div>
                <div className="text-[12.5px] font-bold text-slate-700">
                  {fmtTrained(m.lastTrained)}
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Model registry table */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 overflow-x-auto">
        <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Model Registry</h3>
        <div className="grid grid-cols-12 min-w-[560px] text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide px-2 py-2 border-b border-slate-100">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Version</div>
          <div className="col-span-2 text-right">Mean error</div>
          <div className="col-span-2 text-right">Last Trained</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        <div className="divide-y divide-slate-50">
          {MODELS.map(m => (
            <div key={m.id} className="grid grid-cols-12 min-w-[560px] items-center px-2 py-3.5 hover:bg-slate-50/50 transition-colors">
              <div className="col-span-3 font-bold text-[13px] text-slate-900">{m.name}</div>
              <div className="col-span-3 font-mono text-[12px] text-slate-500">{m.version}</div>
              <div className="col-span-2 text-right font-black text-[13px] text-slate-900">{m.status === 'ACTIVE' && evaluation?.mean_absolute_error_minutes != null ? `±${evaluation.mean_absolute_error_minutes}m` : '—'}</div>
              <div className="col-span-2 text-right text-[12px] text-slate-500">
                {fmtTrained(m.lastTrained)}
              </div>
              <div className="col-span-2 flex justify-end">
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${m.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200/80 text-emerald-600' : m.status === 'TRAINING' ? 'bg-blue-50 border-blue-200/80 text-blue-600' : 'bg-slate-50 border-slate-200/80 text-slate-500'}`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
