'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitReturnToWork } from '@/hooks/useLeave';
import { formatDate } from '@/lib/utils';

interface ReturnToWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequestId: string;
  expectedReturnDate: string;
}

interface ReturnToWorkForm {
  actualReturnDate: string;
  returnNote: string;
  attachments: FileList;
}

export function ReturnToWorkModal({
  isOpen,
  onClose,
  leaveRequestId,
  expectedReturnDate,
}: ReturnToWorkModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReturnToWorkForm>({
    defaultValues: {
      actualReturnDate: new Date().toISOString().split('T')[0],
    },
  });

  const submitReturnToWork = useSubmitReturnToWork();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onSubmit = (data: ReturnToWorkForm) => {
    const attachments = data.attachments && data.attachments.length > 0
      ? Array.from(data.attachments)
      : undefined;

    submitReturnToWork.mutate(
      {
        id: leaveRequestId,
        actualReturnDate: data.actualReturnDate,
        returnNote: data.returnNote,
        attachments,
      },
      {
        onSuccess: () => {
          reset();
          setSelectedFile(null);
          onClose();
        },
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Return to Work"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Expected return date: <span className="font-medium text-gray-900">{formatDate(expectedReturnDate)}</span>
          </p>
        </div>

        <Input
          label="Actual Return Date"
          type="date"
          {...register('actualReturnDate', { required: 'Return date is required' })}
          error={errors.actualReturnDate?.message}
        />

        <Textarea
          label="Return Note (Optional)"
          placeholder="Any notes about your return..."
          {...register('returnNote')}
          error={errors.returnNote?.message}
        />

        <div className="w-full">
          <label
            htmlFor="rtw-file-upload"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Attachment (Optional)
          </label>
          <input
            id="rtw-file-upload"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
            {...register('attachments', { 
              onChange: handleFileChange
            })}
          />
          <p className="mt-1 text-xs text-gray-500">
            Upload any relevant documents (e.g., medical clearance).
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitReturnToWork.isPending}>
            Confirm Return
          </Button>
        </div>
      </form>
    </Modal>
  );
}
