'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import api from '@/lib/api';
import type { CompanyPolicy } from '@/types';
import toast from 'react-hot-toast';

// ─── Query keys ────────────────────────────────────────────

export const policyKeys = {
  all: ['policies'] as const,
  list: () => [...policyKeys.all, 'list'] as const,
};

// ─── List policies ─────────────────────────────────────────

export function usePolicies(
  options?: Omit<UseQueryOptions<CompanyPolicy[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<CompanyPolicy[]>({
    queryKey: policyKeys.list(),
    queryFn: async () => {
      const response = await api.get<CompanyPolicy[]>('/policies');
      console.log('[usePolicies] List Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    },
    ...options,
  });
}

// ─── Upload policy (Admin) ─────────────────────────────────

export interface UploadPolicyInput {
  title: string;
  file: File;
}

export function useUploadPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, file }: UploadPolicyInput) => {
            const formData = new FormData();
      formData.append('title', title);
      formData.append('file', file);

      // Log request payload
      const payload: Record<string, any> = {};
      formData.forEach((value, key) => {
        // For File objects, log metadata instead of the whole object
        if (value instanceof File) {
          payload[key] = { name: value.name, size: value.size, type: value.type };
        } else {
          payload[key] = value;
        }
      });
      console.log('[useUploadPolicy] Upload Request:', JSON.stringify(payload, null, 2));

      const response = await api.post<CompanyPolicy>('/policies/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('[useUploadPolicy] Upload Response:', JSON.stringify(response.data, null, 2));
      return response.data;

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.list() });
      toast.success('Policy uploaded successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to upload policy.';
      toast.error(message);
    },
  });
}

// ─── Delete policy (Admin) ─────────────────────────────────

export function useDeletePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.list() });
      toast.success('Policy deleted successfully.');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to delete policy.';
      toast.error(message);
    },
  });
}

// ─── Download policy ───────────────────────────────────────

export function useDownloadPolicy() {
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const response = await api.get<any>(`/policies/${id}/download`);
        console.log('[useDownloadPolicy] Download Response:', JSON.stringify(response, null, 2));
        
        // 1. Standard format: { data: { downloadUrl: "..." } }
        // api.get returns the body, so response = { data: { downloadUrl: ... } }
        if (response?.data?.downloadUrl) {
          return response.data.downloadUrl;
        }
        
        // 3. Nested data format (sometimes happen with double wrapping): { data: { data: { downloadUrl: ... } } }
        if ((response as any)?.data?.data?.downloadUrl) {
            return (response as any).data.data.downloadUrl;
        }

        console.error('Download URL missing. Response keys:', Object.keys(response || {}));
        throw new Error("Download URL not found in response");

} catch (error: any) {
        // If the download endpoint is missing (404), try fetching the policy details
        // which might contain the signedUrl
        if (error.response?.status === 404 || error.response?.status === 401) {
          try {
            const detailResponse = await api.get<CompanyPolicy>(
              `/policies/${id}`,
            );
            if (detailResponse.data.signedUrl) {
              return detailResponse.data.signedUrl;
            }
          } catch {
            // If detail fetch also fails, throw the original error
            throw error;
          }
        }
        throw error;
      }
    },
    onError: (error: any) => {
      console.error('Download policy error:', error);
      const message =
        error?.response?.data?.message ||
        (error?.response?.status
          ? `Failed to get download URL (Status: ${error.response.status})`
          : 'Failed to get download URL.');
      toast.error(message);
    },
  });
}
