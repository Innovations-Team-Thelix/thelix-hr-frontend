'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginationMeta } from '@/types';
import type { NewHire, NewHireCounts, NewHireStatus } from '@/types/new-hires';

/** Who sees New Hires: the roles that may add employees (POST /employees). */
export const NEW_HIRE_ROLES: readonly string[] = ['CVO', 'Admin'];

export const newHireKeys = {
  all: ['new-hires'] as const,
  list: (status: NewHireStatus, page: number, search: string) =>
    [...newHireKeys.all, 'list', status, page, search] as const,
  counts: () => [...newHireKeys.all, 'counts'] as const,
  detail: (id: string) => [...newHireKeys.all, 'detail', id] as const,
};

/** Hired candidates from Thelix Talent, by status. CVO and Admin only. */
export function useNewHires(status: NewHireStatus, page = 1, search = '', limit = 20) {
  return useQuery<{ data: NewHire[]; pagination: PaginationMeta }>({
    queryKey: newHireKeys.list(status, page, search),
    queryFn: async () => {
      const res = await api.get<NewHire[]>('/new-hires', {
        params: { status, page, limit, ...(search ? { search } : {}) },
      });
      return { data: res.data, pagination: res.pagination! };
    },
  });
}

/** Per-status counts, for the nav badge and tabs. */
export function useNewHireCounts(enabled = true) {
  return useQuery<NewHireCounts>({
    queryKey: newHireKeys.counts(),
    queryFn: async () => (await api.get<NewHireCounts>('/new-hires/counts')).data,
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useNewHire(id: string) {
  return useQuery<NewHire>({
    queryKey: newHireKeys.detail(id),
    queryFn: async () => (await api.get<NewHire>(`/new-hires/${id}`)).data,
    enabled: !!id,
  });
}

/** Creates the employee (same rules as Add Employee) and marks the new hire converted. */
export function useConvertNewHire(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post<{ newHire: NewHire; employee: { id: string } }>(`/new-hires/${id}/convert`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newHireKeys.all });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDismissNewHire(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) =>
      (await api.post<NewHire>(`/new-hires/${id}/dismiss`, { reason })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newHireKeys.all });
    },
  });
}
