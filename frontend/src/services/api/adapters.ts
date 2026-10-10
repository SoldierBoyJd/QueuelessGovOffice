/**
 * Maps backend (snake_case) payloads onto the frontend view-model types in ../../types.
 * Keeping the translation in one place means pages never see raw API shapes.
 */
import type {
  AIModel, AppNotification, AuditLogEntry, Counter, CounterStatus, CongestionLevel, Department, Office,
  OfficeSummary, Queue, QueueEntry, RegionSummary, Role, Service, SystemComponent, SystemComponentStatus,
  Token, TokenStatus, User, VerificationApplication, VerificationDocument, VerificationFinding,
  VerificationStatus, CongestionForecast, QueueDataPoint, NotificationType,
} from '../../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;

// ── helpers ───────────────────────────────────────────────────────────────────
export function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
}

function trimTime(t?: string | null): string {
  return t ?? '—';
}

/** Backend confidence is 0..1 (or null); the UI shows a whole percent. */
function confidencePct(c?: number | null): number {
  if (c == null) return 0;
  return Math.round(c <= 1 ? c * 100 : c);
}

export function tokenStatus(s: string): TokenStatus {
  return (s === 'ON_HOLD' ? 'HOLD' : s) as TokenStatus;
}

// ── user ──────────────────────────────────────────────────────────────────────
export function toUser(u: Raw): User {
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone ?? undefined,
    role: u.role as Role,
    verificationStatus: u.verification_status as VerificationStatus,
    officeId: u.office_id ?? undefined,
    counterId: u.counter_id ?? undefined,
    avatarInitials: u.avatar_initials,
    createdAt: u.created_at,
  };
}

// ── offices & services ────────────────────────────────────────────────────────
export function toService(s: Raw): Service {
  return {
    id: s.id,
    departmentId: s.department ?? 'general',
    name: s.name,
    description: s.description ?? s.department ?? '',
    avgServiceMinutes: Math.round(s.average_service_minutes ?? s.configured_service_minutes ?? 0),
    iconName: s.icon_name ?? 'FileText',
    currentWaitMinutes: s.current_wait_minutes,
    currentQueueLength: s.current_queue_length,
  };
}

export function groupDepartments(officeId: string, services: Raw[]): Department[] {
  const byDept = new Map<string, Service[]>();
  for (const raw of services) {
    const svc = toService(raw);
    const key = raw.department ?? 'General Services';
    svc.departmentId = key;
    byDept.set(key, [...(byDept.get(key) ?? []), svc]);
  }
  return [...byDept.entries()].map(([name, list]) => ({ id: name, officeId, name, services: list }));
}

export function toOffice(o: Raw, services: Raw[] = []): Office {
  return {
    id: o.id,
    name: o.name,
    city: o.city ?? '',
    state: o.state ?? '',
    address: o.address,
    lat: o.lat ?? 0,
    lng: o.lng ?? 0,
    phone: o.phone ?? undefined,
    openTime: trimTime(o.opening_time),
    closeTime: trimTime(o.closing_time),
    isOpen: !!o.is_open,
    congestion: (o.congestion ?? 'NORMAL') as CongestionLevel,
    totalWaiting: o.total_waiting ?? 0,
    activeCounters: o.active_counters ?? 0,
    totalCounters: o.total_counters ?? 0,
    avgWaitMinutes: Math.round(o.avg_wait_minutes ?? 0),
    departments: groupDepartments(o.id, services),
  };
}

