"use client";

import React, { useState } from "react";
import {
  Users,
  UserCheck,
  CalendarOff,
  UserPlus,
  Banknote,
  Download,
  Cake,
  Award,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Building2,
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
} from "recharts";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { useWorkforceStats, useLeaveStats, useCelebrations, useSbus } from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";


const GENDER_COLORS = ["#3b82f6", "#ec4899", "#8b5cf6", "#6b7280"];
const EMPLOYMENT_TYPE_COLORS = ["#10b981", "#f59e0b", "#6366f1"];
const WORK_ARRANGEMENT_COLORS = ["#06b6d4", "#8b5cf6", "#f97316"];

// ─── SBU Management Panel (Admin only) ──────────────
function SbuManagementPanel() {
  const queryClient = useQueryClient();
  const { data: sbus, isLoading } = useSbus();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setShowForm(true);
  };

  const openEdit = (sbu: { id: string; name: string; code: string }) => {
    setEditingId(sbu.id);
    setName(sbu.name);
    setCode(sbu.code);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setCode("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/sbus/${editingId}`, { name, code });
        toast.success("SBU updated");
      } else {
        await api.post("/sbus", { name, code });
        toast.success("SBU created");
      }
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
      queryClient.invalidateQueries({ queryKey: ["workforce-stats"] });
      closeForm();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, sbuName: string) => {
    if (!confirm(`Delete "${sbuName}"? SBUs with departments or employees cannot be deleted.`))
      return;
    try {
      await api.delete(`/sbus/${id}`);
      toast.success("SBU deleted");
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
      queryClient.invalidateQueries({ queryKey: ["workforce-stats"] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Cannot delete SBU");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Manage SBUs
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add SBU
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Inline Form */}
        {showForm && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <h4 className="mb-3 font-semibold text-gray-800">
              {editingId ? "Edit SBU" : "Create New SBU"}
            </h4>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label="SBU Name"
                  placeholder="e.g. Digital Products"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="w-32">
                <Input
                  label="Code"
                  placeholder="e.g. DP"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={5}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                  {editingId ? "Update" : "Save"}
                </Button>
                <Button variant="outline" onClick={closeForm}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SBU List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Depts</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sbus && sbus.length > 0 ? (
                sbus.map((sbu: any) => (
                  <TableRow key={sbu.id}>
                    <TableCell className="font-medium">{sbu.name}</TableCell>
                    <TableCell>
                      <Badge variant="info">{sbu.code}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {sbu._count?.departments ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {sbu._count?.employees ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(sbu)}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(sbu.id, sbu.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No SBUs yet. Click &quot;Add SBU&quot; above to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [sbuFilter, setSbuFilter] = useState("");
  const { user } = useAuth();

  const { data: sbus } = useSbus();
  const {
    data: workforce,
    isLoading: workforceLoading,
  } = useWorkforceStats(sbuFilter || undefined);
  const {
    data: leaveStats,
    isLoading: leaveLoading,
  } = useLeaveStats(sbuFilter || undefined);
  const {
    data: celebrations,
    isLoading: celebrationsLoading,
  } = useCelebrations();

  const sbuOptions = [
    { label: "All SBUs", value: "" },
    ...(sbus?.map((s) => ({ label: s.name, value: s.id })) || []),
  ];

  const handleExport = async () => {
    try {
      const res = await api.instance.get("/reports/headcount", {
        params: { format: "xlsx", sbuId: sbuFilter || undefined },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dashboard-report.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch {
      toast.error("Failed to export report");
    }
  };

  const headcountBySbuData = workforce?.headcountBySbu?.map((item) => ({
    name: item.sbuName,
    count: item.count,
  })) || [];

  const genderData = workforce?.genderDistribution?.map((item) => ({
    name: item.gender,
    value: item.count,
  })) || [];

  const employmentTypeData = workforce?.employmentTypeDistribution?.map((item) => ({
    name: item.type === "FullTime" ? "Full Time" : item.type,
    value: item.count,
  })) || [];

  const workArrangementData = workforce?.workArrangementDistribution?.map((item) => ({
    name: item.arrangement,
    value: item.count,
  })) || [];

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-48">
              <Select
                options={sbuOptions}
                value={sbuFilter}
                onChange={(e) => setSbuFilter(e.target.value)}
                placeholder="All SBUs"
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>



        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {workforceLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))
          ) : (
            <>
              <Link href="/employees">
                <StatCard
                  title="Total Headcount"
                  value={workforce?.totalHeadcount ?? 0}
                  icon={Users}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                />
              </Link>
              <Link href="/employees?status=Active">
                <StatCard
                  title="Active Employees"
                  value={workforce?.activeCount ?? 0}
                  icon={UserCheck}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                />
              </Link>
              <Link href="/leave">
                <StatCard
                  title="On Leave Today"
                  value={leaveStats?.currentlyOnLeave ?? 0}
                  icon={CalendarOff}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                />
              </Link>
              <Link href="/employees?joined=this_month">
                <StatCard
                  title="New Hires This Month"
                  value={workforce?.newHiresThisMonth ?? 0}
                  icon={UserPlus}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                />
              </Link>
              <Link href="/payroll">
                <StatCard
                  title="Next Pay Day"
                  value={workforce?.nextPayDay ? formatDate(workforce.nextPayDay) : "N/A"}
                  icon={Banknote}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                />
              </Link>
            </>
          )}
        </div>

        {/* SBU Management - Admin Only */}
        {user?.role === "Admin" && <SbuManagementPanel />}

        {/* Charts row 1: Headcount by SBU + Gender Distribution */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Headcount by SBU</CardTitle>
            </CardHeader>
            <CardContent>
              {workforceLoading ? (
                <Skeleton className="h-64 w-full" variant="rectangular" />
              ) : headcountBySbuData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={headcountBySbuData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {workforceLoading ? (
                <Skeleton className="h-64 w-full" variant="rectangular" />
              ) : genderData.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={280}>
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {genderData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={GENDER_COLORS[index % GENDER_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {genderData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              GENDER_COLORS[index % GENDER_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-gray-600">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2: Employment Type + Work Arrangement */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Employment Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {workforceLoading ? (
                <Skeleton className="h-64 w-full" variant="rectangular" />
              ) : employmentTypeData.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={280}>
                    <PieChart>
                      <Pie
                        data={employmentTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {employmentTypeData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              EMPLOYMENT_TYPE_COLORS[
                                index % EMPLOYMENT_TYPE_COLORS.length
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {employmentTypeData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              EMPLOYMENT_TYPE_COLORS[
                                index % EMPLOYMENT_TYPE_COLORS.length
                              ],
                          }}
                        />
                        <span className="text-sm text-gray-600">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Arrangement Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {workforceLoading ? (
                <Skeleton className="h-64 w-full" variant="rectangular" />
              ) : workArrangementData.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={280}>
                    <PieChart>
                      <Pie
                        data={workArrangementData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {workArrangementData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              WORK_ARRANGEMENT_COLORS[
                                index % WORK_ARRANGEMENT_COLORS.length
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {workArrangementData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              WORK_ARRANGEMENT_COLORS[
                                index % WORK_ARRANGEMENT_COLORS.length
                              ],
                          }}
                        />
                        <span className="text-sm text-gray-600">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Who's On Leave Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-amber-500" />
              Who&apos;s On Leave Today
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leaveLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : leaveStats?.currentlyOnLeave === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No employees on leave today
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Return Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leaveStats?.onLeaveDetails || []).map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.employeeName}</TableCell>
                      <TableCell>{item.leaveType}</TableCell>
                      <TableCell>{formatDate(item.endDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Celebrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-500" />
              Upcoming Celebrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {celebrationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Today's Birthdays */}
                {celebrations?.todayBirthdays &&
                  celebrations.todayBirthdays.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-700">
                        Today&apos;s Birthdays
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {celebrations.todayBirthdays.map((person, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg border border-pink-100 bg-pink-50 px-4 py-3"
                          >
                            <Avatar name={person.employeeName} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {person.employeeName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {person.department}
                              </p>
                            </div>
                            <Cake className="h-4 w-4 text-pink-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Today's Anniversaries */}
                {celebrations?.todayAnniversaries &&
                  celebrations.todayAnniversaries.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-700">
                        Today&apos;s Work Anniversaries
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {celebrations.todayAnniversaries.map((person, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3"
                          >
                            <Avatar name={person.employeeName} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {person.employeeName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {person.yearsOfService} year
                                {person.yearsOfService !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Award className="h-4 w-4 text-amber-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Upcoming (next 7 days) */}
                {celebrations?.upcomingBirthdays &&
                  celebrations.upcomingBirthdays.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-700">
                        Upcoming Birthdays (Next 7 Days)
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {celebrations.upcomingBirthdays.slice(0, 7).map((person, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2"
                          >
                            <Avatar name={person.employeeName} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {person.employeeName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {person.department}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {celebrations?.upcomingAnniversaries &&
                  celebrations.upcomingAnniversaries.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-700">
                        Upcoming Anniversaries (Next 7 Days)
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {celebrations.upcomingAnniversaries.slice(0, 7).map((person, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2"
                          >
                            <Avatar name={person.employeeName} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {person.employeeName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {person.yearsOfService} year
                                {person.yearsOfService !== 1 ? "s" : ""} -{" "}
                                {person.department}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {!celebrations?.todayBirthdays?.length &&
                  !celebrations?.todayAnniversaries?.length &&
                  !celebrations?.upcomingBirthdays?.length &&
                  !celebrations?.upcomingAnniversaries?.length && (
                    <div className="py-8 text-center text-sm text-gray-500">
                      No upcoming celebrations
                    </div>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
