"use client";

import React, { Suspense, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Users, Upload, Download, X, FileSpreadsheet,
  AlertCircle, CheckCircle2, Trash2, Search, ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmployeeTags } from "@/components/employees/employee-tags";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useEmployees, useSbus, useDepartments, useAuth,
  useDeleteEmployee, useBulkDeleteEmployees,
} from "@/hooks";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { EmployeeFilters } from "@/types";

// ─── Brand tokens ──────────────────────────────────────
const B = {
  navy: "#111729",
  navyLight: "#1a2333",
  orange: "#f48220",
  orangeBg: "#fef3e8",
  orangeBorder: "#fcd9b0",
};

// ─── Small reusable primitives ─────────────────────────
function NavyBtn({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${className}`}
      style={{ backgroundColor: B.navy }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = B.navyLight)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = B.navy)}
    >
      {children}
    </button>
  );
}

function OrangeBtn({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${className}`}
      style={{ backgroundColor: B.orange }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = "#e0731a")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = B.orange)}
    >
      {children}
    </button>
  );
}

function OutlineBtn({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

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
  const isAdmin = user?.role === "Admin";

  const [filters, setFilters] = useState<EmployeeFilters>({
    page: 1,
    limit: 10,
    joined: joinedParam || undefined,
    status: statusParam || undefined,
  });

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "single"; id: string; name: string } | { type: "bulk" } | null
  >(null);
  const deleteEmployee = useDeleteEmployee();
  const bulkDeleteEmployees = useBulkDeleteEmployees();

  const { data: sbus } = useSbus();
  const { data: departments } = useDepartments(filters.sbuId);
  const { data: employeesData, isLoading, refetch } = useEmployees(filters);

  const employees = employeesData?.data || [];
  const pagination = employeesData?.pagination;

  const handleFilterChange = useCallback(
    (key: keyof EmployeeFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
      setSelectedIds(new Set());
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({ page: 1, limit: 10 });
    setSelectedIds(new Set());
  }, []);

  const hasActiveFilters = !!(
    filters.search || filters.sbuId || filters.departmentId || filters.status
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedIds(new Set());
  }, []);

  const handleExport = async (format: "csv" | "excel") => {
    setExportOpen(false);
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
        toast.success(`${res.data.data.created} employees created`);
        refetch();
      }
      if (res.data.data.errors.length > 0) {
        toast.error(`${res.data.data.errors.length} rows had errors`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Bulk upload failed");
    } finally {
      setBulkUploading(false);
      setBulkFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setBulkFile(file); setBulkResult(null); }
  };

  // Selection helpers
  const selectableEmployees = employees.filter((emp) => emp.id !== user?.employeeId);
  const allSelected =
    selectableEmployees.length > 0 &&
    selectableEmployees.every((emp) => selectedIds.has(emp.id));

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

  return (
    <AppLayout pageTitle="Employees">
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: B.navy }}>
              Employee Directory
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {isLoading ? "Loading..." : `${pagination?.total ?? employees.length} employees total`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export dropdown */}
            <div ref={exportRef} className="relative">
              <OutlineBtn onClick={() => setExportOpen(!exportOpen)}>
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </OutlineBtn>
              {exportOpen && (
                <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
                  <button
                    onClick={() => handleExport("csv")}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>

            {isAdmin && (
              <OutlineBtn
                onClick={() => {
                  setShowBulkUpload(!showBulkUpload);
                  setBulkResult(null);
                  setBulkFile(null);
                }}
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </OutlineBtn>
            )}

            {isAdmin && (
              <NavyBtn onClick={() => router.push("/employees/new")}>
                <Plus className="h-4 w-4" />
                Add Employee
              </NavyBtn>
            )}
          </div>
        </div>

        {/* ── Bulk upload panel ── */}
        {isAdmin && showBulkUpload && (
          <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ backgroundColor: B.navy }}
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-5 w-5 text-white/70" />
                <span className="font-semibold text-white">Bulk Upload Employees</span>
              </div>
              <button
                onClick={() => { setShowBulkUpload(false); setBulkResult(null); setBulkFile(null); }}
                className="rounded-lg p-1 text-white/50 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1 */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: B.orange }}
                >
                  1
                </div>
                <div className="flex flex-1 items-center justify-between gap-4">
                  <p className="text-sm text-gray-700">
                    Download the template and fill in employee data
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 text-sm font-semibold transition-colors flex-shrink-0"
                    style={{ color: B.orange }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#e0731a")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = B.orange)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Template
                  </button>
                </div>
              </div>

              <div className="ml-3.5 h-px bg-gray-100" />

              {/* Step 2 */}
              <div className="flex items-start gap-4">
                <div
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white mt-0.5"
                  style={{ backgroundColor: B.orange }}
                >
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-3">Upload the completed file</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className="cursor-pointer rounded-xl border-2 border-dashed px-5 py-3 text-sm transition-colors"
                      style={{
                        borderColor: bulkFile ? B.orange : "#e5e7eb",
                        backgroundColor: bulkFile ? B.orangeBg : "#f9fafb",
                        color: bulkFile ? B.orange : "#6b7280",
                      }}
                    >
                      {bulkFile ? (
                        <span className="font-semibold">{bulkFile.name}</span>
                      ) : (
                        "Choose .xlsx or .csv file"
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <OrangeBtn onClick={handleBulkUpload} disabled={!bulkFile || bulkUploading}>
                      {bulkUploading ? "Uploading..." : "Upload Now"}
                    </OrangeBtn>
                  </div>
                </div>
              </div>

              {/* Results */}
              {bulkResult && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-4 mb-2">
                    {bulkResult.created > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-semibold">{bulkResult.created} created</span>
                      </div>
                    )}
                    {bulkResult.errors.length > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-semibold">{bulkResult.errors.length} errors</span>
                      </div>
                    )}
                  </div>
                  {bulkResult.errors.length > 0 && (
                    <div className="mt-2 max-h-36 overflow-y-auto space-y-0.5">
                      {bulkResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600">
                          Row {err.row}: {err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, ID..."
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": `${B.orange}33` } as React.CSSProperties}
              onFocus={(e) => (e.currentTarget.style.borderColor = B.orange)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "")}
            />
          </div>

          {/* SBU */}
          <select
            value={filters.sbuId || ""}
            onChange={(e) => handleFilterChange("sbuId", e.target.value)}
            className="rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 appearance-none"
            style={{ "--tw-ring-color": `${B.orange}33` } as React.CSSProperties}
          >
            <option value="">All SBUs</option>
            {sbuOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Department */}
          <select
            value={filters.departmentId || ""}
            onChange={(e) => handleFilterChange("departmentId", e.target.value)}
            className="rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 appearance-none"
            style={{ "--tw-ring-color": `${B.orange}33` } as React.CSSProperties}
          >
            <option value="">All Departments</option>
            {departmentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Status */}
          <select
            value={filters.status || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 appearance-none"
            style={{ "--tw-ring-color": `${B.orange}33` } as React.CSSProperties}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Terminated">Terminated</option>
            <option value="Resigned">Resigned</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}

          {/* Filter count pill */}
          {hasActiveFilters && (
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: B.orangeBg, color: B.orange }}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filtered
            </span>
          )}
        </div>

        {/* ── Bulk action bar ── */}
        {isAdmin && selectedIds.size > 0 && (
          <div
            className="flex items-center gap-4 rounded-2xl px-5 py-3"
            style={{ backgroundColor: B.navy }}
          >
            <span className="text-sm font-semibold text-white">
              {selectedIds.size} employee{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-white/50 hover:text-white transition-colors underline"
            >
              Clear selection
            </button>
            <div className="ml-auto">
              <button
                onClick={() => setDeleteTarget({ type: "bulk" })}
                className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete {selectedIds.size} selected
              </button>
            </div>
          </div>
        )}

        {/* ── Employee table ── */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#f9fafb" }}>
                  {isAdmin && (
                    <th className="w-12 px-4 py-3.5 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                        style={{ accentColor: B.orange }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                  )}
                  {["Employee ID", "Name", "SBU", "Department", "Job Title", "Status", "Type", "Date of Hire"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      {col}
                    </th>
                  ))}
                  {isAdmin && <th className="w-10 px-4 py-3.5" />}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: isAdmin ? 10 : 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <Skeleton className="h-4 w-3/4" variant="text" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 8} className="p-0">
                      <EmptyState
                        icon={Users}
                        title="No employees found"
                        description="Try adjusting your search or filter criteria"
                      />
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                    const isSelf = emp.id === user?.employeeId;
                    const isSelected = selectedIds.has(emp.id);
                    return (
                      <tr
                        key={emp.id}
                        onClick={() => router.push(`/employees/${emp.id}`)}
                        className="cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isSelected ? B.orangeBg : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#fafafa";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isSelected ? B.orangeBg : "";
                        }}
                      >
                        {isAdmin && (
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            {!isSelf && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(emp.id)}
                                className="h-4 w-4 rounded border-gray-300"
                                style={{ accentColor: B.orange }}
                              />
                            )}
                          </td>
                        )}

                        {/* Employee ID */}
                        <td className="px-4 py-4">
                          <span
                            className="rounded-md px-2 py-0.5 font-mono text-xs font-medium"
                            style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                          >
                            {emp.employeeId}
                          </span>
                        </td>

                        {/* Name + email */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.fullName} size="sm" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {emp.fullName}
                              </p>
                              <p className="text-xs text-gray-400">{emp.workEmail}</p>
                            </div>
                          </div>
                        </td>

                        {/* SBU */}
                        <td className="px-4 py-4">
                          {emp.sbu?.name ? (
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: B.orangeBg, color: B.orange }}
                            >
                              {emp.sbu.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Department */}
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {emp.department?.name || <span className="text-gray-300">—</span>}
                        </td>

                        {/* Job Title */}
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[160px] truncate">
                          {emp.jobTitle}
                        </td>

                        {/* Status + tags */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={emp.employmentStatus} />
                            <EmployeeTags tags={emp.tags} />
                          </div>
                        </td>

                        {/* Employment type */}
                        <td className="px-4 py-4">
                          <StatusBadge status={emp.employmentType} />
                        </td>

                        {/* Date of hire */}
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatDate(emp.dateOfHire)}
                        </td>

                        {/* Delete */}
                        {isAdmin && (
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            {!isSelf && (
                              <button
                                onClick={() =>
                                  setDeleteTarget({ type: "single", id: emp.id, name: emp.fullName })
                                }
                                className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Delete employee"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-gray-100 px-6 py-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
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
        confirmLabel={
          deleteTarget?.type === "single"
            ? "Delete"
            : `Delete ${selectedIds.size} employee(s)`
        }
        loading={deleteEmployee.isPending || bulkDeleteEmployees.isPending}
      />
    </AppLayout>
  );
}
