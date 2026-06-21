import { api } from '@/shared/api/axios';
import type { Product, Category, PriceHistoryEntry, ProductFilters } from '@/types/product.types';

export const inventoryApi = {
  getProducts: (filters?: ProductFilters) =>
    api.get<Product[]>('/products', { params: filters }).then((r) => r.data),

  getCategories: () =>
    api.get<Category[]>('/products/categories').then((r) => r.data),

  getProductById: (id: string) =>
    api.get<Product>(`/products/${id}`).then((r) => r.data),

  createProduct: (data: any) =>
    api.post<Product>('/products', data).then((r) => r.data),

  updateProduct: ({ id, data }: { id: string; data: any }) =>
    api.put<Product>(`/products/${id}`, data).then((r) => r.data),

  softDeleteProduct: (id: string) =>
    api.delete<{ message: string; product: Product }>(`/products/${id}`).then((r) => r.data),

  getPriceHistory: (id: string) =>
    api.get<PriceHistoryEntry[]>(`/products/${id}/price-history`).then((r) => r.data),

  adjustStock: ({
    productId,
    data,
  }: {
    productId: string;
    data: {
      type: 'add' | 'remove' | 'set';
      qty: number;
      reason: 'new_arrival' | 'damage' | 'returned' | 'audit' | 'other';
      note?: string;
    };
  }) =>
    api.post<{ message: string; product: Product }>(`/inventory/${productId}/adjust`, data).then((r) => r.data),
};
