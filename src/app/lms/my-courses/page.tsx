"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { useMyEnrollments } from "@/hooks";
import { BookMarked, Clock, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  NotStarted: { label: "Not Started",  bg: "bg-gray-100",   text: "text-gray-600",  icon: BookMarked },
  InProgress:  { label: "In Progress",  bg: "bg-primary-100",   text: "text-primary-600",  icon: PlayCircle },
  Completed:   { label: "Completed",    bg: "bg-green-100",  text: "text-green-700", icon: CheckCircle2 },
  Dropped:     { label: "Dropped",      bg: "bg-red-100",    text: "text-red-600",   icon: AlertCircle },
  Expired:     { label: "Overdue",      bg: "bg-orange-100", text: "text-orange-700",icon: AlertCircle },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-100 text-green-700",
  Intermediate: "bg-blue-100 text-blue",
  Advanced:     "bg-primary-100 text-primary-700",
  Expert:       "bg-red-100 text-red-700",
};

export default function MyCoursesPage() {
  const { data: enrollments, isLoading } = useMyEnrollments();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-primary" />
            My Courses
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track your assigned and enrolled courses.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : !enrollments || (enrollments as any[]).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookMarked className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No courses assigned yet.</p>
              <Link href="/lms/courses" className="text-primary text-sm mt-2 inline-block hover:underline">Browse the course library →</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(enrollments as any[]).map((enr) => {
              const status = STATUS_CONFIG[enr.status] ?? STATUS_CONFIG.NotStarted;
              const StatusIcon = status.icon;
              return (
                <Link key={enr.id} href={`/lms/courses/${enr.courseId}`}>
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardContent className="p-5 flex flex-col gap-3 h-full">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{enr.course.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${DIFFICULTY_COLORS[enr.course.difficulty] ?? "bg-gray-100 text-gray-600"}`}>
                          {enr.course.difficulty}
                        </span>
                      </div>

                      {enr.course.category && (
                        <span className="text-xs text-gray-400">{enr.course.category.name}</span>
                      )}

                      <div className="mt-auto space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Progress</span>
                          <span className="font-medium">{enr.progressPct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all bg-primary"
                            style={{ width: `${enr.progressPct}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                          {enr.dueDate && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              Due {formatDate(enr.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
