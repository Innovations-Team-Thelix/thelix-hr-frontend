'use client';

import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { useAuditLogs } from '@/hooks/useAudit';
import { Spinner } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';

interface AuditLogListProps {
  entityType?: string;
  entityId?: string;
}

export default function AuditLogList({ entityType, entityId }: AuditLogListProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError } = useAuditLogs({
    page,
    limit,
    entityType,
    entityId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md">
        Failed to load audit logs. Please try again later.
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="No audit logs found"
        description="There are no audit logs matching your criteria."
      />
    );
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'delete':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {dayjs(log.createdAt).format('MMM D, YYYY HH:mm')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {log.actor?.fullName || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {log.actor?.employeeId || log.actorId}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900">{log.entityType}</span>
                    <span className="text-xs text-gray-500">{log.entityId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {log.changes ? (
                    <details className="cursor-pointer text-xs text-gray-600">
                      <summary className="hover:text-primary">View Changes</summary>
                      <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 font-mono text-xs">
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-xs text-gray-400">No details</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center">
        <Pagination
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
