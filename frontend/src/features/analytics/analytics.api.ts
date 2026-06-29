import { api } from '@/shared/api/axios';
import type {
  AnalyticsOverview,
  TrendPoint,
  TopProduct,
  CategoryBreakdown,
  ProfitBreakdown,
  AllProductsAnalyticsResponse,
  ProductAnalytics,
  ProductTrendPoint,
  StaffDiscountSummary,
  StaffDiscountBillsResponse,
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

  getAllProductsAnalytics: (
    from: string,
    to: string,
    sortBy: string = 'netRevenue',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string,
    category?: string,
    page: number = 1,
    limit: number = 25
  ) =>
    api
      .get<AllProductsAnalyticsResponse>('/analytics/products', {
        params: { from, to, sortBy, sortOrder, search, category, page, limit },
      })
      .then((r) => r.data),

  getProductAnalytics: (productId: string, from: string, to: string) =>
    api
      .get<ProductAnalytics>(`/analytics/product/${productId}`, { params: { from, to } })
      .then((r) => r.data),

  getProductTrend: (productId: string, from: string, to: string, granularity: string = 'day') =>
    api
      .get<ProductTrendPoint[]>(`/analytics/product/${productId}/trend`, { params: { from, to, granularity } })
      .then((r) => r.data),

  getStaffDiscountAudit: (from: string, to: string, granularity: string = 'day') =>
    api
      .get<StaffDiscountSummary[]>('/analytics/staff-discounts', { params: { from, to, granularity } })
      .then((r) => r.data),

  getStaffDiscountBills: (staffId: string, from: string, to: string, page: number = 1, limit: number = 20, productId?: string) =>
    api
      .get<StaffDiscountBillsResponse>(`/analytics/staff-discounts/${staffId}/bills`, { params: { from, to, page, limit, productId } })
      .then((r) => r.data),
};

