"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/loading";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, Wallet, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import api from "@/lib/api";
import { useSbus, useEffectiveRole } from "@/hooks";
import { useLeaveCost } from "@/hooks/useAnalytics";

export default function CostOfLeavePage() {
  const effectiveRole = useEffectiveRole();
  const { data: sbus } = useSbus();
  const [year, setYear] = useState(dayjs().year());
  const [sbuId, setSbuId] = useState("");
  const [downloading, setDownloading] = useState(false);

  const isAdmin = effectiveRole === "Admin" || effectiveRole === "CVO";

  const { data, isLoading } = useLeaveCost({ year });

  const fmt = (n: number, currency: string) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: currency || "NGN", maximumFractionDigits: 0 }).format(n);

  const currency = data?.summary.currency ?? "NGN";

  const handleExport = async (format: "xlsx" | "csv") => {
    setDownloading(true);
    try {
      const params: Record<string, string> = { format, year: String(year) };
      if (isAdmin && sbuId) params.sbuId = sbuId;
      const res = await api.instance.get("/leave-cost/export", { params, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cost-of-leave-${year}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    } catch {
      toast.error("Failed to export. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppLayout pageTitle="Cost of Leave">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || dayjs().year())}
              className="w-28"
            />
            {isAdmin && (
              <Select
                options={[
                  { label: "All SBUs", value: "" },
                  ...(sbus?.map((sbu) => ({ label: sbu.name, value: sbu.id })) || []),
                ]}
                value={sbuId}
                onChange={(e) => setSbuId(e.target.value)}
                placeholder="All SBUs"
                className="w-48"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport("csv")} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => handleExport("xlsx")} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : data ? (
          <>
            {/* Metric cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leave Taken (Cost)</CardTitle>
                  <Receipt className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmt(data.summary.totalUsedCost, currency)}</div>
                  <p className="text-xs text-muted-foreground">Approved paid leave taken in {data.year}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding Liability</CardTitle>
                  <Wallet className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmt(data.summary.totalLiabilityCost, currency)}</div>
                  <p className="text-xs text-muted-foreground">Remaining balances if all taken</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Exposure</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmt(data.summary.totalCost, currency)}</div>
                  <p className="text-xs text-muted-foreground">{data.summary.employeesCounted} employees</p>
                </CardContent>
              </Card>
            </div>

            {/* Cost by department */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Department</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.byDepartment}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis tickFormatter={(v) => fmt(v, currency)} width={90} />
                    <Tooltip formatter={(v: number) => fmt(v, currency)} />
                    <Bar dataKey="usedCost" name="Taken" stackId="a" fill="#10b981" />
                    <Bar dataKey="liabilityCost" name="Liability" stackId="a" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost by leave type */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Leave Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                      <tr>
                        <th className="px-4 py-3">Leave Type</th>
                        <th className="px-4 py-3 text-right">Days Taken</th>
                        <th className="px-4 py-3 text-right">Used Cost</th>
                        <th className="px-4 py-3 text-right">Liability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byLeaveType.map((t) => (
                        <tr key={t.leaveType} className="border-b bg-white hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{t.leaveType}</td>
                          <td className="px-4 py-3 text-right">{t.usedDays}</td>
                          <td className="px-4 py-3 text-right">{fmt(t.usedCost, currency)}</td>
                          <td className="px-4 py-3 text-right">{fmt(t.liabilityCost, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Top employees */}
            <Card>
              <CardHeader>
                <CardTitle>By Employee (Top 25)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3 text-right">Days Taken</th>
                        <th className="px-4 py-3 text-right">Used Cost</th>
                        <th className="px-4 py-3 text-right">Remaining</th>
                        <th className="px-4 py-3 text-right">Liability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byEmployee.slice(0, 25).map((e) => (
                        <tr key={e.employeeId} className="border-b bg-white hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{e.employee}</td>
                          <td className="px-4 py-3">{e.department || "—"}</td>
                          <td className="px-4 py-3 text-right">{e.usedDays}</td>
                          <td className="px-4 py-3 text-right">{fmt(e.usedCost, e.currency)}</td>
                          <td className="px-4 py-3 text-right">{e.remainingDays}</td>
                          <td className="px-4 py-3 text-right">{fmt(e.liabilityCost, e.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-gray-500">
              Indicative figures only — paid leave valued at monthly salary ÷ {data.assumptions.workingDaysPerMonth} working
              days. Not a payroll accrual.
            </p>
          </>
        ) : (
          <div className="flex justify-center py-20 text-gray-500">No cost data available.</div>
        )}
      </div>
    </AppLayout>
  );
}
