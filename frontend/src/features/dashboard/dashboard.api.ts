import { api } from '@/shared/api/axios';
import type { DashboardStats, LowStockProduct, RecentPriceChange } from '@/types/dashboard.types';

export const dashboardApi = {
  getStats: () =>
    api.get<DashboardStats>('/reports/dashboard').then((r) => r.data),

  getLowStock: () =>
    api.get<LowStockProduct[]>('/reports/low-stock').then((r) => r.data),

  getRecentPriceChanges: (limit: number = 10) =>
    api.get<RecentPriceChange[]>(`/reports/price-changes?limit=${limit}`).then((r) => r.data),
};
