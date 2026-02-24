'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  WorkforceStats,
  LeaveStats,
  SalaryStats,
  CelebrationsData,
} from '@/types';

// ─── Query keys ────────────────────────────────────────────

export const dashboardKeys = {
  all: ['dashboard'] as const,
  workforce: (sbuId?: string) =>
    [...dashboardKeys.all, 'workforce', { sbuId }] as const,
  leave: (sbuId?: string) =>
    [...dashboardKeys.all, 'leave', { sbuId }] as const,
  salary: (sbuId?: string) =>
    [...dashboardKeys.all, 'salary', { sbuId }] as const,
  celebrations: () => [...dashboardKeys.all, 'celebrations'] as const,
};

// ─── Workforce stats ──────────────────────────────────────

export function useWorkforceStats(
  sbuId?: string,
  options?: Omit<UseQueryOptions<WorkforceStats>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<WorkforceStats>({
    queryKey: dashboardKeys.workforce(sbuId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sbuId) params.set('sbuId', sbuId);

      const response = await api.get<WorkforceStats>(
        '/dashboard/workforce',
        { params },
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ─── Leave stats ──────────────────────────────────────────

export function useLeaveStats(
  sbuId?: string,
  options?: Omit<UseQueryOptions<LeaveStats>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<LeaveStats>({
    queryKey: dashboardKeys.leave(sbuId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sbuId) params.set('sbuId', sbuId);

      const response = await api.get<LeaveStats>('/dashboard/leave', {
        params,
      });
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ─── Salary stats ─────────────────────────────────────────

export function useSalaryStats(
  sbuId?: string,
  options?: Omit<UseQueryOptions<SalaryStats>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<SalaryStats>({
    queryKey: dashboardKeys.salary(sbuId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sbuId) params.set('sbuId', sbuId);

      const response = await api.get<SalaryStats>('/dashboard/salary', {
        params,
      });
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ─── Celebrations (birthdays + anniversaries) ─────────────

export function useCelebrations(
  options?: Omit<UseQueryOptions<CelebrationsData>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<CelebrationsData>({
    queryKey: dashboardKeys.celebrations(),
    queryFn: async () => {
      const response = await api.get<CelebrationsData>(
        '/dashboard/celebrations',
      );
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes — celebrations rarely change intraday
    refetchOnWindowFocus: false,
    ...options,
  });
}
