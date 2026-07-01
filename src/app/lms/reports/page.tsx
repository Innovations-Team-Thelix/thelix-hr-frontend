"use client";

import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useLmsEmployeeReport, useLmsDepartmentReport, useLmsCourseReport,
  useLmsTeamProgress, useLmsTeamAtRisk,
  useSbus, useDepartments, useEmployees,
  useEffectiveRole,
} from "@/hooks";
import {
  BarChart2, Users, BookOpen, Building2,
  UsersRound, AlertTriangle, TrendingUp,
  Layers, User, Globe2, Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import Link from "next/link";

// ─── Constants ───────────────────────────────────────────────────────────────

type ReportTab = "team" | "employee" | "department" | "course";
type TeamScope = "org" | "dept" | "sbu" | "individual";

const STATUS_COLORS: Record<string, string> = {
  NotStarted: "bg-gray-100 text-gray-600",
  InProgress:  "bg-primary-100 text-primary-700",
  Completed:   "bg-green-100 text-green-700",
  Dropped:     "bg-red-100 text-red-600",
  Expired:     "bg-orange-100 text-orange-700",
  Overdue:     "bg-red-100 text-red-700",
};

const TEAM_SCOPES: { value: TeamScope; label: string; icon: any; description: string }[] = [
  { value: "org",        label: "Entire Team",  icon: Globe2,     description: "All employees — combined progress counts toward overall completion" },
  { value: "dept",       label: "Department",   icon: Building2,  description: "Filter by a specific department" },
  { value: "sbu",        label: "SBU",          icon: Layers,     description: "Filter by a strategic business unit" },
  { value: "individual", label: "Individual",   icon: User,       description: "Track a single employee's progress" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  return s.replace(/([A-Z])/g, " $1").trim();
}

function ProgressBar({ pct, size = "md" }: { pct: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-1.5" : "h-2";
  const color = pct === 100 ? "bg-green-500" : pct > 0 ? "bg-primary" : "bg-gray-300";
  return (
    <div className={`w-full bg-gray-100 rounded-full ${h}`}>
      <div className={`${h} rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Team Summary Cards ───────────────────────────────────────────────────────

function TeamSummary({ rows }: { rows: any[] }) {
  const total     = rows.length;
  const completed = rows.filter(r => r.status === "Completed").length;
  const inProg    = rows.filter(r => r.status === "InProgress").length;
  const notStart  = rows.filter(r => r.status === "NotStarted").length;
  const atRisk    = rows.filter(r =>
    r.status === "Overdue" || r.status === "Expired" ||
    (r.dueDate && new Date(r.dueDate) < new Date() && r.status !== "Completed")
  ).length;
  const avgProgress = total > 0
    ? Math.round(rows.reduce((s, r) => s + (r.progressPct ?? 0), 0) / total)
    : 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Big completion ring + stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Overall Completion",  value: `${completionPct}%`, sub: `${completed}/${total} enrollments`, color: "text-green-600", bg: "bg-green-50 border-green-200"  },
          { label: "Avg Progress",        value: `${avgProgress}%`,   sub: "across all courses",               color: "text-primary",   bg: "bg-primary-50 border-primary-200" },
          { label: "In Progress",         value: inProg,              sub: "currently learning",               color: "text-blue",      bg: "bg-blue-50 border-blue-200"    },
          { label: "At Risk / Overdue",   value: atRisk,              sub: "need attention",                   color: "text-red-600",   bg: "bg-red-50 border-red-200"      },
        ].map(({ label, value, sub, color, bg }) => (
          <Card key={label} className={`border ${bg}`}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status breakdown bar */}
      {total > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Status Breakdown</p>
            <div className="flex rounded-full overflow-hidden h-4">
              {completed > 0  && <div title={`Completed: ${completed}`}  className="bg-green-500"   style={{ width: `${(completed / total) * 100}%` }} />}
              {inProg > 0     && <div title={`In Progress: ${inProg}`}   className="bg-primary"     style={{ width: `${(inProg / total) * 100}%` }} />}
              {notStart > 0   && <div title={`Not Started: ${notStart}`} className="bg-gray-200"    style={{ width: `${(notStart / total) * 100}%` }} />}
              {atRisk > 0     && <div title={`At Risk: ${atRisk}`}       className="bg-red-400"     style={{ width: `${(atRisk / total) * 100}%` }} />}
            </div>
            <div className="flex gap-4 mt-2.5 flex-wrap">
              {[
                { label: "Completed",   count: completed, color: "bg-green-500" },
                { label: "In Progress", count: inProg,    color: "bg-primary"   },
                { label: "Not Started", count: notStart,  color: "bg-gray-300"  },
                { label: "At Risk",     count: atRisk,    color: "bg-red-400"   },
              ].filter(i => i.count > 0).map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  {label}: <span className="font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Team Progress Table ──────────────────────────────────────────────────────

function TeamTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) return (
    <Card>
      <CardContent className="p-12 text-center">
        <UsersRound className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No enrollment data found for this selection.</p>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Employee", "Department", "Course", "Progress", "Status", "Due Date"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800 text-sm">{r.employee?.fullName}</p>
                  <p className="text-[11px] text-gray-400">{r.employee?.jobTitle}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {r.employee?.department?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/lms/courses/${r.courseId ?? r.course?.id}`} className="text-primary hover:underline text-xs font-medium">
                    {r.course?.title}
                  </Link>
                </td>
                <td className="px-4 py-3 w-36">
                  <div className="flex items-center gap-2">
                    <ProgressBar pct={r.progressPct ?? 0} size="sm" />
                    <span className="text-xs text-gray-500 shrink-0">{r.progressPct ?? 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Team Progress Panel ──────────────────────────────────────────────────────

function TeamProgressPanel() {
  const [scope, setScope]               = useState<TeamScope>("org");
  const [selectedDeptId, setDeptId]     = useState("");
  const [selectedSbuId, setSbuId]       = useState("");
  const [selectedEmpId, setEmpId]       = useState("");
  const [empSearch, setEmpSearch]       = useState("");
  const [view, setView]                 = useState<"progress" | "risk">("progress");

  const { data: sbus }          = useSbus();
  const { data: departments }   = useDepartments();
  const { data: empsResult }    = useEmployees({ search: empSearch || undefined, limit: 200 });
  const employees               = (empsResult as any)?.data ?? [];

  // Org-wide / team data
  const { data: teamData,  isLoading: teamLoading  } = useLmsTeamProgress();
  const { data: riskData,  isLoading: riskLoading  } = useLmsTeamAtRisk();

  // Filtered report data (dept / sbu / individual)
  const reportFilters = useMemo(() => {
    if (scope === "dept"       && selectedDeptId) return { departmentId: selectedDeptId, limit: 200 };
    if (scope === "sbu"        && selectedSbuId)  return { sbuId: selectedSbuId,         limit: 200 };
    if (scope === "individual" && selectedEmpId)  return { employeeId: selectedEmpId,    limit: 200 };
    return undefined;
  }, [scope, selectedDeptId, selectedSbuId, selectedEmpId]);

  const { data: filteredData, isLoading: filteredLoading } = useLmsEmployeeReport(reportFilters);

  const isOrgScope    = scope === "org";
  const hasSubFilter  = (scope === "dept" && !!selectedDeptId) ||
                        (scope === "sbu"  && !!selectedSbuId)  ||
                        (scope === "individual" && !!selectedEmpId);

  // Decide which rows to show
  const activeRows: any[] = useMemo(() => {
    if (isOrgScope) {
      return view === "risk"
        ? (riskData as any[]) ?? []
        : (teamData as any[]) ?? [];
    }
    if (hasSubFilter) return (filteredData as any[]) ?? [];
    return [];
  }, [isOrgScope, view, teamData, riskData, filteredData, hasSubFilter]);

  const isLoading = isOrgScope
    ? (view === "risk" ? riskLoading : teamLoading)
    : filteredLoading;

  return (
    <div className="space-y-5">
      {/* Scope selector tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TEAM_SCOPES.map(({ value, label, icon: Icon, description }) => (
          <button
            key={value}
            onClick={() => { setScope(value); setDeptId(""); setSbuId(""); setEmpId(""); }}
            className={`text-left p-3 rounded-xl border-2 transition-all ${
              scope === value
                ? "border-primary bg-primary-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${scope === value ? "text-primary" : "text-gray-400"}`} />
              <span className={`text-sm font-semibold ${scope === value ? "text-primary-700" : "text-gray-700"}`}>{label}</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">{description}</p>
          </button>
        ))}
      </div>

      {/* Sub-filter for non-org scopes */}
      {scope === "dept" && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 shrink-0">Department</label>
          <select
            value={selectedDeptId}
            onChange={e => setDeptId(e.target.value)}
            className="flex-1 max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary bg-white"
          >
            <option value="">— Select department —</option>
            {((departments as any[]) ?? []).map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}{d.sbu?.name ? ` (${d.sbu.name})` : ""}</option>
            ))}
          </select>
        </div>
      )}

      {scope === "sbu" && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 shrink-0">SBU</label>
          <select
            value={selectedSbuId}
            onChange={e => setSbuId(e.target.value)}
            className="flex-1 max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary bg-white"
          >
            <option value="">— Select SBU —</option>
            {((sbus as any[]) ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {scope === "individual" && (
        <div className="space-y-2 max-w-sm">
          <label className="text-sm font-medium text-gray-600">Employee</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              value={empSearch}
              onChange={e => { setEmpSearch(e.target.value); setEmpId(""); }}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
            />
          </div>
          {employees.length > 0 && !selectedEmpId && (
            <div className="border border-gray-200 rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
              {employees.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => { setEmpId(e.id); setEmpSearch(e.fullName); }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800">{e.fullName}</p>
                  <p className="text-[11px] text-gray-400">{e.department?.name ?? e.jobTitle}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* At-Risk toggle (org scope only) */}
      {isOrgScope && (
        <div className="flex gap-2">
          {[
            { value: "progress", label: "All Progress",  icon: TrendingUp   },
            { value: "risk",     label: "At Risk",       icon: AlertTriangle },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setView(value as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                view === value ? "bg-primary text-white border-primary" : "text-gray-600 border-gray-200 hover:border-primary-200"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      ) : !isOrgScope && !hasSubFilter ? (
        <Card>
          <CardContent className="p-10 text-center">
            <UsersRound className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Select a {scope === "dept" ? "department" : scope === "sbu" ? "SBU" : "employee"} above to view progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary only for org + progress view, and for filtered views */}
          {(isOrgScope && view === "progress") || !isOrgScope ? (
            <TeamSummary rows={activeRows} />
          ) : isOrgScope && view === "risk" && activeRows.length > 0 ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">{activeRows.length} employee{activeRows.length !== 1 ? "s" : ""} at risk</p>
                  <p className="text-xs text-red-500">Overdue, expired, or falling behind on due dates</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <TeamTable rows={activeRows} />
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TAB_CONFIG: { value: ReportTab; label: string; icon: any }[] = [
  { value: "team",       label: "Team Progress",     icon: UsersRound },
  { value: "employee",   label: "Employee Report",   icon: Users      },
  { value: "department", label: "Department Report", icon: Building2  },
  { value: "course",     label: "Course Report",     icon: BookOpen   },
];

export default function LmsReportsPage() {
  const [tab, setTab] = useState<ReportTab>("team");

  const { data: empData,    isLoading: empLoading    } = useLmsEmployeeReport();
  const { data: deptData,   isLoading: deptLoading   } = useLmsDepartmentReport();
  const { data: courseData, isLoading: courseLoading } = useLmsCourseReport();

  const isReportLoading =
    tab === "employee"   ? empLoading  :
    tab === "department" ? deptLoading :
    tab === "course"     ? courseLoading : false;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            LMS Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Team progress, individual analytics, department breakdowns, and course insights.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 border-b pb-0 overflow-x-auto">
          {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === value
                  ? "border-primary text-primary bg-primary-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "team" && <TeamProgressPanel />}

        {tab !== "team" && (
          isReportLoading ? <Skeleton className="h-64" /> : (
            <>
              {tab === "employee" && (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {["Employee", "Department", "Course", "Progress", "Status", "Certificate"].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {((empData as any[]) ?? []).map((row: any) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800">{row.employee?.fullName}</p>
                              <p className="text-xs text-gray-400">{row.employee?.employeeId}</p>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{row.employee?.department?.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-700">{row.course?.title}</td>
                            <td className="px-4 py-3 w-32">
                              <div className="flex items-center gap-2">
                                <ProgressBar pct={row.progressPct ?? 0} size="sm" />
                                <span className="text-xs text-gray-500 shrink-0">{row.progressPct ?? 0}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {statusLabel(row.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {row.certificate ? new Date(row.certificate.issuedAt).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {tab === "department" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {((deptData as any[]) ?? []).map((dept: any) => (
                    <Card key={dept.name}>
                      <CardContent className="p-5 space-y-3">
                        <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Completion Rate</span>
                            <span className="font-semibold text-gray-700">{dept.completionRate}%</span>
                          </div>
                          <ProgressBar pct={dept.completionRate} />
                        </div>
                        <div className="flex gap-4 text-xs text-gray-400">
                          <span>{dept.total} enrolled</span>
                          <span className="text-green-600 font-medium">{dept.completed} completed</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {tab === "course" && (
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          {["Course", "Enrollments", "Completed", "Completion Rate", "Avg Progress"].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {((courseData as any[]) ?? []).map((row: any) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{row.title}</td>
                            <td className="px-4 py-3 text-gray-500">{row.totalEnrollments}</td>
                            <td className="px-4 py-3 text-green-600 font-medium">{row.completed}</td>
                            <td className="px-4 py-3 w-36">
                              <div className="flex items-center gap-2">
                                <ProgressBar pct={row.completionRate} size="sm" />
                                <span className="text-xs text-gray-500 shrink-0">{row.completionRate}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{row.avgProgress}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )
        )}
      </div>
    </AppLayout>
  );
}
