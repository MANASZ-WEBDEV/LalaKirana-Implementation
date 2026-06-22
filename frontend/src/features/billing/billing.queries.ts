import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from './billing.api';
import type { BillHistoryQuery } from '@/types/billing.types';

export const billingKeys = {
  all: ['billing'] as const,
  bills: (filters?: BillHistoryQuery) => [...billingKeys.all, 'bills', filters || {}] as const,
  bill: (id: string) => [...billingKeys.all, 'bill', id] as const,
  todaySummary: () => [...billingKeys.all, 'todaySummary'] as const,
};

export function useConfirmBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingApi.confirmBill,
    onSuccess: () => {
      // Invalidate both billing logs, product inventory, and customer balances
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCancelBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingApi.cancelBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useBillsHistory(filters?: BillHistoryQuery) {
  return useQuery({
    queryKey: billingKeys.bills(filters),
    queryFn: () => billingApi.getBills(filters),
    placeholderData: (prev) => prev,
  });
}

export function useBillDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: billingKeys.bill(id),
    queryFn: () => billingApi.getBillById(id),
    ...options,
  });
}

export function useTodaySummary() {
  return useQuery({
    queryKey: billingKeys.todaySummary(),
    queryFn: billingApi.getTodaySummary,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time dashboard updates
  });
}
