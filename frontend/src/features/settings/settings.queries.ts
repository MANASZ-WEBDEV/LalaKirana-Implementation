import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type CreateUserInput } from './settings.api';
import { api } from '@/shared/api/axios';
import type { Category } from '@/types/product.types';

export const settingsKeys = {
  users: ['settings', 'users'] as const,
  sessions: ['settings', 'sessions'] as const,
  categories: ['inventory', 'categories'] as const,
  store: ['settings', 'store'] as const,
  translations: ['settings', 'translations'] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: settingsKeys.users,
    queryFn: settingsApi.getUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => settingsApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.users });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      settingsApi.resetUserPassword(userId, newPassword),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => settingsApi.deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.users });
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: settingsKeys.sessions,
    queryFn: settingsApi.getSessions,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.sessions });
    },
  });
}

export function useDeleteAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.deleteAllSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.sessions });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      settingsApi.changePassword(currentPassword, newPassword),
  });
}

export function useSettingsCategories() {
  return useQuery({
    queryKey: settingsKeys.categories,
    queryFn: () => api.get<Category[]>('/products/categories').then((r) => r.data),
    staleTime: 300000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Category>('/products/categories', { name }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.categories });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put<Category>(`/products/categories/${id}`, { name }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.categories });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // invalidate products list to reflect category rename
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/products/categories/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.categories });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // invalidate products list to reflect deleted category
    },
  });
}

export function useStoreSettings() {
  return useQuery({
    queryKey: settingsKeys.store,
    queryFn: settingsApi.getStoreSettings,
    staleTime: 600000, // 10 minutes cache
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.updateStoreSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.store });
    },
  });
}

export function useTranslations() {
  return useQuery({
    queryKey: settingsKeys.translations,
    queryFn: settingsApi.getTranslations,
  });
}

export function useCreateTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createTranslation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.translations });
    },
  });
}

export function useUpdateTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { token?: string; hindi?: string; category?: string } }) =>
      settingsApi.updateTranslation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.translations });
    },
  });
}

export function useDeleteTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.deleteTranslation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.translations });
    },
  });
}
