"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import dayjs from "dayjs";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useAuth, useEffectiveRole } from "@/hooks";
import { NEW_HIRE_ROLES, useNewHires, useNewHireCounts } from "@/hooks/useNewHires";
import type { NewHireStatus } from "@/types/new-hires";

const STATUS_LABELS: Record<NewHireStatus, string> = {
  pending: "Pending",
  converted: "Converted",
  dismissed: "Dismissed",
};

export default function NewHiresPage() {
  const router = useRouter();
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole();
  const allowed = !!effectiveRole && NEW_HIRE_ROLES.includes(effectiveRole);
  const [status, setStatus] = useState<NewHireStatus>("pending");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user && !allowed) router.push("/dashboard");
  }, [user, allowed, router]);

  const { data: counts } = useNewHireCounts(allowed);
  const { data, isLoading } = useNewHires(status, page, search.trim());
  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  const tabs = (Object.keys(STATUS_LABELS) as NewHireStatus[]).map((s) => ({
    id: s,
    label: counts ? `${STATUS_LABELS[s]} (${counts[s]})` : STATUS_LABELS[s],
  }));

  return (
    <AppLayout pageTitle="New Hires">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">New Hires</h2>
          <p className="text-sm text-gray-500">
            Candidates hired in Thelix Talent. Complete each one as an employee, or dismiss it.
          </p>
        </div>

        <Tabs
          tabs={tabs}
          activeTab={status}
          onChange={(id) => {
            setStatus(id as NewHireStatus);
            setPage(1);
          }}
        />

        <div className="max-w-sm">
          <Input
            placeholder="Search by name, email or job title"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            prefix={<Search className="h-4 w-4" />}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title={`No ${STATUS_LABELS[status].toLowerCase()} new hires`}
                description={
                  status === "pending"
                    ? "Candidates moved to Hired in Thelix Talent appear here."
                    : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Proposed start</TableHead>
                    <TableHead>{status === "pending" ? "Received" : "Handled"}</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((n) => (
                    <TableRow
                      key={n.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/new-hires/${n.id}`)}
                    >
                      <TableCell>
                        <Link href={`/new-hires/${n.id}`} className="font-medium text-gray-900 hover:text-primary">
                          {n.fullName}
                        </Link>
                        <p className="text-xs text-gray-500">{n.personalEmail}</p>
                      </TableCell>
                      <TableCell>{n.jobTitle}</TableCell>
                      <TableCell>{n.companyName ?? "—"}</TableCell>
                      <TableCell>
                        {n.proposedStartDate ? dayjs(n.proposedStartDate).format("MMM D, YYYY") : "—"}
                      </TableCell>
                      <TableCell>
                        {dayjs(status === "pending" ? n.createdAt : n.handledAt ?? n.updatedAt).format("MMM D, YYYY")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            n.status === "converted" ? "success" : n.status === "dismissed" ? "neutral" : "warning"
                          }
                        >
                          {STATUS_LABELS[n.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {pagination && pagination.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
        )}
      </div>
    </AppLayout>
  );
}
