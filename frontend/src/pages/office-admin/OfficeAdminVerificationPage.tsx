import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import { MOCK_VERIFICATION } from '../../mock/data';

const APPS = [
  { ...MOCK_VERIFICATION, id: 'vapp-001' },
  { ...MOCK_VERIFICATION, id: 'vapp-002', applicantName: 'Sneha Kapoor', requestedRole: 'OFFICER' as const, status: 'PENDING' as const, submittedAt: '2026-09-28T14:00:00Z' },
  { ...MOCK_VERIFICATION, id: 'vapp-003', applicantName: 'Arun Mishra',  requestedRole: 'OFFICER' as const, status: 'APPROVED' as const, submittedAt: '2026-09-27T10:00:00Z' },
];

const STATUS_STYLE: Record<string, { pill: string; label: string }> = {
  PENDING:            { pill: 'bg-slate-50 border-slate-200/80 text-slate-500',     label: 'Pending'        },
  UNDER_REVIEW:       { pill: 'bg-amber-50 border-amber-200/80 text-amber-600',     label: 'Under Review'   },
  APPROVED:           { pill: 'bg-emerald-50 border-emerald-200/80 text-emerald-600',label: 'Approved'       },
  REJECTED:           { pill: 'bg-red-50 border-red-200/80 text-red-600',           label: 'Rejected'       },
  MORE_INFO_REQUIRED: { pill: 'bg-blue-50 border-blue-200/80 text-blue-600',        label: 'More Info Req.' },
};

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OfficeAdminVerificationPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Verification Applications</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Review officer and admin role requests</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending',      count: 1, color: 'text-slate-600' },
          { label: 'Under Review', count: 1, color: 'text-amber-600' },
          { label: 'Approved',     count: 1, color: 'text-emerald-600' },
          { label: 'Rejected',     count: 0, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white/95 backdrop-blur-md rounded-[20px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-4">
            <div className={`text-[24px] font-black ${s.color}`}>{s.count}</div>
            <div className="text-[11.5px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Applications table */}
      <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-x-auto">
        <div className="grid grid-cols-12 min-w-[560px] px-5 py-3 border-b border-slate-100 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">
          <div className="col-span-3">Applicant</div>
          <div className="col-span-2">Requested Role</div>
          <div className="col-span-3">Office</div>
          <div className="col-span-2">Submitted</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        <div className="divide-y divide-slate-100">
          {APPS.map(app => {
            const s = STATUS_STYLE[app.status] ?? STATUS_STYLE.PENDING;
            return (
              <div key={app.id} onClick={() => navigate(`/office-admin/verification/${app.id}`)}
                className="grid grid-cols-12 min-w-[560px] items-center px-5 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                <div className="col-span-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {app.applicantName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-900">{app.applicantName}</div>
                    <div className="text-[11px] text-slate-400">{app.applicantEmail}</div>
                  </div>
                </div>
                <div className="col-span-2 text-[12.5px] font-semibold text-slate-700">{app.requestedRole.replace('_', ' ')}</div>
                <div className="col-span-3 text-[12.5px] text-slate-500">{app.requestedOffice}</div>
                <div className="col-span-2 text-[12.5px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />{fmt(app.submittedAt)}
                </div>
                <div className="col-span-2 flex justify-end items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${s.pill}`}>{s.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
