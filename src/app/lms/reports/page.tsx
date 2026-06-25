"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useLmsEmployeeReport, useLmsDepartmentReport, useLmsCourseReport } from "@/hooks";
import { BarChart2, Users, BookOpen, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";

type ReportTab = "employee" | "department" | "course";

const TAB_CONFIG: { value: ReportTab; label: string; icon: any }[] = [
  { value: "employee",   label: "Employee Report",   icon: Users },
  { value: "department", label: "Department Report", icon: Building2 },
  { value: "course",     label: "Course Report",     icon: BookOpen },
];

const STATUS_COLORS: Record<string, string> = {
  NotStarted: "bg-gray-100 text-gray-600",
  InProgress:  "bg-blue-100 text-blue-700",
  Completed:   "bg-green-100 text-green-700",
  Expired:     "bg-orange-100 text-orange-700",
};

export default function LmsReportsPage() {
  const [tab, setTab] = useState<ReportTab>("employee");

  const { data: empData, isLoading: empLoading } = useLmsEmployeeReport();
  const { data: deptData, isLoading: deptLoading } = useLmsDepartmentReport();
  const { data: courseData, isLoading: courseLoading } = useLmsCourseReport();

  const isLoading = tab === "employee" ? empLoading : tab === "department" ? deptLoading : courseLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            LMS Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">Analytics across employees, departments, and courses.</p>
        </div>

        <div className="flex gap-2">
          {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${tab === value ? "bg-blue-600 text-white border-blue-600" : "text-gray-600 border-gray-200 hover:border-blue-300"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {isLoading ? <Skeleton className="h-64" /> : (
          <>
            {tab === "employee" && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        {["Employee", "Department", "Course", "Progress", "Status", "Certificate"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {((empData as any[]) ?? []).map((row: any) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{row.employee.fullName}</p>
                            <p className="text-xs text-gray-400">{row.employee.employeeId}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{row.employee.department?.name}</td>
                          <td className="px-4 py-3 text-gray-700 text-xs">{row.course.title}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${row.progressPct}%` }} />
                              </div>
                              <span className="text-xs">{row.progressPct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                              {row.status.replace(/([A-Z])/g, " $1").trim()}
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
                          <span className="font-medium">{dept.completionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-green-500" style={{ width: `${dept.completionRate}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>{dept.total} enrolled</span>
                        <span>{dept.completed} completed</span>
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
                        {["Course", "Enrollments", "Completed", "Completion Rate", "Avg Progress"].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {((courseData as any[]) ?? []).map((row: any) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{row.title}</td>
                          <td className="px-4 py-3 text-gray-500">{row.totalEnrollments}</td>
                          <td className="px-4 py-3 text-gray-500">{row.completed}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${row.completionRate}%` }} />
                              </div>
                              <span className="text-xs">{row.completionRate}%</span>
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
        )}
      </div>
    </AppLayout>
  );
}
