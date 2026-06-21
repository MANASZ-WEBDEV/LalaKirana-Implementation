import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './dashboard.api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  lowStock: () => [...dashboardKeys.all, 'lowStock'] as const,
  priceChanges: (limit: number) => [...dashboardKeys.all, 'priceChanges', limit] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: dashboardApi.getStats,
    // Dashboard stats can refresh periodically (e.g. every 30 seconds)
    refetchInterval: 30000,
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: dashboardKeys.lowStock(),
    queryFn: dashboardApi.getLowStock,
    refetchInterval: 30000,
  });
}

export function useRecentPriceChanges(limit: number = 10) {
  return useQuery({
    queryKey: dashboardKeys.priceChanges(limit),
    queryFn: () => dashboardApi.getRecentPriceChanges(limit),
  });
}
