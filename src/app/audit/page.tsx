"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, ChevronDown, ChevronRight, Search, Download } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";
import { useAuditLogs, useSbus, useDepartments } from "@/hooks";
import { formatTimestamp, jsonToCsv, downloadFile, cn } from "@/lib/utils";
import type { AuditLog } from "@/types/audit";
import api from "@/lib/api";
import toast from "react-hot-toast";

const ENTITY_TYPES = [
  { label: "All Types", value: "" },
  { label: "Employee", value: "Employee" },
  { label: "Leave Request", value: "LeaveRequest" },
  { label: "Lifecycle Event", value: "LifecycleEvent" },
  { label: "Roster Entry", value: "RosterEntry" },
  { label: "User Account", value: "UserAccount" },
  { label: "Department", value: "Department" },
  { label: "SBU", value: "Sbu" },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { label: "Active", value: "Active" },
  { label: "Suspended", value: "Suspended" },
  { label: "Terminated", value: "Terminated" },
  { label: "Resigned", value: "Resigned" },
];

const ACTION_TYPES = [
  { label: "All Actions", value: "" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Delete", value: "DELETE" },
  { label: "Login", value: "LOGIN" },
  { label: "Approve", value: "APPROVE" },
  { label: "Reject", value: "REJECT" },
];

const ACTION_BADGE_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  LOGIN: "neutral",
  APPROVE: "success",
  REJECT: "danger",
};

export default function AuditPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [sbuId, setSbuId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [actorSearch, setActorSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: sbus = [] } = useSbus();
  const { data: departments = [] } = useDepartments(sbuId || undefined);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "Admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const { data: auditData, isLoading } = useAuditLogs({
    entityType: entityType || undefined,
    action: action || undefined,
    sbuId: sbuId || undefined,
    departmentId: departmentId || undefined,
    employmentStatus: employmentStatus || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit: 20,
  });

  const logs = auditData?.data || [];
  const pagination = auditData?.pagination;

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    setExpandedRow(null);
  }, []);

  const handleClearFilters = () => {
    setEntityType("");
    setAction("");
    setSbuId("");
    setDepartmentId("");
    setEmploymentStatus("");
    setStartDate("");
    setEndDate("");
    setActorSearch("");
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      if (sbuId) params.set("sbuId", sbuId);
      if (departmentId) params.set("departmentId", departmentId);
      if (employmentStatus) params.set("employmentStatus", employmentStatus);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      
      // Fetch all matching logs for export (no pagination or high limit)
      params.set("limit", "1000"); // Reasonable limit for now

      const response = await api.get<AuditLog[]>("/audit-logs", { params });
      const data = response.data;

      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Flatten data for CSV
      const csvData = data.map(log => ({
        Date: formatTimestamp(log.createdAt),
        Actor: log.actor?.fullName || "System",
        Action: log.action,
        Entity: log.entityType,
        "Entity ID": log.entityId,
        Details: log.changes ? JSON.stringify(log.changes) : "",
      }));

      const csvString = jsonToCsv(csvData);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      downloadFile(blob, `audit-logs-${new Date().toISOString().split("T")[0]}.csv`);
      toast.success("Export successful");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export logs");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const formatChanges = (changes: Record<string, unknown> | null) => {
    if (!changes) return "No changes recorded";
    try {
      return JSON.stringify(changes, null, 2);
    } catch {
      return "Unable to parse changes";
    }
  };

  // Filter logs by actor search (client-side since API might not support it)
  const filteredLogs = actorSearch
    ? logs.filter(
        (log) =>
          log.actor?.fullName
            ?.toLowerCase()
            .includes(actorSearch.toLowerCase()) ||
          log.actor?.employeeId
            ?.toLowerCase()
            .includes(actorSearch.toLowerCase()) ||
          log.actorId.toLowerCase().includes(actorSearch.toLowerCase())
      )
    : logs;

  return (
    <AppLayout pageTitle="Audit Logs">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Audit Logs
            </h2>
            <p className="text-sm text-gray-500">
              Track all system activities and changes
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px]">
                <Select
                  label="Entity Type"
                  options={ENTITY_TYPES}
                  value={entityType}
                  onChange={(e) => {
                    setEntityType(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="min-w-[160px]">
                <Select
                  label="Action"
                  options={ACTION_TYPES}
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="min-w-[180px]">
                <Select
                  label="SBU"
                  options={[
                    { label: "All SBUs", value: "" },
                    ...sbus.map((s) => ({ label: s.name, value: s.id })),
                  ]}
                  value={sbuId}
                  onChange={(e) => {
                    setSbuId(e.target.value);
                    setDepartmentId("");
                    setPage(1);
                  }}
                />
              </div>
              <div className="min-w-[180px]">
                <Select
                  label="Department"
                  options={[
                    { label: "All Departments", value: "" },
                    ...departments.map((d) => ({ label: d.name, value: d.id })),
                  ]}
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setPage(1);
                  }}
                  disabled={!sbuId}
                />
              </div>
              <div className="min-w-[180px]">
                <Select
                  label="Employment Status"
                  options={[
                    { label: "All Statuses", value: "" },
                    ...EMPLOYMENT_STATUS_OPTIONS,
                  ]}
                  value={employmentStatus}
                  onChange={(e) => {
                    setEmploymentStatus(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="min-w-[200px] flex-1">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Search Actor
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={actorSearch}
                    onChange={(e) => setActorSearch(e.target.value)}
                    className={cn(
                      "block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm",
                      "placeholder:text-gray-400",
                      "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    )}
                  />
                </div>
              </div>
              <div className="min-w-[150px]">
                <Input
                  label="From Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="min-w-[150px]">
                <Input
                  label="To Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                loading={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell />
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-gray-500"
                    >
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleRow(log.id)}
                      >
                        <TableCell className="w-8">
                          {expandedRow === log.id ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-xs text-gray-600">
                            {formatTimestamp(log.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {log.actor?.fullName || "System"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {log.actor?.employeeId || log.actorId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ACTION_BADGE_VARIANT[log.action.toUpperCase()] ||
                              "neutral"
                            }
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">
                            {log.entityType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-gray-500">
                            {log.entityId.substring(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.changes ? (
                            <Badge variant="info">Has changes</Badge>
                          ) : (
                            <span className="text-xs text-gray-400">
                              -
                            </span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded row */}
                      {expandedRow === log.id && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-gray-50 p-0">
                            <div className="px-6 py-4">
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase">
                                    Full Entity ID
                                  </p>
                                  <p className="mt-0.5 font-mono text-xs text-gray-700 break-all">
                                    {log.entityId}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase">
                                    Actor ID
                                  </p>
                                  <p className="mt-0.5 font-mono text-xs text-gray-700 break-all">
                                    {log.actorId}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase">
                                    IP Address
                                  </p>
                                  <p className="mt-0.5 text-sm text-gray-700">
                                    {log.ipAddress || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-500 uppercase">
                                    User Agent
                                  </p>
                                  <p className="mt-0.5 text-xs text-gray-700 truncate max-w-xs" title={log.userAgent || undefined}>
                                    {log.userAgent || "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                                  Changes
                                </p>
                                <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 font-mono">
                                  {formatChanges(log.changes)}
                                </pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing{" "}
                    {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{" "}
                    of {pagination.total} entries
                  </p>
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
