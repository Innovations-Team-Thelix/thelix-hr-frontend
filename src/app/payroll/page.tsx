"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Wallet,
  Plus,
  Download,
  ArrowRight,
  Users,
  Clock,
  CheckCircle2,
  Banknote,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/loading";
import { usePayrollRuns, useCreatePayrollRun } from "@/hooks";
import { formatDate } from "@/lib/utils";
import { downloadSalaryTemplate } from "@/lib/payroll-utils";
import type { PayrollStatus } from "@/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_BADGE: Record<
  PayrollStatus,
  { variant: BadgeVariant; label: string; className?: string }
> = {
  Draft:          { variant: "neutral", label: "Draft" },
  PendingFinance: { variant: "warning", label: "Pending Finance" },
  PendingCVO:     { variant: "warning", label: "Pending CVO",
                    className: "bg-purple-50 text-purple-700 border-purple-200" },
  Approved:       { variant: "info",    label: "Approved" },
  Disbursing:     { variant: "info",    label: "Disbursing",
                    className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  Sent:           { variant: "success", label: "Sent" },
  Rejected:       { variant: "danger",  label: "Rejected" },
};

const STATUS_STEP: Record<PayrollStatus, number> = {
  Draft: 0, PendingFinance: 1, PendingCVO: 2,
  Approved: 3, Disbursing: 4, Sent: 5, Rejected: -1,
};

const STEPS = ["Draft", "Finance", "CVO", "Approved", "Disbursing", "Sent"];

function ApprovalProgress({ status }: { status: PayrollStatus }) {
  if (status === "Rejected") {
    return <span className="text-xs font-medium text-rose-500">Rejected</span>;
  }
  const step = STATUS_STEP[status];
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div
            title={s}
            className={`h-1.5 w-1.5 rounded-full ${
              i < step
                ? "bg-green-400"
                : i === step
                ? "bg-indigo-500"
                : "bg-gray-200"
            }`}
          />
          {i < STEPS.length - 1 && (
            <div className={`h-px w-3 ${i < step ? "bg-green-300" : "bg-gray-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function formatCurrencyShort(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function formatCurrencyFull(n: number) {
  return `₦${Number(n).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PayrollPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filters, setFilters] = useState<{
    page: number;
    year?: number;
    status?: PayrollStatus;
  }>({ page: 1 });

  const { data: result, isLoading } = usePayrollRuns(filters);
  const createRun = useCreatePayrollRun();

  const stats = useMemo(() => {
    const runs = result?.data ?? [];
    const pending = runs.filter(
      (r) => r.status === "PendingFinance" || r.status === "PendingCVO"
    ).length;
    const approved = runs.filter((r) => r.status === "Approved").length;
    const totalDisbursed = runs
      .filter((r) => r.status === "Sent")
      .reduce((s, r) => s + Number(r.totalNet || 0), 0);
    return { pending, approved, totalDisbursed };
  }, [result?.data]);

  const handleCreate = async () => {
    try {
      const run = await createRun.mutateAsync({ month, year });
      toast.success("Payroll run created");
      setModalOpen(false);
      if (run) router.push(`/payroll/${(run as { id: string }).id}`);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to create payroll run");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadSalaryTemplate(month, year);
      toast.success(`Template for ${MONTH_NAMES[month - 1]} ${year} downloaded`);
      setTemplateModalOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to download template");
    }
  };

  const currentYear = new Date().getFullYear();
  const monthOptions = MONTH_NAMES.map((name, i) => ({
    label: name,
    value: String(i + 1),
  }));
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    label: String(currentYear - 2 + i),
    value: String(currentYear - 2 + i),
  }));
  const statusOptions = [
    { label: "All statuses",   value: "" },
    { label: "Draft",          value: "Draft" },
    { label: "Pending Finance",value: "PendingFinance" },
    { label: "Pending CVO",    value: "PendingCVO" },
    { label: "Approved",       value: "Approved" },
    { label: "Disbursing",     value: "Disbursing" },
    { label: "Sent",           value: "Sent" },
    { label: "Rejected",       value: "Rejected" },
  ];
  const yearFilterOptions = [{ label: "All years", value: "" }, ...yearOptions];

  return (
    <AppLayout pageTitle="Payroll">
      <div className="space-y-6">

        {/* ── Page header ───────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <Wallet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Payroll Runs</h1>
              <p className="text-sm text-gray-500">
                Manage monthly salary cycles and disbursements
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={() => setTemplateModalOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" />
              Template
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New run
            </Button>
          </div>
        </div>

        {/* ── Stat cards ────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              title="Total runs"
              value={result?.pagination?.total ?? 0}
              icon={Wallet}
            />
            <StatCard
              title="Pending approval"
              value={stats.pending}
              icon={Clock}
            />
            <StatCard
              title="Approved / ready"
              value={stats.approved}
              icon={CheckCircle2}
            />
            <StatCard
              title="Disbursed (visible)"
              value={formatCurrencyShort(stats.totalDisbursed)}
              icon={Banknote}
            />
          </div>
        )}

        {/* ── Filters + table ───────────────────────────── */}
        <Card>
          <CardContent className="p-0">

            {/* Filter bar */}
            <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 px-5 py-4">
              <Select
                label="Status"
                options={statusOptions}
                value={filters.status ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    page: 1,
                    status: (e.target.value || undefined) as PayrollStatus | undefined,
                  }))
                }
              />
              <Select
                label="Year"
                options={yearFilterOptions}
                value={filters.year ? String(filters.year) : ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    page: 1,
                    year: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : !result?.data || result.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <Wallet className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No payroll runs found</p>
                <p className="mt-1 text-xs text-gray-400">
                  Adjust the filters above, or create your first run.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 text-xs"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create payroll run
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Period
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Status
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Progress
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Payslips
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Gross
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Net Pay
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Initiated by
                      </th>
                      <th className="w-10 px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.data.map((run) => {
                      const badge = STATUS_BADGE[run.status];
                      return (
                        <tr
                          key={run.id}
                          className="group cursor-pointer bg-white transition-colors hover:bg-indigo-50/40"
                          onClick={() => router.push(`/payroll/${run.id}`)}
                        >
                          {/* Period */}
                          <td className="px-5 py-4">
                            <p className="font-semibold text-gray-900">
                              {MONTH_NAMES[run.month - 1]} {run.year}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {formatDate(run.createdAt)}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <Badge
                              variant={badge.variant}
                              className={badge.className}
                            >
                              {badge.label}
                            </Badge>
                          </td>

                          {/* Approval progress */}
                          <td className="px-5 py-4">
                            <ApprovalProgress status={run.status} />
                          </td>

                          {/* Payslips */}
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5 text-gray-600">
                              <Users className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-medium tabular-nums">
                                {run._count?.payslips ?? 0}
                              </span>
                            </div>
                          </td>

                          {/* Gross */}
                          <td className="px-5 py-4 text-right">
                            <span className="text-gray-500 tabular-nums">
                              {formatCurrencyFull(Number(run.totalGross || 0))}
                            </span>
                          </td>

                          {/* Net */}
                          <td className="px-5 py-4 text-right">
                            <span className="font-semibold text-gray-900 tabular-nums">
                              {formatCurrencyFull(Number(run.totalNet || 0))}
                            </span>
                          </td>

                          {/* Initiated by */}
                          <td className="px-5 py-4">
                            <span className="text-gray-500">
                              {run.createdBy?.fullName ?? "—"}
                            </span>
                          </td>

                          {/* Arrow */}
                          <td className="px-5 py-4">
                            <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-indigo-400" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Table footer */}
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                  <p className="text-xs text-gray-400">
                    {result.data.length}{" "}
                    {result.data.length === 1 ? "run" : "runs"} shown
                    {result.pagination && result.pagination.total > result.data.length
                      ? ` · ${result.pagination.total} total`
                      : ""}
                  </p>
                  {result.pagination && result.pagination.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        disabled={!result.pagination.hasPrevPage}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilters((f) => ({ ...f, page: f.page - 1 }));
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="px-2 text-xs text-gray-500">
                        {result.pagination.page} / {result.pagination.totalPages}
                      </span>
                      <button
                        disabled={!result.pagination.hasNextPage}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilters((f) => ({ ...f, page: f.page + 1 }));
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Create run modal ──────────────────────────── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create payroll run"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={createRun.isPending}>
                Create run
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              The run starts in Draft. Auto-populate it from salary records on
              the next page, review, then submit for Finance → CVO approval.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Month"
                required
                options={monthOptions}
                value={String(month)}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
              <Select
                label="Year"
                required
                options={yearOptions}
                value={String(year)}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-xs text-indigo-700">
                <span className="font-semibold">Tip:</span> Use "Auto-populate"
                on the run page to pull active salary records automatically, or
                upload a filled .xlsx template.
              </p>
            </div>
          </div>
        </Modal>

        {/* ── Template download modal ───────────────────── */}
        <Modal
          isOpen={templateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          title="Download salary template"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setTemplateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4" />
                Download .xlsx
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Downloads an Excel template pre-populated with all active
              employees. Finance fills in actual amounts and re-uploads via the
              payroll run page.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Month"
                required
                options={monthOptions}
                value={String(month)}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
              <Select
                label="Year"
                required
                options={yearOptions}
                value={String(year)}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>
        </Modal>

      </div>
    </AppLayout>
  );
}
