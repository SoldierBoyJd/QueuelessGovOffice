// ─── Auth & User ──────────────────────────────────────────────────────────────

export type Role = 'CITIZEN' | 'OFFICER' | 'OFFICE_ADMIN' | 'CENTRAL_ADMIN' | 'SUPER_ADMIN';

export type VerificationStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'MORE_INFO_REQUIRED';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  verificationStatus: VerificationStatus;
  officeId?: string;
  counterId?: string;
  avatarInitials: string;
  createdAt: string;
}

// ─── Office & Service ─────────────────────────────────────────────────────────

export type CongestionLevel = 'NORMAL' | 'BUSY' | 'HIGH';

export interface Office {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  congestion: CongestionLevel;
  totalWaiting: number;
  activeCounters: number;
  totalCounters: number;
  avgWaitMinutes: number;
  departments: Department[];
}

export interface Department {
  id: string;
  officeId: string;
  name: string;
  services: Service[];
}

export interface Service {
  id: string;
  departmentId: string;
  name: string;
  description: string;
  avgServiceMinutes: number;
  iconName: string;
  /** Server estimate for a token taken right now (null when it cannot be computed). */
  currentWaitMinutes?: number | null;
  currentQueueLength?: number | null;
}

// ─── Queue & Token ────────────────────────────────────────────────────────────

export type TokenStatus =
  | 'CREATED'
  | 'WAITING'
  | 'CALLED'
  | 'SERVING'
  | 'HOLD'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export interface Prediction {
  estimatedWaitMinutes: number;
  estimatedTurnTime: string;
  recommendedArrival: string;
  confidence: number;
  lowerBoundMinutes: number;
  upperBoundMinutes: number;
  modelVersion: string;
}

export interface Token {
  id: string;
  displayNumber: string;
  queueId: string;
  serviceId: string;
  serviceName: string;
  departmentName: string;
  officeId: string;
  officeName: string;
  userId: string;
  userName: string;
  status: TokenStatus;
  position: number;
  peopleAhead: number;
  counterId?: string;
  counterName?: string;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  prediction: Prediction;
}

export interface QueueEntry {
  tokenId: string;
  displayNumber: string;
  status: TokenStatus;
  estimatedTime: string;
  citizenName?: string;
  serviceName?: string;
  waitMinutes?: number;
  isCurrentUser?: boolean;
}

export interface Queue {
  id: string;
  officeId: string;
  serviceId: string;
  serviceName: string;
  totalWaiting: number;
  totalServing: number;
  totalCompleted: number;
  totalNoShow: number;
  activeCounters: number;
  avgServiceMinutes: number;
  tokens: QueueEntry[];
  lastUpdated: string;
}

// ─── Counter ──────────────────────────────────────────────────────────────────

export type CounterStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'BREAK';

export interface Counter {
  id: string;
  officeId: string;
  name: string;
  status: CounterStatus;
  officerId?: string;
  officerName?: string;
  currentTokenId?: string;
  currentTokenDisplay?: string;
  currentCitizenName?: string;
  serviceName?: string;
  tokensServedToday: number;
  avgServiceSeconds: number;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface QueueDataPoint {
  time: string;
  count: number;
  isNow?: boolean;
}

export interface HourlyForecast {
  hour: string;
  expected: number;
  lower: number;
  upper: number;
  isCongested: boolean;
}

export interface CongestionForecast {
  officeId: string;
  date: string;
  hourlyForecast: HourlyForecast[];
  peakHour: string;
  peakExpected: number;
  reasons: string[];
  recommendation: string;
  congestionWindow: string;
  expectedRange: string;
}

// ─── Verification ─────────────────────────────────────────────────────────────

export type VerificationFindingType = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

export interface VerificationFinding {
  id: string;
  type: VerificationFindingType;
  label: string;
  detail?: string;
}

export interface VerificationDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail?: string;
  type: 'SYSTEM' | 'AI' | 'HUMAN';
}

export interface VerificationApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  requestedRole: Role;
  requestedOffice: string;
  status: VerificationStatus;
  documents: VerificationDocument[];
  findings: VerificationFinding[];
  aiAssessment: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  auditLog: AuditLogEntry[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  tokenId?: string;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export type WSEventType =
  | 'QUEUE_UPDATED'
  | 'TOKEN_UPDATED'
  | 'ETA_UPDATED'
  | 'COUNTER_UPDATED'
  | 'CONGESTION_UPDATED'
  | 'NOTIFICATION';

export interface WSEvent {
  type: WSEventType;
  payload: unknown;
  timestamp: string;
}

// ─── Regional / Central ───────────────────────────────────────────────────────

export interface RegionSummary {
  id: string;
  name: string;
  type: 'country' | 'state' | 'district';
  officeCount: number;
  totalWaiting: number;
  avgWaitMinutes: number;
  congestionLevel: CongestionLevel;
  highCongestionCount: number;
}

export interface OfficeSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  district: string;
  lat: number;
  lng: number;
  waiting: number;
  avgWait: number;
  congestion: CongestionLevel;
  activeCounters: number;
}

// ─── System (Super Admin) ─────────────────────────────────────────────────────

export type SystemComponentStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'NOT_CONFIGURED';

export interface SystemComponent {
  name: string;
  status: SystemComponentStatus;
  latencyMs?: number;
  detail?: string;
  lastChecked: string;
}

export interface AIModel {
  id: string;
  name: string;
  version: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRAINING';
  accuracy?: number;
  lastTrained: string;
  description: string;
}
