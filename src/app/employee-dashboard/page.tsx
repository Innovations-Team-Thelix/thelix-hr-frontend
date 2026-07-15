"use client";

import React from "react";
import {
  Calendar,
  Users,
  Cake,
  Award,
  Banknote,
  CalendarOff,
  MapPin,
  Wifi,
  BookOpen,
  GraduationCap,
  Trophy,
  Star,
  Zap,
  ChevronRight,
  Play,
} from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/loading";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import {
  useMyProfile,
  useMyLeaveBalances,
  useLeaveStats,
  useCelebrations,
  useWorkforceStats,
  useMyLmsDashboard,
  useMyLmsPoints,
} from "@/hooks";
import { useRoster } from "@/hooks/useRoster";
import { useEmployees } from "@/hooks/useEmployees";
import { formatDate, cn } from "@/lib/utils";
import { isLeaveTypeEligible } from "@/lib/leave-eligibility";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function EmployeeDashboardPage() {
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const { data: leaveBalances, isLoading: balancesLoading } = useMyLeaveBalances();
  const { data: leaveStats, isLoading: leaveStatsLoading } = useLeaveStats();
  const { data: celebrations, isLoading: celebrationsLoading } = useCelebrations();
  const { data: workforceStats } = useWorkforceStats();
  const { data: lmsDash, isLoading: lmsLoading } = useMyLmsDashboard();
  const { data: lmsPoints } = useMyLmsPoints();

  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");
  const weekEnd = dayjs().endOf("week").format("YYYY-MM-DD");

  const { data: rosterEntries, isLoading: rosterLoading } = useRoster(
    {
      departmentId: profile?.departmentId,
      sbuId: profile?.sbuId,
      startDate: weekStart,
      endDate: weekEnd,
    },
    { enabled: !!profile?.departmentId }
  );

  // Filter roster to only this employee's entries
  const myRoster = rosterEntries?.filter((r) => r.employeeId === profile?.id) ?? [];

  // Hide balances for leave types the employee isn't eligible for (same
  // gender/marital gates as the Apply-for-Leave flow), so ineligible types
  // like Maternity/Paternity don't show up in the balances card.
  const visibleBalances = (leaveBalances || []).filter((b) =>
    isLeaveTypeEligible(b.leaveType, profile),
  );

  const today = dayjs().format("dddd, MMMM D, YYYY");

  // "My Team" counts everyone in the current user's SBU, matching the filtered
  // employee list the card links to (/employees?sbuId=...). We only need the
  // total, so fetch a single row and read pagination.total.
  const { data: sbuTeam, isLoading: teamLoading } = useEmployees(
    { sbuId: profile?.sbuId, limit: 1 },
    { enabled: !!profile?.sbuId },
  );
  const teamCount = sbuTeam?.pagination?.total ?? 0;
  const nextPayDay = workforceStats?.nextPayDay;
  const daysUntilPay = nextPayDay ? dayjs(nextPayDay).diff(dayjs(), "day") : null;

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    dayjs().startOf("week").add(i, "day")
  );


  return (
    <AppLayout pageTitle="My Dashboard">
      <div className="space-y-6">

        {/* ── Welcome banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-[#412003] px-7 py-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                {getGreeting()}
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-white">
                Welcome back,{" "}
                {profile?.fullName?.split(" ")[0] ?? "there"}{" "}
                👋
              </h2>
              <p className="mt-1 text-sm text-white/50">
                {profile?.jobTitle && profile?.department?.name
                  ? `${profile.jobTitle} · ${profile.department.name}`
                  : profile?.jobTitle ?? ""}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2.5 text-xs text-white/40 sm:mt-0">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {today}
            </div>
          </div>
        </div>

        {/* ── Row 1: Time Tracker | Leave Balances | Team + Next Pay Day ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Time Tracker */}
          <ClockInWidget />

          {/* Leave Balances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                  <CalendarOff className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                Leave Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !visibleBalances.length ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">No leave balances available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleBalances.map((balance) => {
                    const used = balance.usedDays;
                    const total = balance.totalDays;
                    const remaining = balance.remainingDays ?? Math.max(0, total - used);
                    const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
                    return (
                      <div key={balance.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-700">
                            {balance.leaveType?.name ?? "Leave"}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">
                            {remaining}
                            <span className="font-normal text-gray-400">/{total} days</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Link
                    href="/leave"
                    className="mt-1 block text-center text-xs font-medium text-primary hover:underline"
                  >
                    Request Leave →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Size + Next Pay Day stacked */}
          <div className="flex flex-col gap-5">
            {/* Team Size — links to the employee list filtered to the current
                user's own SBU (falls back to the full list if SBU is unknown). */}
            <Link
              href={profile?.sbuId ? `/employees?sbuId=${profile.sbuId}` : "/employees"}
              className="group flex-1 block"
            >
              <div className="h-full rounded-2xl bg-emerald-50 p-5 transition-all duration-200 group-hover:shadow-md">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  My Team
                </p>
                {profileLoading || teamLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="mt-1 text-3xl font-bold text-emerald-900">{teamCount}</p>
                )}
                <p className="mt-0.5 text-xs text-emerald-600/70">
                  {teamCount === 1 ? "Team member" : "Team members"}
                </p>
              </div>
            </Link>

            {/* Next Pay Day */}
            <div className="flex-1 rounded-2xl bg-[#412003] p-5 text-white">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                <Banknote className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                Next Pay Day
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                {nextPayDay ? dayjs(nextPayDay).format("MMM D, YYYY") : "—"}
              </p>
              <p className="mt-0.5 text-xs text-white/40">
                {daysUntilPay != null && daysUntilPay >= 0
                  ? daysUntilPay === 0
                    ? "Today! 🎉"
                    : `In ${daysUntilPay} day${daysUntilPay === 1 ? "" : "s"}`
                  : "Not scheduled"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Row 2: This Week's Schedule ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-3.5 w-3.5 text-primary" />
              </div>
              This Week&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rosterLoading || (profileLoading && !profile) ? (
              <div className="flex gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 flex-1 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dateStr = day.format("YYYY-MM-DD");
                  const entry = myRoster.find((r) => r.date === dateStr);
                  const isToday = day.isSame(dayjs(), "day");
                  const dayType = entry?.dayType;

                  const containerCls = isToday
                    ? "bg-[#412003] shadow-md ring-1 ring-[#412003]/30"
                    : dayType === "Onsite"
                    ? "bg-emerald-50"
                    : dayType === "Remote"
                    ? "bg-blue-50"
                    : dayType === "Leave"
                    ? "bg-amber-50"
                    : "bg-gray-50";

                  const dayLabelCls = isToday ? "text-primary/80" : "text-gray-400";
                  const dateCls = isToday ? "text-white" : "text-gray-800";

                  const icon =
                    dayType === "Onsite" ? (
                      <MapPin className={cn("h-3 w-3", isToday ? "text-white/70" : "text-emerald-500")} />
                    ) : dayType === "Remote" ? (
                      <Wifi className={cn("h-3 w-3", isToday ? "text-white/70" : "text-blue-500")} />
                    ) : dayType === "Leave" ? (
                      <CalendarOff className={cn("h-3 w-3", isToday ? "text-white/70" : "text-amber-500")} />
                    ) : null;

                  const typeLabelCls = isToday
                    ? "text-white/60"
                    : dayType === "Onsite"
                    ? "text-emerald-600"
                    : dayType === "Remote"
                    ? "text-blue-600"
                    : dayType === "Leave"
                    ? "text-amber-600"
                    : "text-gray-400";

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "flex flex-col items-center rounded-2xl p-3 transition-all duration-150",
                        containerCls
                      )}
                    >
                      <p className={cn("text-[10px] font-semibold uppercase tracking-wider", dayLabelCls)}>
                        {day.format("ddd")}
                      </p>
                      <p className={cn("mt-1 text-lg font-bold", dateCls)}>
                        {day.format("D")}
                      </p>
                      <div className="mt-2 flex flex-col items-center gap-0.5">
                        {icon}
                        <span className={cn("text-[10px] font-medium", typeLabelCls)}>
                          {dayType ?? "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Row 3: My Learning ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">My Learning</h3>
            <Link href="/lms" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Go to LMS <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Stats + points card */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Progress Summary</p>
              </div>

              {lmsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Completed",   value: (lmsDash as any)?.stats?.completed  ?? 0, color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "In Progress", value: (lmsDash as any)?.stats?.inProgress ?? 0, color: "bg-primary",     text: "text-primary",    bg: "bg-primary/10" },
                    { label: "Overdue",     value: (lmsDash as any)?.stats?.overdue    ?? 0, color: "bg-red-400",     text: "text-red-600",    bg: "bg-red-50"     },
                  ].map(({ label, value, bg, text }) => (
                    <div key={label} className={`flex items-center justify-between rounded-xl px-3 py-2 ${bg}`}>
                      <span className={`text-xs font-medium ${text}`}>{label}</span>
                      <span className={`text-sm font-bold ${text}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Points */}
              {!!lmsPoints && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Points Earned</p>
                  <div className="flex items-center justify-between gap-2">
                    {[
                      { label: "Total", value: (lmsPoints as any)?.total  ?? 0, icon: Star, color: "text-amber-500"  },
                      { label: "Week",  value: (lmsPoints as any)?.weekly ?? 0, icon: Zap,  color: "text-primary"   },
                      { label: "Month", value: (lmsPoints as any)?.monthly ?? 0, icon: Trophy, color: "text-blue-500" },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <p className="text-base font-bold text-gray-900">{value}</p>
                        <p className="text-[10px] text-gray-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Continue Learning */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-gray-900">Continue Learning</p>
                </div>
                <Link href="/lms/my-courses" className="text-xs font-medium text-primary hover:underline">
                  All Courses →
                </Link>
              </div>

              <div className="px-5 py-3 divide-y divide-gray-50">
                {lmsLoading ? (
                  <div className="space-y-3 py-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : !((lmsDash as any)?.enrollments as any[])?.filter((e: any) => e.status === "InProgress").length ? (
                  <div className="py-10 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-gray-200" />
                    <p className="mt-2 text-sm text-gray-500">No courses in progress</p>
                    <Link
                      href="/lms/courses"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> Browse Courses
                    </Link>
                  </div>
                ) : (
                  ((lmsDash as any)?.enrollments as any[])
                    .filter((e: any) => e.status === "InProgress")
                    .slice(0, 4)
                    .map((enr: any) => {
                      const pct = Math.round((enr.progressPct ?? enr.progress ?? 0));
                      return (
                        <Link
                          key={enr.id}
                          href={`/lms/courses/${enr.course?.id}`}
                          className="group flex items-center gap-3 py-3 hover:bg-gray-50 -mx-5 px-5 transition-colors"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Play className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{enr.course?.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className="h-1.5 rounded-full bg-primary transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-gray-400 shrink-0">{pct}%</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
                        </Link>
                      );
                    })
                )}
              </div>

              {/* Quick action footer */}
              <div className="grid grid-cols-3 border-t border-gray-50">
                {[
                  { label: "Browse Courses",  href: "/lms/courses",      icon: BookOpen  },
                  { label: "Certificates",    href: "/lms/certificates", icon: Award     },
                  { label: "Leaderboard",     href: "/lms/gamification", icon: Trophy    },
                ].map(({ label, href, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex flex-col items-center gap-1 py-3 text-center hover:bg-gray-50 transition-colors border-r border-gray-50 last:border-0"
                  >
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-500">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 4: Who's On Leave Today | Upcoming Celebrations ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Who's On Leave Today */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                  <CalendarOff className="h-3.5 w-3.5 text-amber-500" />
                </div>
                Who&apos;s On Leave Today
                {!!leaveStats?.currentlyOnLeave && (
                  <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {leaveStats.currentlyOnLeave}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaveStatsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !leaveStats?.onLeaveDetails?.length ? (
                <div className="py-10 text-center">
                  <CalendarOff className="mx-auto h-8 w-8 text-gray-200" />
                  <p className="mt-2 text-sm text-gray-500">No one is on leave today</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {leaveStats.onLeaveDetails.map((person, i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <Avatar name={person.employeeName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {person.employeeName}
                        </p>
                        <p className="text-xs text-gray-500">{person.leaveType}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        until {formatDate(person.endDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Celebrations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50">
                  <Cake className="h-3.5 w-3.5 text-pink-500" />
                </div>
                Upcoming Celebrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {celebrationsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                (() => {
                  const items: React.ReactNode[] = [];

                  celebrations?.todayBirthdays?.forEach((p, i) => {
                    items.push(
                      <div key={`tb-${i}`} className="flex items-center gap-3 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100">
                          <Cake className="h-4 w-4 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.employeeName}</p>
                          <p className="text-xs text-gray-500">
                            Birthday Today 🎂{p.date ? ` · ${p.date}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-semibold text-pink-600">
                          Today
                        </span>
                      </div>
                    );
                  });

                  celebrations?.todayAnniversaries?.forEach((p, i) => {
                    items.push(
                      <div key={`ta-${i}`} className="flex items-center gap-3 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Award className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.employeeName}</p>
                          <p className="text-xs text-gray-500">
                            {p.yearsOfService}-Year Anniversary 🎉{p.date ? ` · ${p.date}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Today
                        </span>
                      </div>
                    );
                  });

                  celebrations?.milestoneAnniversaries?.forEach((p, i) => {
                    items.push(
                      <div key={`ma-${i}`} className="flex items-center gap-3 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
                          <Award className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.employeeName}</p>
                          <p className="text-xs text-gray-500">{p.yearsOfService}-Year Milestone 🏆</p>
                        </div>
                        {p.date && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                            {p.date}
                          </span>
                        )}
                      </div>
                    );
                  });

                  celebrations?.upcomingBirthdays?.slice(0, 3).forEach((p, i) => {
                    items.push(
                      <div key={`ub-${i}`} className="flex items-center gap-3 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <Cake className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.employeeName}</p>
                          <p className="text-xs text-gray-500">Birthday coming up</p>
                        </div>
                        {p.date && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            {p.date}
                          </span>
                        )}
                      </div>
                    );
                  });

                  celebrations?.upcomingAnniversaries?.slice(0, 2).forEach((p, i) => {
                    items.push(
                      <div key={`ua-${i}`} className="flex items-center gap-3 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <Award className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.employeeName}</p>
                          <p className="text-xs text-gray-500">
                            {p.yearsOfService}-Year Anniversary coming up
                          </p>
                        </div>
                        {p.date && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            {p.date}
                          </span>
                        )}
                      </div>
                    );
                  });

                  if (items.length === 0) {
                    return (
                      <div className="py-10 text-center">
                        <Cake className="mx-auto h-8 w-8 text-gray-200" />
                        <p className="mt-2 text-sm text-gray-500">No upcoming celebrations</p>
                      </div>
                    );
                  }

                  return <div className="divide-y divide-gray-50">{items}</div>;
                })()
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
