"use client";

// cspell:ignore Sbus

import { useState, useMemo, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import {
  ChevronLeft,
  ChevronRight,
  Wand2,
  Save,
  AlertTriangle,
  Building2,
  CalendarRange,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/loading";
import { Avatar } from "@/components/ui/avatar";
import {
  useSbus,
  useDepartments,
  useEmployees,
  useEffectiveRole,
} from "@/hooks";
import {
  useRoster,
  useGenerateRoster,
  useOverrideRoster,
} from "@/hooks/useRoster";
import { useAttendance } from "@/hooks/useAttendance";
import { cn } from "@/lib/utils";
import type { RosterDayType } from "@/types";
import { AttendanceStatus, ApprovalStatus } from "@/types/attendance";
import dayjs from "dayjs";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function getDaysInRange(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }
  return days;
}

function getThisWeekRange(): DateRange {
  const monday = getMonday(new Date());
  return { from: monday, to: addDays(monday, 4) };
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Roster schedule colours (shown when no attendance record exists)
const DAY_TYPE_STYLES: Record<RosterDayType, { bg: string; text: string; label: string }> = {
  Onsite: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Onsite" },
  Remote: { bg: "bg-blue-100",    text: "text-blue-700",    label: "Remote" },
  Leave:  { bg: "bg-amber-100",   text: "text-amber-700",   label: "Leave"  },
};

// Attendance status colours (take priority over schedule when record exists)
type AttendanceTileType = "pending" | "late" | "clocked_in" | "clocked_out" | "absent";

const ATTENDANCE_TILE_STYLES: Record<AttendanceTileType, { bg: string; text: string; label: string }> = {
  pending:     { bg: "bg-gray-200",    text: "text-gray-700",    label: "Pending"     },
  late:        { bg: "bg-orange-100",  text: "text-orange-700",  label: "Late"        },
  clocked_in:  { bg: "bg-emerald-600", text: "text-white",       label: "Clocked In"  },
  clocked_out: { bg: "bg-teal-100",    text: "text-teal-700",    label: "Clocked Out" },
  absent:      { bg: "bg-red-100",     text: "text-red-700",     label: "Absent"      },
};

function getAttendanceTile(attendance: any): AttendanceTileType | null {
  if (!attendance) return null;
  if (attendance.status === AttendanceStatus.Absent) return "absent";
  if (attendance.approvalStatus === ApprovalStatus.Pending) return "pending";
  if (attendance.isLate || attendance.status === AttendanceStatus.Late) return "late";
  if (attendance.clockOutTime) return "clocked_out";
  if (attendance.approvalStatus === ApprovalStatus.Approved) return "clocked_in";
  return null;
}

export default function RosterPage() {
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";

  const [selectedSbuId, setSelectedSbuId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>();
  const [localOverrides, setLocalOverrides] = useState<Map<string, RosterDayType>>(new Map());
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDateRange(getThisWeekRange());
  }, []);

  // Close calendar on outside click
  useEffect(() => {
    if (!calendarOpen) return;
    function handleClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
        setPendingRange(undefined);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [calendarOpen]);

  const { data: sbus } = useSbus();
  const { data: departments } = useDepartments(selectedSbuId || undefined);

  const rangeFrom = dateRange?.from ?? null;
  const rangeTo = dateRange?.to ?? null;

  const { data: rosterEntries, isLoading: isRosterLoading } = useRoster({
    departmentId: selectedDeptId || undefined,
    sbuId: selectedSbuId || undefined,
    startDate: rangeFrom ? toDateStr(rangeFrom) : "",
    endDate: rangeTo ? toDateStr(rangeTo) : "",
  }, { enabled: !!rangeFrom && !!rangeTo });

  const { data: attendanceResponse, isLoading: isAttendanceLoading } = useAttendance({
    departmentId: selectedDeptId || undefined,
    sbuId: selectedSbuId || undefined,
    startDate: rangeFrom ? toDateStr(rangeFrom) : "",
    endDate: rangeTo ? toDateStr(rangeTo) : "",
  }, { enabled: !!rangeFrom && !!rangeTo });

  const attendanceEntries = attendanceResponse?.data || [];

  const { data: employeesData } = useEmployees({
    departmentId: selectedDeptId || undefined,
    sbuId: selectedSbuId || undefined,
    limit: 1000,
  });

  const isLoading = isRosterLoading || isAttendanceLoading || !rangeFrom || !rangeTo;

  const days = useMemo(
    () => (rangeFrom && rangeTo ? getDaysInRange(rangeFrom, rangeTo) : []),
    [rangeFrom, rangeTo]
  );

  const generateRoster = useGenerateRoster();
  const overrideRoster = useOverrideRoster();

  const selectedDept = departments?.find((d) => d.id === selectedDeptId);
  const minOnsite = selectedDept?.minOnsite ?? 1;

  const employeeMap = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      entries: Map<string, RosterDayType>;
      attendance: Map<string, any>;
    }>();

    if (rosterEntries) {
      rosterEntries.forEach((entry) => {
        const empId = entry.employeeId;
        if (!map.has(empId)) {
          const empFromList = employeesData?.data?.find(e => e.id === empId || e.employeeId === empId);
          map.set(empId, {
            id: empId,
            name: entry.employee?.fullName || empFromList?.fullName || "Unknown",
            entries: new Map(),
            attendance: new Map(),
          });
        }
        if (!entry.date) return;
        const dateKey = entry.date.split("T")[0];
        const overrideKey = `${empId}-${dateKey}`;
        map.get(empId)!.entries.set(dateKey, localOverrides.get(overrideKey) ?? entry.dayType);
      });
    }

    if (attendanceEntries) {
      attendanceEntries.forEach((entry) => {
        const empId = entry.employeeId;
        if (!map.has(empId)) {
          const empFromList = employeesData?.data?.find(e => e.id === empId || e.employeeId === empId);
          map.set(empId, {
            id: empId,
            name: entry.employee?.fullName || empFromList?.fullName || "Unknown",
            entries: new Map(),
            attendance: new Map(),
          });
        }
        map.get(empId)!.attendance.set(entry.date.split("T")[0], entry);
      });
    }

    return map;
  }, [rosterEntries, localOverrides, attendanceEntries, employeesData]);

  const onsiteCounts = useMemo(() => {
    return days.map((day) => {
      const dateStr = toDateStr(day);
      let count = 0;
      employeeMap.forEach((emp) => {
        if (emp.entries.get(dateStr) === "Onsite") count++;
      });
      return count;
    });
  }, [employeeMap, days]);

  const belowMinDays = onsiteCounts.some((count) => count < minOnsite && employeeMap.size > 0);

  const sbuOptions = (sbus || []).map((s) => ({ label: s.name, value: s.id }));
  const deptOptions = (departments || []).map((d) => ({ label: d.name, value: d.id }));

  const handleCellClick = (employeeId: string, dateStr: string) => {
    if (!isAdmin) return;
    const overrideKey = `${employeeId}-${dateStr}`;
    const current = localOverrides.get(overrideKey) ?? employeeMap.get(employeeId)?.entries.get(dateStr);
    if (current === "Leave") return;
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      next.set(overrideKey, current === "Onsite" ? "Remote" : "Onsite");
      return next;
    });
  };

  const handleAutoGenerate = async () => {
    if (!selectedDeptId) { toast.error("Please select a department first"); return; }
    if (!rangeFrom || !rangeTo) { toast.error("Please select a date range first"); return; }
    try {
      await generateRoster.mutateAsync({
        departmentId: selectedDeptId,
        sbuId: selectedSbuId || undefined,
        startDate: toDateStr(rangeFrom),
        endDate: toDateStr(rangeTo),
      });
      toast.success("Roster generated successfully");
      setLocalOverrides(new Map());
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to generate roster");
    }
  };

  const handleSaveOverrides = async () => {
    if (localOverrides.size === 0) { toast.error("No changes to save"); return; }
    try {
      const promises = Array.from(localOverrides.entries()).map(([key, dayType]) => {
        const employeeId = key.substring(0, 36);
        const dateStr = key.substring(37);
        return overrideRoster.mutateAsync({ employeeId, date: dateStr, dayType: dayType as "Onsite" | "Remote" });
      });
      await Promise.all(promises);
      toast.success("Roster overrides saved successfully");
      setLocalOverrides(new Map());
    } catch {
      toast.error("Failed to save some overrides");
    }
  };

  const rangeSpanDays = rangeFrom && rangeTo
    ? Math.round((rangeTo.getTime() - rangeFrom.getTime()) / 86400000)
    : 6;

  const handlePrevPeriod = () => {
    if (!rangeFrom || !rangeTo) return;
    const span = rangeSpanDays + 1;
    setDateRange({ from: addDays(rangeFrom, -span), to: addDays(rangeTo, -span) });
    setLocalOverrides(new Map());
  };

  const handleNextPeriod = () => {
    if (!rangeFrom || !rangeTo) return;
    const span = rangeSpanDays + 1;
    setDateRange({ from: addDays(rangeFrom, span), to: addDays(rangeTo, span) });
    setLocalOverrides(new Map());
  };

  const handleThisWeek = () => {
    setDateRange(getThisWeekRange());
    setLocalOverrides(new Map());
    setCalendarOpen(false);
    setPendingRange(undefined);
  };

  const handleOpenCalendar = () => {
    setPendingRange(dateRange ?? undefined);
    setCalendarOpen(true);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setPendingRange(range);
    if (range?.from && range?.to) {
      setDateRange(range);
      setLocalOverrides(new Map());
      setCalendarOpen(false);
      setPendingRange(undefined);
    }
  };

  const displayLabel = rangeFrom && rangeTo
    ? `${toDateStr(rangeFrom)} → ${toDateStr(rangeTo)}`
    : rangeFrom
    ? `${toDateStr(rangeFrom)} → ...`
    : "Select date range";

  return (
    <AppLayout pageTitle="Roster">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-gray-900">Hybrid Roster</h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Select label="SBU" options={sbuOptions} placeholder="All SBUs" value={selectedSbuId}
              onChange={(e) => { setSelectedSbuId(e.target.value); setSelectedDeptId(""); }} />
          </div>
          <div className="w-48">
            <Select label="Department" options={deptOptions} placeholder="All Departments" value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)} />
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevPeriod} disabled={!rangeFrom}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={handleOpenCalendar}
                className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <CalendarRange className="h-4 w-4 text-gray-400" />
                <span className="min-w-[200px] text-left">{displayLabel}</span>
              </button>

              {calendarOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                  <div className="mb-2 flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleThisWeek}>
                      This Week
                    </Button>
                  </div>
                  <DayPicker
                    mode="range"
                    selected={pendingRange}
                    onSelect={handleRangeSelect}
                    numberOfMonths={2}
                  />
                  {pendingRange?.from && !pendingRange?.to && (
                    <p className="mt-1 text-center text-xs text-gray-400">
                      Select an end date
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={handleThisWeek}>
              This Week
            </Button>

            <Button variant="outline" size="sm" onClick={handleNextPeriod} disabled={!rangeFrom}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isAdmin && (
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={handleAutoGenerate} loading={generateRoster.isPending} disabled={!selectedDeptId}>
                <Wand2 className="h-4 w-4" /> Auto-Generate
              </Button>
              <Button variant="outline" onClick={handleSaveOverrides} loading={overrideRoster.isPending} disabled={localOverrides.size === 0}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
          )}
        </div>

        {/* Warning banner */}
        {belowMinDays && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Warning: One or more days are below the minimum onsite requirement of {minOnsite} employee(s).
            </p>
          </div>
        )}

        {/* Roster Grid */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : employeeMap.size === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                {selectedDeptId
                  ? "No roster entries for this period. Use Auto-Generate to create one."
                  : "Select a department to view the roster."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 min-w-[200px]">
                        Employee
                      </th>
                      {days.map((day) => {
                        const dateStr = toDateStr(day);
                        return (
                          <th key={dateStr} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 min-w-[120px]">
                            <div>{DAY_SHORT[day.getDay()]}</div>
                            <div className="text-[10px] font-normal text-gray-400">{dateStr.substring(5)}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(employeeMap.values()).map((emp) => (
                      <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="sticky left-0 z-10 bg-white px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={emp.name} size="sm" />
                            <span className="font-medium text-gray-900 truncate">{emp.name}</span>
                          </div>
                        </td>
                        {days.map((day) => {
                          const dateStr = toDateStr(day);
                          const dayType = emp.entries.get(dateStr);
                          const attendance = emp.attendance.get(dateStr);
                          const overrideKey = `${emp.id}-${dateStr}`;
                          const isOverridden = localOverrides.has(overrideKey);

                          const attendanceTile = getAttendanceTile(attendance);
                          const workLocation = attendance?.workLocation || dayType;
                          
                          // Determine background style:
                          // 1. If Absent, use Absent style (Red)
                          // 2. If present/late/etc, use WorkLocation style (Green/Blue) from DAY_TYPE_STYLES
                          // 3. If no attendance, use dayType style
                          let bgStyle = "bg-white";
                          let textStyle = "text-gray-400";
                          let label = "-";

                          if (attendanceTile === "absent") {
                            bgStyle = ATTENDANCE_TILE_STYLES.absent.bg;
                            // For absent, we want the text to be red as well, but the pill will handle the status style
                          } else if (workLocation && DAY_TYPE_STYLES[workLocation as RosterDayType]) {
                            // Use location color for cell background
                            const locationStyle = DAY_TYPE_STYLES[workLocation as RosterDayType];
                            bgStyle = locationStyle.bg;
                            // Text style for the cell content that is NOT the pill (like location text)
                            textStyle = locationStyle.text;
                          }
                          
                          // Determine label for the status pill
                          if (attendanceTile) {
                              label = ATTENDANCE_TILE_STYLES[attendanceTile].label;
                          } else if (workLocation && DAY_TYPE_STYLES[workLocation as RosterDayType]) {
                              label = DAY_TYPE_STYLES[workLocation as RosterDayType].label;
                          }

                          const tooltipLines = [
                            dayType ? `Roster: ${dayType}` : null,
                            attendanceTile ? `Status: ${ATTENDANCE_TILE_STYLES[attendanceTile].label}` : null,
                            attendance?.workLocation ? `Work Mode: ${attendance.workLocation}` : null,
                            attendance?.clockInTime  ? `In: ${dayjs(attendance.clockInTime).format("HH:mm")}`  : null,
                            attendance?.clockOutTime ? `Out: ${dayjs(attendance.clockOutTime).format("HH:mm")}` : null,
                          ].filter(Boolean).join("\n");

                          return (
                            <td
                              key={dateStr}
                              className={cn(
                                "px-4 py-3 text-center transition-colors border-l border-gray-100",
                                bgStyle,
                                isAdmin && dayType !== "Leave" && "cursor-pointer hover:brightness-95"
                              )}
                              onClick={() => handleCellClick(emp.id, dateStr)}
                              title={tooltipLines || undefined}
                            >
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                {attendanceTile ? (
                                  <span className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm",
                                    ATTENDANCE_TILE_STYLES[attendanceTile].bg,
                                    ATTENDANCE_TILE_STYLES[attendanceTile].text,
                                    // Special case for Clocked In to ensure it pops
                                    attendanceTile === "clocked_in" && "bg-emerald-600 text-white ring-1 ring-emerald-600",
                                    // Special case for Absent to ensure it pops
                                    attendanceTile === "absent" && "bg-red-100 text-red-700 ring-1 ring-red-200"
                                  )}>
                                    {ATTENDANCE_TILE_STYLES[attendanceTile].label}
                                  </span>
                                ) : (
                                  <span className={cn(
                                    "text-xs font-medium",
                                    textStyle,
                                    isOverridden && "underline decoration-blue-500 decoration-2 underline-offset-4"
                                  )}>
                                    {label}
                                  </span>
                                )}
                                
                                {attendanceTile && attendanceTile !== "absent" && workLocation && (
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-tight opacity-90",
                                     textStyle
                                  )}>
                                    {workLocation}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                        Onsite Count
                      </td>
                      {onsiteCounts.map((count, index) => (
                        <td key={index} className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                            count < minOnsite ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {count}<span className="ml-1 font-normal text-gray-400">/ {minOnsite}</span>
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unified Legend */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase w-20 shrink-0">Schedule:</span>
            {Object.entries(DAY_TYPE_STYLES).map(([type, style]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn("inline-block h-3 w-3 rounded-full", style.bg)} />
                <span className="text-xs text-gray-600">{style.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase w-20 shrink-0">Attendance:</span>
            {Object.entries(ATTENDANCE_TILE_STYLES).map(([type, style]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={cn("inline-block h-3 w-3 rounded-full", style.bg, type === "clocked_in" && "bg-emerald-600")} />
                <span className="text-xs text-gray-600">{style.label}</span>
              </div>
            ))}
          </div>
          {isAdmin && (
            <p className="text-xs text-gray-400 italic">Click cells to toggle Onsite / Remote schedule</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
