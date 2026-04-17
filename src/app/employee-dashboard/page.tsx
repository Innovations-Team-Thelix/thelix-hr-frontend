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
} from "@/hooks";
import { useRoster } from "@/hooks/useRoster";
import { formatDate, cn } from "@/lib/utils";

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

  const today = dayjs().format("dddd, MMMM D, YYYY");
  const teamCount = profile?.subordinates?.length ?? 0;
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
              ) : !leaveBalances?.length ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">No leave balances available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveBalances.map((balance) => {
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
            {/* Team Size */}
            <Link href="/employees" className="group flex-1 block">
              <div className="h-full rounded-2xl bg-emerald-50 p-5 transition-all duration-200 group-hover:shadow-md">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                  My Team
                </p>
                {profileLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="mt-1 text-3xl font-bold text-emerald-900">{teamCount}</p>
                )}
                <p className="mt-0.5 text-xs text-emerald-600/70">
                  {teamCount === 1 ? "Direct report" : "Direct reports"}
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

        {/* ── Row 3: Who's On Leave Today | Upcoming Celebrations ── */}
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
