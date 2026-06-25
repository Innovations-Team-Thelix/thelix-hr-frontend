"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useLmsTeamProgress, useLmsTeamAtRisk } from "@/hooks";
import { UsersRound, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  NotStarted: "bg-gray-100 text-gray-600",
  InProgress:  "bg-blue-100 text-blue-700",
  Completed:   "bg-green-100 text-green-700",
  Dropped:     "bg-red-100 text-red-600",
  Expired:     "bg-orange-100 text-orange-700",
};

export default function TeamProgressPage() {
  const [view, setView] = useState<"progress" | "risk">("progress");
  const { data: progressData, isLoading: progressLoading } = useLmsTeamProgress();
  const { data: riskData, isLoading: riskLoading } = useLmsTeamAtRisk();

  const isLoading = view === "progress" ? progressLoading : riskLoading;
  const rows: any[] = (view === "progress" ? progressData : riskData) as any[] ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-blue-600" />
            Team Learning Progress
          </h1>
          <p className="text-gray-500 text-sm mt-1">Monitor your team's course completion and identify employees at risk.</p>
        </div>

        <div className="flex gap-2">
          {[
            { value: "progress", label: "All Progress", icon: TrendingUp },
            { value: "risk",     label: "At Risk",      icon: AlertTriangle },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setView(value as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${view === value ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-blue-300"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-64" />
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UsersRound className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">{view === "risk" ? "No employees at risk." : "No team enrollments found."}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Course</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Progress</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((enr: any) => (
                    <tr key={enr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{enr.employee.fullName}</p>
                        <p className="text-xs text-gray-400">{enr.employee.jobTitle}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/lms/courses/${enr.courseId}`} className="text-blue-600 hover:underline text-sm">
                          {enr.course.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${enr.progressPct === 100 ? "bg-green-500" : enr.progressPct > 0 ? "bg-blue-500" : "bg-gray-300"}`} style={{ width: `${enr.progressPct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{enr.progressPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[enr.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {enr.status.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {enr.dueDate ? new Date(enr.dueDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
