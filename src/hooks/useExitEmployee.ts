'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export interface ExitEmployeeInput {
  exitType: 'Resignation' | 'Termination';
  exitDate: string;
  reason: string;
  lastWorkingDay?: string;
  notes?: string;
}

export function useExitEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExitEmployeeInput }) => {
      const res = await api.post(`/employees/${id}/exit`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to process employee exit.');
    },
  });
}