// ── tokens ────────────────────────────────────────────────────────────────────
export function toToken(t: Raw, user?: Pick<User, 'id' | 'name'> | null): Token {
  const eta = t.eta ?? {};
  const wait = t.estimated_wait_minutes ?? eta.estimated_wait_minutes ?? 0;
  const position = t.queue_position ?? eta.queue_position ?? 0;
  const servingNow = t.status === 'CALLED' || t.status === 'SERVING';
  return {
    id: t.id,
    displayNumber: t.display_number,
    queueId: t.office_id,
    serviceId: t.service_id,
    serviceName: t.service_name,
    departmentName: t.department ?? '—',
    officeId: t.office_id,
    officeName: t.office_name,
    userId: user?.id ?? '',
    userName: t.citizen_name ?? user?.name ?? '',
    status: tokenStatus(t.status),
    position,
    peopleAhead: t.people_ahead ?? Math.max(0, position - 1),
    counterId: t.counter_id ?? undefined,
    counterName: t.counter_name ?? undefined,
    createdAt: t.created_at,
    calledAt: t.called_at ?? undefined,
    completedAt: t.completed_at ?? undefined,
    prediction: {
      estimatedWaitMinutes: wait ?? 0,
      estimatedTurnTime: servingNow ? 'Now' : fmtTime(t.estimated_service_at ?? eta.estimated_service_at),
      recommendedArrival: servingNow ? 'Now' : fmtTime(t.arrive_by ?? eta.arrive_by),
      confidence: confidencePct(eta.confidence),
      lowerBoundMinutes: eta.lower_minutes ?? wait ?? 0,
      upperBoundMinutes: eta.upper_minutes ?? wait ?? 0,
      modelVersion: eta.model_version ?? eta.method ?? 'baseline',
      serviceAtIso: (t.estimated_service_at ?? eta.estimated_service_at) ?? undefined,
      arriveByIso: (t.arrive_by ?? eta.arrive_by) ?? undefined,
    },
  };
}

// ── queue ─────────────────────────────────────────────────────────────────────
export function toQueue(raw: Raw, officeId: string): Queue {
  const s = raw.summary ?? {};
  const tokens: QueueEntry[] = (raw.items ?? []).map((i: Raw): QueueEntry => ({
    tokenId: i.token_id,
    displayNumber: i.display_number,
    status: tokenStatus(i.status),
    estimatedTime: i.status === 'CALLED' || i.status === 'SERVING' ? 'Now' : fmtTime(i.estimated_service_at),
    citizenName: i.citizen_name ?? undefined,
    serviceName: i.service_name,
    waitMinutes: i.estimated_wait_minutes ?? undefined,
    isCurrentUser: !!i.is_mine,
  }));
  return {
    id: officeId,
    officeId,
    serviceId: '',
    serviceName: 'All services',
    totalWaiting: s.waiting_count ?? 0,
    totalServing: (s.serving_count ?? 0) + (s.called_count ?? 0),
    totalCompleted: s.completed_today ?? 0,
    totalNoShow: s.no_show_today ?? 0,
    activeCounters: s.active_counters ?? 0,
    avgServiceMinutes: 0,
    tokens,
    lastUpdated: raw.generated_at ?? new Date().toISOString(),
  };
}

export const EMPTY_QUEUE: Queue = {
  id: '', officeId: '', serviceId: '', serviceName: 'All services', totalWaiting: 0, totalServing: 0,
  totalCompleted: 0, totalNoShow: 0, activeCounters: 0, avgServiceMinutes: 0, tokens: [],
  lastUpdated: new Date(0).toISOString(),
};

// ── counters ──────────────────────────────────────────────────────────────────
export function toCounter(c: Raw): Counter {
  return {
    id: c.id,
    officeId: c.office_id,
    name: c.name,
    status: c.status as CounterStatus,
    officerId: c.officer_id ?? undefined,
    officerName: c.officer_name ?? undefined,
    currentTokenId: c.current_token_id ?? undefined,
    currentTokenDisplay: c.current_token_display ?? undefined,
    serviceName: c.service_name ?? undefined,
    tokensServedToday: c.tokens_served_today ?? 0,
    avgServiceSeconds: c.avg_service_seconds ?? 0,
  };
}

// ── notifications ─────────────────────────────────────────────────────────────
const SEVERITY: Record<string, NotificationType> = {
  INFO: 'INFO', SUCCESS: 'SUCCESS', WARNING: 'WARNING', ERROR: 'ERROR', CRITICAL: 'ERROR',
};

export function toNotification(n: Raw): AppNotification {
  return {
    id: n.id,
    type: SEVERITY[String(n.severity ?? 'INFO').toUpperCase()] ?? 'INFO',
    title: n.title,
    message: n.message,
    timestamp: n.created_at,
    read: !!n.read_at,
    tokenId: n.token_id ?? undefined,
  };
}

// ── analytics ─────────────────────────────────────────────────────────────────
export function toQueueMovement(raw: Raw): (QueueDataPoint & { served: number })[] {
  return (raw.points ?? []).map((p: Raw) => ({
    time: p.time, count: p.tokens_created, served: p.tokens_served, isNow: !!p.is_now,
  }));
}

