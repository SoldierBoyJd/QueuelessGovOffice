import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, FileText, Mail, Phone, Building2, Shield, ChevronRight } from 'lucide-react';
import { MOCK_VERIFICATION } from '../../mock/data';
import type { VerificationFindingType, VerificationStatus } from '../../types';

const FINDING_CONFIG: Record<VerificationFindingType, { icon: React.ComponentType<{ className?: string }>, color: string, bg: string }> = {
  SUCCESS: { icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200/80' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200/80'   },
  ERROR:   { icon: XCircle,       color: 'text-red-600',     bg: 'bg-red-50 border-red-200/80'       },
  INFO:    { icon: Info,          color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200/80'     },
};

const STATUS_STYLE: Record<VerificationStatus, { pill: string; label: string }> = {
  NOT_REQUIRED:       { pill: 'bg-slate-50 border-slate-200/80 text-slate-500',       label: 'Not Required'      },
  PENDING:            { pill: 'bg-slate-50 border-slate-200/80 text-slate-500',       label: 'Pending'           },
  UNDER_REVIEW:       { pill: 'bg-amber-50 border-amber-200/80 text-amber-700',       label: 'Under Review'      },
  APPROVED:           { pill: 'bg-emerald-50 border-emerald-200/80 text-emerald-700', label: 'Approved'          },
  REJECTED:           { pill: 'bg-red-50 border-red-200/80 text-red-700',             label: 'Rejected'          },
  MORE_INFO_REQUIRED: { pill: 'bg-blue-50 border-blue-200/80 text-blue-700',          label: 'More Info Required' },
};

const AUDIT_TYPE_STYLE = {
  SYSTEM: 'bg-slate-100 text-slate-500',
  AI:     'bg-purple-100 text-purple-700',
  HUMAN:  'bg-blue-100 text-blue-700',
};

const DOC_QUALITY_STYLE = {
  HIGH:   'text-emerald-600 bg-emerald-50 border-emerald-200/80',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200/80',
  LOW:    'text-red-600 bg-red-50 border-red-200/80',
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function VerificationCopilotPage() {
  const app = MOCK_VERIFICATION;
  const [status, setStatus] = useState<VerificationStatus>(app.status);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const doDecision = async (decision: 'APPROVE' | 'REJECT' | 'MORE_INFO') => {
    setSubmitting(decision);
    await new Promise(r => setTimeout(r, 900));
    if (decision === 'APPROVE')    setStatus('APPROVED');
    if (decision === 'REJECT')     setStatus('REJECTED');
    if (decision === 'MORE_INFO')  setStatus('MORE_INFO_REQUIRED');
    setDone(decision);
    setSubmitting(null);
  };

  const currentStatus = STATUS_STYLE[status];
  const successCount  = app.findings.filter(f => f.type === 'SUCCESS').length;
  const warningCount  = app.findings.filter(f => f.type === 'WARNING').length;

  return (
    <div className="min-h-screen bg-[#f4f6fa] p-6">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-5">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-slate-500" />
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Verification Copilot</span>
            </div>
            <h1 className="text-[24px] font-black text-slate-900 tracking-tight">Application Review</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">ID: {app.id} · Submitted {fmt(app.submittedAt)}</p>
          </div>
          <span className={`px-3.5 py-1.5 rounded-full border text-[12.5px] font-bold ${currentStatus.pill}`}>
            {currentStatus.label}
          </span>
        </div>

        {/* AI disclaimer banner */}
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/60">
          <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200/80 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-black text-blue-600">AI</span>
          </div>
          <p className="text-[12.5px] text-blue-800 font-medium">
            <strong>AI assists the verifier.</strong> All findings are for reference only. A human makes the final verification decision.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left col — applicant + documents + audit */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Applicant info */}
            <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
              <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Applicant Information</h3>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 text-[18px] font-black flex items-center justify-center flex-shrink-0">
                  {app.applicantName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-[15px] font-black text-slate-900">{app.applicantName}</div>
                  <div className="text-[12px] text-slate-400 mt-0.5">Applicant ID: {app.applicantId}</div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Mail,      label: 'Email',            value: app.applicantEmail  },
                  { icon: Phone,     label: 'Phone',            value: app.applicantPhone  },
                  { icon: Shield,    label: 'Requested Role',   value: app.requestedRole.replace('_', ' ') },
                  { icon: Building2, label: 'Requested Office', value: app.requestedOffice },
                ].map(f => {
                  const Icon = f.icon;
                  return (
                    <div key={f.label} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div>
                        <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wide">{f.label}</div>
                        <div className="text-[13px] font-bold text-slate-800">{f.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
              <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Submitted Documents</h3>
              <div className="space-y-2.5">
                {app.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-slate-900">{doc.name}</div>
                        <div className="text-[11.5px] text-slate-400 mt-0.5">{doc.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${DOC_QUALITY_STYLE[doc.quality]}`}>
                        {doc.quality}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit timeline */}
            <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
              <h3 className="text-[14.5px] font-bold text-slate-900 mb-4">Audit Timeline</h3>
              <div className="relative">
                <div className="absolute top-3 bottom-5 left-3 w-[1.5px] bg-slate-200" />
                <div className="space-y-4">
                  {app.auditLog.map(entry => (
                    <div key={entry.id} className="relative flex items-start gap-3">
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black shadow-sm ${AUDIT_TYPE_STYLE[entry.type]}`}>
                        {entry.type === 'AI' ? 'AI' : entry.type === 'HUMAN' ? 'H' : 'S'}
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[12.5px] font-bold text-slate-900">{entry.action}</span>
                            {entry.detail && <p className="text-[11.5px] text-slate-400 mt-0.5">{entry.detail}</p>}
                            <p className="text-[11px] text-slate-400 mt-0.5">{entry.actor}</p>
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">{fmt(entry.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right col — AI findings + decision */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* AI findings */}
            <div className="bg-white/95 backdrop-blur-md rounded-[24px] border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center">
                    <span className="text-[10px] font-black text-purple-600">AI</span>
                  </div>
                  <h3 className="text-[14.5px] font-bold text-slate-900">AI Findings</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">{successCount} passed</span>
                  {warningCount > 0 && <span className="text-[11.5px] font-bold text-amber-600 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">{warningCount} warnings</span>}
                </div>
              </div>

              <div className="space-y-2.5 mb-5">
                {app.findings.map(f => {
                  const cfg = FINDING_CONFIG[f.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={f.id} className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0 mt-0.5`} />
                      <div>
                        <div className={`text-[13px] font-bold ${cfg.color}`}>{f.label}</div>
                        {f.detail && <p className="text-[12px] text-slate-500 mt-0.5">{f.detail}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI assessment */}
              <div className="px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-[8px] font-black text-slate-600">AI</span>
                  </div>
                  <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wide">AI Assessment</span>
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed italic">"{app.aiAssessment}"</p>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">This assessment is informational only. The verifier makes the final decision.</p>
              </div>
            </div>

            {/* Verification decision */}
            <div className={`bg-white/95 backdrop-blur-md rounded-[24px] border shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-5 ${done === 'APPROVE' ? 'border-emerald-300/80' : done === 'REJECT' ? 'border-red-300/80' : 'border-slate-100/90'}`}>
              <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">Verification Decision</h3>
              <p className="text-[12.5px] text-slate-500 mb-4">Review all findings and documents before deciding. This action is logged.</p>

              {done ? (
                <div className={`flex items-center gap-3 px-4 py-4 rounded-2xl border ${done === 'APPROVE' ? 'bg-emerald-50 border-emerald-200/80' : done === 'REJECT' ? 'bg-red-50 border-red-200/80' : 'bg-blue-50 border-blue-200/80'}`}>
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${done === 'APPROVE' ? 'text-emerald-600' : done === 'REJECT' ? 'text-red-600' : 'text-blue-600'}`} />
                  <div>
                    <div className={`text-[13.5px] font-black ${done === 'APPROVE' ? 'text-emerald-800' : done === 'REJECT' ? 'text-red-800' : 'text-blue-800'}`}>
                      {done === 'APPROVE' ? 'Application Approved' : done === 'REJECT' ? 'Application Rejected' : 'More Information Requested'}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">Decision recorded · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                      Reviewer note <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                      placeholder="Add any notes for this decision…"
                      className="w-full liquid-glass-search rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 placeholder-slate-400 outline-none font-medium resize-none" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => doDecision('APPROVE')} disabled={submitting !== null}
                      className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] transition-all shadow-[0_4px_12px_rgba(34,197,94,0.2)] disabled:opacity-50">
                      <CheckCircle2 className="w-5 h-5" />
                      {submitting === 'APPROVE' ? 'Processing…' : 'APPROVE'}
                    </button>
                    <button onClick={() => doDecision('REJECT')} disabled={submitting !== null}
                      className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[13px] transition-all disabled:opacity-50">
                      <XCircle className="w-5 h-5" />
                      {submitting === 'REJECT' ? 'Processing…' : 'REJECT'}
                    </button>
                    <button onClick={() => doDecision('MORE_INFO')} disabled={submitting !== null}
                      className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[13px] transition-all disabled:opacity-50">
                      <Info className="w-5 h-5" />
                      {submitting === 'MORE_INFO' ? 'Processing…' : 'REQUEST INFO'}
                    </button>
                  </div>

                  <p className="text-[11.5px] text-slate-400 text-center mt-3">
                    Your decision will be recorded with your identity and timestamp.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
