'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  RosterEntry,
  RosterQuery,
  GenerateRosterInput,
  OverrideRosterInput,
  RosterGenerationResult,
} from '@/types';
import toast from 'react-hot-toast';

// ─── Query keys ────────────────────────────────────────────

export const rosterKeys = {
  all: ['roster'] as const,
  lists: () => [...rosterKeys.all, 'list'] as const,
  list: (query: RosterQuery) => [...rosterKeys.lists(), query] as const,
};

// ─── Query roster entries ──────────────────────────────────

export function useRoster(
  query: RosterQuery,
  options?: Omit<UseQueryOptions<RosterEntry[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<RosterEntry[]>({
    queryKey: rosterKeys.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (query.departmentId) params.set('departmentId', query.departmentId);
      if (query.sbuId) params.set('sbuId', query.sbuId);
      params.set('startDate', query.startDate);
      params.set('endDate', query.endDate);

      const response = await api.get<RosterEntry[]>('/roster', { params });
      return response.data;
    },
    enabled: !!query.startDate && !!query.endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ─── Generate roster (Admin) ───────────────────────────────

export function useGenerateRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateRosterInput) => {
      const response = await api.post<RosterGenerationResult>(
        '/roster/generate',
        data,
      );
      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: rosterKeys.lists() });

      if (result.warnings && result.warnings.length > 0) {
        toast.success('Roster generated with warnings.', {
          duration: 5000,
        });
        result.warnings.forEach((warning) => {
          toast(warning, {
            icon: '\u26a0\ufe0f',
            duration: 6000,
          });
        });
      } else {
        toast.success('Roster generated successfully.');
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to generate roster.';
      toast.error(message);
    },
  });
}

// ─── Override roster entry (Admin) ─────────────────────────

export function useOverrideRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OverrideRosterInput) => {
      const response = await api.put<{ success: boolean }>(
        '/roster/entries',
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rosterKeys.lists() });
      toast.success('Roster entry overridden successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to override roster entry.';
      toast.error(message);
    },
  });
}
