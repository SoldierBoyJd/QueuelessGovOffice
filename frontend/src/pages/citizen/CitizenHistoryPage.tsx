import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';

const HISTORY = [
  { id: 'h1', token: 'A-184', service: 'Passport Services', office: 'Rajkot District Office', date: 'Today, 29 Sep 2026', status: 'WAITING',   wait: '42 min (est.)' },
  { id: 'h2', token: 'A-091', service: 'Birth Certificate',  office: 'Rajkot District Office', date: '15 Sep 2026',       status: 'COMPLETED', wait: '28 min' },
  { id: 'h3', token: 'B-044', service: 'Income Certificate', office: 'Surat Municipal Corp',   date: '03 Sep 2026',       status: 'COMPLETED', wait: '14 min' },
  { id: 'h4', token: 'A-210', service: 'Land Records',       office: 'Rajkot District Office', date: '20 Aug 2026',       status: 'NO_SHOW',   wait: '—' },
  { id: 'h5', token: 'C-012', service: 'Driving Licence',    office: 'Ahmedabad RTO',          date: '10 Aug 2026',       status: 'COMPLETED', wait: '67 min' },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
  WAITING:   { icon: <Clock className="w-3.5 h-3.5" />,        text: 'In Progress', cls: 'text-amber-600 bg-amber-50 border-amber-200/80'     },
  COMPLETED: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: 'Completed',   cls: 'text-emerald-600 bg-emerald-50 border-emerald-200/80' },
  CANCELLED: { icon: <XCircle className="w-3.5 h-3.5" />,      text: 'Cancelled',   cls: 'text-slate-500 bg-slate-50 border-slate-200/80'       },
  NO_SHOW:   { icon: <XCircle className="w-3.5 h-3.5" />,      text: 'No Show',     cls: 'text-red-600 bg-red-50 border-red-200/80'            },
};

export default function CitizenHistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 mt-1">
      <div>
        <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Token History</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">Your past and current queue tokens</p>
      </div>

      {/* Desktop table (sm+) */}
      <div className="hidden sm:block bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Token</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide">Service</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide hidden md:table-cell">Date</th>
              <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wide hidden md:table-cell">Wait</th>
              <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {HISTORY.map(item => {
              const s = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.COMPLETED;
              return (
                <tr key={item.id}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => item.status === 'WAITING' ? navigate('/citizen/token') : undefined}
                >
                  <td className="px-5 py-3.5 font-black text-[14px] text-slate-900">{item.token}</td>
                  <td className="px-3 py-3.5">
                    <div className="text-[13px] font-semibold text-slate-800">{item.service}</div>
                    <div className="text-[11px] text-slate-400">{item.office}</div>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-slate-500 hidden md:table-cell">{item.date}</td>
                  <td className="px-3 py-3.5 text-[12px] text-slate-500 hidden md:table-cell">{item.wait}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.cls}`}>
                      {s.icon}{s.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {HISTORY.map(item => {
          const s = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.COMPLETED;
          return (
            <div key={item.id}
              className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
              onClick={() => item.status === 'WAITING' ? navigate('/citizen/token') : undefined}
            >
              <span className="font-black text-[17px] text-slate-900 flex-shrink-0 w-14">{item.token}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-800 truncate">{item.service}</div>
                <div className="text-[11px] text-slate-400 truncate">{item.date} · {item.wait}</div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold flex-shrink-0 ${s.cls}`}>
                {s.icon}{s.text}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
