'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { employeeKeys } from './useEmployees';

// ─── Upload Offer Letter (Admin) ───────────────────────────

export function useUploadOfferLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      file,
    }: {
      employeeId: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(
        `/employees/${employeeId}/offer-letter`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.employeeId) });
      toast.success('Offer letter uploaded successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to upload offer letter.';
      toast.error(message);
    },
  });
}

// ─── Download Offer Letter ─────────────────────────────────

export function useDownloadOfferLetter() {
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await api.get<{ downloadUrl: string }>(
        `/employees/${employeeId}/offer-letter`,
      );
      return response.data.downloadUrl;
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to get download URL.';
      toast.error(message);
    },
  });
}

// ─── Delete Offer Letter (Admin) ───────────────────────────

export function useDeleteOfferLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      await api.delete(`/employees/${employeeId}/offer-letter`);
    },
    onSuccess: (data, employeeId) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employeeId) });
      toast.success('Offer letter deleted successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to delete offer letter.';
      toast.error(message);
    },
  });
}
