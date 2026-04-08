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
  balances: () => [...leaveKeys.all, 'balances'] as const,
  myBalances: (year?: number) =>
    [...leaveKeys.balances(), 'me', year] as const,
  calendar: (sbuId?: string, start?: string, end?: string) =>
    [...leaveKeys.all, 'calendar', { sbuId, start, end }] as const,
};

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
      relieveOfficerId: string;
      attachments?: File[];
    }) => {
      const formData = new FormData();
      formData.append('leaveTypeId', data.leaveTypeId);
      formData.append('startDate', data.startDate);
      formData.append('endDate', data.endDate);
      formData.append('relieveOfficerId', data.relieveOfficerId);
      if (data.reason) formData.append('reason', data.reason);
      if (data.attachments) {
        data.attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await api.post<LeaveRequest>('/leave-requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.requests() });
      queryClient.invalidateQueries({ queryKey: leaveKeys.balances() });
      toast.success('Leave request submitted successfully.');
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
