'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useManageProbation } from '@/hooks/useEmployees';
import { Loader2 } from 'lucide-react';

const probationActionSchema = z.object({
  action: z.enum(['Confirm', 'Extend', 'Convert']),
  newEndDate: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.action === 'Extend' && !data.newEndDate) {
    return false;
  }
  return true;
}, {
  message: "New End Date is required for extension",
  path: ["newEndDate"],
});

type ProbationActionFormData = z.infer<typeof probationActionSchema>;

interface ProbationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function ProbationActionModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: ProbationActionModalProps) {
  const { mutateAsync: manageProbation, isPending } = useManageProbation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ProbationActionFormData>({
    resolver: zodResolver(probationActionSchema),
    defaultValues: {
      action: 'Confirm',
    },
  });

  const selectedAction = watch('action');

  const onSubmit = async (data: ProbationActionFormData) => {
    try {
      await manageProbation({
        id: employeeId,
        data: {
            action: data.action,
            newEndDate: data.newEndDate,
            notes: data.notes
        },
      });
      reset();
      onClose();
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Probation: ${employeeName}`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Action</label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="Confirm"
                {...register('action')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-900">Confirm</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="Extend"
                {...register('action')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-900">Extend</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                value="Convert"
                {...register('action')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-900">Convert</span>
            </label>
          </div>
          {errors.action && (
            <p className="text-sm text-red-500">{errors.action.message}</p>
          )}
        </div>

        {selectedAction === 'Extend' && (
          <Input
            type="date"
            label="New Probation End Date"
            {...register('newEndDate')}
            error={errors.newEndDate?.message}
            required
          />
        )}

        <Textarea
          label="Notes"
          {...register('notes')}
          placeholder="Add any notes regarding this action..."
          rows={3}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
}
