"use client";

import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Receipt,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/loading";
import { useMyPayslips, useAllPayslips, useAllEmployees } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import type { PayslipPaymentStatus } from "@/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const PAYMENT_BADGE: Record<PayslipPaymentStatus, { variant: BadgeVariant; label: string }> = {
  Paid:       { variant: "success", label: "Paid" },
  Processing: { variant: "warning", label: "Processing" },
  Pending:    { variant: "neutral", label: "Pending" },
  Failed:     { variant: "danger",  label: "Failed" },
};

function fmt(n: number) {
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₦${(n / 1_000).toFixed(0)}k`;
  return fmt(n);
}

async function openPayslipPdf(payslipId: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const res = await fetch(`${API_URL}/payslips/${payslipId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (json.data?.signedUrl) {
    const a = document.createElement("a");
    a.href = json.data.signedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  } else {
    throw new Error("No signed URL");
  }
}

// ─── Admin / Finance view ────────────────────────────────────────────────────

function AdminPayslipsView() {
  const [filters, setFilters] = useState<{
    page: number;
    month?: number;
    year?: number;
    employeeId?: string;
    paymentStatus?: string;
  }>({ page: 1 });
  const [search, setSearch] = useState("");

  const { data: result, isLoading } = useAllPayslips(filters);
  const { data: allEmployees } = useAllEmployees();

  const stats = useMemo(() => {
    const rows = result?.data ?? [];
    const paid       = rows.filter((p) => p.paymentStatus === "Paid");
    const processing = rows.filter((p) => p.paymentStatus === "Processing");
    const failed     = rows.filter((p) => p.paymentStatus === "Failed");
    const totalPaid  = paid.reduce((s, p) => s + Number(p.netPay || 0), 0);
    return { total: result?.pagination?.total ?? 0, paidCount: paid.length, processingCount: processing.length, failedCount: failed.length, totalPaid };
  }, [result]);

  const displayedRows = useMemo(() => {
    const rows = result?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        (p as any).employee?.fullName?.toLowerCase().includes(q) ||
        (p as any).employee?.employeeId?.toLowerCase().includes(q),
    );
  }, [result?.data, search]);

  const currentYear = new Date().getFullYear();
  const monthOptions = [
    { label: "All months", value: "" },
    ...MONTH_NAMES.map((m, i) => ({ label: m, value: String(i + 1) })),
  ];
  const yearOptions = [
    { label: "All years", value: "" },
    ...Array.from({ length: 5 }, (_, i) => {
      const y = currentYear - 2 + i;
      return { label: String(y), value: String(y) };
    }),
  ];
  const statusOptions = [
    { label: "All statuses", value: "" },
    { label: "Paid",       value: "Paid" },
    { label: "Processing", value: "Processing" },
    { label: "Pending",    value: "Pending" },
    { label: "Failed",     value: "Failed" },
  ];
  const employeeOptions = [
    { label: "All employees", value: "" },
    ...(allEmployees ?? []).map((e) => ({
      label: `${e.fullName} (${e.employeeId})`,
      value: e.id,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <Receipt className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Payslip Overview</h1>
            <p className="text-sm text-gray-500">
              All employee payslips across payroll runs
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total payslips"   value={stats.total}           icon={Users} />
          <StatCard title="Paid"             value={fmtShort(stats.totalPaid)} icon={CheckCircle2} />
          <StatCard title="Processing"       value={stats.processingCount} icon={Clock} />
          <StatCard title="Failed"           value={stats.failedCount}     icon={XCircle} />
        </div>
      )}

      {/* Filter + table */}
      <Card>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 border-b border-gray-100 px-5 py-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-100 transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Select
                label="Employee"
                options={employeeOptions}
                value={filters.employeeId ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, page: 1, employeeId: e.target.value || undefined }))
                }
              />
              <Select
                label="Month"
                options={monthOptions}
                value={filters.month ? String(filters.month) : ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, page: 1, month: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
              <Select
                label="Year"
                options={yearOptions}
                value={filters.year ? String(filters.year) : ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, page: 1, year: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
              <Select
                label="Status"
                options={statusOptions}
                value={filters.paymentStatus ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, page: 1, paymentStatus: e.target.value || undefined }))
                }
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : displayedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <Receipt className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No payslips found</p>
              <p className="mt-1 text-xs text-gray-400">Try adjusting the filters above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Employee</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Period</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Gross</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">PAYE</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Pension</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Net Pay</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                    <th className="w-16 px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedRows.map((p) => {
                    const emp = (p as any).employee;
                    const run = (p as any).payrollRun;
                    const gross = Number(p.grossPay || 0) || Number(p.basicSalary || 0) + Number(p.allowances || 0);
                    const badge = PAYMENT_BADGE[p.paymentStatus ?? "Pending"];
                    return (
                      <tr key={p.id} className="group bg-white transition-colors hover:bg-green-50/30">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 leading-tight">{emp?.fullName ?? "—"}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{emp?.employeeId}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-gray-700 whitespace-nowrap">
                          {run ? `${MONTH_NAMES[run.month - 1]} ${run.year}` : "—"}
                        </td>
                        <td className="px-5 py-4 text-right text-gray-600 tabular-nums">{fmt(gross)}</td>
                        <td className="px-5 py-4 text-right tabular-nums text-rose-500">({fmt(Number(p.paye || 0))})</td>
                        <td className="px-5 py-4 text-right tabular-nums text-rose-500">({fmt(Number(p.pension || 0))})</td>
                        <td className="px-5 py-4 text-right font-semibold text-gray-900 tabular-nums">{fmt(Number(p.netPay || 0))}</td>
                        <td className="px-5 py-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={async () => {
                              try { await openPayslipPdf(p.id); }
                              catch { toast.error("Failed to get download link"); }
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-300 opacity-0 transition-all hover:bg-green-50 hover:text-green-600 group-hover:opacity-100"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                <p className="text-xs text-gray-400">
                  {displayedRows.length} {displayedRows.length === 1 ? "payslip" : "payslips"} shown
                  {result?.pagination && result.pagination.total > result.data.length
                    ? ` · ${result.pagination.total} total`
                    : ""}
                </p>
                {result?.pagination && result.pagination.totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      disabled={!result.pagination.hasPrevPage}
                      onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-2 text-xs text-gray-500">
                      {result.pagination.page} / {result.pagination.totalPages}
                    </span>
                    <button
                      disabled={!result.pagination.hasNextPage}
                      onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
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
    </div>
  );
}

// ─── Employee self-service view ──────────────────────────────────────────────

function EmployeePayslipsView() {
  const { data, isLoading } = useMyPayslips();

  const handleDownload = async (payslipId: string) => {
    try {
      await openPayslipPdf(payslipId);
    } catch {
      toast.error("Failed to get download link");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
          <Receipt className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Payslips</h1>
          <p className="text-sm text-gray-500">Your year-to-date summary and payment history</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <Receipt className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No payslip data yet</p>
              <p className="mt-1 text-xs text-gray-400">Your payslips will appear here once payroll is processed.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* YTD stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard title="YTD Basic Salary" value={`₦${Number(data.ytd.basicSalary).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`} icon={DollarSign} />
            <StatCard title="YTD Allowances"   value={`₦${Number(data.ytd.allowances).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}   icon={TrendingUp} />
            <StatCard title="YTD Deductions"   value={`₦${Number(data.ytd.deductions).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}   icon={TrendingDown} />
            <StatCard title="YTD Net Pay"      value={`₦${Number(data.ytd.netPay).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}      icon={Wallet} />
          </div>

          {/* Payslip history */}
          <Card>
            <CardContent className="p-0">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Payslip History</h2>
              </div>

              {data.payslips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                    <Receipt className="h-5 w-5 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">No payslips yet</p>
                  <p className="mt-1 text-xs text-gray-400">They'll appear here once your payroll run is sent.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Period</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Gross</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">PAYE</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Pension</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">NHF</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Net Pay</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Payment</th>
                        <th className="w-12 px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.payslips.map((p) => {
                        const gross = Number(p.grossPay || 0) || Number(p.basicSalary || 0) + Number(p.allowances || 0);
                        const badge = PAYMENT_BADGE[(p.paymentStatus as PayslipPaymentStatus) ?? "Pending"];
                        return (
                          <tr key={p.id} className="group bg-white transition-colors hover:bg-green-50/30">
                            <td className="px-5 py-4 font-semibold text-gray-900">
                              {p.payrollRun
                                ? `${MONTH_NAMES[p.payrollRun.month - 1]} ${p.payrollRun.year}`
                                : "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-gray-600 tabular-nums">{fmt(gross)}</td>
                            <td className="px-5 py-4 text-right tabular-nums text-rose-500">({fmt(Number(p.paye || 0))})</td>
                            <td className="px-5 py-4 text-right tabular-nums text-rose-500">({fmt(Number(p.pension || 0))})</td>
                            <td className="px-5 py-4 text-right tabular-nums text-rose-500">({fmt(Number(p.nhf || 0))})</td>
                            <td className="px-5 py-4 text-right font-bold text-gray-900 tabular-nums">{fmt(Number(p.netPay || 0))}</td>
                            <td className="px-5 py-4">
                              <div>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                                {p.paymentStatus === "Paid" && p.paymentCompletedAt && (
                                  <p className="mt-0.5 text-xs text-gray-400">
                                    {new Date(p.paymentCompletedAt).toLocaleDateString("en-NG", {
                                      day: "numeric", month: "short", year: "numeric",
                                    })}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                onClick={() => handleDownload(p.id)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-300 opacity-0 transition-all hover:bg-green-50 hover:text-green-600 group-hover:opacity-100"
                                title="Download PDF"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="border-t border-gray-100 px-5 py-3">
                    <p className="text-xs text-gray-400">
                      {data.payslips.length} {data.payslips.length === 1 ? "payslip" : "payslips"} · current year shown first
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Page entry — role-branched ──────────────────────────────────────────────

export default function PayslipsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "Finance";

  return (
    <AppLayout pageTitle={isAdmin ? "Payslip Overview" : "My Payslips"}>
      {isAdmin ? <AdminPayslipsView /> : <EmployeePayslipsView />}
    </AppLayout>
  );
}
