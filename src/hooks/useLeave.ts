'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  LeaveRequest,
  LeaveBalance,
  LeaveRequestFilters,
  LeaveStatus,
  PaginatedResponse,
  LeaveCalendarEntry,
  LeaveType,
  PublicHoliday,
  LeaveBlackoutDate,
  LeaveTransaction,
  ApproverDelegation,
  LeaveAnalytics,
  AuditLogEntry,
} from '@/types';
import toast from 'react-hot-toast';

// ─── Query keys ────────────────────────────────────────────

export const leaveKeys = {
  all: ['leave'] as const,
  requests: () => [...leaveKeys.all, 'requests'] as const,
  requestList: (filters: LeaveRequestFilters) =>
    [...leaveKeys.requests(), filters] as const,
  requestDetail: (id: string) =>
    [...leaveKeys.requests(), 'detail', id] as const,
  audit: (id: string) => [...leaveKeys.requests(), 'audit', id] as const,
  balances: () => [...leaveKeys.all, 'balances'] as const,
  myBalances: (year?: number) =>
    [...leaveKeys.balances(), 'me', year] as const,
  calendar: (sbuId?: string, start?: string, end?: string) =>
    [...leaveKeys.all, 'calendar', { sbuId, start, end }] as const,
  types: () => [...leaveKeys.all, 'types'] as const,
  holidays: (year?: number) => [...leaveKeys.all, 'holidays', year] as const,
  blackouts: () => [...leaveKeys.all, 'blackouts'] as const,
  delegations: (delegatorId?: string) => [...leaveKeys.all, 'delegations', delegatorId] as const,
  ledger: (employeeId?: string, leaveTypeId?: string, year?: number) =>
    [...leaveKeys.all, 'ledger', { employeeId, leaveTypeId, year }] as const,
  analytics: (year?: number) => [...leaveKeys.all, 'analytics', year] as const,
  settings: () => [...leaveKeys.all, 'settings'] as const,
};

// ─── Admin: Leave Type CRUD ────────────────────────────────

export function useLeaveTypeMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: leaveKeys.types() });
    qc.invalidateQueries({ queryKey: ['leave-types'] });
  };

  const create = useMutation({
    mutationFn: async (data: Partial<LeaveType>) =>
      (await api.post<LeaveType>('/leave-types', data)).data,
    onSuccess: () => { invalidate(); toast.success('Leave type created.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create leave type.'),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeaveType> }) =>
      (await api.put<LeaveType>(`/leave-types/${id}`, data)).data,
    onSuccess: () => { invalidate(); toast.success('Leave type updated.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update leave type.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/leave-types/${id}`)).data,
    onSuccess: () => { invalidate(); toast.success('Leave type removed.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove leave type.'),
  });

  return { create, update, remove };
}

/** Re-apply a leave type's role-based entitlement to current-year balances. */
export function useApplyEntitlements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, year }: { id: string; year?: number }) =>
      (await api.post<{ year: number; created: number; updated: number; employees: number }>(
        `/leave-types/${id}/apply-entitlements`,
        year ? { year } : {},
      )).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: leaveKeys.balances() });
      toast.success(`Entitlements applied for ${data.year}: ${data.created} created, ${data.updated} updated.`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to apply entitlements.'),
  });
}

// ─── Admin: Public Holidays ────────────────────────────────

