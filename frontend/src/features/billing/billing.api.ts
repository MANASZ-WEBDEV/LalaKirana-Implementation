import { api } from '@/shared/api/axios';
import type {
  Bill,
  ConfirmBillInput,
  BillHistoryQuery,
  TodayBillingSummary,
} from '@/types/billing.types';

export const billingApi = {
  confirmBill: (data: ConfirmBillInput) =>
    api.post<Bill>('/billing', data).then((r) => r.data),

  getBills: (params?: BillHistoryQuery) =>
    api
      .get<{
        bills: Bill[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('/billing', { params })
      .then((r) => r.data),

  getTodaySummary: () =>
    api.get<TodayBillingSummary>('/billing/today-summary').then((r) => r.data),

  getBillById: (id: string) =>
    api.get<Bill>(`/billing/${id}`).then((r) => r.data),

  cancelBill: ({ id, reason }: { id: string; reason: string }) =>
    api
      .post<{ message: string; bill_number: string }>(`/billing/${id}/cancel`, { reason })
      .then((r) => r.data),
};
