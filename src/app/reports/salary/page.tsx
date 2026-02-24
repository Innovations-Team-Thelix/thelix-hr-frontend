"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  Download,
} from "lucide-react";
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

export default function SalaryAnalyticsPage() {
  const [sbuFilter, setSbuFilter] = useState("");

  const { data: sbus } = useSbus();
  const { data: salary, isLoading } = useSalaryStats(sbuFilter || undefined);

  const sbuOptions = [
    { label: "All SBUs", value: "" },
    ...(sbus?.map((s) => ({ label: s.name, value: s.id })) || []),
  ];

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
          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select
                options={sbuOptions}
                value={sbuFilter}
                onChange={(e) => setSbuFilter(e.target.value)}
                placeholder="All SBUs"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

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
    </AppLayout>
  );
}
