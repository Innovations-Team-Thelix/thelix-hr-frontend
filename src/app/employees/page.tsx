"use client";

import React, { Suspense, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Users, Upload, Download, X, FileSpreadsheet,
  AlertCircle, CheckCircle2, Trash2, Search, SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmployeeTags } from "@/components/employees/employee-tags";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useEmployees, useSbus, useDepartments, useAuth,
  useDeleteEmployee, useBulkDeleteEmployees, useEffectiveRole,
} from "@/hooks";
import { cn, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { EmployeeFilters } from "@/types";

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesPageContent />
    </Suspense>
  );
}

function EmployeesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinedParam = searchParams.get("joined") as "this_month" | "last_month" | "this_year" | null;
  const statusParam = searchParams.get("status") as EmployeeFilters["status"] | null;

  const { user } = useAuth();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";
  const isSbuHead = effectiveRole === "SBUHead";
  const sbuHeadScopeId = isSbuHead ? (user?.sbuScopeId ?? undefined) : undefined;

  const [filters, setFilters] = useState<EmployeeFilters>({
    page: 1,
    limit: 10,
    joined: joinedParam || undefined,
    status: statusParam || undefined,
    sbuId: sbuHeadScopeId,
  });

  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "single"; id: string; name: string } | { type: "bulk" } | null
  >(null);
  const deleteEmployee = useDeleteEmployee();
  const bulkDeleteEmployees = useBulkDeleteEmployees();

  const { data: sbus } = useSbus();
  const { data: departments } = useDepartments(sbuHeadScopeId ?? filters.sbuId);
  const { data: employeesData, isLoading, refetch } = useEmployees(filters);

  const employees = employeesData?.data || [];
  const pagination = employeesData?.pagination;

  // Derived "showing X–Y of Z"
  const total = pagination?.total ?? 0;
  const page = pagination?.page ?? 1;
  const limit = filters.limit ?? 10;
  const rangeFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeTo = Math.min(page * limit, total);

  const hasActiveFilters = !!(filters.search || filters.sbuId || filters.departmentId || filters.status);

  // Search: fire on Enter or after debounce via blur
  const applySearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
  }, [searchInput]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") applySearch();
  };

  const handleFilterSelect = useCallback((key: keyof EmployeeFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
    setSelectedIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setFilters({
      page: 1,
      limit: filters.limit,
      sbuId: sbuHeadScopeId,
    });
    setSelectedIds(new Set());
  }, [filters.limit, sbuHeadScopeId]);

  const handlePageChange = useCallback((p: number) => {
    setFilters((prev) => ({ ...prev, page: p }));
    setSelectedIds(new Set());
  }, []);

  const handleExport = async (format: "csv" | "excel") => {
    setShowExport(false);
    try {
      const fileFormat = format === "excel" ? "xlsx" : "csv";
      const res = await api.instance.get("/reports/employees", {
        params: { format: fileFormat, sbuId: filters.sbuId, departmentId: filters.departmentId },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `employees.${fileFormat}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    } catch {
      toast.error("Failed to export data");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.instance.get("/employees/bulk-template", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "employee-bulk-upload-template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template");
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      const res = await api.instance.post("/employees/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBulkResult(res.data.data);
      if (res.data.data.created > 0) {
        toast.success(`${res.data.data.created} employees created successfully`);
        refetch();
      }
      if (res.data.data.errors.length > 0) toast.error(`${res.data.data.errors.length} rows had errors`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Bulk upload failed");
    } finally {
      setBulkUploading(false);
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectableEmployees = employees.filter((emp) => emp.id !== user?.employeeId);
  const allSelected = selectableEmployees.length > 0 && selectableEmployees.every((emp) => selectedIds.has(emp.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      selectableEmployees.every((emp) => prev.has(emp.id))
        ? new Set()
        : new Set(selectableEmployees.map((emp) => emp.id))
    );
  }, [selectableEmployees]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "single") {
      await deleteEmployee.mutateAsync(deleteTarget.id);
    } else {
      await bulkDeleteEmployees.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
    setDeleteTarget(null);
  };

  const sbuOptions = (sbus || []).map((s) => ({ label: s.name, value: s.id }));
  const departmentOptions = (departments || []).map((d) => ({ label: d.name, value: d.id }));
  const statusOptions = [
    { label: "Active", value: "Active" },
    { label: "Suspended", value: "Suspended" },
    { label: "Terminated", value: "Terminated" },
    { label: "Resigned", value: "Resigned" },
  ];

  const colCount = isAdmin ? 10 : 8;

  return (
    <AppLayout pageTitle="Employees">
      <div className="space-y-5">

        {/* Bulk Upload Panel */}
        {isAdmin && showBulkUpload && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-gray-900">Bulk Upload Employees</h3>
              </div>
              <button
                onClick={() => { setShowBulkUpload(false); setBulkResult(null); setBulkFile(null); }}
                className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span>
                <span className="text-sm text-gray-700">Download the template and fill in employee data</span>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Template
                </button>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</span>
                <div className="flex-1">
                  <span className="text-sm text-gray-700">Upload the completed file</span>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="cursor-pointer rounded-xl border-2 border-dashed border-primary/30 bg-white px-4 py-2.5 text-sm text-gray-600 hover:border-primary/60 transition-colors">
                      {bulkFile
                        ? <span className="font-medium text-primary">{bulkFile.name}</span>
                        : <span>Choose .xlsx or .csv file</span>
                      }
                      <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={(e) => { setBulkFile(e.target.files?.[0] || null); setBulkResult(null); }} className="hidden" />
                    </label>
                    <Button onClick={handleBulkUpload} disabled={!bulkFile || bulkUploading} size="sm">
                      {bulkUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
              </div>
              {bulkResult && (
                <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-4">
                    {bulkResult.created > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">{bulkResult.created} created</span>
                      </div>
                    )}
                    {bulkResult.errors.length > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">{bulkResult.errors.length} errors</span>
                      </div>
                    )}
                  </div>
                  {bulkResult.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto">
                      {bulkResult.errors.map((err, i) => (
                        <p key={i} className="py-0.5 text-xs text-red-600">Row {err.row}: {err.message}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Main card ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          {/* Card header */}
          <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Employee List</h2>
              <p className="mt-0.5 text-xs text-gray-400">{total} employees total</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Inline search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onBlur={applySearch}
                  className="w-52 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  showFilters || hasActiveFilters
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
                {hasActiveFilters && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>

              {/* Export */}
              <div ref={exportRef} className="relative">
                <button
                  onClick={() => setShowExport(!showExport)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showExport && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                    <button className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => handleExport("csv")}>Export as CSV</button>
                    <button className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => handleExport("excel")}>Export as Excel</button>
                  </div>
                )}
              </div>

              {/* Bulk upload */}
              {isAdmin && (
                <button
                  onClick={() => { setShowBulkUpload(!showBulkUpload); setBulkResult(null); setBulkFile(null); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Bulk Upload
                </button>
              )}

              {/* Add Employee — primary CTA */}
              {isAdmin && (
                <button
                  onClick={() => router.push("/employees/new")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition-all hover:bg-primary-600 hover:shadow-md hover:shadow-primary/30 active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Employee
                </button>
              )}
            </div>
          </div>

          {/* Expanded filter row */}
          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 bg-gray-50/60 px-6 py-3">
              {!isSbuHead && (
                <div className="min-w-[160px]">
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">SBU</label>
                  <Select
                    options={sbuOptions}
                    placeholder="All SBUs"
                    value={filters.sbuId || ""}
                    onChange={(e) => handleFilterSelect("sbuId", e.target.value)}
                  />
                </div>
              )}
              <div className="min-w-[160px]">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Department</label>
                <Select
                  options={departmentOptions}
                  placeholder="All Departments"
                  value={filters.departmentId || ""}
                  onChange={(e) => handleFilterSelect("departmentId", e.target.value)}
                />
              </div>
              <div className="min-w-[140px]">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</label>
                <Select
                  options={statusOptions}
                  placeholder="All Statuses"
                  value={filters.status || ""}
                  onChange={(e) => handleFilterSelect("status", e.target.value as EmployeeFilters["status"])}
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Bulk action bar */}
          {isAdmin && selectedIds.size > 0 && (
            <div className="flex items-center gap-4 border-b border-red-100 bg-red-50 px-6 py-2.5">
              <span className="text-sm font-medium text-gray-700">{selectedIds.size} selected</span>
              <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-400 underline hover:text-gray-700">
                Clear
              </button>
              <div className="ml-auto">
                <Button variant="danger" size="sm" onClick={() => setDeleteTarget({ type: "bulk" })}>
                  <Trash2 className="h-4 w-4" />
                  Delete selected
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  {isAdmin && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableHead>
                  )}
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Employee ID</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Name</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Job Title</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Department</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date of Hire</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tags</TableHead>
                  {isAdmin && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      {Array.from({ length: colCount }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-3/4" variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="p-0">
                      <EmptyState icon={Users} title="No employees found" description="Try adjusting your search or filter criteria" />
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => {
                    const isSelf = emp.id === user?.employeeId;
                    return (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer hover:bg-gray-50/70 transition-colors"
                        onClick={() => router.push(`/employees/${emp.id}`)}
                      >
                        {isAdmin && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {!isSelf && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(emp.id)}
                                onChange={() => toggleSelect(emp.id)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="font-mono text-xs text-gray-400">{emp.employeeId}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.fullName} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">{emp.fullName}</p>
                              <p className="truncate text-xs text-gray-400">{emp.workEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{emp.jobTitle || "—"}</TableCell>
                        <TableCell className="text-sm text-gray-600">{emp.department?.name || "—"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            {emp.employmentType || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDate(emp.dateOfHire)}</TableCell>
                        <TableCell>
                          <StatusBadge status={emp.employmentStatus} />
                        </TableCell>
                        <TableCell>
                          <EmployeeTags tags={emp.tags} />
                        </TableCell>
                        {isAdmin && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {!isSelf && (
                              <button
                                onClick={() => setDeleteTarget({ type: "single", id: emp.id, name: emp.fullName })}
                                className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Delete employee"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-sm text-gray-400">
              {total === 0
                ? "No results"
                : `Showing ${rangeFrom}–${rangeTo} of ${total} results`}
            </p>
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>

        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title={deleteTarget?.type === "single" ? "Delete Employee" : "Delete Selected Employees"}
        message={
          deleteTarget?.type === "single"
            ? `Are you sure you want to delete ${deleteTarget.name}? This action cannot be undone.`
            : `Are you sure you want to delete ${selectedIds.size} employee(s)? This action cannot be undone.`
        }
        confirmLabel={deleteTarget?.type === "single" ? "Delete" : `Delete ${selectedIds.size} employee(s)`}
        loading={deleteEmployee.isPending || bulkDeleteEmployees.isPending}
      />
    </AppLayout>
  );
}
