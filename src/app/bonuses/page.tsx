"use client";

import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Gift,
  Plus,
  Trash2,
  Search,
  Clock,
  CheckCircle2,
  Banknote,
  ListFilter,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/loading";
import {
  useBonuses,
  useCreateBonus,
  useDeleteBonus,
  useAllEmployees,
} from "@/hooks";
import type { BonusType, BonusStatus, EmployeeBonus } from "@/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BONUS_TYPE_LABEL: Record<BonusType, string> = {
  Bonus: "Bonus",
  Reimbursement: "Reimbursement",
  OneOffAllowance: "Allowance",
  OneOffDeduction: "Deduction",
};

const TYPE_BADGE_VARIANT: Record<BonusType, "info" | "success" | "neutral" | "danger"> = {
  Bonus: "info",
  Reimbursement: "success",
  OneOffAllowance: "neutral",
  OneOffDeduction: "danger",
};

const STATUS_BADGE_VARIANT: Record<BonusStatus, "warning" | "success" | "neutral"> = {
  Pending: "warning",
  Applied: "success",
  Cancelled: "neutral",
};

const schema = z.object({
  employeeId: z.string().uuid("Pick an employee"),
  type: z.enum(["Bonus", "Reimbursement", "OneOffAllowance", "OneOffDeduction"]),
  description: z.string().min(2, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  effectiveMonth: z.coerce.number().int().min(1).max(12),
  effectiveYear: z.coerce.number().int().min(2020).max(2100),
});
type FormData = z.infer<typeof schema>;

function formatCurrency(n: number) {
  return `₦${Number(n).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function BonusesPage() {
  const today = new Date();
  const [filters, setFilters] = useState<{
    page: number;
    month?: number;
    year?: number;
    status?: BonusStatus;
  }>({ page: 1, month: today.getMonth() + 1, year: today.getFullYear() });
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeBonus | null>(null);

  const { data: result, isLoading } = useBonuses(filters);
  const { data: allEmployees } = useAllEmployees();
  const createBonus = useCreateBonus();
  const deleteBonus = useDeleteBonus();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "Bonus",
      effectiveMonth: today.getMonth() + 1,
      effectiveYear: today.getFullYear(),
    },
  });

  // Aggregate stats from current filter result
  const stats = useMemo(() => {
    const items = result?.data ?? [];
    const pending = items.filter((b) => b.status === "Pending");
    const applied = items.filter((b) => b.status === "Applied");
    const pendingAmt = pending.reduce((s, b) => s + Number(b.amount), 0);
    const appliedAmt = applied.reduce((s, b) => s + Number(b.amount), 0);
    return {
      total: items.length,
      pendingCount: pending.length,
      pendingAmt,
      appliedAmt,
      totalAmt: pendingAmt + appliedAmt,
    };
  }, [result?.data]);

  // Client-side name/ID search on top of server filter
  const displayedRows = useMemo(() => {
    const items = result?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (b) =>
        b.employee?.fullName?.toLowerCase().includes(q) ||
        b.employee?.employeeId?.toLowerCase().includes(q)
    );
  }, [result?.data, search]);

  const handleCreate = async (data: FormData) => {
    try {
      await createBonus.mutateAsync(data);
      toast.success("Entry saved successfully");
      setModalOpen(false);
      form.reset({
        type: "Bonus",
        effectiveMonth: today.getMonth() + 1,
        effectiveYear: today.getFullYear(),
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to save entry");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBonus.mutateAsync(deleteTarget.id);
      toast.success("Entry deleted");
      setDeleteTarget(null);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete");
    }
  };

  const monthOptions = [
    { label: "All months", value: "" },
    ...MONTH_NAMES.map((m, i) => ({ label: m, value: String(i + 1) })),
  ];
  const yearOptions = [
    { label: "All years", value: "" },
    ...Array.from({ length: 5 }, (_, i) => {
      const y = today.getFullYear() - 2 + i;
      return { label: String(y), value: String(y) };
    }),
  ];
  const statusOptions = [
    { label: "All statuses", value: "" },
    { label: "Pending", value: "Pending" },
    { label: "Applied", value: "Applied" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  return (
    <AppLayout pageTitle="Bonuses & Reimbursements">
      <div className="space-y-6">

        {/* ── Page header ─────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <Gift className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Bonuses & Reimbursements
              </h1>
              <p className="text-sm text-gray-500">
                One-off payments, allowances, and deductions for payroll
              </p>
            </div>
          </div>
          <Button onClick={() => setModalOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" />
            New entry
          </Button>
        </div>

        {/* ── Summary stat cards ──────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              title="Total entries"
              value={stats.total}
              icon={ListFilter}
            />
            <StatCard
              title="Pending entries"
              value={stats.pendingCount}
              icon={Clock}
            />
            <StatCard
              title="Pending amount"
              value={stats.pendingAmt >= 1_000_000
                ? `₦${(stats.pendingAmt / 1_000_000).toFixed(1)}M`
                : stats.pendingAmt >= 1_000
                ? `₦${(stats.pendingAmt / 1_000).toFixed(0)}k`
                : formatCurrency(stats.pendingAmt)}
              icon={Banknote}
            />
            <StatCard
              title="Applied amount"
              value={stats.appliedAmt >= 1_000_000
                ? `₦${(stats.appliedAmt / 1_000_000).toFixed(1)}M`
                : stats.appliedAmt >= 1_000
                ? `₦${(stats.appliedAmt / 1_000).toFixed(0)}k`
                : formatCurrency(stats.appliedAmt)}
              icon={CheckCircle2}
            />
          </div>
        )}

        {/* ── Filter bar + table ──────────────────────────── */}
        <Card>
          <CardContent className="p-0">

            {/* Filter row */}
            <div className="flex flex-wrap items-end gap-3 px-5 py-4 border-b border-gray-100">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors"
                />
              </div>

              {/* Dropdowns */}
              <div className="flex flex-wrap items-end gap-3">
                <Select
                  label="Month"
                  options={monthOptions}
                  value={filters.month ? String(filters.month) : ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      page: 1,
                      month: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
                <Select
                  label="Year"
                  options={yearOptions}
                  value={filters.year ? String(filters.year) : ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      page: 1,
                      year: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
                <Select
                  label="Status"
                  options={statusOptions}
                  value={filters.status ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      page: 1,
                      status: (e.target.value || undefined) as BonusStatus | undefined,
                    }))
                  }
                />
              </div>
            </div>

            {/* Table body */}
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : displayedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <Gift className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No entries found</p>
                <p className="mt-1 text-xs text-gray-400">
                  Adjust the filters above, or add a new entry.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 text-xs"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add entry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Employee
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Type
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Description
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Period
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Status
                      </th>
                      <th className="w-12 px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {displayedRows.map((b) => (
                      <tr
                        key={b.id}
                        className="group bg-white transition-colors hover:bg-indigo-50/40"
                      >
                        {/* Employee */}
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 leading-tight">
                            {b.employee?.fullName}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {b.employee?.employeeId}
                          </p>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <Badge variant={TYPE_BADGE_VARIANT[b.type]}>
                            {BONUS_TYPE_LABEL[b.type]}
                          </Badge>
                        </td>

                        {/* Description */}
                        <td className="max-w-xs px-5 py-4 text-gray-600">
                          <span className="block truncate">{b.description}</span>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`font-semibold tabular-nums ${
                              b.type === "OneOffDeduction"
                                ? "text-rose-600"
                                : "text-gray-900"
                            }`}
                          >
                            {b.type === "OneOffDeduction" ? "−" : "+"}
                            {formatCurrency(Number(b.amount))}
                          </span>
                        </td>

                        {/* Period */}
                        <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                          {MONTH_NAMES[b.effectiveMonth - 1]} {b.effectiveYear}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <Badge variant={STATUS_BADGE_VARIANT[b.status]}>
                            {b.status}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          {b.status === "Pending" && (
                            <button
                              onClick={() => setDeleteTarget(b)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                              title="Delete entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Row count */}
                <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
                  Showing {displayedRows.length} {displayedRows.length === 1 ? "entry" : "entries"}
                  {search && ` matching "${search}"`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Create modal ────────────────────────────────── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="New bonus or reimbursement"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(handleCreate)}
                loading={createBonus.isPending}
              >
                Save entry
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Select
              label="Employee"
              required
              options={[
                { label: "Select an employee…", value: "" },
                ...(allEmployees ?? []).map((e) => ({
                  label: `${e.fullName} (${e.employeeId})`,
                  value: e.id,
                })),
              ]}
              {...form.register("employeeId")}
            />
            {form.formState.errors.employeeId && (
              <p className="text-sm text-red-600">
                {form.formState.errors.employeeId.message}
              </p>
            )}

            <Select
              label="Type"
              required
              options={(Object.keys(BONUS_TYPE_LABEL) as BonusType[]).map((t) => ({
                label: BONUS_TYPE_LABEL[t],
                value: t,
              }))}
              {...form.register("type")}
            />

            <Input
              label="Description"
              required
              placeholder="e.g. Q1 performance bonus"
              error={form.formState.errors.description?.message}
              {...form.register("description")}
            />

            <Input
              label="Amount (₦)"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              error={form.formState.errors.amount?.message}
              {...form.register("amount")}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Month"
                required
                options={MONTH_NAMES.map((m, i) => ({
                  label: m,
                  value: String(i + 1),
                }))}
                {...form.register("effectiveMonth")}
              />
              <Select
                label="Year"
                required
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = today.getFullYear() - 2 + i;
                  return { label: String(y), value: String(y) };
                })}
                {...form.register("effectiveYear")}
              />
            </div>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-xs text-indigo-700">
                When the matching payroll run is auto-populated, this entry will
                be applied to that employee's payslip and marked{" "}
                <span className="font-semibold">Applied</span>.
              </p>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete entry"
          message={`Delete the ${deleteTarget?.type?.toLowerCase() ?? "entry"} of ₦${Number(deleteTarget?.amount ?? 0).toLocaleString("en-NG")} for ${deleteTarget?.employee?.fullName ?? "this employee"}? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={deleteBonus.isPending}
        />
      </div>
    </AppLayout>
  );
}
