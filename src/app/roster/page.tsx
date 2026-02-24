"use client";

import React, { useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Wand2,
  Save,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import { Avatar } from "@/components/ui/avatar";
import {
  useRoster,
  useGenerateRoster,
  useOverrideRoster,
  useSbus,
  useDepartments,
  useAuthStore,
} from "@/hooks";
import { cn } from "@/lib/utils";
import type { RosterEntry, RosterDayType } from "@/types";

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

const DAY_TYPE_STYLES: Record<RosterDayType, { bg: string; text: string; label: string }> = {
  Onsite: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Onsite" },
  Remote: { bg: "bg-blue-100", text: "text-blue-700", label: "Remote" },
  Leave: { bg: "bg-amber-100", text: "text-amber-700", label: "Leave" },
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function RosterPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "Admin";

  const [selectedSbuId, setSelectedSbuId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [localOverrides, setLocalOverrides] = useState<
    Map<string, RosterDayType>
  >(new Map());

  const { data: sbus } = useSbus();
  const { data: departments } = useDepartments(selectedSbuId || undefined);

  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart]);

  const { data: rosterEntries, isLoading } = useRoster({
    departmentId: selectedDeptId || undefined,
    sbuId: selectedSbuId || undefined,
    startDate: toDateStr(weekStart),
    endDate: toDateStr(weekEnd),
  });

  const generateRoster = useGenerateRoster();
  const overrideRoster = useOverrideRoster();

  // Get selected department min_onsite
  const selectedDept = departments?.find((d) => d.id === selectedDeptId);
  const minOnsite = selectedDept?.minOnsite ?? 1;

  // Group entries by employee
  const employeeMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        entries: Map<string, RosterDayType>;
      }
    >();

    if (!rosterEntries) return map;

    rosterEntries.forEach((entry) => {
      const empId = entry.employeeId;
      if (!map.has(empId)) {
        map.set(empId, {
          id: empId,
          name: entry.employee?.fullName || "Unknown",
          entries: new Map(),
        });
      }
      const dateKey = entry.date.split("T")[0];
      // Check for local override
      const overrideKey = `${empId}-${dateKey}`;
      if (localOverrides.has(overrideKey)) {
        map.get(empId)!.entries.set(dateKey, localOverrides.get(overrideKey)!);
      } else {
        map.get(empId)!.entries.set(dateKey, entry.dayType);
      }
    });

    return map;
  }, [rosterEntries, localOverrides]);

  // Count onsite per day
  const onsiteCounts = useMemo(() => {
    const counts: number[] = [0, 0, 0, 0, 0];
    employeeMap.forEach((emp) => {
      DAY_NAMES.forEach((_, index) => {
        const dateStr = toDateStr(addDays(weekStart, index));
        const type = emp.entries.get(dateStr);
        if (type === "Onsite") counts[index]++;
      });
    });
    return counts;
  }, [employeeMap, weekStart]);

  const belowMinDays = onsiteCounts.some(
    (count) => count < minOnsite && employeeMap.size > 0
  );

  const sbuOptions = (sbus || []).map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const deptOptions = (departments || []).map((d) => ({
    label: d.name,
    value: d.id,
  }));

  const handleCellClick = (employeeId: string, dateStr: string) => {
    if (!isAdmin) return;

    const overrideKey = `${employeeId}-${dateStr}`;
    const current =
      localOverrides.get(overrideKey) ||
      employeeMap.get(employeeId)?.entries.get(dateStr);

    // Toggle: Onsite -> Remote -> Onsite
    if (current === "Leave") return; // Can't override leave days
    const newType: RosterDayType =
      current === "Onsite" ? "Remote" : "Onsite";

    setLocalOverrides((prev) => {
      const next = new Map(prev);
      next.set(overrideKey, newType);
      return next;
    });
  };

  const handleAutoGenerate = async () => {
    if (!selectedDeptId) {
      toast.error("Please select a department first");
      return;
    }

    try {
      await generateRoster.mutateAsync({
        departmentId: selectedDeptId,
        startDate: toDateStr(weekStart),
        endDate: toDateStr(weekEnd),
      });
      toast.success("Roster generated successfully");
      setLocalOverrides(new Map());
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to generate roster");
    }
  };

  const handleSaveOverrides = async () => {
    if (localOverrides.size === 0) {
      toast.error("No changes to save");
      return;
    }

    try {
      const promises = Array.from(localOverrides.entries()).map(
        ([key, dayType]) => {
          const [employeeId, date] = key.split("-", 2);
          const fullDate = key.substring(employeeId.length + 1);
          return overrideRoster.mutateAsync({
            employeeId,
            date: fullDate,
            dayType: dayType as "Onsite" | "Remote",
          });
        }
      );

      await Promise.all(promises);
      toast.success("Roster overrides saved successfully");
      setLocalOverrides(new Map());
    } catch {
      toast.error("Failed to save some overrides");
    }
  };

  const handlePrevWeek = () => {
    setWeekStart((prev) => addDays(prev, -7));
    setLocalOverrides(new Map());
  };

  const handleNextWeek = () => {
    setWeekStart((prev) => addDays(prev, 7));
    setLocalOverrides(new Map());
  };

  const handleThisWeek = () => {
    setWeekStart(getMonday(new Date()));
    setLocalOverrides(new Map());
  };

  return (
    <AppLayout pageTitle="Roster">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-gray-900">
            Hybrid Roster
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Select
              label="SBU"
              options={sbuOptions}
              placeholder="All SBUs"
              value={selectedSbuId}
              onChange={(e) => {
                setSelectedSbuId(e.target.value);
                setSelectedDeptId("");
              }}
            />
          </div>
          <div className="w-48">
            <Select
              label="Department"
              options={deptOptions}
              placeholder="All Departments"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleThisWeek}>
              This Week
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm font-medium text-gray-600">
            {toDateStr(weekStart)} to {toDateStr(weekEnd)}
          </span>
          {isAdmin && (
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleAutoGenerate}
                loading={generateRoster.isPending}
                disabled={!selectedDeptId}
              >
                <Wand2 className="h-4 w-4" />
                Auto-Generate
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveOverrides}
                loading={overrideRoster.isPending}
                disabled={localOverrides.size === 0}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          )}
        </div>

        {/* Warning banner */}
        {belowMinDays && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Warning: One or more days are below the minimum onsite requirement
              of {minOnsite} employee(s).
            </p>
          </div>
        )}

        {/* Roster Grid */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
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
                      {DAY_NAMES.map((day, index) => {
                        const dateStr = toDateStr(addDays(weekStart, index));
                        return (
                          <th
                            key={day}
                            className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 min-w-[120px]"
                          >
                            <div>{day}</div>
                            <div className="text-[10px] font-normal text-gray-400">
                              {dateStr.substring(5)}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(employeeMap.values()).map((emp) => (
                      <tr
                        key={emp.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50"
                      >
                        <td className="sticky left-0 z-10 bg-white px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={emp.name} size="sm" />
                            <span className="font-medium text-gray-900 truncate">
                              {emp.name}
                            </span>
                          </div>
                        </td>
                        {DAY_NAMES.map((_, index) => {
                          const dateStr = toDateStr(addDays(weekStart, index));
                          const dayType = emp.entries.get(dateStr);
                          const overrideKey = `${emp.id}-${dateStr}`;
                          const isOverridden = localOverrides.has(overrideKey);
                          const style = dayType
                            ? DAY_TYPE_STYLES[dayType]
                            : null;

                          return (
                            <td
                              key={index}
                              className={cn(
                                "px-4 py-3 text-center",
                                isAdmin &&
                                  dayType !== "Leave" &&
                                  "cursor-pointer hover:bg-gray-100"
                              )}
                              onClick={() =>
                                handleCellClick(emp.id, dateStr)
                              }
                            >
                              {style ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                                    style.bg,
                                    style.text,
                                    isOverridden &&
                                      "ring-2 ring-blue-400 ring-offset-1"
                                  )}
                                >
                                  {style.label}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer: Onsite count */}
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                        Onsite Count
                      </td>
                      {onsiteCounts.map((count, index) => (
                        <td
                          key={index}
                          className="px-4 py-3 text-center"
                        >
                          <span
                            className={cn(
                              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                              count < minOnsite
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            )}
                          >
                            {count}
                            <span className="ml-1 font-normal text-gray-400">
                              / {minOnsite}
                            </span>
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

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-medium text-gray-500 uppercase">
            Legend:
          </span>
          {Object.entries(DAY_TYPE_STYLES).map(([type, style]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block h-3 w-3 rounded",
                  style.bg
                )}
              />
              <span className="text-xs text-gray-600">{style.label}</span>
            </div>
          ))}
          {isAdmin && (
            <span className="text-xs text-gray-400 italic ml-2">
              Click cells to toggle Onsite/Remote
            </span>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