export function useHolidays(year?: number) {
  return useQuery<PublicHoliday[]>({
    queryKey: leaveKeys.holidays(year),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      return (await api.get<PublicHoliday[]>('/leave-holidays', { params })).data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useHolidayMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [...leaveKeys.all, 'holidays'] });

  const create = useMutation({
    mutationFn: async (data: Partial<PublicHoliday>) =>
      (await api.post<PublicHoliday>('/leave-holidays', data)).data,
    onSuccess: () => { invalidate(); toast.success('Holiday added.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add holiday.'),
  });
  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PublicHoliday> }) =>
      (await api.put<PublicHoliday>(`/leave-holidays/${id}`, data)).data,
    onSuccess: () => { invalidate(); toast.success('Holiday updated.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update holiday.'),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/leave-holidays/${id}`)).data,
    onSuccess: () => { invalidate(); toast.success('Holiday removed.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove holiday.'),
  });
  return { create, update, remove };
}

// ─── Admin: Restricted (blackout) periods ──────────────────

export function useBlackouts() {
  return useQuery<LeaveBlackoutDate[]>({
    queryKey: leaveKeys.blackouts(),
    queryFn: async () => (await api.get<LeaveBlackoutDate[]>('/leave-blackouts')).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBlackoutMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: leaveKeys.blackouts() });

  const create = useMutation({
    mutationFn: async (data: Partial<LeaveBlackoutDate>) =>
      (await api.post<LeaveBlackoutDate>('/leave-blackouts', data)).data,
    onSuccess: () => { invalidate(); toast.success('Restricted period added.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add restricted period.'),
  });
  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeaveBlackoutDate> }) =>
      (await api.put<LeaveBlackoutDate>(`/leave-blackouts/${id}`, data)).data,
    onSuccess: () => { invalidate(); toast.success('Restricted period updated.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update restricted period.'),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/leave-blackouts/${id}`)).data,
    onSuccess: () => { invalidate(); toast.success('Restricted period removed.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove restricted period.'),
  });
  return { create, update, remove };
}

// ─── Approver delegations ──────────────────────────────────

export function useDelegations(delegatorId?: string) {
  return useQuery<ApproverDelegation[]>({
    queryKey: leaveKeys.delegations(delegatorId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (delegatorId) params.set('delegatorId', delegatorId);
      return (await api.get<ApproverDelegation[]>('/leave-delegations', { params })).data;
    },
  });
}

