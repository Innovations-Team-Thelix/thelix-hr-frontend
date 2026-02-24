"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];

  // Always show first page
  pages.push(1);

  if (currentPage <= 3) {
    // Near the start: 1 2 3 4 ... last
    pages.push(2, 3, 4, "ellipsis", totalPages);
  } else if (currentPage >= totalPages - 2) {
    // Near the end: 1 ... n-3 n-2 n-1 n
    pages.push(
      "ellipsis",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages
    );
  } else {
    // Middle: 1 ... prev current next ... last
    pages.push(
      "ellipsis",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis",
      totalPages
    );
  }

  return pages;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const baseButtonStyles = cn(
    "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md text-sm font-medium",
    "transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1"
  );

  return (
    <nav
      className={cn("flex items-center justify-center gap-1", className)}
      aria-label="Pagination"
    >
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={cn(
          baseButtonStyles,
          "px-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700",
          "disabled:pointer-events-none disabled:opacity-40"
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Page numbers */}
      {pages.map((page, index) => {
        if (page === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-8 min-w-[2rem] items-center justify-center text-sm text-gray-400"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={isActive}
            className={cn(
              baseButtonStyles,
              "px-2",
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
            aria-label={`Page ${page}`}
            aria-current={isActive ? "page" : undefined}
          >
            {page}
          </button>
        );
      })}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={cn(
          baseButtonStyles,
          "px-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700",
          "disabled:pointer-events-none disabled:opacity-40"
        )}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

export { Pagination };
export type { PaginationProps };
