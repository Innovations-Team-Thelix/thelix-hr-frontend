'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useUploadDocument } from '@/hooks/useDocuments';
import { DocumentType } from '@/types';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
}

const DOCUMENT_TYPES: { label: string; value: DocumentType }[] = [
  { label: 'Resume', value: 'Resume' },
  { label: 'Offer Letter', value: 'OfferLetter' },
  { label: 'Employment Contract', value: 'EmploymentContract' },
  { label: 'Promotion Letter', value: 'PromotionLetter' },
  { label: 'Warning Letter', value: 'WarningLetter' },
  { label: 'NDA', value: 'NDA' },
  { label: 'Confidentiality Agreement', value: 'ConfidentialityAgreement' },
  { label: 'Tax Form', value: 'TaxForm' },
  { label: 'Identification', value: 'Identification' },
  { label: 'Policy Acknowledgment', value: 'PolicyAcknowledgment' },
  { label: 'Certification', value: 'Certification' },
  { label: 'Other', value: 'Other' },
];

export function UploadDocumentModal({ isOpen, onClose, employeeId }: UploadDocumentModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    type: DocumentType;
    file: FileList;
  }>();

  const uploadMutation = useUploadDocument();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onSubmit = (data: { type: DocumentType; file: FileList }) => {
    if (!data.file || data.file.length === 0) return;
    
    uploadMutation.mutate(
      {
        type: data.type,
        file: data.file[0],
        employeeId,
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
      title="Upload Document"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Document Type"
          options={DOCUMENT_TYPES}
          {...register('type', { required: 'Document type is required' })}
          error={errors.type?.message}
        />

        <div className="w-full">
          <label
            htmlFor="file-upload"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            File <span className="ml-0.5 text-danger">*</span>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
            {...register('file', { 
              required: 'File is required',
              onChange: handleFileChange
            })}
          />
          {errors.file && (
            <p className="mt-1.5 text-xs text-danger" role="alert">
              {errors.file.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Max 5MB. PDF, DOC, DOCX, JPG, PNG.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={uploadMutation.isPending}
            disabled={uploadMutation.isPending}
          >
            Upload
          </Button>
        </div>
      </form>
    </Modal>
  );
}
