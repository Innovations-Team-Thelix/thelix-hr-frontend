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
import { Input } from "@/components/ui/input";
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
  usePreviewAttendanceImport,
  useBulkUploadAttendance,
  useBulkApproveAttendance,
  downloadAttendanceTemplate,
  downloadAttendanceExport,
} from "@/hooks/useAttendance";
import { useAuthStore, useEffectiveRole } from "@/hooks";
import { ApprovalStatus, AttendanceRecord, AttendanceImportResult } from "@/types/attendance";
import { Check, X, Clock, ShieldCheck, Upload, Download, FileSpreadsheet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import toast from "react-hot-toast";

import { Pagination } from "@/components/ui/pagination";

type Tab = "Pending" | "Approved" | "Rejected" | "All";

const STATUS_VARIANTS: Record<ApprovalStatus, "warning" | "success" | "danger" | "neutral"> = {
  [ApprovalStatus.Pending]:  "warning",
  [ApprovalStatus.Approved]: "success",
  [ApprovalStatus.Rejected]: "danger",
};

export default function AttendanceApprovalsPage() {
  const { user } = useAuthStore();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";

  const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().endOf("month").format("YYYY-MM-DD"));

  const [activeTab, setActiveTab] = useState<Tab>("Pending");
  const [page, setPage] = useState(1);
  const limit = 10;

  const handleDateChange = (value: string, type: 'start' | 'end') => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
    setPage(1);
  };

  const { data: response, isLoading } = useAttendance({
    startDate,
    endDate,
    approvalStatus: activeTab === "All" ? undefined : (activeTab as ApprovalStatus),
    page,
    limit,
  });

  const attendanceRecords = response?.data || [];
  const pagination = response?.pagination;

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const { mutate: approve, isPending: isApprovePending } = useApproveAttendance();
  const { mutate: override, isPending: isOverridePending } = useOverrideAttendance();
  const bulkApprove = useBulkApproveAttendance();
  const previewImport = usePreviewAttendanceImport();
  const commitImport = useBulkUploadAttendance();

  const canManage = isAdmin || effectiveRole === "SBUHead";

  // Row selection for bulk approve/reject
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pendingIds = attendanceRecords
    .filter((r) => r.approvalStatus === ApprovalStatus.Pending)
    .map((r) => r.id);
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === pendingIds.length ? new Set() : new Set(pendingIds)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkApprove = (status: ApprovalStatus) => {
    if (selectedIds.size === 0) return;
    let rejectionReason: string | undefined;
    if (status === ApprovalStatus.Rejected) {
      rejectionReason = window.prompt("Reason for rejecting the selected records?") || undefined;
      if (!rejectionReason) { toast.error("Rejection reason is required"); return; }
    }
    bulkApprove.mutate(
      { ids: Array.from(selectedIds), status, rejectionReason },
      { onSuccess: clearSelection },
    );
  };

  // Import flow
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<AttendanceImportResult | null>(null);

  const resetImport = () => { setImportFile(null); setImportPreview(null); };

  const handlePreview = () => {
    if (!importFile) return;
    previewImport.mutate(importFile, { onSuccess: (res) => setImportPreview(res) });
  };
  const handleCommit = () => {
    if (!importFile) return;
    commitImport.mutate(importFile, {
      onSuccess: () => { setImportOpen(false); resetImport(); },
    });
  };

  const handleExport = (format: "csv" | "xlsx") => {
    downloadAttendanceExport(format, {
      startDate,
      endDate,
      ...(activeTab !== "All" ? { approvalStatus: activeTab } : {}),
    });
  };

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">Attendance Approvals</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-40">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value, 'start')}
              />
            </div>
            <span className="text-gray-500">to</span>
            <div className="w-40">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange(e.target.value, 'end')}
              />
            </div>
            {canManage && (
              <>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => { resetImport(); setImportOpen(true); }}>
                    <Upload className="h-4 w-4 mr-1" /> Upload
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
                  <Download className="h-4 w-4 mr-1" /> Export
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
            <span className="text-sm text-gray-700">{selectedIds.size} selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={clearSelection}>Clear</Button>
              <Button size="sm" variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                loading={bulkApprove.isPending}
                onClick={() => handleBulkApprove(ApprovalStatus.Rejected)}>
                Reject selected
              </Button>
              <Button size="sm"
                loading={bulkApprove.isPending}
                onClick={() => handleBulkApprove(ApprovalStatus.Approved)}>
                Approve selected
              </Button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-8"><Spinner size="lg" /></div>
            ) : attendanceRecords.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                No {activeTab === "All" ? "" : activeTab.toLowerCase()} attendance records found for the selected period.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canManage && (
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all pending"
                            className="h-4 w-4 rounded border-gray-300 text-primary"
                            checked={pendingIds.length > 0 && selectedIds.size === pendingIds.length}
                            onChange={toggleSelectAll}
                            disabled={pendingIds.length === 0}
                          />
                        </TableHead>
                      )}
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Work Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        {canManage && (
                          <TableCell>
                            {record.approvalStatus === ApprovalStatus.Pending ? (
                              <input
                                type="checkbox"
                                aria-label={`Select ${record.employee?.fullName ?? "record"}`}
                                className="h-4 w-4 rounded border-gray-300 text-primary"
                                checked={selectedIds.has(record.id)}
                                onChange={() => toggleSelect(record.id)}
                              />
                            ) : null}
                          </TableCell>
                        )}
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
                
                {pagination && pagination.totalPages > 1 && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
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

      {/* Import Modal */}
      <Modal isOpen={importOpen} onClose={() => { setImportOpen(false); resetImport(); }} title="Upload Attendance" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a <strong>.xlsx</strong> or <strong>.csv</strong> file. Rows are matched by Employee ID or work email,
            auto-approved, and existing days are updated.
          </p>

          <button
            type="button"
            onClick={() => downloadAttendanceTemplate()}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <FileSpreadsheet className="h-4 w-4" /> Download template
          </button>

          <div className="rounded-lg border border-dashed border-gray-300 p-4">
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportPreview(null); }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
            {importFile && <p className="mt-2 text-xs text-gray-500">{importFile.name}</p>}
          </div>

          {importPreview && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="success">{importPreview.created} to create</Badge>
                <Badge variant="info">{importPreview.updated} to update</Badge>
                {importPreview.errors.length > 0 && (
                  <Badge variant="danger">{importPreview.errors.length} error(s)</Badge>
                )}
              </div>

              {importPreview.errors.length > 0 && (
                <div className="max-h-32 overflow-auto rounded-md border border-red-100 bg-red-50 p-2 text-xs text-red-700">
                  {importPreview.errors.slice(0, 50).map((err, i) => (
                    <div key={i}>Row {err.row}: {err.message}</div>
                  ))}
                </div>
              )}

              {importPreview.preview && importPreview.preview.length > 0 && (
                <div className="max-h-48 overflow-auto rounded-md border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        {Object.keys(importPreview.preview[0]).map((k) => (
                          <th key={k} className="px-2 py-1 text-left font-medium capitalize">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.preview.map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="px-2 py-1 text-gray-700">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setImportOpen(false); resetImport(); }}>Cancel</Button>
            {!importPreview ? (
              <Button onClick={handlePreview} loading={previewImport.isPending} disabled={!importFile}>
                Preview
              </Button>
            ) : (
              <Button onClick={handleCommit} loading={commitImport.isPending}>
                Import {importPreview.created + importPreview.updated} row(s)
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
