import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eodApi } from './eod.api';
import { api } from '@/shared/api/axios';
import type { Product } from '@/types/product.types';

export const eodKeys = {
  all: ['eod'] as const,
  entry: (date: string) => ['eod', 'entry', date] as const,
  products: ['inventory', 'products', {}] as const,
};

export function useEODEntry(date: string) {
  return useQuery({
    queryKey: eodKeys.entry(date),
    queryFn: () => eodApi.getEODEntry(date),
    enabled: !!date,
  });
}

export function useEODProducts() {
  return useQuery({
    queryKey: eodKeys.products,
    queryFn: () => api.get<Product[]>('/products').then((r) => r.data),
    staleTime: 60000,
  });
}

export function useSubmitEOD() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: eodApi.submitEODEntry,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eodKeys.entry(variables.entry_date) });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
