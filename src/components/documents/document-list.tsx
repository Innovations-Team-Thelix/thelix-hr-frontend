'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyDocuments, useEmployeeDocuments, useDeleteDocument, useDownloadDocument } from '@/hooks/useDocuments';
import { Download, Trash2, FileText, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDocumentType(type: string): string {
  // Add spaces before capital letters and trim
  return type.replace(/([A-Z])/g, ' $1').trim();
}

interface DocumentListProps {
  employeeId?: string;
}

export function DocumentList({ employeeId }: DocumentListProps) {
  const { data: myDocuments, isLoading: myLoading, isError: myError } = useMyDocuments({
    enabled: !employeeId,
  });

  const { data: empDocuments, isLoading: empLoading, isError: empError } = useEmployeeDocuments(
    employeeId || '',
    {
      enabled: !!employeeId,
    }
  );

  const documents = employeeId ? empDocuments : myDocuments;
  const isLoading = employeeId ? empLoading : myLoading;
  const isError = (employeeId ? empError : myError) && !isLoading;

  const deleteMutation = useDeleteDocument();
  const downloadMutation = useDownloadDocument();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownload = (id: string, fileName: string) => {
    downloadMutation.mutate(id, {
      onSuccess: (url) => {
        // Create a temporary link and click it to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 text-center text-danger">
        Failed to load documents. Please try again later.
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
        <div className="rounded-full bg-gray-50 p-4">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-gray-900">No documents</h3>
        <p className="mt-1 text-sm text-gray-500">
          {employeeId
            ? "No documents found for this employee."
            : "You haven't uploaded any documents yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{doc.fileName}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="neutral">{formatDocumentType(doc.type)}</Badge>
              </TableCell>
              <TableCell className="text-gray-500">
                {formatFileSize(doc.fileSize)}
              </TableCell>
              <TableCell className="text-gray-500">
                {doc.uploadedAt ? dayjs(doc.uploadedAt).format('MMM D, YYYY') : '-'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.id, doc.fileName)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
