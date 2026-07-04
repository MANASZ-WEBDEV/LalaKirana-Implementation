import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from './auth.api';
import { useAuthStore } from '@/shared/store/authStore';

export const authKeys = {
  all: ['auth'] as const,
  sessions: () => [...authKeys.all, 'sessions'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (!data.requires2FA && data.user && data.token) {
        login(data.user, data.token);
        queryClient.setQueryData(authKeys.me(), { user: data.user });
      }
    },
  });
}

export function useVerify2fa() {
  const login = useAuthStore((s) => s.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verify2fa,
    onSuccess: (data) => {
      if (data.user && data.token) {
        login(data.user, data.token);
        queryClient.setQueryData(authKeys.me(), { user: data.user });
      }
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.getMe,
    ...options,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: authKeys.sessions(),
    queryFn: authApi.getSessions,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.sessions() });
    },
  });
}

export function useChangePassword() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      // Force logout on password change as all other sessions are terminated
      logout();
      queryClient.clear();
    },
  });
}