export function toForecast(raw: Raw): CongestionForecast & { available: boolean; reason?: string; capacityPerHour?: number } {
  return {
    available: !!raw.available,
    capacityPerHour: raw.capacity_per_hour,
    reason: raw.reason,
    officeId: raw.office_id,
    date: raw.date,
    hourlyForecast: (raw.hourly_forecast ?? []).map((h: Raw) => ({
      hour: h.hour, expected: h.expected, lower: h.lower, upper: h.upper, isCongested: !!h.is_congested,
    })),
    peakHour: raw.peak_hour ?? '—',
    peakExpected: raw.peak_expected ?? 0,
    reasons: [],
    recommendation: raw.recommendation ?? '',
    congestionWindow: raw.congestion_window ?? '—',
    expectedRange: raw.expected_range ?? '—',
  };
}

export function toOfficeSummary(o: Raw): OfficeSummary {
  return {
    id: o.id, name: o.name, city: o.city ?? '', state: o.state ?? '', district: o.district ?? '',
    lat: o.lat ?? 0, lng: o.lng ?? 0, waiting: o.waiting ?? 0, avgWait: Math.round(o.avg_wait_minutes ?? 0),
    congestion: o.congestion as CongestionLevel, activeCounters: o.active_counters ?? 0,
  };
}

export function toRegion(r: Raw): RegionSummary {
  return {
    id: r.id, name: r.name, type: r.type, officeCount: r.office_count, totalWaiting: r.total_waiting,
    avgWaitMinutes: Math.round(r.avg_wait_minutes ?? 0), congestionLevel: r.congestion_level as CongestionLevel,
    highCongestionCount: r.high_congestion_count,
  };
}

// ── system ────────────────────────────────────────────────────────────────────
export function toSystemComponent(c: Raw): SystemComponent {
  const status = (['HEALTHY', 'DEGRADED', 'DOWN', 'NOT_CONFIGURED'].includes(c.status) ? c.status : 'DEGRADED') as SystemComponentStatus;
  return {
    name: c.name, status, latencyMs: c.latency_ms ?? undefined,
    detail: c.detail ?? undefined,
    lastChecked: c.last_checked,
  };
}

export function toModel(m: Raw): AIModel {
  return {
    id: m.id, name: m.name, version: m.version ?? 'n/a',
    status: (m.status === 'ACTIVE' || m.status === 'TRAINING' ? m.status : 'INACTIVE') as AIModel['status'],
    accuracy: m.accuracy ?? undefined, lastTrained: m.last_trained ?? '—', description: m.description,
    evaluation: m.evaluation ?? null, benchmark: m.benchmark ?? null,
  };
}

export function toAuditEntry(a: Raw): AuditLogEntry {
  return {
    id: a.id, timestamp: a.timestamp, actor: a.actor, action: a.action,
    detail: a.detail ? (typeof a.detail === 'string' ? a.detail : JSON.stringify(a.detail)) : undefined,
    type: a.type,
  };
}

// ── verification ──────────────────────────────────────────────────────────────
export function toVerification(a: Raw): VerificationApplication {
  const documents: VerificationDocument[] = (a.documents ?? []).map((d: Raw, i: number) => ({
    id: `${a.id}-d${i}`, name: d.name, type: d.doc_type, uploadedAt: d.uploaded_at, quality: 'MEDIUM',
  }));
  const findings: VerificationFinding[] = (a.findings ?? []).map((f: Raw) => ({
    id: f.id, type: f.type, label: f.label, detail: f.detail ?? undefined,
  }));
  return {
    id: a.id,
    applicantId: a.applicant?.id ?? '',
    applicantName: a.applicant?.name ?? '',
    applicantEmail: a.applicant?.email ?? '',
    applicantPhone: a.applicant?.phone ?? '—',
    requestedRole: a.requested_role as Role,
    requestedOffice: a.requested_office?.name ?? '',
    status: a.status as VerificationStatus,
    documents,
    findings,
    aiAssessment: a.ai_assessment ?? '',
    submittedAt: a.submitted_at,
    reviewedAt: a.reviewed_at ?? undefined,
    reviewedBy: a.reviewed_by ?? undefined,
    auditLog: (a.audit_log ?? []).map(toAuditEntry),
  };
}
