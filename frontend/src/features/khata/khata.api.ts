import { api } from '@/shared/api/axios';
import type {
  Customer,
  CustomerProfileStats,
  KhataEntry,
  CustomerQuery,
  StatementQuery,
  MonthlyStatementResult,
} from '@/types/khata.types';

export const khataApi = {
  getCustomers: (params?: CustomerQuery) =>
    api
      .get<{
        customers: Customer[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('/customers', { params })
      .then((r) => r.data),

  createCustomer: (data: { name: string; phone?: string | null; address?: string | null }) =>
    api.post<Customer>('/customers', data).then((r) => r.data),

  getCustomerProfile: (id: string) =>
    api.get<CustomerProfileStats>(`/customers/${id}`).then((r) => r.data),

  updateCustomer: (id: string, data: { name?: string; phone?: string | null; address?: string | null }) =>
    api.put<Customer>(`/customers/${id}`, data).then((r) => r.data),

  getKhataEntries: (id: string, page = 1, limit = 20) =>
    api
      .get<{
        entries: KhataEntry[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/customers/${id}/khata`, { params: { page, limit } })
      .then((r) => r.data),

  logRepayment: (id: string, data: { amount: number; note?: string | null }) =>
    api.post<{ message: string; entry: KhataEntry }>([`/customers/${id}/repay`].join(''), data).then((r) => r.data),

  getMonthlyStatement: (id: string, params: StatementQuery) =>
    api.get<MonthlyStatementResult>(`/customers/${id}/statement`, { params }).then((r) => r.data),
};
