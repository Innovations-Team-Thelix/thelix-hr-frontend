'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Employee,
  EmployeeFilters,
  PaginatedResponse,
} from '@/types';
import toast from 'react-hot-toast';

// ─── Query keys ────────────────────────────────────────────

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) =>
    [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
  me: () => [...employeeKeys.all, 'me'] as const,
};

// ─── List employees (paginated + filtered) ─────────────────

export function useEmployees(
  filters: EmployeeFilters = {},
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Employee>>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<PaginatedResponse<Employee>>({
    queryKey: employeeKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.sbuId) params.set('sbuId', filters.sbuId);
      if (filters.departmentId)
        params.set('departmentId', filters.departmentId);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const response = await api.get<Employee[]>('/employees', {
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

// ─── Single employee by ID ─────────────────────────────────

export function useEmployee(
  id: string,
  options?: Omit<UseQueryOptions<Employee>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Employee>({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<Employee>(`/employees/${id}`);
      return response.data;
    },
    enabled: !!id,
    ...options,
  });
}

// ─── Own profile ───────────────────────────────────────────

export function useMyProfile(
  options?: Omit<UseQueryOptions<Employee>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Employee>({
    queryKey: employeeKeys.me(),
    queryFn: async () => {
      const response = await api.get<Employee>('/employees/me');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ─── Create employee (Admin) ───────────────────────────────

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const response = await api.post<Employee>('/employees', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success('Employee created successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to create employee.';
      toast.error(message);
    },
  });
}

// ─── Update employee (Admin, full update) ──────────────────

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Employee>;
    }) => {
      const response = await api.put<Employee>(`/employees/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedEmployee) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.setQueryData(
        employeeKeys.detail(updatedEmployee.id),
        updatedEmployee,
      );
      toast.success('Employee updated successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to update employee.';
      toast.error(message);
    },
  });
}

// ─── Delete employee (Admin) ─────────────────────────────────

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/employees/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      toast.success('Employee deleted successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to delete employee.';
      toast.error(message);
    },
  });
}

// ─── Bulk delete employees (Admin) ───────────────────────────

export function useBulkDeleteEmployees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.post('/employees/bulk-delete', { ids });
      return response.data as { deleted: number; errors: Array<{ id: string; message: string }> };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      if (result.deleted > 0) {
        toast.success(`${result.deleted} employee(s) deleted successfully.`);
      }
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} deletion(s) failed.`);
      }
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to delete employees.';
      toast.error(message);
    },
  });
}

// ─── Update own profile (Employee, limited fields) ─────────

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      phone?: string | null;
      address?: string | null;
      personalEmail?: string | null;
      emergencyContact?: string | null;
      nextOfKinName?: string | null;
      nextOfKinRelationship?: string | null;
      nextOfKinPhone?: string | null;
      maritalStatus?: string | null;
    }) => {
      const response = await api.patch<Employee>('/employees/me', data);
      return response.data;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(employeeKeys.me(), updatedProfile);
      toast.success('Profile updated successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to update profile.';
      toast.error(message);
    },
  });
}
