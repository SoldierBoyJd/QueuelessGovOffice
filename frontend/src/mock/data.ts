import type {
  Office, Token, Queue, Counter, CongestionForecast,
  VerificationApplication, OfficeSummary, RegionSummary,
  SystemComponent, AIModel, QueueDataPoint, AppNotification,
} from '../types';

// ─── Offices ──────────────────────────────────────────────────────────────────

export const MOCK_OFFICES: Office[] = [
  {
    id: 'off-001',
    name: 'Rajkot District Office',
    city: 'Rajkot',
    state: 'Gujarat',
    address: 'Collectorate, Race Course Ring Road, Rajkot, Gujarat – 360001',
    lat: 22.3039,
    lng: 70.8022,
    phone: '0281-2234567',
    openTime: '9:30 AM',
    closeTime: '5:30 PM',
    isOpen: true,
    congestion: 'BUSY',
    totalWaiting: 37,
    activeCounters: 4,
    totalCounters: 6,
    avgWaitMinutes: 42,
    departments: [
      {
        id: 'dep-001',
        officeId: 'off-001',
        name: 'Passport & Documentation',
        services: [
          { id: 'svc-001', departmentId: 'dep-001', name: 'Passport Services', description: 'New Passport Application / Renewal', avgServiceMinutes: 8, iconName: 'BookOpen' },
          { id: 'svc-002', departmentId: 'dep-001', name: 'Birth Certificate', description: 'New Registration / Correction', avgServiceMinutes: 6, iconName: 'FileText' },
        ],
      },
      {
        id: 'dep-002',
        officeId: 'off-001',
        name: 'Revenue & Land Records',
        services: [
          { id: 'svc-003', departmentId: 'dep-002', name: 'Land Records', description: '7/12 Extract / Mutation', avgServiceMinutes: 10, iconName: 'Map' },
          { id: 'svc-004', departmentId: 'dep-002', name: 'Income Certificate', description: 'New Application', avgServiceMinutes: 5, iconName: 'FileCheck' },
        ],
      },
    ],
  },
  {
    id: 'off-002',
    name: 'Ahmedabad RTO & Collectorate',
    city: 'Ahmedabad',
    state: 'Gujarat',
    address: 'Sardar Patel Bhavan, Sector-10, Gandhinagar, Gujarat – 382010',
    lat: 23.0225,
    lng: 72.5714,
    openTime: '9:00 AM',
    closeTime: '6:00 PM',
    isOpen: true,
    congestion: 'HIGH',
    totalWaiting: 82,
    activeCounters: 7,
    totalCounters: 10,
    avgWaitMinutes: 67,
    departments: [
      {
        id: 'dep-003',
        officeId: 'off-002',
        name: 'Motor Vehicle',
        services: [
          { id: 'svc-005', departmentId: 'dep-003', name: 'Driving Licence', description: 'New / Renewal / Duplicate', avgServiceMinutes: 12, iconName: 'Car' },
          { id: 'svc-006', departmentId: 'dep-003', name: 'Vehicle Registration', description: 'New Registration / Transfer', avgServiceMinutes: 15, iconName: 'Truck' },
        ],
      },
    ],
  },
  {
    id: 'off-003',
    name: 'Surat Municipal Corporation',
    city: 'Surat',
    state: 'Gujarat',
    address: 'Muglisara, Surat, Gujarat – 395003',
    lat: 21.1702,
    lng: 72.8311,
    openTime: '9:30 AM',
    closeTime: '5:00 PM',
    isOpen: true,
    congestion: 'NORMAL',
    totalWaiting: 14,
    activeCounters: 3,
    totalCounters: 5,
    avgWaitMinutes: 18,
    departments: [],
  },
  {
    id: 'off-004',
    name: 'Vadodara Civic Center',
    city: 'Vadodara',
    state: 'Gujarat',
    address: 'Khanderao Market, Vadodara, Gujarat – 390001',
    lat: 22.3072,
    lng: 73.1812,
    openTime: '9:00 AM',
    closeTime: '5:30 PM',
    isOpen: false,
    congestion: 'NORMAL',
    totalWaiting: 0,
    activeCounters: 0,
    totalCounters: 4,
    avgWaitMinutes: 0,
    departments: [],
  },
];

// ─── Counters ─────────────────────────────────────────────────────────────────

