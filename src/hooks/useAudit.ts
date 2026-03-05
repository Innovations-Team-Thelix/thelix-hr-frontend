'use client';

import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResponse } from '@/types';
import type { AuditLog, AuditQuery } from '@/types/audit';

// ─── Query keys ────────────────────────────────────────────

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: AuditQuery) => [...auditKeys.lists(), filters] as const,
};

// ─── List audit logs (paginated + filtered) ─────────────────

export function useAuditLogs(
  filters: AuditQuery = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<AuditLog>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<PaginatedResponse<AuditLog>>({
    queryKey: auditKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.entityId) params.set('entityId', filters.entityId);
      if (filters.action) params.set('action', filters.action);
      if (filters.actorId) params.set('actorId', filters.actorId);
      if (filters.sbuId) params.set('sbuId', filters.sbuId);
      if (filters.departmentId) params.set('departmentId', filters.departmentId);
      if (filters.employmentStatus) params.set('employmentStatus', filters.employmentStatus);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const response = await api.get<AuditLog[]>('/audit-logs', {
        params,
      });

      return {
        data: response.data,
        pagination: response.pagination!,
        message: response.message,
      };
    },
    ...options,
  });
}
