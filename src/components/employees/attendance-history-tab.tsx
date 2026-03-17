"use client";

import React from "react";
import { useAttendance } from "@/hooks/useAttendance";
import { AttendanceStatus } from "@/types/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/loading";
import dayjs from "dayjs";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AttendanceHistoryTabProps {
  employeeId: string;
}

export function AttendanceHistoryTab({ employeeId }: AttendanceHistoryTabProps) {
  const startDate = dayjs().subtract(3, "month").format("YYYY-MM-DD");
  const endDate = dayjs().format("YYYY-MM-DD");

  const { data: response, isLoading } = useAttendance({
    employeeId,
    startDate,
    endDate,
  });

  const attendanceRecords = response?.data || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  // Sort by date descending (newest first)
  const sortedRecords = attendanceRecords ? [...attendanceRecords].sort((a, b) => 
    dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
  ) : [];

  const getStatusVariant = (status: AttendanceStatus, isLate: boolean): BadgeVariant => {
    if (status === AttendanceStatus.Absent) return "danger";
    if (status === AttendanceStatus.OnLeave) return "info";
    if (isLate) return "warning";
    if (status === AttendanceStatus.Present) return "success";
    return "neutral";
  };

  const getStatusLabel = (status: AttendanceStatus, isLate: boolean) => {
    if (isLate && status === AttendanceStatus.Present) return "Late";
    return status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance History</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedRecords.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No attendance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Clock In</th>
                  <th className="px-6 py-3">Clock Out</th>
                  <th className="px-6 py-3">Work Mode</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => (
                  <tr key={record.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {dayjs(record.date).format("MMM D, YYYY")}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={getStatusVariant(record.status, record.isLate)}
                      >
                        {getStatusLabel(record.status, record.isLate)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {record.clockInTime 
                        ? dayjs(record.clockInTime).format("h:mm A") 
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {record.clockOutTime 
                        ? dayjs(record.clockOutTime).format("h:mm A") 
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {record.workLocation || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
