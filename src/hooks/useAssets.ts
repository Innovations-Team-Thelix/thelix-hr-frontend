'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Asset, AssetFilters, CreateAssetInput, UpdateAssetInput, PaginatedResponse } from '@/types';

export function useAssets(filters: AssetFilters = {}) {
  return useQuery<PaginatedResponse<Asset>>({
    queryKey: ['assets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.employeeId) params.set('employeeId', filters.employeeId);
      if (filters.equipmentType) params.set('equipmentType', filters.equipmentType);
      if (filters.condition) params.set('condition', filters.condition);
      if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const res = await api.get<Asset[]>('/assets', { params });
      if (res.pagination) {
        return { data: res.data, pagination: res.pagination, message: res.message };
      }
      return {
        data: res.data,
        pagination: { total: res.data.length, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      };
    },
  });
}

export function useEmployeeAssets(employeeId: string) {
  return useQuery<Asset[]>({
    queryKey: ['assets', 'employee', employeeId],
    queryFn: async () => {
      const res = await api.get<Asset[]>(`/assets/employee/${employeeId}`);
      return res.data;
    },
    enabled: !!employeeId,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAssetInput) => {
      const res = await api.post<Asset>('/assets', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset issued successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to issue asset.');
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAssetInput }) => {
      const res = await api.put<Asset>(`/assets/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset updated successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update asset.');
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete asset.');
    },
  });
}
