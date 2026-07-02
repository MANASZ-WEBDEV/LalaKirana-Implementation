import { api } from '@/shared/api/axios';
import type { User, Session } from '@/types/auth.types';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'owner' | 'staff';
}

export const settingsApi = {
  getUsers: () =>
    api.get<User[]>('/auth/users').then((r) => r.data),

  createUser: (data: CreateUserInput) =>
    api.post<User>('/auth/users', data).then((r) => r.data),

  resetUserPassword: (userId: string, newPassword: string) =>
    api.put<{ message: string }>(`/auth/users/${userId}/reset-password`, { newPassword }).then((r) => r.data),

  deactivateUser: (userId: string) =>
    api.delete<{ message: string }>(`/auth/users/${userId}`).then((r) => r.data),

  getSessions: () =>
    api.get<Session[]>('/auth/sessions').then((r) => r.data),

  deleteSession: (id: string) =>
    api.delete<{ message: string }>(`/auth/sessions/${id}`).then((r) => r.data),

  deleteAllSessions: () =>
    api.delete<{ message: string }>('/auth/sessions/all').then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ message: string }>('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),

  getStoreSettings: () =>
    api.get<Record<string, string>>('/settings/store').then((r) => r.data),

  updateStoreSettings: (data: Record<string, string>) =>
    api.put<{ success: boolean }>('/settings/store', data).then((r) => r.data),

  // Translations
  getTranslations: () =>
    api.get<ReceiptTranslation[]>('/settings/store/translations').then((r) => r.data),

  createTranslation: (data: { token: string; hindi: string; category: string }) =>
    api.post<ReceiptTranslation>('/settings/store/translations', data).then((r) => r.data),

  updateTranslation: (id: string, data: { token?: string; hindi?: string; category?: string }) =>
    api.put<ReceiptTranslation>(`/settings/store/translations/${id}`, data).then((r) => r.data),

  deleteTranslation: (id: string) =>
    api.delete<{ success: boolean }>(`/settings/store/translations/${id}`).then((r) => r.data),
};

export interface ReceiptTranslation {
  id: string;
  token: string;
  hindi: string;
  category: 'brand' | 'product' | 'qualifier' | 'general';
  created_at: string;
}
