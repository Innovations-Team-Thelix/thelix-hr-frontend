import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  AttendanceFilters,
  AttendanceRecord,
  ApprovalStatus,
  AttendanceImportResult,
  WorkSchedule,
} from '@/types/attendance';
import { PaginatedResponse } from '@/types';
import { toast } from 'react-hot-toast';

export const attendanceKeys = {
  all: ['attendance'] as const,
  list: (filters: AttendanceFilters) =>
    [...attendanceKeys.all, 'list', filters] as const,
};

// --- API Functions ---

// Removed fetchAttendance as it is now integrated into the hook for better control

const clockIn = async (payload: {
  workLocation: 'Onsite' | 'Remote';
  lateReason?: string;
}) => {
  const { data } = await api.post<AttendanceRecord>(
    '/attendance/clock-in',
    payload
  );
  return data;
};

const clockOut = async () => {
  const { data } = await api.post<AttendanceRecord>(
    '/attendance/clock-out'
  );
  return data;
};

const approveAttendance = async ({
  id,
  approved,
  rejectionReason,
}: {
  id: string;
  approved: boolean;
  rejectionReason?: string;
}) => {
  const { data } = await api.patch<AttendanceRecord>(
    `/attendance/${id}/approve`,
    {
      status: approved ? ApprovalStatus.Approved : ApprovalStatus.Rejected,
      rejectionReason,
    }
  );
  return data;
};

const overrideAttendance = async ({
  id,
  ...payload
}: {
  id: string;
  status?: string;
  approvalStatus?: string;
  clockInTime?: string;
  clockOutTime?: string;
  workLocation?: string;
  overrideReason: string;
}) => {
  const { data } = await api.patch<AttendanceRecord>(
    `/attendance/${id}/override`,
    payload
  );
  return data;
};

// --- Hooks ---

export function useAttendance(filters: AttendanceFilters, options?: { enabled?: boolean }) {
  return useQuery<PaginatedResponse<AttendanceRecord>>({
    queryKey: attendanceKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.employeeId) params.set('employeeId', filters.employeeId);
      if (filters.departmentId) params.set('departmentId', filters.departmentId);
      if (filters.sbuId) params.set('sbuId', filters.sbuId);
      if (filters.status) params.set('status', filters.status);
      if (filters.approvalStatus) params.set('approvalStatus', filters.approvalStatus);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const response = await api.get<AttendanceRecord[]>('/attendance', {
        params,
      });

      // Handle server-side pagination if available
      if (response.pagination) {
        return {
          data: response.data,
          pagination: response.pagination,
          message: response.message,
        };
      }

      // Fallback: Client-side pagination and filtering
      let data = response.data;

      // Filter by approvalStatus if backend didn't (client-side fallback)
      if (filters.approvalStatus) {
        data = data.filter((r) => r.approvalStatus === filters.approvalStatus);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const total = data.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const end = start + limit;
      
      const paginatedData = data.slice(start, end);

      return {
        data: paginatedData,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        message: response.message,
      };
    },
    enabled: options?.enabled,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clockIn,
    onSuccess: () => {
      toast.success('Clock-in awaiting approval');
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to clock in');
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clockOut,
    onSuccess: () => {
      toast.success('Clocked out successfully');
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to clock out');
    },
  });
}

export function useApproveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveAttendance,
    onSuccess: (data, variables) => {
      if (variables.approved) {
        toast.success('Clock-in approval successful');
      } else {
        toast.success('Attendance rejected successfully');
      }
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update attendance');
    },
  });
}

export function useOverrideAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: overrideAttendance,
    onSuccess: () => {
      toast.success('Attendance overridden successfully');
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to override attendance');
    },
  });
}

// ─── Bulk import (xlsx/csv) ────────────────────────────────

async function uploadAttendance({ file, dryRun }: { file: File; dryRun?: boolean }) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<AttendanceImportResult>(
    `/attendance/bulk-upload${dryRun ? '?dryRun=true' : ''}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

/** Dry-run preview of an attendance file (no writes). */
export function usePreviewAttendanceImport() {
  return useMutation({
    mutationFn: (file: File) => uploadAttendance({ file, dryRun: true }),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to preview file'),
  });
}

/** Commit an attendance import. */
export function useBulkUploadAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadAttendance({ file, dryRun: false }),
    onSuccess: (res) => {
      toast.success(`Imported ${res.created} new, ${res.updated} updated.`);
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Import failed'),
  });
}

// ─── Bulk approve/reject ───────────────────────────────────

export function useBulkApproveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: string[]; status: ApprovalStatus; rejectionReason?: string }) => {
      const { data } = await api.patch<{ count: number; skipped: number }>(
        '/attendance/bulk-approve',
        payload,
      );
      return data;
    },
    onSuccess: (res) => {
      toast.success(`${res.count} record(s) updated${res.skipped ? `, ${res.skipped} out of scope` : ''}.`);
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Bulk action failed'),
  });
}

// ─── Work schedules ────────────────────────────────────────

export function useWorkSchedules() {
  return useQuery<WorkSchedule[]>({
    queryKey: [...attendanceKeys.all, 'schedules'],
    queryFn: async () => (await api.get<WorkSchedule[]>('/attendance/schedules')).data,
  });
}

export function useSaveWorkSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WorkSchedule>) =>
      (await api.put<WorkSchedule>('/attendance/schedules', payload)).data,
    onSuccess: () => {
      toast.success('Work schedule saved.');
      queryClient.invalidateQueries({ queryKey: [...attendanceKeys.all, 'schedules'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to save schedule'),
  });
}

// ─── Downloads (template / export) ─────────────────────────

async function downloadBlob(path: string, filename: string, params?: Record<string, string>) {
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

export function downloadAttendanceTemplate() {
  return downloadBlob('/attendance/bulk-template', 'attendance-upload-template.xlsx');
}

export function downloadAttendanceExport(
  format: 'csv' | 'xlsx',
  params: { startDate: string; endDate: string; approvalStatus?: string; status?: string },
) {
  return downloadBlob('/attendance/export', `attendance.${format}`, { ...params, format });
}
