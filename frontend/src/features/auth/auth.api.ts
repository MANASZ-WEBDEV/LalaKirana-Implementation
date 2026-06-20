import { api } from '@/shared/api/axios';
import type { LoginInput, LoginResponse, User, Session } from '@/types/auth.types';

export const authApi = {
  login: (data: LoginInput) =>
    api.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  logout: () =>
    api.post<{ message: string }>('/auth/logout').then((r) => r.data),

  getMe: () =>
    api.get<{ user: User }>('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (data: any) =>
    api.post<{ message: string }>('/auth/reset-password', data).then((r) => r.data),

  changePassword: (data: any) =>
    api.put<{ message: string }>('/auth/change-password', data).then((r) => r.data),

  getSessions: () =>
    api.get<Session[]>('/auth/sessions').then((r) => r.data),

  deleteSession: (id: string) =>
    api.delete<{ message: string }>(`/auth/sessions/${id}`).then((r) => r.data),
};
