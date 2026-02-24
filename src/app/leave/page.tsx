"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Plus,
  CalendarDays,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
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
  useLeaveRequests,
  useMyLeaveBalances,
  useCreateLeaveRequest,
  useCancelLeaveRequest,
  useSupervisorAction,
  useHrAction,
  useLeaveTypes,
  useLeaveCalendar,
  useAuthStore,
} from "@/hooks";
import { formatDate, cn } from "@/lib/utils";
import type { LeaveRequestFilters } from "@/types";

const createLeaveSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().optional(),
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
  const isAdmin = user?.role === "Admin";
  const isSBUHead = user?.role === "SBUHead";
  const canApprove = isAdmin || isSBUHead;

  const [activeTab, setActiveTab] = useState("my-requests");
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [myPage, setMyPage] = useState(1);
  const [approvalPage, setApprovalPage] = useState(1);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

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
  const calStartDate = new Date(calendarMonth.year, calendarMonth.month, 1);
  const calEndDate = new Date(calendarMonth.year, calendarMonth.month + 1, 0);
  const { data: calendarData } = useLeaveCalendar({
    startDate: calStartDate.toISOString().split("T")[0],
    endDate: calEndDate.toISOString().split("T")[0],
  });

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

  const tabs = [
    { id: "my-requests", label: "My Requests" },
    ...(canApprove
      ? [{ id: "approval-queue", label: "Approval Queue" }]
      : []),
    { id: "calendar", label: "Calendar" },
  ];

  const handleCreateLeave = async (data: CreateLeaveFormData) => {
    try {
      await createLeave.mutateAsync({
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason || undefined,
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
  const daysInMonth = new Date(
    calendarMonth.year,
    calendarMonth.month + 1,
    0
  ).getDate();
  const firstDayOfWeek =
    new Date(calendarMonth.year, calendarMonth.month, 1).getDay() || 7; // Mon=1

  const calendarDays = useMemo(() => {
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
  }, [daysInMonth, firstDayOfWeek]);

  const getLeaveEntriesForDay = (day: number) => {
    if (!calendarData || day === 0) return [];
    const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarData.filter((entry) => {
      const start = entry.startDate.split("T")[0];
      const end = entry.endDate.split("T")[0];
      return dateStr >= start && dateStr <= end;
    });
  };

  const monthName = new Date(
    calendarMonth.year,
    calendarMonth.month
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const goToPrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setCalendarMonth((prev) => {
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
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                  LEAVE_TYPE_COLORS[
                                    req.leaveType?.name || ""
                                  ] || "bg-gray-100 text-gray-700"
                                )}
                              >
                                {req.leaveType?.name || "Leave"}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(req.startDate)}</TableCell>
                            <TableCell>{formatDate(req.endDate)}</TableCell>
                            <TableCell>{req.daysCount}</TableCell>
                            <TableCell>
                              <StatusBadge status={req.status} />
                            </TableCell>
                            <TableCell>
                              <span className="max-w-[200px] truncate text-sm text-gray-500">
                                {req.reason || "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {req.status === "Pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequestId(req.id);
                                    setCancelDialogOpen(true);
                                  }}
                                >
                                  <X className="h-3.5 w-3.5 text-red-500" />
                                  Cancel
                                </Button>
                              )}
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
                              <div>
                                <p className="font-medium text-gray-900">
                                  {req.employee?.fullName || "Unknown"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {req.employee?.sbu?.name}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                  LEAVE_TYPE_COLORS[
                                    req.leaveType?.name || ""
                                  ] || "bg-gray-100 text-gray-700"
                                )}
                              >
                                {req.leaveType?.name || "Leave"}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(req.startDate)}</TableCell>
                            <TableCell>{formatDate(req.endDate)}</TableCell>
                            <TableCell>{req.daysCount}</TableCell>
                            <TableCell>
                              <span className="max-w-[150px] truncate text-sm text-gray-500">
                                {req.reason || "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleApproveReject(req.id, "Approved")
                                  }
                                  loading={
                                    supervisorAction.isPending ||
                                    hrAction.isPending
                                  }
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleApproveReject(req.id, "Rejected")
                                  }
                                  loading={
                                    supervisorAction.isPending ||
                                    hrAction.isPending
                                  }
                                >
                                  <X className="h-4 w-4 text-red-600" />
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
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle>{monthName}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
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
                                      LEAVE_TYPE_COLORS[entry.leaveTypeName] ||
                                        "bg-gray-100 text-gray-700"
                                    )}
                                    title={`${entry.fullName} - ${entry.leaveTypeName}`}
                                  >
                                    {entry.fullName.split(" ")[0]}
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
                    {Object.entries(LEAVE_TYPE_COLORS).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "h-3 w-3 rounded",
                            color.split(" ")[0]
                          )}
                        />
                        <span className="text-xs text-gray-600">{type}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
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
                variant="outline"
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
          </div>
        </Modal>

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
