import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/axios';
import type { Product, Category } from '@/types/product.types';
import { pricingApi } from './pricing.api';

export const pricingKeys = {
  products: ['inventory', 'products', {}] as const,
  categories: ['inventory', 'categories'] as const,
  inventoryAll: ['inventory'] as const,
  dashboardAll: ['dashboard'] as const,
};

export function usePricingProducts() {
  return useQuery({
    queryKey: pricingKeys.products,
    queryFn: () => api.get<Product[]>('/products').then((r) => r.data),
    staleTime: 60000,
  });
}

export function usePricingCategories() {
  return useQuery({
    queryKey: pricingKeys.categories,
    queryFn: () => api.get<Category[]>('/products/categories').then((r) => r.data),
    staleTime: 300000,
  });
}

export function useBulkUpdatePrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pricingApi.bulkUpdatePrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pricingKeys.inventoryAll });
      queryClient.invalidateQueries({ queryKey: pricingKeys.dashboardAll });
    },
  });
}
