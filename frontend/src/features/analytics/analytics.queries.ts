import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (from: string, to: string) => [...analyticsKeys.all, 'overview', from, to] as const,
  trend: (from: string, to: string, granularity: string) =>
    [...analyticsKeys.all, 'trend', from, to, granularity] as const,
  topProducts: (from: string, to: string) => [...analyticsKeys.all, 'topProducts', from, to] as const,
  categories: (from: string, to: string) => [...analyticsKeys.all, 'categories', from, to] as const,
  products: (from: string, to: string, sortBy: string, sortOrder: string, search: string, category: string, page: number, limit: number) =>
    [...analyticsKeys.all, 'products', from, to, sortBy, sortOrder, search, category, page, limit] as const,
  productDetail: (productId: string, from: string, to: string) =>
    [...analyticsKeys.all, 'productDetail', productId, from, to] as const,
  productTrend: (productId: string, from: string, to: string, granularity: string) =>
    [...analyticsKeys.all, 'productTrend', productId, from, to, granularity] as const,
  staffDiscounts: (from: string, to: string, granularity: string) =>
    [...analyticsKeys.all, 'staffDiscounts', from, to, granularity] as const,
  staffDiscountBills: (staffId: string, from: string, to: string, page: number, limit: number, productId?: string) =>
    [...analyticsKeys.all, 'staffDiscountBills', staffId, from, to, page, limit, productId || ''] as const,
};

export function useAnalyticsOverview(from: string, to: string) {
  return useQuery({
    queryKey: analyticsKeys.overview(from, to),
    queryFn: () => analyticsApi.getOverview(from, to),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}

export function useAnalyticsTrend(from: string, to: string, granularity: string = 'day') {
  return useQuery({
    queryKey: analyticsKeys.trend(from, to, granularity),
    queryFn: () => analyticsApi.getTrend(from, to, granularity),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}

export function useTopProducts(from: string, to: string) {
  return useQuery({
    queryKey: analyticsKeys.topProducts(from, to),
    queryFn: () => analyticsApi.getTopProducts(from, to),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}

export function useCategoryBreakdown(from: string, to: string) {
  return useQuery({
    queryKey: analyticsKeys.categories(from, to),
    queryFn: () => analyticsApi.getCategoryBreakdown(from, to),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}

export function useProfitBreakdown(from: string, to: string) {
  return useQuery({
    queryKey: ['analytics', 'breakdown', from, to] as const,
    queryFn: () => analyticsApi.getProfitBreakdown(from, to),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}

export function useAllProductsAnalytics(
  from: string,
  to: string,
  sortBy: string = 'netRevenue',
  sortOrder: 'asc' | 'desc' = 'desc',
  search: string = '',
  category: string = '',
  page: number = 1,
  limit: number = 25
) {
  return useQuery({
    queryKey: analyticsKeys.products(from, to, sortBy, sortOrder, search, category, page, limit),
    queryFn: () => analyticsApi.getAllProductsAnalytics(from, to, sortBy, sortOrder, search, category, page, limit),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}

export function useProductAnalytics(productId: string, from: string, to: string) {
  return useQuery({
    queryKey: analyticsKeys.productDetail(productId, from, to),
    queryFn: () => analyticsApi.getProductAnalytics(productId, from, to),
    enabled: !!productId && !!from && !!to,
    staleTime: 60_000,
  });
}

export function useProductTrend(productId: string, from: string, to: string, granularity: string = 'day') {
  return useQuery({
    queryKey: analyticsKeys.productTrend(productId, from, to, granularity),
    queryFn: () => analyticsApi.getProductTrend(productId, from, to, granularity),
    enabled: !!productId && !!from && !!to,
    staleTime: 60_000,
  });
}

export function useStaffDiscountAudit(from: string, to: string, granularity: string = 'day') {
  return useQuery({
    queryKey: analyticsKeys.staffDiscounts(from, to, granularity),
    queryFn: () => analyticsApi.getStaffDiscountAudit(from, to, granularity),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}

export function useStaffDiscountBills(staffId: string, from: string, to: string, page: number = 1, limit: number = 20, productId?: string) {
  return useQuery({
    queryKey: analyticsKeys.staffDiscountBills(staffId, from, to, page, limit, productId),
    queryFn: () => analyticsApi.getStaffDiscountBills(staffId, from, to, page, limit, productId),
    enabled: !!staffId && !!from && !!to,
    staleTime: 60_000,
  });
}

