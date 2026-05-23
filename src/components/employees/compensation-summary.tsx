import React from "react";
import { DollarSign, TrendingUp, TrendingDown, Landmark, Building2, CalendarDays } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { LeaveBalance } from "@/types";

interface SalaryBreakdown {
  baseSalary: number;
  grossPay: number;
  netPay: number;
  netPay40?: number;
  netPayTotal?: number;
  tax: number;
  pension: number;
  employerPension?: number;
  nhf?: number;
  totalDeductions?: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
}

export interface CompensationSummaryProps {
  salaryBreakdown?: SalaryBreakdown | null;
  currency?: string | null;
  monthlySalary?: number | null;
  netPay?: number | null;
  salaryBand?: string | null;
  salaryEffectiveDate?: string | null;
  lastSalaryReview?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  leaveBalances?: LeaveBalance[];
}

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function LineItem({
  label,
  value,
  variant = "default",
  bold = false,
}: {
  label: string;
  value: string;
  variant?: "default" | "positive" | "negative";
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${
        bold ? "" : "border-b border-gray-50 last:border-0"
      }`}
    >
      <span className={`text-sm ${bold ? "font-semibold text-gray-900" : "text-gray-600"}`}>
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          bold
            ? variant === "negative" ? "text-danger-600" : "text-gray-900"
            : variant === "negative"
              ? "text-danger-500"
              : variant === "positive"
                ? "text-success-600"
                : "text-gray-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function CompensationSummary({
  salaryBreakdown,
  currency = "NGN",
  monthlySalary,
  netPay,
  salaryBand,
  salaryEffectiveDate,
  lastSalaryReview,
  accountName,
  accountNumber,
  bankName,
  leaveBalances = [],
}: CompensationSummaryProps) {
  const cur = currency || "NGN";

  const n = (v: unknown) => parseFloat(String(v ?? 0)) || 0;
  const totalDeductions =
    n(salaryBreakdown?.tax) +
    n(salaryBreakdown?.pension) +
    n(salaryBreakdown?.nhf) +
    (Array.isArray(salaryBreakdown?.deductions)
      ? salaryBreakdown.deductions.reduce((s: number, d: { amount: number }) => s + n(d.amount), 0)
      : 0);
  const emplrPension       = n(salaryBreakdown?.employerPension);
  const itf                = Math.round(n(salaryBreakdown?.baseSalary) * 0.01 * 100) / 100;
  const totalCompanyContrib = emplrPension + itf;

  return (
    <div className="space-y-6">
      {/* ── Top KPI cards ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Compensation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salaryBreakdown ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl bg-[#412003] p-5 text-white">
                <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">Base Salary</p>
                <p className="mt-3 text-2xl font-bold">{formatCurrency(salaryBreakdown.baseSalary, cur)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Gross Pay</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">{formatCurrency(salaryBreakdown.grossPay, cur)}</p>
              </div>
              <div className="rounded-2xl bg-primary/5 p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Net Pay</p>
                <p className="mt-1 text-2xl font-bold text-[#412003]">{formatCurrency(salaryBreakdown.netPayTotal ?? salaryBreakdown.netPay, cur)}</p>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField label="Gross Pay" value={formatCurrency(monthlySalary, cur)} />
              {netPay != null && <InfoField label="Net Pay" value={formatCurrency(netPay, cur)} />}
              <InfoField label="Salary Band" value={salaryBand} />
              <InfoField label="Currency" value={currency} />
              <InfoField label="Salary Effective Date" value={formatDate(salaryEffectiveDate)} />
              <InfoField label="Last Salary Review" value={formatDate(lastSalaryReview)} />
            </dl>
          )}
        </CardContent>
      </Card>

      {/* ── Earnings + Deductions ── */}
      {salaryBreakdown && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Earnings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineItem
                label="Basic Salary"
                value={formatCurrency(salaryBreakdown.baseSalary, cur)}
                variant="positive"
              />
              {salaryBreakdown.allowances.map((a, i) => (
                <LineItem key={i} label={a.name} value={formatCurrency(a.amount, cur)} variant="positive" />
              ))}
              {salaryBreakdown.allowances.length === 0 && salaryBreakdown.grossPay > salaryBreakdown.baseSalary && (
                <LineItem
                  label="Allowances"
                  value={formatCurrency(salaryBreakdown.grossPay - salaryBreakdown.baseSalary, cur)}
                  variant="positive"
                />
              )}
              <div className="mt-1 border-t border-gray-100 pt-2">
                <LineItem label="Gross Pay" value={formatCurrency(salaryBreakdown.grossPay, cur)} variant="positive" bold />
              </div>
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                  <TrendingDown className="h-3.5 w-3.5 text-danger-500" />
                </div>
                Deductions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salaryBreakdown.tax > 0 && (
                <LineItem label="PAYE" value={`-${formatCurrency(salaryBreakdown.tax, cur)}`} variant="negative" />
              )}
              {salaryBreakdown.pension > 0 && (
                <LineItem label="Employee Pension (8%)" value={`-${formatCurrency(salaryBreakdown.pension, cur)}`} variant="negative" />
              )}
              {(salaryBreakdown.nhf ?? 0) > 0 && (
                <LineItem label="NHF (2.5%)" value={`-${formatCurrency(salaryBreakdown.nhf!, cur)}`} variant="negative" />
              )}
              {salaryBreakdown.deductions.map((d, i) => (
                <LineItem key={i} label={d.name} value={`-${formatCurrency(d.amount, cur)}`} variant="negative" />
              ))}
              {totalDeductions === 0 && (
                <p className="py-3 text-sm text-gray-400">No deductions recorded</p>
              )}
              <div className="mt-1 border-t border-gray-100 pt-2">
                <LineItem
                  label="Total Deductions"
                  value={`-${formatCurrency(totalDeductions, cur)}`}
                  variant="negative"
                  bold
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Company Contributions + Leave Balance ── */}
      {salaryBreakdown && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Company Contributions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                </div>
                Company Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {emplrPension > 0 && (
                <LineItem
                  label="Employer Pension (10%)"
                  value={formatCurrency(emplrPension, cur)}
                  variant="positive"
                />
              )}
              {itf > 0 && (
                <LineItem
                  label="ITF (1%)"
                  value={formatCurrency(itf, cur)}
                  variant="positive"
                />
              )}
              {totalCompanyContrib === 0 && (
                <p className="py-3 text-sm text-gray-400">No contributions recorded</p>
              )}
              {totalCompanyContrib > 0 && (
                <div className="mt-1 border-t border-gray-100 pt-2">
                  <LineItem
                    label="Total Contributions"
                    value={formatCurrency(totalCompanyContrib, cur)}
                    bold
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                  <CalendarDays className="h-3.5 w-3.5 text-violet-600" />
                </div>
                Leave Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaveBalances.length === 0 ? (
                <p className="py-3 text-sm text-gray-400">No leave balances recorded</p>
              ) : (
                leaveBalances.map((lb) => {
                  const remaining = (lb.remainingDays ?? (lb.totalDays - lb.usedDays));
                  return (
                    <LineItem
                      key={lb.id}
                      label={lb.leaveType?.name ?? "Leave"}
                      value={`${remaining % 1 === 0 ? remaining.toFixed(0) : remaining.toFixed(1)} days`}
                    />
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Bank Details ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Landmark className="h-3.5 w-3.5 text-primary" />
            </div>
            Bank Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <InfoField label="Account Name" value={accountName} />
            <InfoField label="Account Number" value={accountNumber} />
            <InfoField label="Bank Name" value={bankName} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