export const MOCK_COUNTERS: Counter[] = [
  { id: 'ctr-001', officeId: 'off-001', name: 'Counter 01', status: 'ACTIVE', officerId: 'usr-officer-01', officerName: 'Priya Sharma', currentTokenId: 'tok-183', currentTokenDisplay: 'A-183', currentCitizenName: 'Rahul Patel', serviceName: 'Passport Services', tokensServedToday: 22, avgServiceSeconds: 522 },
  { id: 'ctr-002', officeId: 'off-001', name: 'Counter 02', status: 'ACTIVE', officerId: 'usr-officer-02', officerName: 'Amit Verma', currentTokenId: 'tok-181', currentTokenDisplay: 'A-181', currentCitizenName: 'Meena Joshi', serviceName: 'Passport Services', tokensServedToday: 19, avgServiceSeconds: 498 },
  { id: 'ctr-003', officeId: 'off-001', name: 'Counter 03', status: 'PAUSED', officerId: 'usr-officer-03', officerName: 'Deepak Singh', tokensServedToday: 14, avgServiceSeconds: 610 },
  { id: 'ctr-004', officeId: 'off-001', name: 'Counter 04', status: 'ACTIVE', officerId: 'usr-officer-04', officerName: 'Kavya Nair', currentTokenId: 'tok-179', currentTokenDisplay: 'A-179', currentCitizenName: 'Sunita Rao', serviceName: 'Birth Certificate', tokensServedToday: 27, avgServiceSeconds: 380 },
  { id: 'ctr-005', officeId: 'off-001', name: 'Counter 05', status: 'CLOSED', tokensServedToday: 0, avgServiceSeconds: 0 },
  { id: 'ctr-006', officeId: 'off-001', name: 'Counter 06', status: 'CLOSED', tokensServedToday: 0, avgServiceSeconds: 0 },
];

// ─── Active Token (Citizen A-184) ─────────────────────────────────────────────

export const MOCK_ACTIVE_TOKEN: Token = {
  id: 'tok-184',
  displayNumber: 'A-184',
  queueId: 'q-001',
  serviceId: 'svc-001',
  serviceName: 'Passport Services',
  departmentName: 'Passport & Documentation',
  officeId: 'off-001',
  officeName: 'Rajkot District Office',
  userId: 'usr-citizen-01',
  userName: 'Jainam Doshi',
  status: 'WAITING',
  position: 12,
  peopleAhead: 11,
  createdAt: '2026-09-29T08:54:00Z',
  prediction: {
    estimatedWaitMinutes: 42,
    estimatedTurnTime: '2:42 PM',
    recommendedArrival: '2:27 PM',
    confidence: 92,
    lowerBoundMinutes: 35,
    upperBoundMinutes: 51,
    modelVersion: 'queue-xgb-v1',
  },
};

// ─── Queue ────────────────────────────────────────────────────────────────────

export const MOCK_QUEUE: Queue = {
  id: 'q-001',
  officeId: 'off-001',
  serviceId: 'svc-001',
  serviceName: 'Passport Services',
  totalWaiting: 37,
  totalServing: 4,
  totalCompleted: 82,
  totalNoShow: 6,
  activeCounters: 4,
  avgServiceMinutes: 8,
  lastUpdated: '2026-09-29T08:48:00Z',
  tokens: [
    { tokenId: 'tok-178', displayNumber: 'A-178', status: 'COMPLETED', estimatedTime: '2:05 PM', citizenName: 'Arjun Mehta', serviceName: 'Passport Services', waitMinutes: 0 },
    { tokenId: 'tok-179', displayNumber: 'A-179', status: 'SERVING',   estimatedTime: '2:08 PM', citizenName: 'Sunita Rao',   serviceName: 'Birth Certificate', waitMinutes: 0 },
    { tokenId: 'tok-180', displayNumber: 'A-180', status: 'SERVING',   estimatedTime: '2:10 PM', citizenName: 'Ravi Kumar',   serviceName: 'Passport Services', waitMinutes: 0 },
    { tokenId: 'tok-181', displayNumber: 'A-181', status: 'COMPLETED', estimatedTime: '2:12 PM', citizenName: 'Meena Joshi',  serviceName: 'Passport Services', waitMinutes: 0 },
    { tokenId: 'tok-182', displayNumber: 'A-182', status: 'COMPLETED', estimatedTime: '2:15 PM', citizenName: 'Pooja Desai',  serviceName: 'Passport Services', waitMinutes: 0 },
    { tokenId: 'tok-183', displayNumber: 'A-183', status: 'SERVING',   estimatedTime: '2:17 PM', citizenName: 'Rahul Patel',  serviceName: 'Passport Services', waitMinutes: 0 },
    { tokenId: 'tok-184', displayNumber: 'A-184', status: 'WAITING',   estimatedTime: '2:42 PM', citizenName: 'Jainam Doshi', serviceName: 'Passport Services', waitMinutes: 42, isCurrentUser: true },
    { tokenId: 'tok-185', displayNumber: 'A-185', status: 'WAITING',   estimatedTime: '2:48 PM', citizenName: 'Nisha Patel',  serviceName: 'Passport Services', waitMinutes: 48 },
    { tokenId: 'tok-186', displayNumber: 'A-186', status: 'WAITING',   estimatedTime: '2:53 PM', citizenName: 'Kiran Shah',   serviceName: 'Passport Services', waitMinutes: 53 },
    { tokenId: 'tok-187', displayNumber: 'A-187', status: 'WAITING',   estimatedTime: '2:59 PM', citizenName: 'Varun Modi',   serviceName: 'Birth Certificate', waitMinutes: 59 },
    { tokenId: 'tok-188', displayNumber: 'A-188', status: 'WAITING',   estimatedTime: '3:05 PM', citizenName: 'Anjali Roy',   serviceName: 'Passport Services', waitMinutes: 65 },
  ],
};

