import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  AttendanceFilters,
  AttendanceRecord,
  ApprovalStatus,
} from '@/types/attendance';
import { toast } from 'react-hot-toast';

export const attendanceKeys = {
  all: ['attendance'] as const,
  list: (filters: AttendanceFilters) =>
    [...attendanceKeys.all, 'list', filters] as const,
};

// --- API Functions ---

const fetchAttendance = async (filters: AttendanceFilters) => {
  const { data } = await api.get<AttendanceRecord[]>('/attendance', {
    params: filters,
  });
  return data;
};

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
  return useQuery({
    queryKey: attendanceKeys.list(filters),
    queryFn: () => fetchAttendance(filters),
    enabled: options?.enabled,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clockIn,
    onSuccess: () => {
      toast.success('Clocked in successfully');
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
    onSuccess: () => {
      toast.success('Attendance updated successfully');
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
      toast.success('Attendance record overridden.');
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to override attendance');
    },
  });
}
