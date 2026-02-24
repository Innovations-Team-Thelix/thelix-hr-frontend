"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface FilterDefinition {
  key: string;
  label: string;
  type: "select" | "date" | "search";
  options?: SelectOption[];
  placeholder?: string;
}

type FilterValues = Record<string, string>;

type ExportFormat = "csv" | "excel";

interface FilterBarProps {
  filters: FilterDefinition[];
  values?: FilterValues;
  onChange: (filters: FilterValues) => void;
  onExport?: (format: ExportFormat) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* FilterBar                                                           */
/* ------------------------------------------------------------------ */

function FilterBar({
  filters,
  values: controlledValues,
  onChange,
  onExport,
  className,
}: FilterBarProps) {
  const [internalValues, setInternalValues] = useState<FilterValues>({});
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const values = controlledValues ?? internalValues;

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportRef.current &&
        !exportRef.current.contains(event.target as Node)
      ) {
        setExportOpen(false);
      }
    }
    if (exportOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportOpen]);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const next = { ...values, [key]: value };
      if (!controlledValues) {
        setInternalValues(next);
      }
      onChange(next);
    },
    [values, controlledValues, onChange]
  );

  const clearFilters = useCallback(() => {
    const empty: FilterValues = {};
    if (!controlledValues) {
      setInternalValues(empty);
    }
    onChange(empty);
  }, [controlledValues, onChange]);

  const hasActiveFilters = Object.values(values).some(
    (v) => v !== "" && v !== undefined
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4",
        className
      )}
    >
      {filters.map((filter) => {
        switch (filter.type) {
          case "search":
            return (
              <div key={filter.key} className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  {filter.label}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={filter.placeholder || `Search...`}
                    value={values[filter.key] || ""}
                    onChange={(e) => updateFilter(filter.key, e.target.value)}
                    className={cn(
                      "block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm",
                      "placeholder:text-gray-400",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    )}
                  />
                </div>
              </div>
            );

          case "select":
            return (
              <div key={filter.key} className="min-w-[160px]">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  {filter.label}
                </label>
                <Select
                  options={filter.options || []}
                  placeholder={filter.placeholder || `All`}
                  value={values[filter.key] || ""}
                  onChange={(e) => updateFilter(filter.key, e.target.value)}
                />
              </div>
            );

          case "date":
            return (
              <div key={filter.key} className="min-w-[160px]">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  {filter.label}
                </label>
                <Input
                  type="date"
                  value={values[filter.key] || ""}
                  onChange={(e) => updateFilter(filter.key, e.target.value)}
                />
              </div>
            );

          default:
            return null;
        }
      })}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        {/* Export dropdown */}
        {onExport && (
          <div ref={exportRef} className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(!exportOpen)}
            >
              <Download className="h-3.5 w-3.5" />
              Export
              <ChevronDown className="h-3 w-3" />
            </Button>

            {exportOpen && (
              <div
                className={cn(
                  "absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                )}
              >
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    onExport("csv");
                    setExportOpen(false);
                  }}
                >
                  Export as CSV
                </button>
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    onExport("excel");
                    setExportOpen(false);
                  }}
                >
                  Export as Excel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { FilterBar };
export type { FilterBarProps, FilterDefinition, FilterValues, ExportFormat };
