"use client";

import React, { Suspense, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Users, Upload, Download, X, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { FilterBar, type FilterValues } from "@/components/shared/filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmployeeTags } from "@/components/employees/employee-tags";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useEmployees, useSbus, useDepartments, useAuth, useDeleteEmployee, useBulkDeleteEmployees } from "@/hooks";
import { formatDate } from "@/lib/utils";
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
  const isAdmin = user?.role === "Admin";

  const [filters, setFilters] = useState<EmployeeFilters>({
    page: 1,
    limit: 20,
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

  // Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ type: "single"; id: string; name: string } | { type: "bulk" } | null>(null);
  const deleteEmployee = useDeleteEmployee();
  const bulkDeleteEmployees = useBulkDeleteEmployees();

  const { data: sbus } = useSbus();
  const { data: departments } = useDepartments(filters.sbuId);
  const { data: employeesData, isLoading, refetch } = useEmployees(filters);

  const employees = employeesData?.data || [];
  const pagination = employeesData?.pagination;

  const handleFilterChange = useCallback((values: FilterValues) => {
    setFilters((prev) => ({
      ...prev,
      search: values.search || undefined,
      sbuId: values.sbuId || undefined,
      departmentId: values.departmentId || undefined,
      status: (values.status as EmployeeFilters["status"]) || undefined,
      page: 1,
    }));
    setSelectedIds(new Set());
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedIds(new Set());
  }, []);

  const handleExport = async (format: "csv" | "excel") => {
    try {
      const fileFormat = format === "excel" ? "xlsx" : "csv";
      const res = await api.instance.get("/reports/employees", {
        params: {
          format: fileFormat,
          sbuId: filters.sbuId,
          departmentId: filters.departmentId,
        },
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
      const res = await api.instance.get("/employees/bulk-template", {
        responseType: "blob",
      });
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
    if (file) {
      setBulkFile(file);
      setBulkResult(null);
    }
  };

  // Selection helpers
  const selectableEmployees = employees.filter((emp) => emp.id !== user?.employeeId);
  const allSelected = selectableEmployees.length > 0 && selectableEmployees.every((emp) => selectedIds.has(emp.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (selectableEmployees.every((emp) => prev.has(emp.id))) {
        return new Set();
      }
      return new Set(selectableEmployees.map((emp) => emp.id));
    });
  }, [selectableEmployees]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

  const sbuOptions = (sbus || []).map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const departmentOptions = (departments || []).map((d) => ({
    label: d.name,
    value: d.id,
  }));

  const statusOptions = [
    { label: "Active", value: "Active" },
    { label: "Suspended", value: "Suspended" },
    { label: "Terminated", value: "Terminated" },
    { label: "Resigned", value: "Resigned" },
  ];

  
  const filterValues = {
    search: filters.search || "",
    sbuId: filters.sbuId || "",
    departmentId: filters.departmentId || "",
    status: filters.status || "",
  };

  return (
    <AppLayout pageTitle="Employees">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Employee Directory
              </h2>
              <p className="text-sm text-gray-500">
                {pagination?.total ?? 0} employees total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkUpload(!showBulkUpload);
                  setBulkResult(null);
                  setBulkFile(null);
                }}
              >
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" onClick={() => router.push("/employees/new")}>
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Upload Panel */}
        {isAdmin && showBulkUpload && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">
                  Bulk Upload Employees
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowBulkUpload(false);
                  setBulkResult(null);
                  setBulkFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Step 1: Download template */}
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  1
                </span>
                <span className="text-sm text-gray-700">
                  Download the template and fill in employee data
                </span>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Template
                </button>
              </div>

              {/* Step 2: Upload file */}
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white mt-0.5">
                  2
                </span>
                <div className="flex-1">
                  <span className="text-sm text-gray-700">
                    Upload the completed file
                  </span>
                  <div className="mt-2 flex items-center gap-3">
                    <label className="cursor-pointer rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm text-gray-600 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      {bulkFile ? (
                        <span className="font-medium text-blue-700">
                          {bulkFile.name}
                        </span>
                      ) : (
                        <span>Choose .xlsx or .csv file</span>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <Button
                      onClick={handleBulkUpload}
                      disabled={!bulkFile || bulkUploading}
                      size="sm"
                    >
                      {bulkUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Results */}
              {bulkResult && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-4 mb-2">
                    {bulkResult.created > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">
                          {bulkResult.created} created
                        </span>
                      </div>
                    )}
                    {bulkResult.errors.length > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">
                          {bulkResult.errors.length} errors
                        </span>
                      </div>
                    )}
                  </div>
                  {bulkResult.errors.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      {bulkResult.errors.map((err, i) => (
                        <p
                          key={i}
                          className="text-xs text-red-600 py-0.5"
                        >
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

        {/* Filters */}
        <FilterBar
          values={filterValues}
          filters={[
            {
              key: "search",
              label: "Search",
              type: "search",
              placeholder: "Search by name, email, ID...",
            },
            {
              key: "sbuId",
              label: "SBU",
              type: "select",
              options: sbuOptions,
              placeholder: "All SBUs",
            },
            {
              key: "departmentId",
              label: "Department",
              type: "select",
              options: departmentOptions,
              placeholder: "All Departments",
            },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: statusOptions,
              placeholder: "All Statuses",
            },
          ]}
          onChange={handleFilterChange}
          onExport={handleExport}
        />

        {/* Bulk action bar */}
        {isAdmin && selectedIds.size > 0 && (
          <div className="flex items-center gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear
            </button>
            <div className="ml-auto">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteTarget({ type: "bulk" })}
              >
                <Trash2 className="h-4 w-4" />
                Delete selected
              </Button>
            </div>
          </div>
        )}

        {/* Data table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SBU</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date of Hire</TableHead>
                  {isAdmin && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      {Array.from({ length: isAdmin ? 10 : 8 }).map((_, j) => (
                        <TableCell key={`skeleton-${i}-${j}`}>
                          <Skeleton className="h-4 w-3/4" variant="text" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 10 : 8} className="p-0">
                      <EmptyState
                        icon={Users}
                        title="No employees found"
                        description="Try adjusting your search or filter criteria"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => {
                    const isSelf = emp.id === user?.employeeId;
                    return (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/employees/${emp.id}`)}
                      >
                        {isAdmin && (
                          <TableCell>
                            {!isSelf && (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(emp.id)}
                                onChange={() => toggleSelect(emp.id)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="font-mono text-xs text-gray-500">
                            {emp.employeeId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={emp.fullName} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {emp.fullName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {emp.workEmail}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{emp.sbu?.name || "-"}</TableCell>
                        <TableCell>{emp.department?.name || "-"}</TableCell>
                        <TableCell>{emp.jobTitle}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={emp.employmentStatus} />
                            <EmployeeTags tags={emp.tags} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={emp.employmentType} />
                        </TableCell>
                        <TableCell>{formatDate(emp.dateOfHire)}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            {!isSelf && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ type: "single", id: emp.id, name: emp.fullName });
                                }}
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Delete employee"
                              >
                                <Trash2 className="h-4 w-4" />
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title={
          deleteTarget?.type === "single"
            ? "Delete Employee"
            : "Delete Selected Employees"
        }
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
