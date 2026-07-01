"use client";

import { AppLayout } from "@/components/layout/app-layout";
import {
  useAuth,
  useMyLmsDashboard,
  useAdminLmsDashboard,
  useEffectiveRole,
} from "@/hooks";
import {
  GraduationCap,
  BookOpen,
  Award,
  Trophy,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  Clock,
  ChevronRight,
  Flame,
  Users,
  BarChart3,
  Plus,
  BookMarked,
  Star,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading";
import Link from "next/link";

// ─── Difficulty badge ──────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  Beginner:     "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-blue-100 text-blue",
  Advanced:     "bg-orange-100 text-orange-700",
  Expert:       "bg-red-100 text-red-700",
};

// ─── Circular progress ring ────────────────────────────────────────────────

function Ring({ pct, size = 48, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#D97530" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Course card ────────────────────────────────────────────────────────────

function CourseProgressCard({ enr }: { enr: any }) {
  const isDone = enr.status === "Completed";
  return (
    <Link href={`/lms/courses/${enr.courseId}`}>
      <div className="group flex gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-primary-200 hover:shadow-md transition-all cursor-pointer">
        {/* Thumbnail placeholder */}
        <div className="w-20 h-16 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex-shrink-0 flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-white opacity-80" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {enr.course.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${DIFF_COLORS[enr.course.difficulty] ?? "bg-gray-100 text-gray-600"}`}>
              {enr.course.difficulty}
            </span>
            {enr.dueDate && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                Due {new Date(enr.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isDone ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${enr.progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-gray-500 w-8 text-right">{enr.progressPct}%</span>
          </div>
        </div>
        <div className="flex items-center self-center">
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <PlayCircle className="w-5 h-5 text-primary-300 group-hover:text-primary transition-colors" />
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Empty state (employee) ────────────────────────────────────────────────

function EmptyLearner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-5">
        <GraduationCap className="w-10 h-10 text-primary-300" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">No courses yet</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6 leading-relaxed">
        You haven't been enrolled in any courses yet. Browse the library to start learning, or wait for your manager to assign a course.
      </p>
      <div className="flex gap-3">
        <Link href="/lms/courses">
          <Button className="bg-primary hover:bg-primary-600 text-white rounded-lg px-5">
            Browse Courses
          </Button>
        </Link>
        <Link href="/lms/paths">
          <Button variant="outline" className="rounded-lg px-5">
            Learning Paths
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Employee dashboard ────────────────────────────────────────────────────

function EmployeeDashboard() {
  const { data, isLoading } = useMyLmsDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const stats       = (data as any)?.stats       ?? { total: 0, inProgress: 0, completed: 0, overdue: 0 };
  const enrollments = (data as any)?.enrollments ?? [];
  const badges      = (data as any)?.badges      ?? [];

  const inProgress  = enrollments.filter((e: any) => e.status === "InProgress");
  const recent      = enrollments.slice(0, 5);
  const isEmpty     = enrollments.length === 0;

  return (
    <div className="space-y-8">
      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookMarked,    label: "Enrolled",    value: stats.total,       color: "from-primary-400 to-primary",    bg: "bg-primary-50",    text: "text-primary" },
          { icon: PlayCircle,    label: "In Progress", value: stats.inProgress,  color: "from-amber-400 to-amber-500",  bg: "bg-amber-50",   text: "text-amber-600" },
          { icon: CheckCircle2,  label: "Completed",   value: stats.completed,   color: "from-emerald-500 to-green-600",bg: "bg-emerald-50", text: "text-emerald-600" },
          { icon: AlertCircle,   label: "Overdue",     value: stats.overdue,     color: "from-red-500 to-rose-600",     bg: "bg-red-50",     text: "text-red-600" },
        ].map(({ icon: Icon, label, value, color, bg, text }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-3xl font-bold ${text}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Continue learning / empty */}
      {isEmpty ? (
        <EmptyLearner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Continue learning */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-base">Continue Learning</h2>
              <Link href="/lms/my-courses">
                <span className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  See all <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="space-y-3">
              {(inProgress.length > 0 ? inProgress : recent).slice(0, 4).map((enr: any) => (
                <CourseProgressCard key={enr.id} enr={enr} />
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Points & streak */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-5 h-5 text-amber-300" />
                <span className="text-sm font-semibold opacity-90">My Progress</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-bold">{stats.completed}</p>
                  <p className="text-xs opacity-70 mt-0.5">Courses completed</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{stats.total - stats.completed}</p>
                  <p className="text-xs opacity-70">Remaining</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}%` : "0%" }}
                />
              </div>
              <p className="text-[11px] opacity-60 mt-1.5">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% overall completion
              </p>
            </div>

            {/* Badges */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">My Badges</h3>
                <Link href="/lms/gamification">
                  <span className="text-xs text-primary hover:underline">Leaderboard</span>
                </Link>
              </div>
              {badges.length === 0 ? (
                <div className="text-center py-5">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-2">
                    <Trophy className="w-5 h-5 text-amber-300" />
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Complete courses to earn your first badge.
                  </p>
                  <Link href="/lms/gamification">
                    <button className="text-xs text-primary hover:underline mt-2">View all badges</button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {badges.slice(0, 6).map((ub: any) => (
                    <div key={ub.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-100 rounded-full">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      <span className="text-[11px] font-medium text-amber-700">{ub.badge.name}</span>
                    </div>
                  ))}
                  {badges.length > 6 && (
                    <span className="text-[11px] text-gray-400 self-center">+{badges.length - 6} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Links</h3>
              {[
                { href: "/lms/courses",      label: "Browse Course Library", icon: BookOpen },
                { href: "/lms/certificates", label: "My Certificates",       icon: Award },
                { href: "/lms/paths",        label: "Learning Paths",        icon: TrendingUp },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                    <Icon className="w-4 h-4 text-primary-400" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 flex-1">{label}</span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin dashboard ───────────────────────────────────────────────────────

function AdminDashboard() {
  const { data, isLoading } = useAdminLmsDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const d = (data as any) ?? {};
  const totalCourses      = d.totalCourses      ?? 0;
  const totalEnrollments  = d.totalEnrollments  ?? 0;
  const totalCompleted    = d.totalCompleted    ?? 0;
  const totalCertificates = d.totalCertificates ?? 0;
  const completionRate    = d.completionRate    ?? 0;
  const recentEnrollments = d.recentEnrollments ?? [];

  const isEmpty = totalCourses === 0;

  return (
    <div className="space-y-8">
      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookOpen,   label: "Published Courses",   value: totalCourses,       color: "from-primary-400 to-primary",      text: "text-primary" },
          { icon: Users,      label: "Total Enrollments",   value: totalEnrollments,   color: "from-blue-300 to-blue",  text: "text-blue" },
          { icon: TrendingUp, label: "Completions",         value: totalCompleted,     color: "from-emerald-500 to-green-600",  text: "text-emerald-600" },
          { icon: Award,      label: "Certificates Issued", value: totalCertificates,  color: "from-amber-400 to-amber-500",    text: "text-amber-600" },
        ].map(({ icon: Icon, label, value, color, text }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-3xl font-bold ${text}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Empty state for admin when no courses exist */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-5">
            <BookOpen className="w-10 h-10 text-primary-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">No courses published yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-6 leading-relaxed">
            Create your first course to get the Learning Hub running. You can add modules, lessons, and quizzes.
          </p>
          <Link href="/lms/courses/create">
            <Button className="bg-primary hover:bg-primary-600 text-white rounded-lg px-5 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create First Course
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Completion rate + chart */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-gray-900 text-base">Platform Overview</h2>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Overall Completion Rate</p>
                  <p className="text-4xl font-bold text-gray-900 mt-1">{completionRate}<span className="text-xl text-gray-400">%</span></p>
                </div>
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  Active
                </div>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>0%</span>
                <span>{totalCompleted} of {totalEnrollments} enrollments completed</span>
                <span>100%</span>
              </div>

              {/* Mini metric row */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-gray-50">
                {[
                  { label: "Avg per course", value: totalCourses > 0 ? Math.round(totalEnrollments / totalCourses) : 0, suffix: "enrolled" },
                  { label: "Cert rate", value: totalCompleted > 0 ? Math.round((totalCertificates / totalCompleted) * 100) : 0, suffix: "%" },
                  { label: "Active courses", value: totalCourses, suffix: "total" },
                ].map(({ label, value, suffix }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl font-bold text-gray-800">{value}<span className="text-xs text-gray-400 ml-0.5">{suffix}</span></p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent enrollments */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Recent Enrollments</h3>
                <Link href="/lms/reports">
                  <span className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    Full Report <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
              {recentEnrollments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No enrollments yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentEnrollments.slice(0, 5).map((enr: any) => (
                    <div key={enr.id} className="flex items-center gap-3 py-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600 flex-shrink-0">
                        {enr.employee?.fullName?.charAt(0) ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{enr.employee?.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{enr.course?.title}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                        enr.status === "Completed"  ? "bg-emerald-50 text-emerald-700" :
                        enr.status === "InProgress" ? "bg-primary-50 text-primary-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {enr.status?.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Admin quick actions */}
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-base">Quick Actions</h2>
            <div className="space-y-3">
              {[
                { href: "/lms/courses/create", label: "Create New Course",   icon: Plus,      color: "bg-primary hover:bg-primary-600 text-white" },
                { href: "/lms/courses",        label: "Manage Courses",      icon: BookOpen,  color: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200" },
                { href: "/lms/team",           label: "Team Progress",       icon: Users,     color: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200" },
                { href: "/lms/reports",        label: "View Reports",        icon: BarChart3, color: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200" },
                { href: "/lms/paths",          label: "Learning Paths",      icon: TrendingUp,color: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200" },
              ].map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href}>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${color} transition-all cursor-pointer`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium flex-1">{label}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                  </div>
                </Link>
              ))}
            </div>

            {/* At-a-glance badges */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-300" />
                <span className="text-sm font-semibold">Certificates Issued</span>
              </div>
              <p className="text-4xl font-bold">{totalCertificates}</p>
              <p className="text-xs opacity-60 mt-1">Across all courses</p>
              <Link href="/lms/reports">
                <div className="mt-4 flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
                  View certificate report <ArrowRight className="w-3 h-3 ml-0.5" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Welcome banner ────────────────────────────────────────────────────────

function WelcomeBanner({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 px-8 py-7 text-white">
      {/* Background blobs */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 right-24 w-28 h-28 rounded-full bg-white/5" />
      <div className="absolute top-4 right-4 w-14 h-14 rounded-full bg-yellow-400/20" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-primary-200 text-sm font-medium">{greeting},</p>
          <h1 className="text-2xl font-bold mt-0.5">
            {name ? name.split(" ")[0] : "Welcome"} 👋
          </h1>
          <p className="text-primary-100 text-sm mt-2 max-w-sm leading-relaxed">
            {isAdmin
              ? "Here's what's happening across your Learning Hub today."
              : "Pick up where you left off and keep building your skills."}
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-1 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
          <GraduationCap className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-semibold ml-1">Learning Hub</span>
        </div>
      </div>

      {!isAdmin && (
        <div className="relative mt-5 flex gap-3">
          <Link href="/lms/courses">
            <button className="bg-white text-primary-600 hover:bg-primary-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Browse Courses
            </button>
          </Link>
          <Link href="/lms/my-courses">
            <button className="bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-white/20">
              My Courses
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LmsDashboardPage() {
  const effectiveRole = useEffectiveRole();
  const { profile } = useAuth();
  const isAdmin = effectiveRole === "CVO" || effectiveRole === "Admin";
  const name = profile?.fullName ?? "";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl">
        <WelcomeBanner name={name} isAdmin={isAdmin} />
        {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
      </div>
    </AppLayout>
  );
}
