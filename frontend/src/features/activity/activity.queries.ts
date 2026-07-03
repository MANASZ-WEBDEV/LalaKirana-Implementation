import { useQuery } from '@tanstack/react-query';
import { activityApi, type ActivityFeedFilters, type ActivityLoginFilters } from './activity.api';

export const activityKeys = {
  all: ['activity'] as const,
  summary: (date?: string) => [...activityKeys.all, 'summary', date || 'today'] as const,
  feed: (filters: ActivityFeedFilters) => [...activityKeys.all, 'feed', filters] as const,
  profile: (userId: string, month?: number, year?: number) =>
    [...activityKeys.all, 'profile', userId, { month, year }] as const,
  logins: (filters: ActivityLoginFilters) => [...activityKeys.all, 'logins', filters] as const,
};

export function useActivitySummary(date?: string) {
  return useQuery({
    queryKey: activityKeys.summary(date),
    queryFn: () => activityApi.getSummary(date),
    refetchInterval: 15000, // Auto refresh summary every 15s to keep dashboard up to date
  });
}

export function useActivityFeed(filters: ActivityFeedFilters) {
  return useQuery({
    queryKey: activityKeys.feed(filters),
    queryFn: () => activityApi.getFeed(filters),
  });
}

export function useActivityProfile(userId: string, month?: number, year?: number) {
  return useQuery({
    queryKey: activityKeys.profile(userId, month, year),
    queryFn: () => activityApi.getUserProfile(userId, month, year),
    enabled: !!userId,
  });
}

export function useActivityLogins(filters: ActivityLoginFilters) {
  return useQuery({
    queryKey: activityKeys.logins(filters),
    queryFn: () => activityApi.getLoginHistory(filters),
  });
}
