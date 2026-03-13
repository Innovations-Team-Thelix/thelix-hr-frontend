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
  Calendar,
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
import {
  useWorkforceStats,
  useLeaveStats,
  useCelebrations,
  useSbus,
  useEffectiveRole,
} from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";

// ─── Color palettes (on-brand) ───────────────────────────
const GENDER_COLORS       = ["#f48220", "#412003", "#fcd34d", "#9ca3af"];
const EMPLOYMENT_COLORS   = ["#f48220", "#412003", "#fcd34d"];
const ARRANGEMENT_COLORS  = ["#f48220", "#412003", "#fcd34d"];
const SBU_BAR_COLOR       = "#f48220";

// ─── Custom tooltip ──────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-lg text-sm">
      {label && <p className="mb-0.5 text-xs text-gray-400">{label}</p>}
      <p className="font-semibold text-gray-900">{payload[0]?.value}</p>
    </div>
  );
}

// ─── KPI card (reference style: tinted bg + big number) ─
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tint: string;      // card background e.g. "bg-orange-50"
  iconBg: string;    // icon wrapper e.g. "bg-primary/15"
  iconColor: string; // icon text color e.g. "text-primary"
  href: string;
  loading?: boolean;
}

function KpiCard({ title, value, icon: Icon, tint, iconBg, iconColor, href }: KpiCardProps) {
  return (
    <Link href={href} className="group block">
      <div className={cn("rounded-2xl p-5 transition-all duration-200 hover:shadow-md", tint)}>
        <div className="flex items-start justify-between">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconBg)}>
            <Icon className={cn("h-4.5 w-4.5", iconColor)} style={{ width: 18, height: 18 }} />
          </div>
        </div>
        <p className="mt-4 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
        <p className="mt-1 text-xs font-medium text-gray-500">{title}</p>
      </div>
    </Link>
  );
}

