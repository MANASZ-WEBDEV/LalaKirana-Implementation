import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (from: string, to: string) => [...analyticsKeys.all, 'overview', from, to] as const,
  trend: (from: string, to: string, granularity: string) =>
    [...analyticsKeys.all, 'trend', from, to, granularity] as const,
  topProducts: (from: string, to: string) => [...analyticsKeys.all, 'topProducts', from, to] as const,
  categories: (from: string, to: string) => [...analyticsKeys.all, 'categories', from, to] as const,
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
