"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  useAttendance,
  useApproveAttendance,
  useOverrideAttendance,
} from "@/hooks/useAttendance";
import { useAuthStore } from "@/hooks";
import { ApprovalStatus, AttendanceRecord } from "@/types/attendance";
import { Check, X, Clock, ShieldCheck } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import toast from "react-hot-toast";

type Tab = "Pending" | "Approved" | "Rejected" | "All";

const STATUS_VARIANTS: Record<ApprovalStatus, "warning" | "success" | "danger" | "neutral"> = {
  [ApprovalStatus.Pending]:  "warning",
  [ApprovalStatus.Approved]: "success",
  [ApprovalStatus.Rejected]: "danger",
};

export default function AttendanceApprovalsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "Admin";

  const startDate = dayjs().startOf("month").format("YYYY-MM-DD");
  const endDate   = dayjs().endOf("month").format("YYYY-MM-DD");

  const { data: attendanceRecords, isLoading } = useAttendance({ startDate, endDate });

  const [activeTab, setActiveTab] = useState<Tab>("Pending");

  const filtered = (attendanceRecords ?? []).filter((r) =>
    activeTab === "All" ? true : r.approvalStatus === activeTab
  );

  const { mutate: approve, isPending: isApprovePending } = useApproveAttendance();
  const { mutate: override, isPending: isOverridePending } = useOverrideAttendance();

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen]   = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason]   = useState("");

  // Override modal
  const [overrideModalOpen, setOverrideModalOpen]     = useState(false);
  const [overrideTarget, setOverrideTarget]           = useState<AttendanceRecord | null>(null);
  const [overrideStatus, setOverrideStatus]           = useState("");
  const [overrideApproval, setOverrideApproval]       = useState("");
  const [overrideClockIn, setOverrideClockIn]         = useState("");
  const [overrideClockOut, setOverrideClockOut]       = useState("");
  const [overrideLocation, setOverrideLocation]       = useState("");
  const [overrideReason, setOverrideReason]           = useState("");

  const handleApprove = (id: string) => approve({ id, approved: true });

  const openRejectModal = (id: string) => {
    setSelectedRecordId(id);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleReject = () => {
    if (!selectedRecordId) return;
    if (!rejectionReason.trim()) { toast.error("Please provide a rejection reason"); return; }
    approve(
      { id: selectedRecordId, approved: false, rejectionReason },
      { onSuccess: () => { setRejectModalOpen(false); setSelectedRecordId(null); } }
    );
  };

  const openOverrideModal = (record: AttendanceRecord) => {
    setOverrideTarget(record);
    setOverrideStatus(record.status);
    setOverrideApproval(record.approvalStatus);
    setOverrideClockIn(record.clockInTime ? dayjs(record.clockInTime).format("HH:mm") : "");
    setOverrideClockOut(record.clockOutTime ? dayjs(record.clockOutTime).format("HH:mm") : "");
    setOverrideLocation(record.workLocation);
    setOverrideReason("");
    setOverrideModalOpen(true);
  };

  const handleOverride = () => {
    if (!overrideTarget) return;
    if (!overrideReason.trim()) { toast.error("Override reason is required"); return; }

    const date = dayjs(overrideTarget.date).format("YYYY-MM-DD");
    override(
      {
        id: overrideTarget.id,
        ...(overrideStatus   && { status: overrideStatus }),
        ...(overrideApproval && { approvalStatus: overrideApproval }),
        ...(overrideClockIn  && { clockInTime: `${date}T${overrideClockIn}:00.000Z` }),
        ...(overrideClockOut && { clockOutTime: `${date}T${overrideClockOut}:00.000Z` }),
        ...(overrideLocation && { workLocation: overrideLocation }),
        overrideReason,
      },
      { onSuccess: () => { setOverrideModalOpen(false); setOverrideTarget(null); } }
    );
  };

  const tabs: Tab[] = ["Pending", "Approved", "Rejected", "All"];

  return (
    <AppLayout pageTitle="Attendance Approvals">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-gray-900">Attendance Approvals</h2>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {(attendanceRecords ?? []).filter((r) => r.approvalStatus === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                No {activeTab === "All" ? "" : activeTab.toLowerCase()} attendance records this month.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={record.employee?.fullName || "Unknown"} size="sm" />
                          <div>
                            <div className="font-medium text-gray-900">{record.employee?.fullName}</div>
                            <div className="text-xs text-gray-500">{record.employee?.department?.name || "-"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{dayjs(record.date).format("MMM D, YYYY")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span>In: {record.clockInTime ? dayjs(record.clockInTime).format("HH:mm") : "-"}</span>
                          <span>Out: {record.clockOutTime ? dayjs(record.clockOutTime).format("HH:mm") : "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-600">{record.workLocation}</span>
                      </TableCell>
                      <TableCell>
                        {record.isLate ? <Badge variant="warning">Late</Badge> : <Badge variant="success">On Time</Badge>}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-gray-600">
                        {record.lateReason || record.rejectionReason || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[record.approvalStatus]}>
                          {record.approvalStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {record.approvalStatus === ApprovalStatus.Pending && (
                            <>
                              <Button size="sm" variant="outline"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                                onClick={() => openRejectModal(record.id)} disabled={isApprovePending}>
                                <X className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline"
                                className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
                                onClick={() => handleApprove(record.id)} disabled={isApprovePending}>
                                <Check className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {isAdmin && (
                            <Button size="sm" variant="outline"
                              className="text-purple-600 hover:bg-purple-50 hover:text-purple-700 border-purple-200"
                              onClick={() => openOverrideModal(record)} disabled={isOverridePending}
                              title="HR Override">
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Attendance">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Please provide a reason for rejecting this attendance record.</p>
          <Textarea placeholder="Rejection reason..." value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)} required />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} disabled={isApprovePending}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={isApprovePending}>Reject</Button>
          </div>
        </div>
      </Modal>

      {/* HR Override Modal */}
      <Modal isOpen={overrideModalOpen} onClose={() => setOverrideModalOpen(false)} title="HR Override">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Override attendance for <span className="font-medium text-gray-800">{overrideTarget?.employee?.fullName}</span> on{" "}
            <span className="font-medium text-gray-800">{overrideTarget ? dayjs(overrideTarget.date).format("MMM D, YYYY") : ""}</span>.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              options={[
                { label: "Present",  value: "Present"  },
                { label: "Absent",   value: "Absent"   },
                { label: "Late",     value: "Late"     },
                { label: "On Leave", value: "OnLeave"  },
              ]} />
            <Select label="Approval Status" value={overrideApproval}
              onChange={(e) => setOverrideApproval(e.target.value)}
              options={[
                { label: "Approved", value: "Approved" },
                { label: "Rejected", value: "Rejected" },
              ]} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Clock In</label>
              <input type="time" value={overrideClockIn} onChange={(e) => setOverrideClockIn(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Clock Out</label>
              <input type="time" value={overrideClockOut} onChange={(e) => setOverrideClockOut(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <Select label="Work Location" value={overrideLocation}
            onChange={(e) => setOverrideLocation(e.target.value)}
            options={[
              { label: "Onsite", value: "Onsite" },
              { label: "Remote", value: "Remote" },
            ]} />
          <Textarea label="Override Reason (required)" placeholder="Reason for this correction..."
            value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} required />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOverrideModalOpen(false)} disabled={isOverridePending}>Cancel</Button>
            <Button onClick={handleOverride} loading={isOverridePending}>Apply Override</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
