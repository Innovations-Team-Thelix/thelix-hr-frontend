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
import { Download, CalendarRange, AlertTriangle, TrendingUp, Users } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import api from "@/lib/api";
import { useSbus, useEffectiveRole } from "@/hooks";
import { useLeaveForecast } from "@/hooks/useAnalytics";

export default function LeaveForecastPage() {
  const effectiveRole = useEffectiveRole();
  const { data: sbus } = useSbus();
  const [range, setRange] = useState({
    startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
    endDate: dayjs().add(5, "month").endOf("month").format("YYYY-MM-DD"),
  });
  const [sbuId, setSbuId] = useState("");
  const [downloading, setDownloading] = useState(false);

  const isAdmin = effectiveRole === "Admin" || effectiveRole === "CVO";

  const { data, isLoading } = useLeaveForecast({
    startDate: range.startDate,
    endDate: range.endDate,
  });

  const handleExport = async (view: "monthly" | "gaps", format: "xlsx" | "csv") => {
    setDownloading(true);
    try {
      const params: Record<string, string> = {
        format,
        view,
        startDate: range.startDate,
        endDate: range.endDate,
      };
      if (isAdmin && sbuId) params.sbuId = sbuId;
      const res = await api.instance.get("/leave-forecast/export", {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `leave-forecast-${view}-${dayjs().format("YYYY-MM-DD")}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    } catch {
      toast.error("Failed to export. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const s = data?.summary;

  return (
    <AppLayout pageTitle="Leave Forecast">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={range.startDate}
                onChange={(e) => setRange((p) => ({ ...p, startDate: e.target.value }))}
                className="w-40"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={range.endDate}
                onChange={(e) => setRange((p) => ({ ...p, endDate: e.target.value }))}
                className="w-40"
              />
            </div>
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
            <Button variant="outline" onClick={() => handleExport("monthly", "xlsx")} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" /> Forecast (Excel)
            </Button>
            <Button variant="outline" onClick={() => handleExport("gaps", "csv")} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" /> Gaps (CSV)
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Peak Leave Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s?.peakMonth ?? "—"}</div>
                  <p className="text-xs text-muted-foreground">{s?.peakMonthDays ?? 0} leave-days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leave Days</CardTitle>
                  <CalendarRange className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s?.totalLeaveDays ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Across selected window</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Understaffed Days</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s?.gapDays ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {s?.truncated ? "Capped at 500 — narrow the range" : "Days below coverage floor"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Departments at Risk</CardTitle>
                  <Users className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s?.departmentsAtRisk ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Max shortfall {s?.maxShortfall ?? 0}</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly leave chart */}
            <Card>
              <CardHeader>
                <CardTitle>Leave Days by Month</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.monthTotals}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthLabel" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="leaveDays" name="Leave days" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Coverage gaps */}
            <Card>
              <CardHeader>
                <CardTitle>Coverage Gaps (Understaffed Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.coverageGaps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    No coverage gaps in this window — every department stays above its minimum onsite floor.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">SBU</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3 text-right">Active</th>
                          <th className="px-4 py-3 text-right">On Leave</th>
                          <th className="px-4 py-3 text-right">Available</th>
                          <th className="px-4 py-3 text-right">Min Req.</th>
                          <th className="px-4 py-3 text-right">Shortfall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.coverageGaps.slice(0, 100).map((g, i) => (
                          <tr key={i} className="border-b bg-white hover:bg-gray-50">
                            <td className="px-4 py-3">{dayjs(g.date).format("ddd D MMM")}</td>
                            <td className="px-4 py-3">{g.sbu || "—"}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{g.department}</td>
                            <td className="px-4 py-3 text-right">{g.activeHeadcount}</td>
                            <td className="px-4 py-3 text-right">{g.onLeave}</td>
                            <td className="px-4 py-3 text-right">{g.available}</td>
                            <td className="px-4 py-3 text-right">{g.minRequired}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                −{g.shortfall}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.coverageGaps.length > 100 && (
                      <p className="mt-3 text-xs text-gray-500">
                        Showing first 100 of {data.coverageGaps.length}. Export the Gaps CSV for the full list.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Leave by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                      <tr>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">SBU</th>
                        <th className="px-4 py-3 text-right">Active Headcount</th>
                        <th className="px-4 py-3 text-right">Min Onsite</th>
                        <th className="px-4 py-3 text-right">Total Leave Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byDepartment.map((d) => (
                        <tr key={d.departmentId} className="border-b bg-white hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{d.department}</td>
                          <td className="px-4 py-3">{d.sbu || "—"}</td>
                          <td className="px-4 py-3 text-right">{d.activeHeadcount}</td>
                          <td className="px-4 py-3 text-right">{d.minOnsite}</td>
                          <td className="px-4 py-3 text-right font-semibold">{d.totalLeaveDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex justify-center py-20 text-gray-500">No forecast data available.</div>
        )}
      </div>
    </AppLayout>
  );
}
