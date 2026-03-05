'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type { EmployeeDocument, DocumentType } from '@/types';
import toast from 'react-hot-toast';

// ─── Query keys ────────────────────────────────────────────

export const documentKeys = {
  all: ['documents'] as const,
  mine: () => [...documentKeys.all, 'mine'] as const,
  employee: (employeeId: string) => [...documentKeys.all, 'employee', employeeId] as const,
  detail: (id: string) => [...documentKeys.all, id] as const,
};

// ─── List my documents ─────────────────────────────────────

export function useMyDocuments(
  options?: Omit<UseQueryOptions<EmployeeDocument[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<EmployeeDocument[]>({
    queryKey: documentKeys.mine(),
    queryFn: async () => {
      const response = await api.get<EmployeeDocument[]>('/documents/me');
      return response.data || [];
    },
    ...options,
  });
}

// ─── List employee documents (Admin) ───────────────────────

export function useEmployeeDocuments(
  employeeId: string,
  options?: Omit<UseQueryOptions<EmployeeDocument[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<EmployeeDocument[]>({
    queryKey: documentKeys.employee(employeeId),
    queryFn: async () => {
      const response = await api.get<EmployeeDocument[]>(`/documents/employee/${employeeId}`);
      return response.data || [];
    },
    enabled: !!employeeId,
    ...options,
  });
}

// ─── Upload document ───────────────────────────────────────

export interface UploadDocumentInput {
  file: File;
  type: DocumentType;
  employeeId?: string;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, type, employeeId }: UploadDocumentInput) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (employeeId) {
        formData.append('employeeId', employeeId);
      }

      const response = await api.post<EmployeeDocument>('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success('Document uploaded successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to upload document.';
      toast.error(message);
    },
  });
}

// ─── Delete document ───────────────────────────────────────

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success('Document deleted successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to delete document.';
      toast.error(message);
    },
  });
}

// ─── Get download URL ──────────────────────────────────────

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.get<{ downloadUrl: string }>(`/documents/${id}/download`);
      return response.data.downloadUrl;
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to get download URL.';
      toast.error(message);
    },
  });
}
