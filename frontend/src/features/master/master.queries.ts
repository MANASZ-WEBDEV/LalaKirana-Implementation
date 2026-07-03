import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/axios';

export const masterKeys = {
  all: ['master'] as const,
  overview: () => [...masterKeys.all, 'overview'] as const,
  users: () => [...masterKeys.all, 'users'] as const,
};

export function useMasterOverview() {
  return useQuery({
    queryKey: masterKeys.overview(),
    queryFn: () => api.get('/master/shops/overview').then((r) => r.data),
    refetchInterval: 30000,
  });
}

export function useMasterUsers() {
  return useQuery({
    queryKey: masterKeys.users(),
    queryFn: () => api.get('/master/users/all').then((r) => r.data),
  });
}

export function useMasterCreateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/master/users/create-owner', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterKeys.users() });
      queryClient.invalidateQueries({ queryKey: masterKeys.overview() });
    },
  });
}

export function useMasterChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'owner' | 'staff' }) =>
      api.put(`/master/users/${userId}/role`, { role }).then((r) => r.data),
    // Note: Wait! The route in backend we defined is PUT /api/v1/master/users/:id/role
    // So the path should be `/master/users/${userId}/role` ! Let's fix that path.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterKeys.users() });
      queryClient.invalidateQueries({ queryKey: masterKeys.overview() });
    },
  });
}

export function useMasterDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/master/users/${userId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterKeys.users() });
      queryClient.invalidateQueries({ queryKey: masterKeys.overview() });
    },
  });
}

export function useMasterResetPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      api.put(`/master/users/${userId}/reset-password`, { newPassword }).then((r) => r.data),
  });
}
