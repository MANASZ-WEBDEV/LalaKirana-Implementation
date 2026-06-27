import { api } from '@/shared/api/axios';
import type {
  AnalyticsOverview,
  TrendPoint,
  TopProduct,
  CategoryBreakdown,
  ProfitBreakdown,
} from '@/types/analytics.types';

export const analyticsApi = {
  getOverview: (from: string, to: string) =>
    api.get<AnalyticsOverview>('/analytics/overview', { params: { from, to } }).then((r) => r.data),

  getProfitBreakdown: (from: string, to: string) =>
    api.get<ProfitBreakdown>('/analytics/breakdown', { params: { from, to } }).then((r) => r.data),

  getTrend: (from: string, to: string, granularity: string = 'day') =>
    api.get<TrendPoint[]>('/analytics/trend', { params: { from, to, granularity } }).then((r) => r.data),

  getTopProducts: (from: string, to: string, limit: number = 10) =>
    api.get<TopProduct[]>('/analytics/top-products', { params: { from, to, limit } }).then((r) => r.data),

  getCategoryBreakdown: (from: string, to: string) =>
    api.get<CategoryBreakdown[]>('/analytics/categories', { params: { from, to } }).then((r) => r.data),

  exportCSV: (from: string, to: string) =>
    api.get('/analytics/export/csv', { params: { from, to }, responseType: 'blob' }).then((r) => r.data),
};
