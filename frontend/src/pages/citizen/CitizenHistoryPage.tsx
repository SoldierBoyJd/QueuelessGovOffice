import { CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';

const HISTORY = [
  { id: 'h1', token: 'A-184', service: 'Passport Services', office: 'Rajkot District Office', date: 'Today, 29 Sep 2026', status: 'WAITING',   wait: '42 min (est.)' },
  { id: 'h2', token: 'A-091', service: 'Birth Certificate',  office: 'Rajkot District Office', date: '15 Sep 2026',       status: 'COMPLETED', wait: '28 min' },
  { id: 'h3', token: 'B-044', service: 'Income Certificate', office: 'Surat Municipal Corp',   date: '03 Sep 2026',       status: 'COMPLETED', wait: '14 min' },
  { id: 'h4', token: 'A-210', service: 'Land Records',       office: 'Rajkot District Office', date: '20 Aug 2026',       status: 'NO_SHOW',   wait: '—' },
  { id: 'h5', token: 'C-012', service: 'Driving Licence',    office: 'Ahmedabad RTO',          date: '10 Aug 2026',       status: 'COMPLETED', wait: '67 min' },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
  WAITING:   { icon: <Clock className="w-3.5 h-3.5" />,       text: 'In Progress', cls: 'text-amber-600 bg-amber-50 border-amber-200/80' },
  COMPLETED: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: 'Completed',  cls: 'text-emerald-600 bg-emerald-50 border-emerald-200/80' },
  CANCELLED: { icon: <XCircle className="w-3.5 h-3.5" />,     text: 'Cancelled',  cls: 'text-slate-500 bg-slate-50 border-slate-200/80' },
  NO_SHOW:   { icon: <XCircle className="w-3.5 h-3.5" />,     text: 'No Show',    cls: 'text-red-600 bg-red-50 border-red-200/80' },
};

export default function CitizenHistoryPage() {
  return (
    <div className="flex flex-col gap-5 mt-1">
      <div>
        <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Token History</h2>
        <p className="text-[13px] text-slate-500 mt-0.5">Your past and current queue tokens</p>
      </div>

      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-2">Token</div>
          <div className="col-span-4">Service</div>
          <div className="col-span-3">Date</div>
          <div className="col-span-2">Wait</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        <div className="divide-y divide-slate-100">
          {HISTORY.map(item => {
            const s = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.COMPLETED;
            return (
              <div key={item.id} className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                <div className="col-span-2 font-black text-[14px] text-slate-900">{item.token}</div>
                <div className="col-span-4">
                  <div className="text-[13px] font-semibold text-slate-800">{item.service}</div>
                  <div className="text-[11.5px] text-slate-400 mt-0.5">{item.office}</div>
                </div>
                <div className="col-span-3 text-[12.5px] text-slate-500 font-medium">{item.date}</div>
                <div className="col-span-2 text-[12.5px] text-slate-500 font-medium">{item.wait}</div>
                <div className="col-span-1 flex justify-end">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.cls}`}>
                    {s.icon}{s.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
