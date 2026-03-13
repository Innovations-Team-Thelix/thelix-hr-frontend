'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  Plus,
  CalendarDays,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Paperclip,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  useLeaveTypes, useEffectiveRole,
  useAuthStore,
  useMyProfile,
} from "@/hooks";
import {
  useLeaveRequests,
  useMyLeaveBalances,
  useCreateLeaveRequest,
  useLeaveCalendar,
  useCancelLeave as useCancelLeaveRequest,
  useSupervisorAction,
  useHrAction,
} from "@/hooks/useLeave";
import { useEmployees } from "@/hooks/useEmployees";
import { formatDate, cn } from "@/lib/utils";
import type { LeaveRequestFilters, LeaveRequest } from "@/types";
import { ReturnToWorkModal } from "@/components/leave/return-to-work-modal";

const createLeaveSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().optional(),
    relieveOfficerId: z.string().min(1, "Relieve officer is required"),
    attachments: z.any().optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

type CreateLeaveFormData = z.infer<typeof createLeaveSchema>;

const LEAVE_TYPE_COLORS: Record<string, string> = {
  Annual: "bg-blue-100 text-blue-800",
  Sick: "bg-red-100 text-red-800",
  Maternity: "bg-pink-100 text-pink-800",
  Paternity: "bg-indigo-100 text-indigo-800",
  Compassionate: "bg-purple-100 text-purple-800",
  Study: "bg-amber-100 text-amber-800",
};