export function useDelegationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [...leaveKeys.all, 'delegations'] });

  const create = useMutation({
    mutationFn: async (data: { delegateId: string; startDate: string; endDate: string; reason?: string; delegatorId?: string }) =>
      (await api.post<ApproverDelegation>('/leave-delegations', data)).data,
    onSuccess: () => { invalidate(); toast.success('Delegation created.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create delegation.'),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/leave-delegations/${id}`)).data,
    onSuccess: () => { invalidate(); toast.success('Delegation removed.'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove delegation.'),
  });
  return { create, remove };
}

// ─── Balance administration & ledger ───────────────────────

export function useAdjustBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { employeeId: string; leaveTypeId: string; days: number; reason: string; year?: number }) =>
      (await api.post('/leave-balances/adjust', data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.balances() });
      qc.invalidateQueries({ queryKey: [...leaveKeys.all, 'ledger'] });
      toast.success('Balance adjusted.');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to adjust balance.'),
  });
}

export interface LeaveSettings {
  id: string;
  maxConcurrentPerGroup: number | null;
}

export function useLeaveSettings() {
  return useQuery({
    queryKey: leaveKeys.settings(),
    queryFn: async () => (await api.get<LeaveSettings>('/leave-settings')).data,
  });
}

export function useUpdateLeaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { maxConcurrentPerGroup: number | null }) =>
      (await api.put<LeaveSettings>('/leave-settings', data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.settings() });
      toast.success('Coverage policy updated.');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed.'),
  });
}

export function useRunRollover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (year?: number) =>
      (await api.post<{ toYear: number; balancesCreated: number; carryOversApplied: number }>('/leave-balances/rollover', { year })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: leaveKeys.balances() });
      toast.success(`Rollover to ${data.toYear}: ${data.balancesCreated} balances, ${data.carryOversApplied} carryovers.`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Rollover failed.'),
  });
}

export function useBalanceLedger(opts: { employeeId?: string; leaveTypeId?: string; year?: number } = {}) {
  return useQuery<LeaveTransaction[]>({
    queryKey: leaveKeys.ledger(opts.employeeId, opts.leaveTypeId, opts.year),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts.employeeId) params.set('employeeId', opts.employeeId);
      if (opts.leaveTypeId) params.set('leaveTypeId', opts.leaveTypeId);
      if (opts.year) params.set('year', String(opts.year));
      return (await api.get<LeaveTransaction[]>('/leave-ledger', { params })).data;
    },
  });
}

// ─── Analytics & exports ───────────────────────────────────

export function useLeaveAnalytics(year?: number) {
  return useQuery<LeaveAnalytics>({
    queryKey: leaveKeys.analytics(year),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      return (await api.get<LeaveAnalytics>('/leave-analytics', { params })).data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Trigger a CSV/ICS file download from a leave-reports endpoint. */
export async function downloadLeaveFile(path: string, filename: string, params?: Record<string, string>) {
  try {
    const res = await api.instance.get(path, { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    toast.error('Download failed.');
  }
}

// ─── List leave requests ───────────────────────────────────

export function useLeaveRequests(
  filters: LeaveRequestFilters = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<LeaveRequest>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<PaginatedResponse<LeaveRequest>>({
    queryKey: leaveKeys.requestList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.employeeId) params.set('employeeId', filters.employeeId);
      if (filters.status) params.set('status', filters.status);
      if (filters.stage) params.set('stage', filters.stage);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const response = await api.get<LeaveRequest[]>('/leave-requests', {
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

// ─── Single leave request (detail, with signed-URL attachments) ────

export function useLeaveRequest(
  id: string | null | undefined,
  enabled = true,
) {
  return useQuery<LeaveRequest>({
    queryKey: leaveKeys.requestDetail(id ?? ''),
    queryFn: async () => (await api.get<LeaveRequest>(`/leave-requests/${id}`)).data,
    enabled: !!id && enabled,
    staleTime: 30 * 1000,
  });
}

// ─── Employee leave balances (admin) ──────────────────────

export function useEmployeeLeaveBalances(
  employeeId: string | null | undefined,
  year?: number,
  options?: Omit<UseQueryOptions<LeaveBalance[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<LeaveBalance[]>({
    queryKey: [...leaveKeys.balances(), 'employee', employeeId, year] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (employeeId) params.set('employeeId', employeeId);
      if (year) params.set('year', String(year));
      const response = await api.get<LeaveBalance[]>('/leave-balances', { params });
      return response.data;
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

// ─── My leave balances ─────────────────────────────────────

export function useMyLeaveBalances(
  year?: number,
  options?: Omit<UseQueryOptions<LeaveBalance[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<LeaveBalance[]>({
    queryKey: leaveKeys.myBalances(year),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));

      const response = await api.get<LeaveBalance[]>('/leave-balances/me', {
        params,
      });

      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

// ─── Create leave request ──────────────────────────────────

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason?: string;
      handoverNote?: string;
      relieveOfficerId: string;
      attachments?: File[];
      onBehalfOfEmployeeId?: string;
      overrideCoverage?: boolean;
      overrideReason?: string;
    }) => {
      const formData = new FormData();
      formData.append('leaveTypeId', data.leaveTypeId);
      formData.append('startDate', data.startDate);
      formData.append('endDate', data.endDate);
      formData.append('relieveOfficerId', data.relieveOfficerId);
      if (data.reason) formData.append('reason', data.reason);
      if (data.handoverNote) formData.append('handoverNote', data.handoverNote);
      if (data.onBehalfOfEmployeeId) formData.append('onBehalfOfEmployeeId', data.onBehalfOfEmployeeId);
      if (data.overrideCoverage) formData.append('overrideCoverage', 'true');
      if (data.overrideReason) formData.append('overrideReason', data.overrideReason);
      if (data.attachments) {
        data.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await api.post<LeaveRequest & { coverageWarning?: string | null }>(
        '/leave-requests',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      const wasAutoApproved = data?.status === 'Approved';
      toast.success(wasAutoApproved ? 'Leave request auto-approved.' : 'Leave request submitted successfully.');
      if (data?.coverageWarning) {
        toast(data.coverageWarning, { icon: '⚠️', duration: 6000 });
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to submit leave request.';
      toast.error(message);
    },
  });
}

// ─── Supervisor action (Approve / Reject) ──────────────────

export function useSupervisorAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      note,
    }: {
      id: string;
      action: 'Approved' | 'Rejected';
      note?: string;
    }) => {
      const response = await api.post<LeaveRequest>(
        `/leave-requests/${id}/supervisor-action`,
        { action, note },
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.requestDetail(variables.id),
      });
      const actionLabel =
        variables.action === 'Approved' ? 'approved' : 'rejected';
      toast.success(`Leave request ${actionLabel} by supervisor.`);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to process supervisor action.';
      toast.error(message);
    },
  });
}

// ─── HR action (Approve / Reject) ──────────────────────────

export function useHrAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      note,
    }: {
      id: string;
      action: 'Approved' | 'Rejected';
      note?: string;
    }) => {
      const response = await api.post<LeaveRequest>(
        `/leave-requests/${id}/hr-action`,
        { action, note },
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.requestDetail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      const actionLabel =
        variables.action === 'Approved' ? 'approved' : 'rejected';
      toast.success(`Leave request ${actionLabel} by HR.`);
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to process HR action.';
      toast.error(message);
    },
  });
}

// ─── HR document upload ────────────────────────────────────

export function useAddHrAttachments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, attachments }: { id: string; attachments: File[] }) => {
      const formData = new FormData();
      attachments.forEach((file) => formData.append('attachments', file));

      const response = await api.post<LeaveRequest>(
        `/leave-requests/${id}/hr-attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.requestDetail(variables.id) });
      queryClient.invalidateQueries({ queryKey: leaveKeys.audit(variables.id) });
      toast.success('Document(s) uploaded.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to upload document(s).');
    },
  });
}

