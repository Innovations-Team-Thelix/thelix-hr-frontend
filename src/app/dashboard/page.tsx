"use client";

import React, { useState } from "react";
import {
  Users,
  UserCheck,
  UserPlus,
  CalendarOff,
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
  TrendingUp,
  CalendarDays,
  ChevronRight,
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
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  useMyProfile,
} from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

// ─── Brand tokens ──────────────────────────────────────
const B = {
  navy: "#111729",
  navyLight: "#1a2333",
  orange: "#f48220",
  orangeHover: "#e0731a",
  orangeBg: "#fef3e8",
  orangeBorder: "#fcd9b0",
};

// ─── Helpers ───────────────────────────────────────────
function formatGreetingDate(d: Date) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const nth = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
  };
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${nth(d.getDate())}`;
}

function firstName(fullName?: string | null) {
  if (!fullName) return "there";
  return fullName.split(" ")[0];
}

// ─── Shared tab button ─────────────────────────────────
function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md px-4 py-1.5 text-sm font-medium transition-all"
      style={
        active
          ? { backgroundColor: B.navy, color: "#fff" }
          : { color: "#6b7280", backgroundColor: "transparent" }
      }
    >
      {label}
    </button>
  );
}

// ─── SBU Management Panel ─────────────────────────────
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
    } finally { setSubmitting(false); }
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
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" style={{ color: B.orange }} />
          <h3 className="font-semibold text-gray-900">Manage SBUs</h3>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          style={{ backgroundColor: B.navy }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = B.navyLight)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = B.navy)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add SBU
        </button>
      </div>

      <div className="p-6">
        {showForm && (
          <div
            className="mb-5 rounded-xl border p-4"
            style={{ borderColor: B.orangeBorder, backgroundColor: B.orangeBg }}
          >
            <p className="mb-3 text-sm font-semibold" style={{ color: B.navy }}>
              {editingId ? "Edit SBU" : "New SBU"}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input label="Name" placeholder="e.g. Digital Products" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="w-28">
                <Input label="Code" placeholder="e.g. DP" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={5} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: B.orange }}
                >
                  {submitting ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                  {editingId ? "Update" : "Save"}
                </button>
                <Button variant="outline" onClick={closeForm}><X className="h-4 w-4" />Cancel</Button>
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
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: B.orangeBg, color: B.orange }}
                      >
                        {sbu.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{sbu._count?.departments ?? "-"}</TableCell>
                    <TableCell className="text-right">{sbu._count?.employees ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(sbu)}>
                          <Pencil className="h-3 w-3" />Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(sbu.id, sbu.name)}>
                          <Trash2 className="h-3 w-3" />Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                    No SBUs yet. Click &quot;Add SBU&quot; to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────
export default function DashboardPage() {
  const [sbuFilter, setSbuFilter] = useState("");
  const [eventTab, setEventTab] = useState<"birthdays" | "anniversaries" | "leave">("birthdays");
  const [chartTab, setChartTab] = useState<"gender" | "employment" | "arrangement">("gender");

  const { user } = useAuth();
  const { data: profile } = useMyProfile();
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
  const headcountBySbuData = workforce?.headcountBySbu?.map((i) => ({ name: i.sbuName, count: i.count })) || [];
  const genderData = workforce?.genderDistribution?.map((i) => ({ name: i.gender, value: i.count })) || [];
  const employmentData = workforce?.employmentTypeDistribution?.map((i) => ({
    name: i.type === "FullTime" ? "Full Time" : i.type,
    value: i.count,
  })) || [];
  const arrangementData = workforce?.workArrangementDistribution?.map((i) => ({ name: i.arrangement, value: i.count })) || [];

  const pieColors = [B.orange, B.navy, "#9ca3af", "#d1d5db"];

  // Events data
  const allBirthdays = [
    ...(celebrations?.todayBirthdays?.map((p) => ({ ...p, isToday: true })) || []),
    ...(celebrations?.upcomingBirthdays?.map((p) => ({ ...p, isToday: false })) || []),
  ].slice(0, 8);

  const allAnniversaries = [
    ...(celebrations?.todayAnniversaries?.map((p) => ({ ...p, isToday: true })) || []),
    ...(celebrations?.upcomingAnniversaries?.map((p) => ({ ...p, isToday: false })) || []),
  ].slice(0, 8);

  const onLeaveList = leaveStats?.onLeaveDetails || [];

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="space-y-7">

        {/* ── Welcome header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {firstName(profile?.fullName)} 👋
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {formatGreetingDate(new Date())}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select
                options={sbuOptions}
                value={sbuFilter}
                onChange={(e) => setSbuFilter(e.target.value)}
                placeholder="All SBUs"
              />
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: B.navy }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = B.navyLight)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = B.navy)}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* ── Bento row 1: 3 hero cards ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Card 1: Workforce summary */}
          <Link href="/employees" className="group">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow h-full">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Total Workforce
                  </p>
                  {workforceLoading ? (
                    <Skeleton className="mt-2 h-12 w-24" />
                  ) : (
                    <p className="mt-1 text-6xl font-bold tracking-tight" style={{ color: B.navy }}>
                      {workforce?.totalHeadcount ?? 0}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-400">employees across all SBUs</p>
                </div>
                <div className="rounded-2xl p-3" style={{ backgroundColor: B.orangeBg }}>
                  <Users className="h-7 w-7" style={{ color: B.orange }} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Active", value: workforce?.activeCount ?? 0, icon: UserCheck },
                  { label: "New Hires", value: workforce?.newHiresThisMonth ?? 0, icon: UserPlus },
                  { label: "On Leave", value: leaveStats?.currentlyOnLeave ?? 0, icon: CalendarOff },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-center">
                    <Icon className="mx-auto mb-1 h-4 w-4 text-gray-400" />
                    {workforceLoading ? (
                      <Skeleton className="mx-auto h-5 w-8" />
                    ) : (
                      <p className="text-lg font-bold" style={{ color: B.navy }}>{value}</p>
                    )}
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Card 2: Next Payday — HERO dark card */}
          <Link href="/payroll" className="group">
            <div
              className="relative rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow h-full overflow-hidden flex flex-col justify-between"
              style={{ backgroundColor: B.navy }}
            >
              {/* Orange glow circle top-right */}
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full opacity-20"
                style={{ backgroundColor: B.orange }}
              />
              <div
                className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full opacity-10"
                style={{ backgroundColor: B.orange }}
              />

              <div>
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-lg px-3 py-1 text-xs font-semibold"
                    style={{ backgroundColor: B.orange, color: "#fff" }}
                  >
                    Pay Day
                  </span>
                  <CalendarDays className="h-5 w-5 text-white/40" />
                </div>

                <p className="mt-5 text-3xl font-bold text-white">Next Payday</p>
                {workforceLoading ? (
                  <Skeleton className="mt-2 h-5 w-40 bg-white/10" />
                ) : (
                  <p className="mt-2 text-sm text-white/60">
                    {workforce?.nextPayDay
                      ? `Your next payday is ${formatDate(workforce.nextPayDay)}`
                      : "No upcoming payrun scheduled"}
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="flex items-center gap-1 text-xs font-medium text-white/40 group-hover:text-white/70 transition-colors">
                  View Payroll <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 3: SBU breakdown + trend */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Headcount by SBU
              </p>
              <TrendingUp className="h-4 w-4" style={{ color: B.orange }} />
            </div>

            {workforceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : headcountBySbuData.length > 0 ? (
              <div className="space-y-2.5">
                {headcountBySbuData.slice(0, 5).map((item) => {
                  const max = Math.max(...headcountBySbuData.map((d) => d.count));
                  const pct = max > 0 ? (item.count / max) * 100 : 0;
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 truncate max-w-[140px]">{item.name}</span>
                        <span className="text-sm font-bold" style={{ color: B.navy }}>{item.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: B.orange }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No SBU data</p>
            )}
          </div>
        </div>

        {/* ── Bento row 2: Events + Charts ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Events / Celebrations — 2 cols */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="font-semibold text-gray-900">Events</h3>
              <Link href="/celebrations" className="text-xs font-medium transition-colors" style={{ color: B.orange }}>
                View All →
              </Link>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 pb-4">
              <Tab label="Birthdays" active={eventTab === "birthdays"} onClick={() => setEventTab("birthdays")} />
              <Tab label="Anniversaries" active={eventTab === "anniversaries"} onClick={() => setEventTab("anniversaries")} />
              <Tab label="On Leave" active={eventTab === "leave"} onClick={() => setEventTab("leave")} />
            </div>

            {/* List */}
            <div className="px-6 pb-6">
              {celebrationsLoading || leaveLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {eventTab === "birthdays" && (
                    allBirthdays.length > 0 ? allBirthdays.map((p, i) => (
                      <div key={i} className="flex items-center gap-4 py-3">
                        <div
                          className="h-10 w-1 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: p.isToday ? B.orange : "#e5e7eb" }}
                        />
                        <Avatar name={p.employeeName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.employeeName}</p>
                          <p className="text-xs text-gray-400">{p.department}</p>
                        </div>
                        {p.isToday && (
                          <span
                            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{ backgroundColor: B.orangeBg, color: B.orange }}
                          >
                            <Cake className="h-3 w-3" /> Today!
                          </span>
                        )}
                      </div>
                    )) : (
                      <p className="py-8 text-center text-sm text-gray-400">No upcoming birthdays</p>
                    )
                  )}

                  {eventTab === "anniversaries" && (
                    allAnniversaries.length > 0 ? allAnniversaries.map((p, i) => (
                      <div key={i} className="flex items-center gap-4 py-3">
                        <div
                          className="h-10 w-1 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: p.isToday ? B.orange : "#e5e7eb" }}
                        />
                        <Avatar name={p.employeeName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.employeeName}</p>
                          <p className="text-xs text-gray-400">{p.department}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={
                              p.isToday
                                ? { backgroundColor: B.orangeBg, color: B.orange }
                                : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                            }
                          >
                            <Award className="h-3 w-3" />
                            {p.yearsOfService}yr
                          </span>
                        </div>
                      </div>
                    )) : (
                      <p className="py-8 text-center text-sm text-gray-400">No upcoming anniversaries</p>
                    )
                  )}

                  {eventTab === "leave" && (
                    onLeaveList.length > 0 ? onLeaveList.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 py-3">
                        <div className="h-10 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: B.orange }} />
                        <Avatar name={item.employeeName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.employeeName}</p>
                          <p className="text-xs text-gray-400">{item.leaveType}</p>
                        </div>
                        <p className="text-xs text-gray-400 flex-shrink-0">
                          Returns {formatDate(item.endDate)}
                        </p>
                      </div>
                    )) : (
                      <p className="py-8 text-center text-sm text-gray-400">Nobody on leave today</p>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Workforce Composition — 1 col */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="font-semibold text-gray-900">Composition</h3>
            </div>

            {/* Chart tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 pb-2">
              <Tab label="Gender" active={chartTab === "gender"} onClick={() => setChartTab("gender")} />
              <Tab label="Type" active={chartTab === "employment"} onClick={() => setChartTab("employment")} />
              <Tab label="WFH" active={chartTab === "arrangement"} onClick={() => setChartTab("arrangement")} />
            </div>

            <div className="px-6 pb-6">
              {workforceLoading ? (
                <Skeleton className="h-52 w-full mt-2" variant="rectangular" />
              ) : (() => {
                const data =
                  chartTab === "gender" ? genderData :
                  chartTab === "employment" ? employmentData : arrangementData;

                if (!data.length) return (
                  <p className="py-16 text-center text-sm text-gray-400">No data</p>
                );

                return (
                  <div>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {data.map((_e, idx) => (
                            <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="mt-3 space-y-1.5">
                      {data.map((entry, idx) => (
                        <div key={entry.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                            <span className="text-xs text-gray-500">{entry.name}</span>
                          </div>
                          <span className="text-xs font-semibold" style={{ color: B.navy }}>{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── Headcount bar chart ── */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Headcount by SBU</h3>
            <Link href="/employees" className="text-xs font-medium" style={{ color: B.orange }}>
              View All →
            </Link>
          </div>

          {workforceLoading ? (
            <Skeleton className="h-56 w-full" variant="rectangular" />
          ) : headcountBySbuData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={headcountBySbuData} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                  cursor={{ fill: B.orangeBg }}
                />
                <Bar dataKey="count" fill={B.orange} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="h-56 flex items-center justify-center text-sm text-gray-400">
              No SBU data available
            </p>
          )}
        </div>

        {/* ── SBU Management (Admin only) ── */}
        {user?.role === "Admin" && (
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: B.navy }}>
              SBU Management
            </h3>
            <SbuManagementPanel />
          </div>
        )}

      </div>
    </AppLayout>
  );
}
