"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Upload,
  Plus,
  Check,
  Send,
  Download,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import {
  usePayrollRun,
  useUploadPayslips,
  useCreatePayslip,
  useApprovePayroll,
  useSendPayroll,
  useAllEmployees,
  useAuthStore, useEffectiveRole,
} from "@/hooks";
import { formatDate } from "@/lib/utils";
import type { PayrollStatus, Payslip } from "@/types";
import { generatePayslipPdf } from "@/lib/pdf-utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS: Record<PayrollStatus, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Approved: "bg-blue-100 text-blue-700",
  Sent: "bg-green-100 text-green-700",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const payslipSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  basicSalary: z.coerce.number().min(0, "Basic salary must be positive"),
  allowances: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
});

type PayslipFormData = z.infer<typeof payslipSchema>;

export default function PayrollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";
  const payrollRunId = params.id as string;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { data: run, isLoading } = usePayrollRun(payrollRunId);
  const { data: allEmployees } = useAllEmployees();
  
  const filteredEmployees = allEmployees?.filter((emp) =>
    emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const uploadPayslips = useUploadPayslips();
  const createPayslip = useCreatePayslip();
  const approvePayroll = useApprovePayroll();
  const sendPayroll = useSendPayroll();

  const form = useForm<PayslipFormData>({
    resolver: zodResolver(payslipSchema),
    defaultValues: { allowances: 0, deductions: 0 },
  });

  const handleAddPayslip = async (data: PayslipFormData) => {
    try {
      await createPayslip.mutateAsync({ payrollRunId, data });
      toast.success("Payslip added successfully");
      setAddModalOpen(false);
      form.reset({ allowances: 0, deductions: 0 });
      setEmployeeSearch("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add payslip");
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await uploadPayslips.mutateAsync({ payrollRunId, data: formData });
      toast.success("Payslips uploaded successfully");
      setUploadModalOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload payslips");
    }
  };

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this payroll run?")) return;
    try {
      await approvePayroll.mutateAsync(payrollRunId);
      toast.success("Payroll run approved");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve");
    }
  };

  const handleSend = async () => {
    if (!confirm("This will send payslip emails to all employees. Continue?")) return;
    try {
      await sendPayroll.mutateAsync(payrollRunId);
      toast.success("Payslips sent to employees");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send payslips");
    }
  };

  const handleDownloadPdf = async (payslip: Payslip) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await fetch(`${API_URL}/payslips/${payslip.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data?.signedUrl) {
        const a = document.createElement("a");
        a.href = json.data.signedUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      } else {
        throw new Error("Failed to get download link");
      }
    } catch (err) {
      console.warn("Backend PDF generation failed, falling back to client-side", err);
      if (run) {
        try {
          generatePayslipPdf(payslip, run.month, run.year);
          toast.success("PDF generated successfully");
        } catch (clientErr) {
          console.error("Client-side PDF generation failed", clientErr);
          toast.error("Failed to download PDF");
        }
      }
    }
  };

  const formatCurrency = (amount: number) =>
    Number(amount).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (isLoading) {
    return (
      <AppLayout pageTitle="Payroll Run">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" variant="rectangular" />
        </div>
      </AppLayout>
    );
  }

  if (!run) {
    return (
      <AppLayout pageTitle="Payroll Run Not Found">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-gray-500">Payroll run not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/payroll")}>
            Back to Payroll
          </Button>
        </div>
      </AppLayout>
    );
  }

  const monthName = MONTH_NAMES[run.month - 1];

  return (
    <AppLayout pageTitle={`${monthName} ${run.year} Payroll`}>
      <div className="space-y-6">
        {/* Back + Header */}
        <Button variant="ghost" size="sm" onClick={() => router.push("/payroll")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Payroll
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {monthName} {run.year}
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STATUS_COLORS[run.status]
                }`}
              >
                {run.status}
              </span>
              <span className="text-sm text-gray-500">
                {run.payslips?.length || 0} payslips
              </span>
              {run.createdBy && (
                <span className="text-sm text-gray-500">
                  Created by {run.createdBy.fullName}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {run.status === "Draft" && (
              <>
                <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Bulk Upload
                </Button>
                <Button variant="outline" onClick={() => setAddModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Payslip
                </Button>
                {isAdmin && (
                  <Button onClick={handleApprove} loading={approvePayroll.isPending}>
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                )}
              </>
            )}
            {run.status === "Approved" && (
              <Button onClick={handleSend} loading={sendPayroll.isPending}>
                <Send className="h-4 w-4" />
                Send Payslips
              </Button>
            )}
          </div>
        </div>

        {/* Payslips Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            {!run.payslips || run.payslips.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No payslips yet. Add individual payslips or use bulk upload.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3 text-right">Basic Salary</th>
                      <th className="px-4 py-3 text-right">Allowances</th>
                      <th className="px-4 py-3 text-right">Deductions</th>
                      <th className="px-4 py-3 text-right">Net Pay</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {run.payslips.map((payslip) => (
                      <tr key={payslip.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {payslip.employee?.fullName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payslip.employee?.employeeId} - {payslip.employee?.jobTitle}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(payslip.basicSalary)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(payslip.allowances)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          ({formatCurrency(payslip.deductions)})
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(payslip.netPay)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPdf(payslip);
                            }}
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(
                          run.payslips.reduce((s, p) => s + Number(p.basicSalary), 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(
                          run.payslips.reduce((s, p) => s + Number(p.allowances), 0)
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        ({formatCurrency(
                          run.payslips.reduce((s, p) => s + Number(p.deductions), 0)
                        )})
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(
                          run.payslips.reduce((s, p) => s + Number(p.netPay), 0)
                        )}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Payslip Modal */}
        <Modal
          isOpen={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            form.reset({ allowances: 0, deductions: 0 });
            setEmployeeSearch("");
          }}
          title="Add Payslip"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(handleAddPayslip)}
                loading={createPayslip.isPending}
              >
                Add Payslip
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Employee *
              </label>
              <Input
                placeholder="Search employee..."
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              />
              {isDropdownOpen && filteredEmployees && filteredEmployees.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      onMouseDown={() => {
                        form.setValue("employeeId", emp.id);
                        setEmployeeSearch(emp.fullName);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <span className="font-medium">{emp.fullName}</span>
                      <span className="ml-2 text-gray-500">{emp.employeeId}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.formState.errors.employeeId && (
                <p className="mt-1 text-sm text-red-600">
                  {form.formState.errors.employeeId.message}
                </p>
              )}
            </div>
            <Input
              label="Basic Salary"
              type="number"
              step="0.01"
              required
              error={form.formState.errors.basicSalary?.message}
              {...form.register("basicSalary")}
            />
            <Input
              label="Allowances"
              type="number"
              step="0.01"
              error={form.formState.errors.allowances?.message}
              {...form.register("allowances")}
            />
            <Input
              label="Deductions"
              type="number"
              step="0.01"
              error={form.formState.errors.deductions?.message}
              {...form.register("deductions")}
            />
          </div>
        </Modal>

        {/* Bulk Upload Modal */}
        <Modal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedFile(null);
          }}
          title="Bulk Upload Payslips"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkUpload}
                loading={uploadPayslips.isPending}
                disabled={!selectedFile}
              >
                Upload
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload an Excel file (.xlsx) with the following columns:
            </p>
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium">Column A: Employee Email</p>
              <p className="font-medium">Column B: Basic Salary</p>
              <p className="font-medium">Column C: Allowances</p>
              <p className="font-medium">Column D: Deductions</p>
            </div>
            <div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Choose Excel file
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-500">{selectedFile.name}</p>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
