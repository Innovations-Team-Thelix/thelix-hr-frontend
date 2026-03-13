"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, Users, Clock, MapPin, AlertTriangle } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";
import { useSbus, useDepartments } from "@/hooks";
import { Spinner } from "@/components/ui/loading";
import dayjs from "dayjs";
import { AttendanceStats, AttendanceRecord, AttendanceStatus } from "@/types/attendance";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

function calculateStats(records: AttendanceRecord[]): AttendanceStats {
  const stats: AttendanceStats = {
    totalWorkDays: 0,
    totalPresent: 0,
    totalLate: 0,
    totalAbsent: 0,
    averageClockInTime: "00:00 AM",
    dailyTrend: [],
    locationDistribution: { onsite: 0, remote: 0 },
    mostLateEmployees: [],
  };

  if (!records.length) return stats;

  let totalClockInMinutes = 0;
  let clockInCount = 0;
  const employeeLateMap = new Map<string, { name: string; count: number; department: string }>();
  const dailyMap = new Map<string, { date: string; present: number; late: number; absent: number }>();

  records.forEach((record) => {
    // Totals
    if (record.status === AttendanceStatus.Present) {
      stats.totalPresent++;
      stats.totalWorkDays++;

      if (record.workLocation === "Onsite") stats.locationDistribution.onsite++;
      if (record.workLocation === "Remote") stats.locationDistribution.remote++;

      if (record.isLate) {
        stats.totalLate++;

        // Late Employees
        const empId = record.employeeId;
        const current = employeeLateMap.get(empId) || {
          name: record.employee?.fullName || "Unknown",
          count: 0,
          department: record.employee?.department?.name || "-",
        };
        current.count++;
        employeeLateMap.set(empId, current);
      }

      // Average Time
      if (record.clockInTime) {
        const time = dayjs(record.clockInTime);
        const minutes = time.hour() * 60 + time.minute();
        totalClockInMinutes += minutes;
        clockInCount++;
      }
    } else if (record.status === AttendanceStatus.Absent) {
      stats.totalAbsent++;
      stats.totalWorkDays++;
      
      const dateStr = dayjs(record.date).format("YYYY-MM-DD");
      const daily = dailyMap.get(dateStr) || { date: dateStr, present: 0, late: 0, absent: 0 };
      daily.absent++;
      dailyMap.set(dateStr, daily);
    }

    // Daily Trend (for Present)
    if (record.status === AttendanceStatus.Present) {
        const dateStr = dayjs(record.date).format("YYYY-MM-DD");
        const daily = dailyMap.get(dateStr) || { date: dateStr, present: 0, late: 0, absent: 0 };
        daily.present++;
        if (record.isLate) daily.late++;
        dailyMap.set(dateStr, daily);
    }
  });

  // Finalize Average Time
  if (clockInCount > 0) {
    const avgMinutes = totalClockInMinutes / clockInCount;
    const h = Math.floor(avgMinutes / 60);
    const m = Math.floor(avgMinutes % 60);
    stats.averageClockInTime = dayjs().hour(h).minute(m).format("h:mm A");
  }

  // Finalize Top Offenders
  stats.mostLateEmployees = Array.from(employeeLateMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((e) => ({
      employeeId: "",
      name: e.name,
      count: e.count,
      department: e.department,
    }));

  // Finalize Daily Trend
  stats.dailyTrend = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return stats;
}

export default function AttendanceReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().startOf("month").format("YYYY-MM-DD"),
    endDate: dayjs().endOf("month").format("YYYY-MM-DD"),
  });
  const [selectedSbu, setSelectedSbu] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const { data: sbus } = useSbus();
  const { data: departments } = useDepartments(selectedSbu);

  const { data: response, isLoading } = useAttendance({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    sbuId: selectedSbu || undefined,
    departmentId: selectedDepartment || undefined,
  });

  const records = response?.data || [];

  const stats = useMemo(() => {
    if (!records) return null;
    return calculateStats(records);
  }, [records]);

  const handleExport = () => {
    if (!records?.length) return;
    const headers = ["Date", "Employee", "Department", "Status", "Late", "Clock In", "Clock Out", "Work Mode"];
    const rows = records.map((r) => [
      dayjs(r.date).format("YYYY-MM-DD"),
      r.employee?.fullName ?? "",
      r.employee?.department?.name ?? "",
      r.status,
      r.isLate ? "Yes" : "No",
      r.clockInTime  ? dayjs(r.clockInTime).format("HH:mm")  : "",
      r.clockOutTime ? dayjs(r.clockOutTime).format("HH:mm") : "",
      r.workLocation,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attendanceRate =
    stats && stats.totalWorkDays > 0
      ? ((stats.totalPresent / stats.totalWorkDays) * 100).toFixed(1)
      : "0";

  const lateRate =
    stats && stats.totalPresent > 0
      ? ((stats.totalLate / stats.totalPresent) * 100).toFixed(1)
      : "0";

  return (
    <AppLayout pageTitle="Attendance Reports">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-40"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-40"
              />
            </div>

            <Select
              options={
                sbus?.map((sbu) => ({ label: sbu.name, value: sbu.id })) || []
              }
              value={selectedSbu}
              onChange={(e) => setSelectedSbu(e.target.value)}
              placeholder="All SBUs"
              className="w-48"
            />

            <Select
              options={
                departments?.map((dept) => ({
                  label: dept.name,
                  value: dept.id,
                })) || []
              }
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              placeholder="All Departments"
              disabled={!selectedSbu}
              className="w-48"
            />
          </div>

          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : stats ? (
          <>
            {/* Key Metric Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Attendance Rate
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{attendanceRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalPresent} present out of {stats.totalWorkDays} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Late Arrivals
                  </CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalLate}</div>
                  <p className="text-xs text-muted-foreground">
                    {lateRate}% of present employees
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Remote Usage
                  </CardTitle>
                  <MapPin className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.locationDistribution?.remote ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Days worked remotely
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Absenteeism
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAbsent}</div>
                  <p className="text-xs text-muted-foreground">
                    Unexcused absences
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Visualizations */}
            <div className="grid gap-4 md:grid-cols-7">
              {/* Daily Trend Chart */}
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Attendance Status Trend</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={stats.dailyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => dayjs(val).format("D MMM")}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(val) => dayjs(val).format("D MMM YYYY")}
                      />
                      <Legend />
                      <Bar
                        dataKey="present"
                        name="Present"
                        stackId="a"
                        fill="#10b981"
                      />
                      <Bar
                        dataKey="late"
                        name="Late"
                        stackId="a"
                        fill="#f59e0b"
                      />
                      <Bar
                        dataKey="absent"
                        name="Absent"
                        stackId="a"
                        fill="#ef4444"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Location Split Chart */}
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Work Mode Split</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Onsite",
                            value: stats.locationDistribution?.onsite || 0,
                          },
                          {
                            name: "Remote",
                            value: stats.locationDistribution?.remote || 0,
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        <Cell fill="#0ea5e9" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Offenders Table */}
            {stats.mostLateEmployees && stats.mostLateEmployees.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Most Frequent Late Arrivals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-6 py-3">Employee Name</th>
                          <th className="px-6 py-3">Department</th>
                          <th className="px-6 py-3">Late Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.mostLateEmployees.map((employee, index) => (
                          <tr
                            key={index}
                            className="bg-white border-b hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {employee.name}
                            </td>
                            <td className="px-6 py-4">
                              {employee.department || "-"}
                            </td>
                            <td className="px-6 py-4 text-orange-600 font-semibold">
                              {employee.count} times
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex justify-center py-20 text-gray-500">
            No attendance data found for the selected period.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
