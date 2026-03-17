"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { useAttendance } from "@/hooks/useAttendance";
import { AttendanceStatus, ApprovalStatus } from "@/types/attendance";
import { CalendarDays, CheckCircle2, AlertCircle, XCircle, Wifi } from "lucide-react";

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "danger" | "neutral" | "info"; label: string }> = {
  Present:  { variant: "success", label: "Present"  },
  Late:     { variant: "warning", label: "Late"     },
  Absent:   { variant: "danger",  label: "Absent"   },
  OnLeave:  { variant: "info",    label: "On Leave" },
};

export default function MyAttendancePage() {
  const startDate = dayjs().startOf("month").format("YYYY-MM-DD");
  const endDate   = dayjs().format("YYYY-MM-DD");

  const { data: response, isLoading } = useAttendance({ startDate, endDate });

  const records = response?.data || [];

  // Derive stats from records
  const stats = records.reduce(
    (acc, r) => {
      if (r.status === AttendanceStatus.Present || r.status === AttendanceStatus.Late) {
        acc.present++;
        if (r.workLocation === "Remote") acc.remote++;
      }
      if (r.status === AttendanceStatus.Late)   acc.late++;
      if (r.status === AttendanceStatus.Absent) acc.absent++;
      return acc;
    },
    { present: 0, late: 0, absent: 0, remote: 0 }
  );

  const statCards = [
    { label: "Days Present",  value: stats.present, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Late Arrivals", value: stats.late,    icon: AlertCircle,  color: "text-orange-500"  },
    { label: "Absences",      value: stats.absent,  icon: XCircle,      color: "text-red-500"     },
    { label: "Remote Days",   value: stats.remote,  icon: Wifi,         color: "text-blue-500"    },
  ];

  const sorted = [...(records ?? [])].sort(
    (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  
  const paginatedRecords = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AppLayout pageTitle="My Attendance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">My Attendance</h2>
            <p className="text-sm text-gray-500">{dayjs().format("MMMM YYYY")}</p>
          </div>
        </div>

        {/* Clock-in widget + stat cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ClockInWidget />
          </div>
          <div className="lg:col-span-3 grid grid-cols-2 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className={`h-8 w-8 ${color} shrink-0`} />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{isLoading ? "-" : value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Attendance history table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This Month&apos;s History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            ) : sorted.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">No attendance records yet this month.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Work Mode</TableHead>
                    <TableHead>Approval</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => {
                    const statusInfo = STATUS_BADGE[record.status] ?? { variant: "neutral" as const, label: record.status };
                    const approvalVariant =
                      record.approvalStatus === ApprovalStatus.Approved ? "success" :
                      record.approvalStatus === ApprovalStatus.Rejected  ? "danger"  : "warning";
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{dayjs(record.date).format("ddd, MMM D")}</TableCell>
                        <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                        <TableCell>{record.clockInTime  ? dayjs(record.clockInTime).format("HH:mm")  : "-"}</TableCell>
                        <TableCell>{record.clockOutTime ? dayjs(record.clockOutTime).format("HH:mm") : "-"}</TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600">{record.workLocation}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={approvalVariant}>{record.approvalStatus}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="border-t border-gray-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, sorted.length)} of{" "}
                      {sorted.length} entries
                    </p>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