// ─── Queue movement chart data ────────────────────────────────────────────────

export const MOCK_QUEUE_CHART_DATA: QueueDataPoint[] = [
  { time: '1:00 PM', count: 8 },
  { time: '1:10 PM', count: 14 },
  { time: '1:20 PM', count: 18 },
  { time: '1:30 PM', count: 24 },
  { time: '1:40 PM', count: 30 },
  { time: '1:50 PM', count: 38 },
  { time: '2:00 PM', count: 46 },
  { time: '2:10 PM', count: 50 },
  { time: '2:18 PM', count: 37, isNow: true },
  { time: '2:20 PM', count: 34 },
  { time: '2:30 PM', count: 28 },
];

// ─── Congestion Forecast ──────────────────────────────────────────────────────

export const MOCK_FORECAST: CongestionForecast = {
  officeId: 'off-001',
  date: '2026-09-29',
  congestionWindow: '2:00 PM – 4:00 PM',
  expectedRange: '67–82',
  peakHour: '3:00 PM',
  peakExpected: 76,
  reasons: [
    'Increasing arrival rate',
    'Reduced counter capacity (Counter 03 paused)',
    'Historical peak period — Tuesday afternoons',
  ],
  recommendation: 'Open an additional counter to handle the forecasted peak.',
  hourlyForecast: [
    { hour: '9 AM',  expected: 12, lower: 8,  upper: 16, isCongested: false },
    { hour: '10 AM', expected: 24, lower: 18, upper: 30, isCongested: false },
    { hour: '11 AM', expected: 32, lower: 26, upper: 38, isCongested: false },
    { hour: '12 PM', expected: 28, lower: 22, upper: 34, isCongested: false },
    { hour: '1 PM',  expected: 38, lower: 30, upper: 46, isCongested: false },
    { hour: '2 PM',  expected: 58, lower: 48, upper: 67, isCongested: true  },
    { hour: '3 PM',  expected: 76, lower: 65, upper: 87, isCongested: true  },
    { hour: '4 PM',  expected: 62, lower: 52, upper: 72, isCongested: true  },
    { hour: '5 PM',  expected: 34, lower: 26, upper: 42, isCongested: false },
  ],
};

// ─── Verification Application ─────────────────────────────────────────────────

