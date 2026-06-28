import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasesApi } from './purchases.api';
import type { PurchaseQuery, ExpenseQuery, SupplierQuery } from '@/types/purchases.types';

export const purchasesKeys = {
  all: ['purchases'] as const,
  suppliers: (filters?: SupplierQuery) => [...purchasesKeys.all, 'suppliers', filters || {}] as const,
  orders: (filters?: PurchaseQuery) => [...purchasesKeys.all, 'orders', filters || {}] as const,
  order: (id: string) => [...purchasesKeys.all, 'order', id] as const,
  expenses: (filters?: ExpenseQuery) => [...purchasesKeys.all, 'expenses', filters || {}] as const,
  ledger: (id: string) => [...purchasesKeys.all, 'ledger', id] as const,
};

export function useSuppliers(filters?: SupplierQuery) {
  return useQuery({
    queryKey: purchasesKeys.suppliers(filters),
    queryFn: () => purchasesApi.getSuppliers(filters),
    staleTime: 30000,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.suppliers() });
    },
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; phone?: string | null; address?: string | null; note?: string | null }) =>
      purchasesApi.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.suppliers() });
    },
  });
}

export function useSupplierRepayment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; note?: string | null }) =>
      purchasesApi.logSupplierRepayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.suppliers() });
    },
  });
}

export function usePurchaseOrders(filters?: PurchaseQuery) {
  return useQuery({
    queryKey: purchasesKeys.orders(filters),
    queryFn: () => purchasesApi.getPurchaseOrders(filters),
    staleTime: 30000,
  });
}

export function useConfirmPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.confirmPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: purchasesKeys.suppliers() });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function usePurchaseDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchasesKeys.order(id),
    queryFn: () => purchasesApi.getPurchaseOrderById(id),
    ...options,
  });
}

export function useCancelPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.cancelPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: purchasesKeys.suppliers() });
    },
  });
}

export function usePayPurchase(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => purchasesApi.payPurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.order(id) });
      queryClient.invalidateQueries({ queryKey: purchasesKeys.orders() });
      queryClient.invalidateQueries({ queryKey: purchasesKeys.suppliers() });
    },
  });
}

export function useExpenses(filters?: ExpenseQuery) {
  return useQuery({
    queryKey: purchasesKeys.expenses(filters),
    queryFn: () => purchasesApi.getExpenses(filters),
    staleTime: 30000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchasesKeys.expenses() });
    },
  });
}

export function useSupplierLedger(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchasesKeys.ledger(id),
    queryFn: () => purchasesApi.getSupplierLedger(id),
    ...options,
  });
}
