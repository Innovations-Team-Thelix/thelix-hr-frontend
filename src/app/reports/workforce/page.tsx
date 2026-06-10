"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loading";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Download, Users, UserMinus, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import api from "@/lib/api";
import { useSbus, useEffectiveRole } from "@/hooks";
import { useCapacity, useHeadcountTrend, useAttrition } from "@/hooks/useAnalytics";

export default function WorkforcePlanningPage() {
  const effectiveRole = useEffectiveRole();
  const { data: sbus } = useSbus();
  const [sbuId, setSbuId] = useState("");
  const [year] = useState(dayjs().year());
  const [downloading, setDownloading] = useState(false);

  const isAdmin = effectiveRole === "Admin" || effectiveRole === "CVO";

  // SBU filter only affects admins; SBUHeads are auto-scoped server-side.
  const { data: capacity, isLoading: loadingCapacity } = useCapacity();
  const { data: trend, isLoading: loadingTrend } = useHeadcountTrend(12);
  const { data: attrition, isLoading: loadingAttrition } = useAttrition(year);

  const handleExport = async (view: "capacity" | "attrition", format: "xlsx" | "csv") => {
    setDownloading(true);
    try {
      const params: Record<string, string> = { format, view, year: String(year) };
      if (isAdmin && sbuId) params.sbuId = sbuId;
      const res = await api.instance.get("/workforce/export", { params, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `workforce-${view}-${dayjs().format("YYYY-MM-DD")}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export ready");
    } catch {
      toast.error("Failed to export. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const isLoading = loadingCapacity || loadingTrend || loadingAttrition;

  return (
    <AppLayout pageTitle="Workforce Planning">
      <div className="space-y-6">
        {/* Filters / actions */}
        <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
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
            <Button variant="outline" onClick={() => handleExport("capacity", "xlsx")} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" /> Capacity (Excel)
            </Button>
            <Button variant="outline" onClick={() => handleExport("attrition", "csv")} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" /> Attrition (CSV)
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Headcount</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{trend?.summary.currentHeadcount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +{trend?.summary.totalJoiners ?? 0} joined / −{trend?.summary.totalLeavers ?? 0} left (12 mo)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attrition Rate ({year})</CardTitle>
                  <UserMinus className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{attrition?.summary.attritionRate ?? 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    {attrition?.summary.leavers ?? 0} leavers / avg {attrition?.summary.avgHeadcount ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Need More Hands</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{capacity?.summary.departmentsNeedingHands ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Departments below coverage now</p>
                </CardContent>
              </Card>
            </div>

            {/* Headcount trend */}
            <Card>
              <CardHeader>
                <CardTitle>Headcount Trend (12 months)</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trend?.months ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="headcount" name="Headcount" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="joiners" name="Joiners" stroke="#10b981" strokeWidth={1} />
                    <Line type="monotone" dataKey="leavers" name="Leavers" stroke="#ef4444" strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Attrition by department */}
            <Card>
              <CardHeader>
                <CardTitle>Attrition by Department ({year})</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attrition?.departments ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="attritionRate" name="Attrition %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Capacity table */}
            <Card>
              <CardHeader>
                <CardTitle>Capacity After Leave — Do We Need More Hands?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                      <tr>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">SBU</th>
                        <th className="px-4 py-3 text-right">Active</th>
                        <th className="px-4 py-3 text-right">On Leave Today</th>
                        <th className="px-4 py-3 text-right">Available</th>
                        <th className="px-4 py-3 text-right">Upcoming (30d)</th>
                        <th className="px-4 py-3 text-right">Min Onsite</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(capacity?.departments ?? []).map((d) => (
                        <tr key={d.departmentId} className="border-b bg-white hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{d.department}</td>
                          <td className="px-4 py-3">{d.sbu || "—"}</td>
                          <td className="px-4 py-3 text-right">{d.activeHeadcount}</td>
                          <td className="px-4 py-3 text-right">{d.onLeaveToday}</td>
                          <td className="px-4 py-3 text-right">{d.availableNow}</td>
                          <td className="px-4 py-3 text-right">{d.upcomingLeave30d}</td>
                          <td className="px-4 py-3 text-right">{d.minOnsite}</td>
                          <td className="px-4 py-3 text-center">
                            {d.needsHands ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                Needs hands (−{d.shortfall})
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                Covered
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
