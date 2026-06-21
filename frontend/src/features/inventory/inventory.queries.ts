import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from './inventory.api';
import type { ProductFilters } from '@/types/product.types';

export const inventoryKeys = {
  all: ['inventory'] as const,
  products: (filters?: ProductFilters) => [...inventoryKeys.all, 'products', filters || {}] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
  product: (id: string) => [...inventoryKeys.all, 'product', id] as const,
  priceHistory: (id: string) => [...inventoryKeys.all, 'priceHistory', id] as const,
};

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: inventoryKeys.products(filters),
    queryFn: () => inventoryApi.getProducts(filters),
    staleTime: 60000, // 1 minute stale time for catalog
  });
}

export function useCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: inventoryApi.getCategories,
    staleTime: 300000, // 5 minutes stale time for categories
  });
}

export function useProduct(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: inventoryKeys.product(id),
    queryFn: () => inventoryApi.getProductById(id),
    ...options,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.updateProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.setQueryData(inventoryKeys.product(data.id), data);
    },
  });
}

export function useSoftDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.softDeleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function usePriceHistory(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: inventoryKeys.priceHistory(id),
    queryFn: () => inventoryApi.getPriceHistory(id),
    ...options,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.adjustStock,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
