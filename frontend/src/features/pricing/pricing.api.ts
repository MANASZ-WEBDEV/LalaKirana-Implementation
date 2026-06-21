import { api } from '@/shared/api/axios';

export interface BulkPriceItem {
  id: string;
  price: number;
}

export const pricingApi = {
  bulkUpdatePrices: (items: BulkPriceItem[]) =>
    api.post<{ message: string; count: number }>('/products/bulk-price', { items }).then((r) => r.data),
};
