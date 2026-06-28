import { api } from '@/shared/api/axios';
import type {
  Supplier,
  PurchaseOrder,
  Expense,
  SupplierRepaymentInput,
  PurchaseQuery,
  ExpenseQuery,
  SupplierQuery,
  CreatePurchaseOrderInput,
  CreateExpenseInput,
} from '@/types/purchases.types';

export const purchasesApi = {
  // Suppliers CRUD
  getSuppliers: (params?: SupplierQuery) =>
    api
      .get<{
        suppliers: Supplier[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('/purchases/suppliers', { params })
      .then((r) => r.data),

  createSupplier: (data: { name: string; phone?: string | null; address?: string | null; note?: string | null }) =>
    api.post<Supplier>('/purchases/suppliers', data).then((r) => r.data),

  updateSupplier: (id: string, data: { name?: string; phone?: string | null; address?: string | null; note?: string | null }) =>
    api.put<Supplier>(`/purchases/suppliers/${id}`, data).then((r) => r.data),

  logSupplierRepayment: (id: string, data: SupplierRepaymentInput) =>
    api.post<{ message: string; new_balance: number }>(`/purchases/suppliers/${id}/repay`, data).then((r) => r.data),

  getSupplierLedger: (id: string) =>
    api.get<any[]>(`/purchases/suppliers/${id}/ledger`).then((r) => r.data),

  // Purchase Orders CRUD
  getPurchaseOrders: (params?: PurchaseQuery) =>
    api
      .get<{
        purchaseOrders: PurchaseOrder[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('/purchases', { params })
      .then((r) => r.data),

  confirmPurchaseOrder: (data: CreatePurchaseOrderInput) =>
    api.post<PurchaseOrder>('/purchases', data).then((r) => r.data),

  getPurchaseOrderById: (id: string) =>
    api.get<PurchaseOrder>(`/purchases/${id}`).then((r) => r.data),

  cancelPurchaseOrder: ({ id, reason }: { id: string; reason: string }) =>
    api
      .post<{ message: string }>(`/purchases/${id}/cancel`, { reason })
      .then((r) => r.data),

  payPurchaseOrder: (id: string) =>
    api.post<PurchaseOrder>(`/purchases/${id}/pay`).then((r) => r.data),

  recordPOPayment: ({ id, amount, note }: { id: string; amount: number; note: string | null }) =>
    api.post<PurchaseOrder>(`/purchases/${id}/record-payment`, { amount, note }).then((r) => r.data),

  // Expenses CRUD
  getExpenses: (params?: ExpenseQuery) =>
    api
      .get<{
        expenses: Expense[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('/purchases/expenses', { params })
      .then((r) => r.data),

  createExpense: (data: CreateExpenseInput) =>
    api.post<Expense>('/purchases/expenses', data).then((r) => r.data),
};
