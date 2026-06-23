import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { khataApi } from './khata.api';
import type { CustomerQuery, StatementQuery } from '@/types/khata.types';

export const khataKeys = {
  all: ['customers'] as const,
  list: (filters?: CustomerQuery) => [...khataKeys.all, 'list', filters || {}] as const,
  profile: (id: string) => [...khataKeys.all, 'profile', id] as const,
  khata: (id: string, page: number, limit: number) => [...khataKeys.all, 'khata', id, page, limit] as const,
  statement: (id: string, filters: StatementQuery) => [...khataKeys.all, 'statement', id, filters] as const,
};

export function useCustomers(filters?: CustomerQuery) {
  return useQuery({
    queryKey: khataKeys.list(filters),
    queryFn: () => khataApi.getCustomers(filters),
    staleTime: 0,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: khataApi.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: khataKeys.all });
    },
  });
}

export function useCustomerProfile(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: khataKeys.profile(id),
    queryFn: () => khataApi.getCustomerProfile(id),
    ...options,
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; phone?: string | null; address?: string | null }) =>
      khataApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: khataKeys.all });
      queryClient.invalidateQueries({ queryKey: khataKeys.profile(id) });
    },
  });
}

export function useKhataEntries(id: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: khataKeys.khata(id, page, limit),
    queryFn: () => khataApi.getKhataEntries(id, page, limit),
  });
}

export function useLogRepayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; note?: string | null }) =>
      khataApi.logRepayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: khataKeys.all });
      queryClient.invalidateQueries({ queryKey: khataKeys.profile(id) });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useMonthlyStatement(id: string, filters: StatementQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: khataKeys.statement(id, filters),
    queryFn: () => khataApi.getMonthlyStatement(id, filters),
    ...options,
  });
}
