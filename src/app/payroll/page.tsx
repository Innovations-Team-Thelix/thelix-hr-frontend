"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Wallet, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import { usePayrollRuns, useCreatePayrollRun } from "@/hooks";
import { formatDate } from "@/lib/utils";
import type { PayrollStatus } from "@/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS: Record<PayrollStatus, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Approved: "bg-blue-100 text-blue-700",
  Sent: "bg-green-100 text-green-700",
};

export default function PayrollPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filters, setFilters] = useState<{ page: number; year?: number }>({ page: 1 });

  const { data: result, isLoading } = usePayrollRuns(filters);
  const createRun = useCreatePayrollRun();

  const handleCreate = async () => {
    try {
      const run = await createRun.mutateAsync({ month, year });
      toast.success("Payroll run created successfully");
      setModalOpen(false);
      if (run) {
        router.push(`/payroll/${(run as any).id}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create payroll run");
    }
  };

  const monthOptions = MONTH_NAMES.map((name, i) => ({
    label: name,
    value: String(i + 1),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    label: String(currentYear - 2 + i),
    value: String(currentYear - 2 + i),
  }));

  return (
    <AppLayout pageTitle="Payroll">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Payroll Runs</h1>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Payroll Run
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !result?.data || result.data.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No payroll runs found. Create your first payroll run.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Payslips</th>
                      <th className="px-4 py-3">Created By</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.data.map((run) => (
                      <tr
                        key={run.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/payroll/${run.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {MONTH_NAMES[run.month - 1]} {run.year}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              STATUS_COLORS[run.status]
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {run._count?.payslips || 0}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {run.createdBy?.fullName}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(run.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {result?.pagination && result.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-500">
                  Page {result.pagination.page} of {result.pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!result.pagination.hasPrevPage}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: f.page - 1 }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!result.pagination.hasNextPage}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: f.page + 1 }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create Payroll Run"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={createRun.isPending}>
                Create
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Select
              label="Month"
              required
              options={monthOptions}
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
            <Select
              label="Year"
              required
              options={yearOptions}
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
