"use client";

import React from "react";
import { InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  type SortDirection,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/loading";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTablePagination {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableSort {
  key: string;
  direction: SortDirection;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  pagination?: DataTablePagination;
  sort?: DataTableSort;
  onSort?: (key: string) => void;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
  /** Unique key extractor for row keys. Defaults to index. */
  rowKey?: (row: T, index: number) => string | number;
}

/* ------------------------------------------------------------------ */
/* Loading skeleton rows                                               */
/* ------------------------------------------------------------------ */

function LoadingRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={`skeleton-row-${rowIdx}`}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <TableCell key={`skeleton-cell-${rowIdx}-${colIdx}`}>
              <Skeleton variant="text" className="h-4 w-3/4" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* DataTable                                                           */
/* ------------------------------------------------------------------ */

function DataTable<T>({
  columns,
  data,
  isLoading = false,
  pagination,
  sort,
  onSort,
  emptyMessage = "No data found",
  emptyDescription,
  className,
  rowKey,
}: DataTableProps<T>) {
  const isEmpty = !isLoading && data.length === 0;

  function getSortDirection(key: string): SortDirection {
    if (!sort || sort.key !== key) return null;
    return sort.direction;
  }

  function handleSort(key: string) {
    onSort?.(key);
  }

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                sortable={col.sortable}
                sortDirection={col.sortable ? getSortDirection(col.key) : undefined}
                onSort={col.sortable ? () => handleSort(col.key) : undefined}
                className={col.className}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingRows columns={columns.length} />
          ) : isEmpty ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0">
                <EmptyState
                  icon={InboxIcon}
                  title={emptyMessage}
                  description={emptyDescription}
                />
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow
                key={rowKey ? rowKey(row, index) : index}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render
                      ? col.render(row, index)
                      : (row as Record<string, unknown>)[col.key] != null
                        ? String((row as Record<string, unknown>)[col.key])
                        : "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && !isEmpty && !isLoading && (
        <div className="border-t border-gray-100 px-4 py-3">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}

export { DataTable };
export type { DataTableProps, DataTableColumn, DataTablePagination, DataTableSort };