export const MOCK_VERIFICATION: VerificationApplication = {
  id: 'vapp-001',
  applicantId: 'usr-applicant-01',
  applicantName: 'Rahul Patel',
  applicantEmail: 'rahul.patel@gmail.com',
  applicantPhone: '+91 98765 43210',
  requestedRole: 'OFFICER',
  requestedOffice: 'Rajkot District Office',
  status: 'UNDER_REVIEW',
  documents: [
    { id: 'doc-001', name: 'Aadhaar Card', type: 'Identity Document', uploadedAt: '2026-09-28T10:00:00Z', quality: 'MEDIUM' },
    { id: 'doc-002', name: 'Employment Letter', type: 'Employment Document', uploadedAt: '2026-09-28T10:05:00Z', quality: 'LOW' },
    { id: 'doc-003', name: 'Photo ID', type: 'Identity Document', uploadedAt: '2026-09-28T10:08:00Z', quality: 'HIGH' },
  ],
  findings: [
    { id: 'f-001', type: 'SUCCESS', label: 'Identity document detected', detail: 'Aadhaar card format recognized.' },
    { id: 'f-002', type: 'SUCCESS', label: 'Employment document detected', detail: 'Government letterhead identified.' },
    { id: 'f-003', type: 'SUCCESS', label: 'Name appears consistent', detail: 'Name matches across documents.' },
    { id: 'f-004', type: 'SUCCESS', label: 'Office name appears consistent', detail: 'Rajkot District Office referenced in employment letter.' },
    { id: 'f-005', type: 'WARNING', label: 'Document image quality: LOW', detail: 'Employment letter scan is low resolution. Manual review recommended.' },
  ],
  aiAssessment: 'Documents appear internally consistent. Name and office references match across submitted materials. One document has low image quality — human verification of employment letter is recommended before approval.',
  submittedAt: '2026-09-28T10:10:00Z',
  auditLog: [
    { id: 'al-001', timestamp: '2026-09-28T10:10:00Z', actor: 'System', action: 'Application submitted', type: 'SYSTEM' },
    { id: 'al-002', timestamp: '2026-09-28T10:10:30Z', actor: 'AI Copilot v1', action: 'Document analysis complete', detail: '5 findings generated.', type: 'AI' },
    { id: 'al-003', timestamp: '2026-09-28T10:11:00Z', actor: 'System', action: 'Status updated to UNDER_REVIEW', type: 'SYSTEM' },
    { id: 'al-004', timestamp: '2026-09-29T09:00:00Z', actor: 'Aditi Mehta (Reviewer)', action: 'Review started', type: 'HUMAN' },
  ],
};

// ─── Central Dashboard ────────────────────────────────────────────────────────

export const MOCK_OFFICE_SUMMARIES: OfficeSummary[] = [
  { id: 'off-001', name: 'Rajkot District Office',          city: 'Rajkot',      state: 'Gujarat', district: 'Rajkot',      lat: 22.3039, lng: 70.8022, waiting: 37,  avgWait: 42, congestion: 'BUSY',   activeCounters: 4 },
  { id: 'off-002', name: 'Ahmedabad RTO & Collectorate',    city: 'Ahmedabad',   state: 'Gujarat', district: 'Ahmedabad',   lat: 23.0225, lng: 72.5714, waiting: 82,  avgWait: 67, congestion: 'HIGH',   activeCounters: 7 },
  { id: 'off-003', name: 'Surat Municipal Corporation',     city: 'Surat',       state: 'Gujarat', district: 'Surat',       lat: 21.1702, lng: 72.8311, waiting: 14,  avgWait: 18, congestion: 'NORMAL', activeCounters: 3 },
  { id: 'off-004', name: 'Vadodara Civic Center',           city: 'Vadodara',    state: 'Gujarat', district: 'Vadodara',    lat: 22.3072, lng: 73.1812, waiting: 0,   avgWait: 0,  congestion: 'NORMAL', activeCounters: 0 },
  { id: 'off-005', name: 'Mumbai Central Collectorate',     city: 'Mumbai',      state: 'Maharashtra', district: 'Mumbai',  lat: 19.0760, lng: 72.8777, waiting: 124, avgWait: 88, congestion: 'HIGH',   activeCounters: 12 },
  { id: 'off-006', name: 'Pune District Office',            city: 'Pune',        state: 'Maharashtra', district: 'Pune',    lat: 18.5204, lng: 73.8567, waiting: 48,  avgWait: 35, congestion: 'BUSY',   activeCounters: 5 },
  { id: 'off-007', name: 'Nagpur RTO',                      city: 'Nagpur',      state: 'Maharashtra', district: 'Nagpur',  lat: 21.1458, lng: 79.0882, waiting: 29,  avgWait: 28, congestion: 'NORMAL', activeCounters: 4 },
  { id: 'off-008', name: 'Jaipur Collectorate',             city: 'Jaipur',      state: 'Rajasthan', district: 'Jaipur',   lat: 26.9124, lng: 75.7873, waiting: 61,  avgWait: 52, congestion: 'HIGH',   activeCounters: 6 },
  { id: 'off-009', name: 'Jodhpur District Office',         city: 'Jodhpur',     state: 'Rajasthan', district: 'Jodhpur',  lat: 26.2389, lng: 73.0243, waiting: 22,  avgWait: 24, congestion: 'NORMAL', activeCounters: 3 },
  { id: 'off-010', name: 'Bengaluru BBMP Office',           city: 'Bengaluru',   state: 'Karnataka', district: 'Bengaluru',lat: 12.9716, lng: 77.5946, waiting: 95,  avgWait: 71, congestion: 'HIGH',   activeCounters: 9 },
];