// ─── Donut legend row ────────────────────────────────────
function DonutLegend({
  data,
  colors,
  total,
}: {
  data: { name: string; value: number }[];
  colors: string[];
  total: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {data.map((entry, i) => (
        <div key={entry.name} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="truncate text-sm text-gray-600">{entry.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
            <span className="text-xs text-gray-400 w-10 text-right">
              {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SBU Management ──────────────────────────────────────
function SbuManagementPanel() {
  const queryClient = useQueryClient();
  const { data: sbus, isLoading } = useSbus();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => { setEditingId(null); setName(""); setCode(""); setShowForm(true); };
  const openEdit = (sbu: { id: string; name: string; code: string }) => {
    setEditingId(sbu.id); setName(sbu.name); setCode(sbu.code); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setName(""); setCode(""); };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) { toast.error("Name and code are required"); return; }
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
    if (!confirm(`Delete "${sbuName}"? SBUs with departments or employees cannot be deleted.`)) return;
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
            <Building2 className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
            Strategic Business Units
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add SBU
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">
              {editingId ? "Edit SBU" : "New SBU"}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input label="Name" placeholder="e.g. Digital Products" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="w-32">
                <Input label="Code" placeholder="e.g. DP" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                  {editingId ? "Update" : "Save"}
                </Button>
                <Button variant="outline" onClick={closeForm}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Departments</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sbus && sbus.length > 0 ? (
                sbus.map((sbu: any) => (
                  <TableRow key={sbu.id}>
                    <TableCell className="font-medium">{sbu.name}</TableCell>
                    <TableCell><Badge variant="info">{sbu.code}</Badge></TableCell>
                    <TableCell className="text-right">{sbu._count?.departments ?? "-"}</TableCell>
                    <TableCell className="text-right">{sbu._count?.employees ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(sbu)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(sbu.id, sbu.name)}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                    No SBUs yet. Click &quot;Add SBU&quot; to get started.
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

// ─── Greeting helper ─────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Main page ───────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole();
  const isSbuHead = effectiveRole === "SBUHead";
  const isAdmin = effectiveRole === "Admin";
  const sbuHeadScopeId = isSbuHead ? (user?.sbuScopeId ?? "") : "";

  const [sbuFilter, setSbuFilter] = useState(sbuHeadScopeId);

  const { data: sbus } = useSbus();
  const { data: workforce, isLoading: workforceLoading } = useWorkforceStats(sbuFilter || undefined);
  const { data: leaveStats, isLoading: leaveLoading } = useLeaveStats(sbuFilter || undefined);
  const { data: celebrations, isLoading: celebrationsLoading } = useCelebrations();

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

  // Chart data
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

  const genderTotal = genderData.reduce((s, d) => s + d.value, 0);
  const empTotal    = employmentTypeData.reduce((s, d) => s + d.value, 0);
  const arrTotal    = workArrangementData.reduce((s, d) => s + d.value, 0);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-2.5">
            {!isSbuHead && (
              <div className="w-44">
                <Select
                  options={sbuOptions}
                  value={sbuFilter}
                  onChange={(e) => setSbuFilter(e.target.value)}
                  placeholder="All SBUs"
                />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* ── Welcome banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-[#412003] px-7 py-6">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />

          <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                {getGreeting()}
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-white">
                Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Here&apos;s what&apos;s happening across your workforce today.
              </p>
            </div>
            <div className="mt-3 sm:mt-0 flex items-center gap-2.5 text-xs text-white/40">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {today}
            </div>
          </div>
        </div>

        {/* ── Row 1: 2×2 KPI grid + Gender distribution ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* 2×2 KPI grid */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-4">
            {workforceLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-50 p-5">
                  <Skeleton className="mb-4 h-9 w-9 rounded-xl" />
                  <Skeleton className="mb-2 h-8 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))
            ) : (
              <>
                <KpiCard
                  title="Total Headcount"
                  value={workforce?.totalHeadcount ?? 0}
                  icon={Users}
                  tint="bg-orange-50"
                  iconBg="bg-primary/15"
                  iconColor="text-primary"
                  href="/employees"
                />
                <KpiCard
                  title="Active Employees"
                  value={workforce?.activeCount ?? 0}
                  icon={UserCheck}
                  tint="bg-emerald-50"
                  iconBg="bg-emerald-100"
                  iconColor="text-emerald-600"
                  href="/employees?status=Active"
                />
                <KpiCard
                  title="New Hires This Month"
                  value={workforce?.newHiresThisMonth ?? 0}
                  icon={UserPlus}
                  tint="bg-indigo-50"
                  iconBg="bg-indigo-100"
                  iconColor="text-indigo-600"
                  href="/employees?joined=this_month"
                />
                <KpiCard
                  title="On Leave Today"
                  value={leaveStats?.currentlyOnLeave ?? 0}
                  icon={CalendarOff}
                  tint="bg-amber-50"
                  iconBg="bg-amber-100"
                  iconColor="text-amber-600"
                  href="/leave"
                />
              </>
            )}
          </div>

          {/* Gender distribution (reference: "Departments" panel) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Gender Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {workforceLoading ? (
                <Skeleton className="h-48 w-full" variant="rectangular" />
              ) : genderData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={genderData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={65}
                          dataKey="value"
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {genderData.map((_e, i) => (
                            <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0">
                    <DonutLegend data={genderData} colors={GENDER_COLORS} total={genderTotal} />
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-gray-400">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 2: Next Pay Day accent + Headcount by SBU bar ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* Next Pay Day accent card */}
          <Link href="/payroll" className="group lg:col-span-2 block">
            <div className="flex h-full flex-col justify-between rounded-2xl bg-[#412003] p-6 text-white transition-all duration-200 hover:shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Banknote className="h-5 w-5 text-primary" />
                </div>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Payroll
                </span>
              </div>
              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-widest text-white/50">
                  Next Pay Day
                </p>
                <p className="mt-1.5 text-2xl font-bold">
                  {workforce?.nextPayDay ? formatDate(workforce.nextPayDay) : "—"}
                </p>
              </div>
            </div>
          </Link>

          {/* Headcount by SBU bar chart */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Headcount by SBU</CardTitle>
            </CardHeader>
            <CardContent>
              {workforceLoading ? (
                <Skeleton className="h-44 w-full" variant="rectangular" />
              ) : headcountBySbuData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={headcountBySbuData} barSize={28}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#fdf2e8" }} />
                    <Bar dataKey="count" fill={SBU_BAR_COLOR} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-gray-400">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 3: Employment Type + Work Arrangement ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Employment Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employment Type</CardTitle>
            </CardHeader>
            <CardContent>
              {workforceLoading ? (
                <Skeleton className="h-44 w-full" variant="rectangular" />
              ) : employmentTypeData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={employmentTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={65}
                          dataKey="value"
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {employmentTypeData.map((_e, i) => (
                            <Cell key={i} fill={EMPLOYMENT_COLORS[i % EMPLOYMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0">
                    <DonutLegend data={employmentTypeData} colors={EMPLOYMENT_COLORS} total={empTotal} />
                  </div>
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-gray-400">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work Arrangement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Work Arrangement</CardTitle>
            </CardHeader>
            <CardContent>
              {workforceLoading ? (
                <Skeleton className="h-44 w-full" variant="rectangular" />
              ) : workArrangementData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={workArrangementData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={65}
                          dataKey="value"
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {workArrangementData.map((_e, i) => (
                            <Cell key={i} fill={ARRANGEMENT_COLORS[i % ARRANGEMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0">
                    <DonutLegend data={workArrangementData} colors={ARRANGEMENT_COLORS} total={arrTotal} />
                  </div>
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-gray-400">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── SBU Management (Admin only) ── */}
        {isAdmin && <SbuManagementPanel />}

        {/* ── Who's On Leave Today ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarOff className="h-4 w-4 text-amber-500" />
                Who&apos;s On Leave Today
              </CardTitle>
              {!leaveLoading && !!leaveStats?.currentlyOnLeave && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-700">
                  {leaveStats.currentlyOnLeave}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leaveLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : leaveStats?.currentlyOnLeave === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
                  <CalendarOff className="h-5 w-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Everyone&apos;s in today</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Returns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leaveStats?.onLeaveDetails || []).map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={item.employeeName} size="sm" />
                          <span className="font-medium text-gray-900">{item.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">{item.leaveType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(item.endDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── Upcoming Celebrations ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-4 w-4 text-pink-500" />
              Upcoming Celebrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {celebrationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-7">

                {celebrations?.todayBirthdays && celebrations.todayBirthdays.length > 0 && (
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      Today&apos;s Birthdays
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {celebrations.todayBirthdays.map((person, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl border border-pink-100 bg-pink-50 px-4 py-3">
                          <Avatar name={person.employeeName} size="sm" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{person.employeeName}</p>
                            <p className="text-xs text-gray-400">{person.department}</p>
                          </div>
                          <Cake className="ml-1 h-4 w-4 text-pink-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {celebrations?.todayAnniversaries && celebrations.todayAnniversaries.length > 0 && (
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      Today&apos;s Work Anniversaries
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {celebrations.todayAnniversaries.map((person, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                          <Avatar name={person.employeeName} size="sm" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{person.employeeName}</p>
                            <p className="text-xs text-gray-400">
                              {person.yearsOfService} year{person.yearsOfService !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <Award className="ml-1 h-4 w-4 text-amber-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {celebrations?.upcomingBirthdays && celebrations.upcomingBirthdays.length > 0 && (
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      Upcoming Birthdays · Next 7 Days
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {celebrations.upcomingBirthdays.slice(0, 7).map((person, i) => (
                        <div key={i} className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                          <Avatar name={person.employeeName} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{person.employeeName}</p>
                            <p className="text-xs text-gray-400">{person.department}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {celebrations?.upcomingAnniversaries && celebrations.upcomingAnniversaries.length > 0 && (
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                      Upcoming Anniversaries · Next 7 Days
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {celebrations.upcomingAnniversaries.slice(0, 7).map((person, i) => (
                        <div key={i} className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                          <Avatar name={person.employeeName} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{person.employeeName}</p>
                            <p className="text-xs text-gray-400">
                              {person.yearsOfService} yr{person.yearsOfService !== 1 ? "s" : ""} · {person.department}
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
                    <div className="flex flex-col items-center justify-center gap-2 py-10">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
                        <Cake className="h-5 w-5 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">No upcoming celebrations</p>
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
