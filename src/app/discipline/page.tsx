"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ShieldAlert, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useDisciplinaryActions,
  useCreateDisciplinaryAction,
  useEmployees,
  useAuthStore,
} from "@/hooks";
import { formatDate } from "@/lib/utils";
import type { ViolationType, DisciplinarySeverity, DisciplinaryActionFilters } from "@/types";

const createSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  violationType: z.string().min(1, "Violation type is required"),
  severity: z.string().min(1, "Severity is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;

const violationTypeOptions = [
  { label: "Late Coming", value: "LateComing" },
  { label: "Absenteeism", value: "Absenteeism" },
  { label: "Insubordination", value: "Insubordination" },
  { label: "Policy Violation", value: "PolicyViolation" },
  { label: "Misconduct", value: "Misconduct" },
  { label: "Other", value: "Other" },
];

const severityOptions = [
  { label: "Warning", value: "Warning" },
  { label: "Strike", value: "Strike" },
  { label: "Suspension", value: "Suspension" },
  { label: "Termination", value: "Termination" },
];

const VIOLATION_LABELS: Record<ViolationType, string> = {
  LateComing: "Late Coming",
  Absenteeism: "Absenteeism",
  Insubordination: "Insubordination",
  PolicyViolation: "Policy Violation",
  Misconduct: "Misconduct",
  Other: "Other",
};

const SEVERITY_COLORS: Record<DisciplinarySeverity, string> = {
  Warning: "bg-yellow-100 text-yellow-800",
  Strike: "bg-orange-100 text-orange-800",
  Suspension: "bg-red-100 text-red-800",
  Termination: "bg-red-200 text-red-900",
};

export default function DisciplinePage() {
  const { user } = useAuthStore();
  const isAdminOrSBUHead = user?.role === "Admin" || user?.role === "SBUHead";

  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState<DisciplinaryActionFilters>({ page: 1 });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<SearchableSelectOption | null>(null);

  const { data: result, isLoading } = useDisciplinaryActions(filters);
  const { data: employeesData, isLoading: isSearching } = useEmployees({ 
    search: employeeSearch,
    limit: 20
  });
  const searchResults = employeesData?.data || [];
  const createAction = useCreateDisciplinaryAction();

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  });

  const handleCreate = async (data: CreateFormData) => {
    try {
      await createAction.mutateAsync(data);
      toast.success("Disciplinary action created successfully");
      setModalOpen(false);
      form.reset();
    } catch {
      toast.error("Failed to create disciplinary action");
    }
  };

  return (
    <AppLayout pageTitle="Discipline">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Disciplinary Actions
            </h1>
          </div>
          {isAdminOrSBUHead && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Issue Action
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <Select
                label="Violation Type"
                options={[
                  { label: "All Types", value: "" },
                  ...violationTypeOptions,
                ]}
                value={filters.violationType || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    violationType: (e.target.value || undefined) as ViolationType | undefined,
                    page: 1,
                  }))
                }
              />
              <Select
                label="Severity"
                options={[
                  { label: "All Severities", value: "" },
                  ...severityOptions,
                ]}
                value={filters.severity || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    severity: (e.target.value || undefined) as DisciplinarySeverity | undefined,
                    page: 1,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !result?.data || result.data.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No disciplinary actions found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Violation</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Issued By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.data.map((action) => (
                      <tr key={action.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {action.employee?.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {action.employee?.employeeId}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {VIOLATION_LABELS[action.violationType] ||
                            action.violationType}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              SEVERITY_COLORS[action.severity] || ""
                            }`}
                          >
                            {action.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-gray-600">
                          {action.description}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(action.date)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {action.issuedBy?.fullName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {result?.pagination && result.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-500">
                  Page {result.pagination.page} of {result.pagination.totalPages}{" "}
                  ({result.pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!result.pagination.hasPrevPage}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!result.pagination.hasNextPage}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            form.reset();
            setEmployeeSearch("");
            setSelectedEmployee(null);
          }}
          title="Issue Disciplinary Action"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setModalOpen(false);
                  form.reset();
                  setEmployeeSearch("");
                  setSelectedEmployee(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(handleCreate)}
                loading={createAction.isPending}
              >
                Issue Action
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <SearchableSelect
              label="Employee"
              required
              placeholder="Search employee by name..."
              options={searchResults?.map(emp => ({
                label: emp.fullName,
                value: emp.id,
                subLabel: emp.employeeId
              })) || []}
              value={form.watch("employeeId")}
              onChange={(val) => {
                form.setValue("employeeId", val, { shouldValidate: true });
                const emp = searchResults?.find(e => e.id === val);
                if (emp) {
                  setSelectedEmployee({
                    label: emp.fullName,
                    value: emp.id,
                    subLabel: emp.employeeId
                  });
                }
              }}
              onSearch={(query) => setEmployeeSearch(query)}
              onClear={() => {
                form.setValue("employeeId", "", { shouldValidate: true });
                setSelectedEmployee(null);
                setEmployeeSearch("");
              }}
              selectedOption={selectedEmployee}
              loading={isSearching}
              error={form.formState.errors.employeeId?.message}
            />
            <Select
              label="Violation Type"
              required
              options={violationTypeOptions}
              placeholder="Select violation type"
              error={form.formState.errors.violationType?.message}
              {...form.register("violationType")}
            />
            <Select
              label="Severity"
              required
              options={severityOptions}
              placeholder="Select severity"
              error={form.formState.errors.severity?.message}
              {...form.register("severity")}
            />
            <Input
              label="Date"
              type="date"
              error={form.formState.errors.date?.message}
              {...form.register("date")}
            />
            <Textarea
              label="Description"
              required
              rows={3}
              placeholder="Describe the violation..."
              error={form.formState.errors.description?.message}
              {...form.register("description")}
            />
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