export default function LeavePage() {
  const { user } = useAuthStore();
  const { data: profile } = useMyProfile();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";
  const isSBUHead = effectiveRole === "SBUHead";
  const isSupervisor = (profile?.subordinates?.length ?? 0) > 0;
  const canApprove = isAdmin || isSBUHead || isSupervisor;
  const isEmployee = effectiveRole === "Employee";
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [activeTab, setActiveTab] = useState("my-requests");
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rtwModalOpen, setRtwModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [myPage, setMyPage] = useState(1);
  const [approvalPage, setApprovalPage] = useState(1);
  const [calendarMonth, setCalendarMonth] = useState<{
    year: number;
    month: number;
  } | null>(null);

  useEffect(() => {
    const now = new Date();
    setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
  }, []);

  const { data: leaveTypes } = useLeaveTypes();
  const { data: myBalances, isLoading: balancesLoading } = useMyLeaveBalances();

  // My requests
  const { data: myRequestsData, isLoading: myRequestsLoading } =
    useLeaveRequests({ page: myPage, limit: 10 });

  // Approval queue (pending requests)
  const { data: pendingData, isLoading: pendingLoading } = useLeaveRequests({
    status: "Pending",
    page: approvalPage,
    limit: 10,
  });

  // Calendar data
  let calStartDate: Date;
  let calEndDate: Date;

  if (isEmployee) {
    calStartDate = selectedDate;
    calEndDate = selectedDate;
  } else {
    calStartDate = calendarMonth
      ? new Date(calendarMonth.year, calendarMonth.month, 1)
      : new Date();
    calEndDate = calendarMonth
      ? new Date(calendarMonth.year, calendarMonth.month + 1, 0)
      : new Date();
  }
  const { data: calendarData } = useLeaveCalendar({
    startDate: calendarMonth ? calStartDate.toISOString().split("T")[0] : undefined,
    endDate: calendarMonth ? calEndDate.toISOString().split("T")[0] : undefined,
  });

  // Fetch potential relieve officers (same SBU)
  const { data: colleaguesData } = useEmployees(
    { 
      sbuId: profile?.sbuId,
      limit: 1000, // Fetch enough employees
      status: 'Active'
    },
    { enabled: !!profile?.sbuId }
  );

  const createLeave = useCreateLeaveRequest();
  const cancelLeave = useCancelLeaveRequest();
  const supervisorAction = useSupervisorAction();
  const hrAction = useHrAction();

  const form = useForm<CreateLeaveFormData>({
    resolver: zodResolver(createLeaveSchema),
  });

  const leaveTypeOptions = (leaveTypes || []).map((lt) => ({
    label: lt.name,
    value: lt.id,
  }));

  const relieveOfficerOptions = (colleaguesData?.data || [])
    .filter(emp => emp.id !== profile?.id) // Exclude self
    .map(emp => ({
      label: emp.fullName,
      value: emp.id,
    }));

  const selectedLeaveTypeId = form.watch("leaveTypeId");
  const selectedLeaveType = leaveTypes?.find(lt => lt.id === selectedLeaveTypeId);

  const tabs = [
    { id: "my-requests", label: "My Requests" },
    ...(canApprove
      ? [{ id: "approval-queue", label: "Approval Queue" }]
      : []),
    { id: "calendar", label: "Calendar" },
  ];

  const handleCreateLeave = async (data: CreateLeaveFormData) => {
    try {
      const attachments = data.attachments && data.attachments.length > 0
        ? Array.from(data.attachments as FileList)
        : undefined;

      await createLeave.mutateAsync({
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason || undefined,
        relieveOfficerId: data.relieveOfficerId,
        attachments,
      });
      toast.success("Leave request submitted successfully");
      setApplyModalOpen(false);
      form.reset();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to submit leave request");
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedRequestId) return;
    try {
      await cancelLeave.mutateAsync(selectedRequestId);
      toast.success("Leave request cancelled");
      setCancelDialogOpen(false);
      setSelectedRequestId(null);
    } catch {
      toast.error("Failed to cancel request");
    }
  };

  const handleApproveReject = async (
    requestId: string,
    action: "Approved" | "Rejected"
  ) => {
    try {
      if (isAdmin) {
        await hrAction.mutateAsync({ id: requestId, action });
      } else {
        await supervisorAction.mutateAsync({ id: requestId, action });
      }
      toast.success(`Leave request ${action.toLowerCase()}`);
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} request`);
    }
  };

  // Calendar helpers
  const daysInMonth = calendarMonth
    ? new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate()
    : 0;
  const firstDayOfWeek = calendarMonth
    ? new Date(calendarMonth.year, calendarMonth.month, 1).getDay() || 7
    : 0; // Mon=1

  const calendarDays = useMemo(() => {
    if (!calendarMonth) return [];
    const days: { date: number; isCurrentMonth: boolean }[] = [];
    // Previous month padding
    for (let i = 1; i < firstDayOfWeek; i++) {
      days.push({ date: 0, isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, isCurrentMonth: true });
    }
    return days;
  }, [daysInMonth, firstDayOfWeek, calendarMonth]);

  const getLeaveEntriesForDay = (day: number) => {
    if (!calendarData || !calendarMonth || day === 0) return [];
    const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarData.filter((entry) => {
      const start = entry.startDate.split("T")[0];
      const end = entry.endDate.split("T")[0];
      return dateStr >= start && dateStr <= end;
    });
  };

  const monthName = calendarMonth
    ? new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      )
    : "";

  const goToPrevMonth = () => {
    setCalendarMonth((prev) => {
      if (!prev) return null;
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setCalendarMonth((prev) => {
      if (!prev) return null;
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  return (
    <AppLayout pageTitle="Leave Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">
              Leave Management
            </h2>
          </div>
          <Button variant="outline" onClick={() => setApplyModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Apply for Leave
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* My Requests Tab */}
            {activeTab === "my-requests" && (
              <Card className="mt-4">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequestsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : !myRequestsData?.data.length ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-8 text-center text-sm text-gray-500"
                          >
                            No leave requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        myRequestsData.data.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span
                                  className={cn(
                                    "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                    LEAVE_TYPE_COLORS[
                                      req.leaveType?.name || ""
                                    ] || "bg-gray-100 text-gray-700"
                                  )}
                                >
                                  {req.leaveType?.name || "Leave"}
                                </span>
                                {req.attachments && req.attachments.length > 0 && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Paperclip className="h-3 w-3" />
                                    {req.attachments.length} attachment(s)
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(req.startDate)}</TableCell>
                            <TableCell>{formatDate(req.endDate)}</TableCell>
                            <TableCell>{req.daysCount}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <StatusBadge status={req.status} />
                                {req.returnedAt && (
                                  <span className="text-[10px] text-success font-medium">
                                    Returned: {formatDate(req.returnedAt)}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="max-w-[200px] truncate text-sm text-gray-500">
                                {req.reason || "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {req.status === "Pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setSelectedRequestId(req.id);
                                      setCancelDialogOpen(true);
                                    }}
                                  >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Cancel
                                  </Button>
                                )}
                                {req.status === "Approved" && !req.returnedAt && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-primary hover:text-primary/80 hover:bg-primary/5"
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setRtwModalOpen(true);
                                    }}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                    Return
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {myRequestsData?.pagination &&
                    myRequestsData.pagination.totalPages > 1 && (
                      <div className="border-t border-gray-100 px-4 py-3">
                        <Pagination
                          currentPage={myPage}
                          totalPages={myRequestsData.pagination.totalPages}
                          onPageChange={setMyPage}
                        />
                      </div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Approval Queue Tab */}
            {activeTab === "approval-queue" && canApprove && (
              <Card className="mt-4">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 7 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : !pendingData?.data.length ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-8 text-center text-sm text-gray-500"
                          >
                            No pending requests
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingData.data.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">
                                  {req.employee?.fullName}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {req.employee?.jobTitle}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span
                                  className={cn(
                                    "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                    LEAVE_TYPE_COLORS[
                                      req.leaveType?.name || ""
                                    ] || "bg-gray-100 text-gray-700"
                                  )}
                                >
                                  {req.leaveType?.name || "Leave"}
                                </span>
                                {req.attachments && req.attachments.length > 0 && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Paperclip className="h-3 w-3" />
                                    {req.attachments.length} attachment(s)
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(req.startDate)}</TableCell>
                            <TableCell>{formatDate(req.endDate)}</TableCell>
                            <TableCell>{req.daysCount}</TableCell>
                            <TableCell>
                              <span className="max-w-[200px] truncate text-sm text-gray-500">
                                {req.reason || "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-success hover:bg-success/10"
                                  onClick={() =>
                                    handleApproveReject(req.id, "Approved")
                                  }
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-danger hover:bg-danger/10"
                                  onClick={() =>
                                    handleApproveReject(req.id, "Rejected")
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {pendingData?.pagination &&
                    pendingData.pagination.totalPages > 1 && (
                      <div className="border-t border-gray-100 px-4 py-3">
                        <Pagination
                          currentPage={approvalPage}
                          totalPages={pendingData.pagination.totalPages}
                          onPageChange={setApprovalPage}
                        />
                      </div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Calendar Tab */}
            {activeTab === "calendar" && (
              <Card className="mt-4">
                {isEmployee ? (
                  <>
<CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">
                      {dayjs(selectedDate).format("MMMM D, YYYY")}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const prev = new Date(selectedDate);
                          prev.setDate(prev.getDate() - 1);
                          setSelectedDate(prev);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDate(new Date())}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = new Date(selectedDate);
                          next.setDate(next.getDate() + 1);
                          setSelectedDate(next);
                        }}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>

                    <CardContent>
                      {(!calendarData || calendarData.length === 0) ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                          <CalendarDays className="h-12 w-12 text-gray-300 mb-3" />
                          <p className="text-lg font-medium">No leaves found</p>
                          <p className="text-sm">No one is on leave for this date.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {calendarData.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                  {entry.employee.fullName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium">{entry.employee.fullName}</p>
                                  <p className="text-sm text-gray-500">
                                    {entry.employee.jobTitle} • {entry.employee.department?.name || "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="neutral" className="mb-1">
                                  {entry.leaveType.name}
                                </Badge>
                                <p className="text-sm text-gray-600">
                                  Returns: <span className="font-medium">{dayjs(entry.endDate).format("MMM D, YYYY")}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </>
                ) : (
                  <>
<CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-medium">
                    {monthName}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
                    {/* Day headers */}
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day) => (
                        <div
                          key={day}
                          className="bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-500"
                        >
                          {day}
                        </div>
                      )
                    )}
                    {/* Calendar cells */}
                    {calendarDays.map((day, index) => {
                      const entries = getLeaveEntriesForDay(day.date);
                      return (
                        <div
                          key={index}
                          className={cn(
                            "min-h-[80px] bg-white p-1",
                            !day.isCurrentMonth && "bg-gray-50"
                          )}
                        >
                          {day.isCurrentMonth && (
                            <>
                              <span className="text-xs font-medium text-gray-600">
                                {day.date}
                              </span>
                              <div className="mt-1 space-y-0.5">
                                {entries.slice(0, 3).map((entry, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                                      LEAVE_TYPE_COLORS[
                                        entry.leaveType.name
                                      ] || "bg-gray-100 text-gray-700"
                                    )}
                                    title={`${entry.employee.fullName} - ${entry.leaveType.name}`}
                                  >
                                    {entry.employee.fullName.split(" ")[0]}
                                  </div>
                                ))}
                                {entries.length > 3 && (
                                  <div className="text-[10px] text-gray-400 pl-1">
                                    +{entries.length - 3} more
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {Object.entries(LEAVE_TYPE_COLORS).map(
                      ([type, color]) => (
                        <div
                          key={type}
                          className="flex items-center gap-1.5"
                        >
                          <div
                            className={cn(
                              "h-3 w-3 rounded",
                              color.split(" ")[0]
                            )}
                          />
                          <span className="text-xs text-gray-600">
                            {type}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
                  </>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar: Leave Balances */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leave Balances</CardTitle>
              </CardHeader>
              <CardContent>
                {balancesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : !myBalances?.length ? (
                  <p className="text-sm text-gray-500">
                    No balances available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {myBalances.map((balance) => {
                      const remaining =
                        balance.totalDays - balance.usedDays;
                      const pct =
                        balance.totalDays > 0
                          ? (balance.usedDays / balance.totalDays) * 100
                          : 0;
                      return (
                        <div key={balance.id}>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">
                              {balance.leaveType?.name || "Leave"}
                            </span>
                            <span className="text-gray-500">
                              {remaining}d left
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                pct > 80
                                  ? "bg-red-500"
                                  : pct > 50
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                )}
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-0.5 text-[11px] text-gray-400">
                            {balance.usedDays} used of {balance.totalDays}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Apply for Leave Modal */}
        <Modal
          isOpen={applyModalOpen}
          onClose={() => {
            setApplyModalOpen(false);
            form.reset();
          }}
          title="Apply for Leave"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setApplyModalOpen(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(handleCreateLeave)}
                loading={createLeave.isPending}
              >
                Submit Request
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Select
              label="Leave Type"
              required
              options={leaveTypeOptions}
              placeholder="Select leave type"
              error={form.formState.errors.leaveTypeId?.message}
              {...form.register("leaveTypeId")}
            />
            <Input
              label="Start Date"
              type="date"
              required
              error={form.formState.errors.startDate?.message}
              {...form.register("startDate")}
            />
            <Input
              label="End Date"
              type="date"
              required
              error={form.formState.errors.endDate?.message}
              {...form.register("endDate")}
            />
            <Textarea
              label="Reason (optional)"
              rows={3}
              placeholder="Please provide a reason for your leave..."
              {...form.register("reason")}
            />

            <Select
              label="Relieve Officer"
              required
              options={relieveOfficerOptions}
              placeholder="Select a relieve officer"
              error={form.formState.errors.relieveOfficerId?.message}
              {...form.register("relieveOfficerId")}
            />
            
            <div className="w-full">
              <label
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Attachments {selectedLeaveType?.requiresDoc && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                multiple
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
                {...form.register("attachments")}
              />
              <p className="mt-1 text-xs text-gray-500">
                {selectedLeaveType?.requiresDoc 
                  ? "This leave type requires supporting documents." 
                  : "Upload any supporting documents (optional)."}
              </p>
            </div>
          </div>
        </Modal>

        {/* Return to Work Modal */}
        {selectedRequest && (
          <ReturnToWorkModal
            isOpen={rtwModalOpen}
            onClose={() => {
              setRtwModalOpen(false);
              setSelectedRequest(null);
            }}
            leaveRequestId={selectedRequest.id}
            expectedReturnDate={selectedRequest.endDate}
          />
        )}

        {/* Cancel Confirmation */}
        <ConfirmDialog
          isOpen={cancelDialogOpen}
          onClose={() => {
            setCancelDialogOpen(false);
            setSelectedRequestId(null);
          }}
          onConfirm={handleCancelRequest}
          title="Cancel Leave Request"
          message="Are you sure you want to cancel this leave request? This action cannot be undone."
          confirmLabel="Cancel Request"
          variant="danger"
          loading={cancelLeave.isPending}
        />
      </div>
    </AppLayout>
  );
}

