import React from "react";
import { DollarSign, TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SalaryBreakdown {
  baseSalary: number;
  grossPay: number;
  netPay: number;
  tax: number;
  pension: number;
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
      <span
        className={`text-sm ${
          bold ? "font-semibold text-gray-900" : "text-gray-600"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          bold
            ? variant === "negative"
              ? "text-danger-600"
              : "text-gray-900"
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
}: CompensationSummaryProps) {
  const cur = currency || "NGN";

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
              {/* Base Salary — dark brand card */}
              <div className="relative overflow-hidden rounded-2xl bg-[#412003] p-5 text-white">
                <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                  Base Salary
                </p>
                <p className="mt-3 text-2xl font-bold">
                  {formatCurrency(salaryBreakdown.baseSalary, cur)}
                </p>
              </div>

              {/* Gross Pay — green tint */}
              <div className="rounded-2xl bg-emerald-50 p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  Gross Pay
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">
                  {formatCurrency(salaryBreakdown.grossPay, cur)}
                </p>
              </div>

              {/* Net Pay — orange tint */}
              <div className="rounded-2xl bg-primary/5 p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Net Pay
                </p>
                <p className="mt-1 text-2xl font-bold text-[#412003]">
                  {formatCurrency(salaryBreakdown.netPay, cur)}
                </p>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField
                label="Gross Pay"
                value={formatCurrency(monthlySalary, cur)}
              />
              {netPay != null && (
                <InfoField
                  label="Net Pay"
                  value={formatCurrency(netPay, cur)}
                />
              )}
              <InfoField label="Salary Band" value={salaryBand} />
              <InfoField label="Currency" value={currency} />
              <InfoField
                label="Salary Effective Date"
                value={formatDate(salaryEffectiveDate)}
              />
              <InfoField
                label="Last Salary Review"
                value={formatDate(lastSalaryReview)}
              />
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
              <div>
                <LineItem
                  label="Base Salary"
                  value={formatCurrency(salaryBreakdown.baseSalary, cur)}
                  variant="positive"
                />
                {salaryBreakdown.allowances.map((allowance, i) => (
                  <LineItem
                    key={i}
                    label={allowance.name}
                    value={formatCurrency(allowance.amount, cur)}
                    variant="positive"
                  />
                ))}
                <div className="mt-1 border-t border-gray-100 pt-2">
                  <LineItem
                    label="Total Earnings"
                    value={formatCurrency(salaryBreakdown.grossPay, cur)}
                    variant="positive"
                    bold
                  />
                </div>
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
              <div>
                <LineItem
                  label="Tax"
                  value={`-${formatCurrency(salaryBreakdown.tax, cur)}`}
                  variant="negative"
                />
                <LineItem
                  label="Pension"
                  value={`-${formatCurrency(salaryBreakdown.pension, cur)}`}
                  variant="negative"
                />
                {salaryBreakdown.deductions.map((deduction, i) => (
                  <LineItem
                    key={i}
                    label={deduction.name}
                    value={`-${formatCurrency(deduction.amount, cur)}`}
                    variant="negative"
                  />
                ))}
                <div className="mt-1 border-t border-gray-100 pt-2">
                  <LineItem
                    label="Total Deductions"
                    value={`-${formatCurrency(
                      salaryBreakdown.grossPay - salaryBreakdown.netPay,
                      cur
                    )}`}
                    variant="negative"
                    bold
                  />
                </div>
              </div>
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