export const MOCK_REGION_SUMMARIES: RegionSummary[] = [
  { id: 'reg-guj', name: 'Gujarat',      type: 'state', officeCount: 847,  totalWaiting: 4821,  avgWaitMinutes: 34, congestionLevel: 'BUSY',   highCongestionCount: 18 },
  { id: 'reg-mah', name: 'Maharashtra',  type: 'state', officeCount: 1243, totalWaiting: 12480, avgWaitMinutes: 41, congestionLevel: 'HIGH',   highCongestionCount: 52 },
  { id: 'reg-raj', name: 'Rajasthan',    type: 'state', officeCount: 621,  totalWaiting: 5910,  avgWaitMinutes: 38, congestionLevel: 'BUSY',   highCongestionCount: 22 },
  { id: 'reg-kar', name: 'Karnataka',    type: 'state', officeCount: 534,  totalWaiting: 7200,  avgWaitMinutes: 44, congestionLevel: 'HIGH',   highCongestionCount: 19 },
  { id: 'reg-tn',  name: 'Tamil Nadu',   type: 'state', officeCount: 498,  totalWaiting: 3980,  avgWaitMinutes: 29, congestionLevel: 'NORMAL', highCongestionCount: 8  },
  { id: 'reg-del', name: 'Delhi',        type: 'state', officeCount: 278,  totalWaiting: 4800,  avgWaitMinutes: 52, congestionLevel: 'HIGH',   highCongestionCount: 8  },
];

// ─── System Components ────────────────────────────────────────────────────────

export const MOCK_SYSTEM_COMPONENTS: SystemComponent[] = [
  { name: 'API Server',         status: 'HEALTHY',  latencyMs: 42,  lastChecked: '2026-09-29T08:58:00Z' },
  { name: 'Database (Postgres)',status: 'HEALTHY',  latencyMs: 6,   lastChecked: '2026-09-29T08:58:00Z' },
  { name: 'Redis Cache',        status: 'HEALTHY',  latencyMs: 1,   lastChecked: '2026-09-29T08:58:00Z' },
  { name: 'WebSocket Server',   status: 'HEALTHY',  latencyMs: 18,  lastChecked: '2026-09-29T08:58:00Z', detail: '1,284 active connections' },
  { name: 'AI Prediction API',  status: 'DEGRADED', latencyMs: 310, lastChecked: '2026-09-29T08:57:00Z', detail: 'Elevated latency — fallback active' },
  { name: 'File Storage (S3)',  status: 'HEALTHY',  latencyMs: 55,  lastChecked: '2026-09-29T08:58:00Z' },
  { name: 'Notification Queue', status: 'HEALTHY',  latencyMs: 12,  lastChecked: '2026-09-29T08:58:00Z' },
];

export const MOCK_AI_MODELS: AIModel[] = [
  { id: 'mdl-001', name: 'Queue ETA Predictor', version: 'queue-xgb-v1', status: 'ACTIVE', accuracy: 91.4, lastTrained: '2026-09-15T00:00:00Z', description: 'XGBoost model for real-time queue ETA prediction using historical throughput.' },
  { id: 'mdl-002', name: 'Congestion Forecaster', version: 'cong-lstm-v2', status: 'ACTIVE', accuracy: 87.8, lastTrained: '2026-09-20T00:00:00Z', description: 'LSTM time-series model for next-day congestion forecasting by office.' },
  { id: 'mdl-003', name: 'Document Verifier',    version: 'doc-cnn-v1',  status: 'INACTIVE', accuracy: 84.2, lastTrained: '2026-08-01T00:00:00Z', description: 'CNN-based document quality and consistency checker for verification copilot.' },
];

// ─── Notifications ────────────────────────────────────────────────────────────

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n-001', type: 'WARNING', title: 'ETA Updated', message: 'Your estimated turn moved from 2:42 PM → 3:04 PM. Counter 03 temporarily unavailable.', timestamp: '2026-09-29T08:48:00Z', read: false, tokenId: 'tok-184' },
  { id: 'n-002', type: 'INFO',    title: 'Counter 03 Unavailable', message: 'Services are being redirected to other counters.', timestamp: '2026-09-29T08:40:00Z', read: false },
  { id: 'n-003', type: 'SUCCESS', title: 'Token Confirmed', message: 'Your token A-184 is confirmed for Passport Services.', timestamp: '2026-09-29T08:24:00Z', read: true, tokenId: 'tok-184' },
];
