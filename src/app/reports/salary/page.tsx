"use client";

import React, { useState, useRef } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AppLayout } from "@/components/layout/app-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useSbus } from "@/hooks";
import { useSalaryStats } from "@/hooks/useDashboard";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const SBU_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function SalaryAnalyticsPage() {
  const queryClient = useQueryClient();
  const [sbuFilter, setSbuFilter] = useState("");
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    created: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const { data: sbus } = useSbus();
  const { data: salary, isLoading } = useSalaryStats(
    sbuFilter || undefined,
    month,
    year,
  );

  const sbuOptions = [
    { label: "All SBUs", value: "" },
    ...(sbus?.map((s) => ({ label: s.name, value: s.id })) || []),
  ];

  const yearOptions = (() => {
    const current = now.getFullYear();
    const range: { label: string; value: string }[] = [];
    for (let y = current + 1; y >= current - 4; y--) {
      range.push({ label: String(y), value: String(y) });
    }
    return range;
  })();
  const monthOptions = MONTHS.map((m) => ({
    label: m.label,
    value: String(m.value),
  }));
  const monthLabel = MONTHS.find((m) => m.value === month)?.label ?? "";

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await api.instance.get("/payroll/template", {
        params: { month, year },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `salary-template-${monthLabel}-${year}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to download template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file first");
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("month", String(month));
      formData.append("year", String(year));

      const res = await api.instance.post("/payroll/upload-month", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data?.data ?? res.data;
      setUploadResult({
        created: data.created ?? 0,
        errors: data.errors ?? [],
      });
      toast.success(
        `Uploaded ${data.created ?? 0} payslip(s) for ${monthLabel} ${year}`,
      );
      // Refresh analytics
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadResult(null);
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  };

  const payoutData = salary?.payoutBySbu?.map((item) => ({
    name: item.sbuName,
    total: item.total,
    average: Math.round(item.averageSalary),
    headcount: item.headcount,
  })) || [];

  const pieData = salary?.payoutBySbu?.map((item) => ({
    name: item.sbuName,
    value: item.total,
  })) || [];

  const totalHeadcount = payoutData.reduce((sum, item) => sum + item.headcount, 0);
  const overallAvg = totalHeadcount > 0
    ? Math.round((salary?.totalMonthlyPayout ?? 0) / totalHeadcount)
    : 0;

  const handleExport = async () => {
    try {
      const res = await api.instance.get("/reports/salary", {
        params: { format: "xlsx", sbuId: sbuFilter || undefined },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "salary-report.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Salary report exported");
    } catch {
      toast.error("Failed to export salary report");
    }
  };

  return (
    <AppLayout pageTitle="Salary Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Salary Analytics
              </h2>
              <p className="text-sm text-gray-500">
                Compensation overview across the organisation
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-36">
              <Select
                options={monthOptions}
                value={String(month)}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </div>
            <div className="w-24">
              <Select
                options={yearOptions}
                value={String(year)}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="w-40">
              <Select
                options={sbuOptions}
                value={sbuFilter}
                onChange={(e) => setSbuFilter(e.target.value)}
                placeholder="All SBUs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              loading={downloadingTemplate}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Template
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload Payments
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Data source banner */}
        {!isLoading && salary && (
          <div
            className={cn(
              "flex items-center justify-between rounded-lg border px-4 py-3 text-sm",
              salary.source === "actual"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800",
            )}
          >
            <div className="flex items-center gap-2">
              {salary.source === "actual" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>
                {salary.source === "actual"
                  ? `Showing actual payments uploaded by Finance for ${monthLabel} ${year}.`
                  : `No payments uploaded for ${monthLabel} ${year} yet — showing theoretical payout from each employee's configured monthly salary.`}
              </span>
            </div>
            {salary.source === "theoretical" && (
              <button
                onClick={() => setUploadOpen(true)}
                className="text-xs font-semibold underline underline-offset-2 hover:no-underline"
              >
                Upload now →
              </button>
            )}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </Card>
            ))
          ) : (
            <>
              <StatCard
                title="Total Monthly Payout"
                value={formatCurrency(salary?.totalMonthlyPayout ?? 0)}
                icon={DollarSign}
              />
              <StatCard
                title="Average Salary"
                value={formatCurrency(overallAvg)}
                icon={TrendingUp}
              />
              <StatCard
                title="Total Headcount"
                value={totalHeadcount}
                icon={Users}
              />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Payout by SBU - Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Monthly Payout by SBU
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72 w-full" variant="rectangular" />
              ) : payoutData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={payoutData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Payout" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-gray-500">
                  No salary data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout Distribution - Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Payout Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72 w-full" variant="rectangular" />
              ) : pieData.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {pieData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={SBU_COLORS[index % SBU_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: SBU_COLORS[index % SBU_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-gray-600">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Average Salary by SBU - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Average Salary by SBU</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" variant="rectangular" />
            ) : payoutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payoutData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="average" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Average Salary" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-gray-500">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>SBU Salary Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SBU</TableHead>
                    <TableHead className="text-right">Headcount</TableHead>
                    <TableHead className="text-right">Total Monthly Payout</TableHead>
                    <TableHead className="text-right">Average Salary</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutData.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.headcount}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.average)}
                      </TableCell>
                      <TableCell className="text-right">
                        {salary?.totalMonthlyPayout
                          ? ((item.total / salary.totalMonthlyPayout) * 100).toFixed(1)
                          : 0}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                  {payoutData.length > 0 && (
                    <TableRow className="bg-gray-50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totalHeadcount}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(salary?.totalMonthlyPayout ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(overallAvg)}
                      </TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Payments Modal */}
      <Modal
        isOpen={uploadOpen}
        onClose={closeUpload}
        title={`Upload Payments — ${monthLabel} ${year}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={closeUpload} disabled={uploading}>
              {uploadResult ? "Done" : "Cancel"}
            </Button>
            {!uploadResult && (
              <Button
                onClick={handleUpload}
                loading={uploading}
                disabled={!uploadFile}
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          {!uploadResult && (
            <>
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                <p className="font-semibold">How this works</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                  <li>
                    Click <span className="font-semibold">Template</span> on the
                    page header to download the {monthLabel} {year} template.
                  </li>
                  <li>
                    Fill in the <em>Basic Salary</em>, <em>Allowances</em>, and{" "}
                    <em>Deductions</em> columns. Don&apos;t change the Email
                    column.
                  </li>
                  <li>Save and upload the file below.</li>
                </ol>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Filled template (.xlsx) <span className="text-red-500">*</span>
                </label>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
                />
                {uploadFile && (
                  <p className="mt-1 text-xs text-gray-500">
                    Selected: {uploadFile.name}
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-500">
                If a payroll run for {monthLabel} {year} already exists in
                Draft, this will update the existing payslips. Approved or sent
                runs cannot be modified.
              </p>
            </>
          )}

          {uploadResult && (
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {uploadResult.created} payslip(s) recorded for {monthLabel}{" "}
                  {year}
                </div>
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    {uploadResult.errors.length} row(s) skipped
                  </p>
                  <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-red-700">
                    {uploadResult.errors.map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
