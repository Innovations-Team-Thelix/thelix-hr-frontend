import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc" | null;

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

function Table({ className, children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TableHeader                                                         */
/* ------------------------------------------------------------------ */

interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

function TableHeader({ className, children, ...props }: TableHeaderProps) {
  return (
    <thead
      className={cn("border-b border-gray-200 bg-gray-50/80", className)}
      {...props}
    >
      {children}
    </thead>
  );
}

/* ------------------------------------------------------------------ */
/* TableBody                                                           */
/* ------------------------------------------------------------------ */

interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

function TableBody({ className, children, ...props }: TableBodyProps) {
  return (
    <tbody
      className={cn("[&>tr:nth-child(even)]:bg-gray-50/50", className)}
      {...props}
    >
      {children}
    </tbody>
  );
}

/* ------------------------------------------------------------------ */
/* TableRow                                                            */
/* ------------------------------------------------------------------ */

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

function TableRow({ className, children, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-gray-100 transition-colors hover:bg-gray-50",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* TableHead                                                           */
/* ------------------------------------------------------------------ */

interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: () => void;
}

function TableHead({
  className,
  children,
  sortable = false,
  sortDirection,
  onSort,
  ...props
}: TableHeadProps) {
  const SortIcon =
    sortDirection === "asc"
      ? ArrowUp
      : sortDirection === "desc"
        ? ArrowDown
        : ArrowUpDown;

  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500",
        sortable && "cursor-pointer select-none hover:text-gray-700",
        className
      )}
      onClick={sortable ? onSort : undefined}
      aria-sort={
        sortDirection === "asc"
          ? "ascending"
          : sortDirection === "desc"
            ? "descending"
            : undefined
      }
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {sortable && (
          <SortIcon
            className={cn(
              "h-3.5 w-3.5",
              sortDirection ? "text-primary" : "text-gray-400"
            )}
          />
        )}
      </span>
    </th>
  );
}

/* ------------------------------------------------------------------ */
/* TableCell                                                           */
/* ------------------------------------------------------------------ */

interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

function TableCell({ className, children, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-sm text-gray-700",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
};
export type {
  TableProps,
  TableHeaderProps,
  TableBodyProps,
  TableRowProps,
  TableHeadProps,
  TableCellProps,
  SortDirection,
};
