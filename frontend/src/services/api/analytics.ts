import { apiClient } from './client';
import { toForecast, toQueueMovement, toOfficeSummary, toRegion } from './adapters';

export interface OfficeAnalytics {
  totalTokens: number;
  completed: number;
  waiting: number;
  serving: number;
  noShow: number;
  cancelled: number;
  noShowRate: number | null;
  avgWaitMinutes: number | null;
  avgServiceMinutes: number | null;
}

export interface CentralOverview {
  officeCount: number;
  totalWaiting: number;
  activeCounters: number;
  totalCounters: number;
  completedLast24h: number;
  avgWaitMinutes: number | null;
  congestion: { NORMAL: number; BUSY: number; HIGH: number };
}

const officeParam = (officeId?: string) => (officeId ? { office_id: officeId } : {});

export const analyticsApi = {
  /** `day` (YYYY-MM-DD) limits the summary to a single local day; default is today. */
  officeSummary: async (officeId?: string, day?: string): Promise<OfficeAnalytics> => {
    const { data } = await apiClient.get('/analytics/office', {
      params: { ...officeParam(officeId), ...(day ? { from: day, to: day } : {}) },
    });
    return {
      totalTokens: data.total_tokens, completed: data.completed_tokens, waiting: data.waiting_tokens,
      serving: data.serving_tokens, noShow: data.no_show_tokens, cancelled: data.cancelled_tokens,
      noShowRate: data.no_show_rate, avgWaitMinutes: data.average_wait_minutes,
      avgServiceMinutes: data.average_service_minutes,
    };
  },

  queueMovement: async (officeId?: string) => {
    const { data } = await apiClient.get('/analytics/office/queue-movement', { params: officeParam(officeId) });
    return toQueueMovement(data);
  },

  forecast: async (officeId?: string) => {
    const { data } = await apiClient.get('/analytics/office/forecast', { params: officeParam(officeId) });
    return toForecast(data);
  },

  centralOverview: async (): Promise<CentralOverview> => {
    const { data } = await apiClient.get('/analytics/central/overview');
    return {
      officeCount: data.office_count, totalWaiting: data.total_waiting, activeCounters: data.active_counters,
      totalCounters: data.total_counters, completedLast24h: data.tokens_completed_last_24h,
      avgWaitMinutes: data.average_wait_minutes_last_24h, congestion: data.congestion_breakdown,
    };
  },

  regions: async () => {
    const { data } = await apiClient.get('/analytics/central/regions', { params: { level: 'state' } });
    return (data.items as Record<string, unknown>[]).map(toRegion);
  },

  centralOffices: async () => {
    const { data } = await apiClient.get('/analytics/central/offices');
    return (data.items as Record<string, unknown>[]).map(toOfficeSummary);
  },
};