// ─── Leave request audit trail ─────────────────────────────

export function useLeaveAuditTrail(id: string | null | undefined, enabled = true) {
  return useQuery<AuditLogEntry[]>({
    queryKey: leaveKeys.audit(id ?? ''),
    queryFn: async () => (await api.get<AuditLogEntry[]>(`/leave-requests/${id}/audit`)).data,
    enabled: !!id && enabled,
    staleTime: 30 * 1000,
  });
}

// ─── Reliever action (Accept / Decline) ───────────────────

export function useRelieverAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      action,
      note,
    }: {
      id: string;
      action: 'Approved' | 'Rejected';
      note?: string;
    }) => {
      const response = await api.post<LeaveRequest>(
        `/leave-requests/${id}/reliever-action`,
        { action, note },
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.requestDetail(variables.id),
      });
      const actionLabel = variables.action === 'Approved' ? 'accepted' : 'declined';
      toast.success(`Relieve officer request ${actionLabel}.`);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to process reliever action.';
      toast.error(message);
    },
  });
}

// ─── Send approval reminder ───────────────────────────────

export function useSendApprovalReminder() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ sentTo: string }>(`/leave-requests/${id}/send-reminder`);
      return response.data;
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to send reminder.';
      toast.error(message);
    },
  });
}

// ─── Cancel leave request ──────────────────────────────────

export function useCancelLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<LeaveRequest>(
        `/leave-requests/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      toast.success('Leave request cancelled.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to cancel leave request.';
      toast.error(message);
    },
  });
}

// ─── Submit Return to Work ─────────────────────────────────

export function useSubmitReturnToWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      actualReturnDate,
      returnNote,
      attachments,
    }: {
      id: string;
      actualReturnDate: string;
      returnNote?: string;
      attachments?: File[];
    }) => {
      const formData = new FormData();
      formData.append('actualReturnDate', actualReturnDate);
      if (returnNote) formData.append('returnNote', returnNote);
      if (attachments) {
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await api.post<LeaveRequest>(
        `/leave-requests/${id}/return-to-work`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: leaveKeys.requestDetail(variables.id),
      });
      toast.success('Return to work submitted successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to submit return to work.';
      toast.error(message);
    },
  });
}

// ─── Leave calendar ────────────────────────────────────────

export function useLeaveCalendar(
  params: {
    sbuId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
  options?: Omit<
    UseQueryOptions<LeaveCalendarEntry[]>,
    'queryKey' | 'queryFn'
  >,
) {
  const { sbuId, startDate, endDate } = params;

  return useQuery<LeaveCalendarEntry[]>({
    queryKey: leaveKeys.calendar(sbuId, startDate, endDate),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (sbuId) searchParams.set('sbuId', sbuId);
      if (startDate) searchParams.set('startDate', startDate);
      if (endDate) searchParams.set('endDate', endDate);

      const response = await api.get<LeaveCalendarEntry[]>(
        '/leave-calendar',
        { params: searchParams },
      );

      return response.data;
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
