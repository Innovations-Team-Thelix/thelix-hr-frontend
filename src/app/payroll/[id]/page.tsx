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
  Download,
  RefreshCw,
  Send,
  X,
  CircleDollarSign,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  usePayrollRun,
  useUploadPayslips,
  useCreatePayslip,
  useEmployeeSalaryDefaults,
  usePopulatePayrollRun,
  useSubmitPayroll,
  useApproveFinance,
  useApproveCvo,
  useRejectPayroll,
  useDisbursePayroll,
  useCancelPayrollRun,
  useDeletePayslip,
  useAllEmployees,
  useEffectiveRole,
} from "@/hooks";
import { formatDate } from "@/lib/utils";
import type {
  PayrollStatus,
  Payslip,
  PayslipPaymentStatus,
} from "@/types";
import { generatePayslipPdf } from "@/lib/pdf-utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS: Record<PayrollStatus, string> = {
  Draft: "bg-gray-100 text-gray-700",
  PendingFinance: "bg-amber-100 text-amber-700",
  PendingCVO: "bg-purple-100 text-purple-700",
  Approved: "bg-blue-100 text-blue-700",
  Disbursing: "bg-indigo-100 text-indigo-700",
  Sent: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<PayrollStatus, string> = {
  Draft: "Draft",
  PendingFinance: "Pending Finance",
  PendingCVO: "Pending CVO",
  Approved: "Approved",
  Disbursing: "Disbursing",
  Sent: "Sent",
  Rejected: "Rejected",
};

const PAY_STATUS_COLORS: Record<PayslipPaymentStatus, string> = {
  Pending: "bg-gray-100 text-gray-700",
  Processing: "bg-amber-100 text-amber-700",
  Paid: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const allowanceItemSchema = z.object({
  name: z.string(),
  amount: z.coerce.number().min(0),
});

const payslipSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  basicSalary: z.coerce.number().min(0, "Basic salary must be positive"),
  housing: z.coerce.number().min(0).default(0),
  transport: z.coerce.number().min(0).default(0),
  wardrobe: z.coerce.number().min(0).default(0),
  meal: z.coerce.number().min(0).default(0),
  utility: z.coerce.number().min(0).default(0),
  otherAllowances: z.array(allowanceItemSchema).default([]),
  deductions: z.array(allowanceItemSchema).default([]),
  netPay40: z.coerce.number().min(0).default(0),
  nhfOptIn: z.boolean().default(false),
});

type PayslipFormData = z.infer<typeof payslipSchema>;

const formatCurrency = (amount: number | string) =>
  Number(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PayrollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";
  const isFinance = effectiveRole === "Finance";
  const payrollRunId = params.id as string;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [deletePayslipTarget, setDeletePayslipTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [genericConfirm, setGenericConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant?: "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    created: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);

  const { data: run, isLoading } = usePayrollRun(payrollRunId);
  const { data: allEmployees } = useAllEmployees();
  const { data: salaryDefaults } = useEmployeeSalaryDefaults(selectedEmployeeId);

  const filteredEmployees = allEmployees?.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()),
  );

  const uploadPayslips = useUploadPayslips();
  const createPayslip = useCreatePayslip();
  const populateRun = usePopulatePayrollRun();
  const submitRun = useSubmitPayroll();
  const approveFinance = useApproveFinance();
  const approveCvo = useApproveCvo();
  const rejectRun = useRejectPayroll();
  const disburseRun = useDisbursePayroll();
  const cancelRun = useCancelPayrollRun();
  const deletePayslip = useDeletePayslip();

  const handleDeletePayslip = async () => {
    if (!deletePayslipTarget) return;
    try {
      await deletePayslip.mutateAsync({ payrollRunId, payslipId: deletePayslipTarget.id });
      toast.success("Payslip removed");
      setDeletePayslipTarget(null);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete payslip");
    }
  };

  const form = useForm<PayslipFormData>({
    resolver: zodResolver(payslipSchema),
    defaultValues: {
      basicSalary: 0, housing: 0, transport: 0, wardrobe: 0, meal: 0, utility: 0,
      otherAllowances: [], deductions: [], netPay40: 0, nhfOptIn: false,
    },
  });

  // Auto-populate form when salary defaults load for the selected employee
  React.useEffect(() => {
    if (!salaryDefaults) return;
    const find = (name: string) =>
      salaryDefaults.allowances.find((a) => a.name.toLowerCase().includes(name))?.amount ?? 0;
    form.setValue("basicSalary", salaryDefaults.basicSalary);
    form.setValue("housing", find("housing"));
    form.setValue("transport", find("transport"));
    form.setValue("wardrobe", find("wardrobe"));
    form.setValue("meal", find("meal"));
    form.setValue("utility", find("utility"));
    const known = ["housing", "transport", "wardrobe", "meal", "utility"];
    const others = salaryDefaults.allowances.filter(
      (a) => !known.some((k) => a.name.toLowerCase().includes(k)),
    );
    form.setValue("otherAllowances", others);
    form.setValue("deductions", salaryDefaults.deductions);
  }, [salaryDefaults, form]);

  const handleAddPayslip = async (data: PayslipFormData) => {
    const allowances = [
      { name: "Housing", amount: data.housing },
      { name: "Transport", amount: data.transport },
      { name: "Wardrobe", amount: data.wardrobe },
      { name: "Meal", amount: data.meal },
      { name: "Utility", amount: data.utility },
      ...data.otherAllowances,
    ].filter((a) => a.amount > 0);

    try {
      await createPayslip.mutateAsync({
        payrollRunId,
        data: {
          employeeId: data.employeeId,
          basicSalary: data.basicSalary,
          allowances,
          deductions: data.deductions,
          netPay40: data.netPay40,
          nhfOptIn: data.nhfOptIn,
        },
      });
      toast.success("Payslip added successfully");
      setAddModalOpen(false);
      setSelectedEmployeeId(null);
      setEmployeeSearch("");
      form.reset({
        basicSalary: 0, housing: 0, transport: 0, wardrobe: 0, meal: 0, utility: 0,
        otherAllowances: [], deductions: [], netPay40: 0, nhfOptIn: false,
      });
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to add payslip");
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const res = await uploadPayslips.mutateAsync({ payrollRunId, data: formData });
      setBulkResult(res as { created: number; errors: Array<{ row: number; message: string }> });
      toast.success(`Uploaded: ${(res as { created: number }).created} created`);
      setUploadModalOpen(false);
      setSelectedFile(null);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to upload payslips");
    }
  };

  const handlePopulate = () => {
    setGenericConfirm({
      title: "Auto-populate payslips",
      message: "This will generate payslips for all active employees using their current salary structure. Existing payslips for this run will be updated.",
      confirmLabel: "Auto-populate",
      variant: "primary",
      onConfirm: async () => {
        setGenericConfirm(null);
        try {
          const res = await populateRun.mutateAsync(payrollRunId);
          const r = res as { populated: number; skipped: Array<{ fullName: string; reason: string }> };
          toast.success(`Populated ${r.populated} payslip(s)`);
          if (r.skipped.length > 0) {
            toast(
              `${r.skipped.length} skipped: ${r.skipped.slice(0, 3).map((s) => s.fullName).join(", ")}${r.skipped.length > 3 ? "…" : ""}`,
              { icon: "⚠️" },
            );
          }
        } catch (err) {
          const e = err as { response?: { data?: { message?: string } } };
          toast.error(e?.response?.data?.message || "Failed to populate");
        }
      },
    });
  };

  const handleSubmit = () => {
    setGenericConfirm({
      title: "Submit for Finance approval",
      message: "This will lock the run from further edits and send it to Finance for review. You will not be able to add or remove payslips until it is rejected back to Draft.",
      confirmLabel: "Submit",
      variant: "primary",
      onConfirm: async () => {
        setGenericConfirm(null);
        try {
          await submitRun.mutateAsync(payrollRunId);
          toast.success("Submitted for Finance approval");
        } catch (err) {
          const e = err as { response?: { data?: { message?: string } } };
          toast.error(e?.response?.data?.message || "Failed to submit");
        }
      },
    });
  };

  const handleApproveFinance = () => {
    setGenericConfirm({
      title: "Approve as Finance",
      message: "Confirming Finance approval will forward this payroll run to the CVO for final sign-off.",
      confirmLabel: "Approve",
      variant: "primary",
      onConfirm: async () => {
        setGenericConfirm(null);
        try {
          await approveFinance.mutateAsync(payrollRunId);
          toast.success("Finance approval recorded");
        } catch (err) {
          const e = err as { response?: { data?: { message?: string } } };
          toast.error(e?.response?.data?.message || "Failed to approve");
        }
      },
    });
  };

  const handleApproveCvo = () => {
    setGenericConfirm({
      title: "CVO final approval",
      message: "This is the final approval stage. After CVO sign-off, the payroll run will be ready to disburse to employees.",
      confirmLabel: "Approve",
      variant: "primary",
      onConfirm: async () => {
        setGenericConfirm(null);
        try {
          await approveCvo.mutateAsync(payrollRunId);
          toast.success("CVO approval recorded");
        } catch (err) {
          const e = err as { response?: { data?: { message?: string } } };
          toast.error(e?.response?.data?.message || "Failed to approve");
        }
      },
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    try {
      await rejectRun.mutateAsync({ id: payrollRunId, reason: rejectReason });
      toast.success("Run rejected and returned to Draft");
      setRejectModalOpen(false);
      setRejectReason("");
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to reject");
    }
  };

  const handleDisburse = async () => {
    try {
      const res = await disburseRun.mutateAsync(payrollRunId);
      const r = res as { initiated: number; failedToInitiate: Array<{ reason: string }> };
      toast.success(`Disbursement initiated for ${r.initiated} payslip(s)`);
      if (r.failedToInitiate.length > 0) {
        toast.error(`${r.failedToInitiate.length} failed to initiate`);
      }
      setDisburseModalOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to disburse");
    }
  };

  const handleCancelRun = () => {
    setGenericConfirm({
      title: "Cancel payroll run",
      message: "This will permanently cancel the Draft run and delete all its payslips. Any pending bonuses will be returned to the queue. This cannot be undone.",
      confirmLabel: "Cancel run",
      variant: "danger",
      onConfirm: async () => {
        setGenericConfirm(null);
        try {
          await cancelRun.mutateAsync(payrollRunId);
          toast.success("Draft cancelled");
          router.push("/payroll");
        } catch (err) {
          const e = err as { response?: { data?: { message?: string } } };
          toast.error(e?.response?.data?.message || "Failed to cancel");
        }
      },
    });
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

  // Pre-flight: how many payslips are missing bank info?
  const missingBankInfo = (run.payslips ?? []).filter(
    (p) => !p.employee?.accountNumber || !p.employee?.bankName,
  );

  return (
    <AppLayout pageTitle={`${monthName} ${run.year} Payroll`}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/payroll")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Payroll
        </Button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{monthName} {run.year}</h1>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[run.status]}`}
              >
                {STATUS_LABEL[run.status]}
              </span>
              <span className="text-sm text-gray-500">{run.payslips?.length || 0} payslips</span>
              {run.createdBy && (
                <span className="text-sm text-gray-500">Created by {run.createdBy.fullName}</span>
              )}
            </div>
          </div>

          {/* Action bar driven by status */}
          <div className="flex flex-wrap gap-2">
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
                <Button variant="outline" onClick={handlePopulate} loading={populateRun.isPending}>
                  <RefreshCw className="h-4 w-4" />
                  Auto-populate
                </Button>
                <Button onClick={handleSubmit} loading={submitRun.isPending}>
                  <Send className="h-4 w-4" />
                  Submit for approval
                </Button>
                <Button variant="outline" onClick={handleCancelRun}>
                  <X className="h-4 w-4" />
                  Cancel run
                </Button>
              </>
            )}
            {run.status === "PendingFinance" && isFinance && (
              <>
                <Button variant="outline" onClick={() => setRejectModalOpen(true)}>
                  <X className="h-4 w-4" />
                  Reject
                </Button>
                <Button onClick={handleApproveFinance} loading={approveFinance.isPending}>
                  <Check className="h-4 w-4" />
                  Approve (Finance)
                </Button>
              </>
            )}
            {run.status === "PendingCVO" && isAdmin && (
              <>
                <Button variant="outline" onClick={() => setRejectModalOpen(true)}>
                  <X className="h-4 w-4" />
                  Reject
                </Button>
                <Button onClick={handleApproveCvo} loading={approveCvo.isPending}>
                  <Check className="h-4 w-4" />
                  Approve (CVO)
                </Button>
              </>
            )}
            {(run.status === "Approved" || run.status === "Disbursing") && isAdmin && (
              <Button onClick={() => setDisburseModalOpen(true)}>
                <CircleDollarSign className="h-4 w-4" />
                {run.status === "Disbursing" ? "Retry failed transfers" : "Disburse via Paystack"}
              </Button>
            )}
          </div>
        </div>

        {/* Approval timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TimelineEntry
                label="Submitted"
                actor={run.createdBy?.fullName}
                at={run.submittedAt}
              />
              <TimelineEntry
                label="Finance"
                actor={run.financeApprover?.fullName ?? null}
                at={run.financeApprovedAt}
              />
              <TimelineEntry
                label="CVO"
                actor={run.cvoApprover?.fullName ?? null}
                at={run.cvoApprovedAt}
              />
              <TimelineEntry
                label={run.status === "Sent" ? "Paid out" : "Disbursement"}
                actor={run.disburser?.fullName ?? null}
                at={run.disbursedAt ?? run.sentAt}
              />
            </div>
            {run.status === "Rejected" || run.rejectionReason ? (
              <p className="mt-3 text-sm text-red-600">
                Rejected: {run.rejectionReason}
                {run.rejecter ? ` — by ${run.rejecter.fullName}` : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-4">
              <Stat label="Total Gross" value={`₦${formatCurrency(run.totalGross || 0)}`} />
              <Stat label="Total PAYE" value={`₦${formatCurrency(run.totalTax || 0)}`} />
              <Stat label="Total Pension" value={`₦${formatCurrency(run.totalPension || 0)}`} />
              <Stat label="Total Net" value={`₦${formatCurrency(run.totalNet || 0)}`} highlight />
            </div>
          </CardContent>
        </Card>

        {/* Bulk upload result, if any */}
        {bulkResult && bulkResult.errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload — {bulkResult.errors.length} row error(s)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-red-600">
                {bulkResult.errors.map((e) => (
                  <li key={e.row}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setBulkResult(null)}>
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payslips Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payslips</CardTitle>
          </CardHeader>
          <CardContent>
            {!run.payslips || run.payslips.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No payslips yet. Use Auto-populate, Add payslip, or Bulk upload.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-3">Employee</th>
                      <th className="px-3 py-3 text-right">Gross</th>
                      <th className="px-3 py-3 text-right">PAYE</th>
                      <th className="px-3 py-3 text-right">Pension</th>
                      <th className="px-3 py-3 text-right">NHF</th>
                      <th className="px-3 py-3 text-right">Other Ded.</th>
                      <th className="px-3 py-3 text-right">Net Pay</th>
                      {(run.status === "Disbursing" || run.status === "Sent") && (
                        <th className="px-3 py-3">Payment</th>
                      )}
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {run.payslips.map((payslip) => {
                      const otherDed =
                        Number(payslip.deductions || 0) -
                        Number(payslip.paye || 0) -
                        Number(payslip.pension || 0) -
                        Number(payslip.nhf || 0);
                      return (
                        <tr key={payslip.id} className="group hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-900">{payslip.employee?.fullName}</p>
                            <p className="text-xs text-gray-500">
                              {payslip.employee?.employeeId} - {payslip.employee?.jobTitle}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right">{formatCurrency(payslip.grossPay || 0)}</td>
                          <td className="px-3 py-3 text-right text-red-600">({formatCurrency(payslip.paye || 0)})</td>
                          <td className="px-3 py-3 text-right text-red-600">({formatCurrency(payslip.pension || 0)})</td>
                          <td className="px-3 py-3 text-right text-red-600">({formatCurrency(payslip.nhf || 0)})</td>
                          <td className="px-3 py-3 text-right text-red-600">
                            ({formatCurrency(otherDed > 0 ? otherDed : 0)})
                          </td>
                          <td className="px-3 py-3 text-right font-semibold">
                            {formatCurrency(payslip.netPay)}
                          </td>
                          {(run.status === "Disbursing" || run.status === "Sent") && (
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PAY_STATUS_COLORS[payslip.paymentStatus]}`}
                                title={payslip.paymentFailureReason ?? undefined}
                              >
                                {payslip.paymentStatus}
                              </span>
                            </td>
                          )}
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadPdf(payslip); }}>
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                              {run.status === "Draft" && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setDeletePayslipTarget({ id: payslip.id, name: payslip.employee?.fullName ?? "this employee" }); }}
                                  disabled={deletePayslip.isPending}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                                  title="Remove payslip"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
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
            setSelectedEmployeeId(null);
            setEmployeeSearch("");
            form.reset({
              basicSalary: 0, housing: 0, transport: 0, wardrobe: 0, meal: 0, utility: 0,
              otherAllowances: [], deductions: [], netPay40: 0, nhfOptIn: false,
            });
          }}
          title="Add Payslip"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
              <Button onClick={form.handleSubmit(handleAddPayslip)} loading={createPayslip.isPending}>
                Add Payslip
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Employee selector */}
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Employee *</label>
              <Input
                placeholder="Search employee..."
                value={employeeSearch}
                onChange={(e) => { setEmployeeSearch(e.target.value); setIsDropdownOpen(true); }}
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
                        setSelectedEmployeeId(emp.id);
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
                <p className="mt-1 text-sm text-red-600">{form.formState.errors.employeeId.message}</p>
              )}
              {salaryDefaults && !salaryDefaults.hasSalaryRecord && (
                <p className="mt-1 text-xs text-amber-600">No salary record found — enter values manually.</p>
              )}
              {salaryDefaults?.hasSalaryRecord && salaryDefaults.hasBreakdown && (
                <p className="mt-1 text-xs text-green-600">Salary record loaded and pre-filled.</p>
              )}
              {salaryDefaults?.hasSalaryRecord && !salaryDefaults.hasBreakdown && (
                <p className="mt-1 text-xs text-amber-600">
                  Salary record found but breakdown not set — enter components manually.
                  {salaryDefaults.referenceNetPay > 0 && (
                    <span className="ml-1 font-medium">
                      Reference net pay: ₦{salaryDefaults.referenceNetPay.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Earnings */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Earnings</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Basic Salary *" type="number" step="0.01"
                  error={form.formState.errors.basicSalary?.message} {...form.register("basicSalary")} />
                <Input label="Housing Allowance" type="number" step="0.01" {...form.register("housing")} />
                <Input label="Transport Allowance" type="number" step="0.01" {...form.register("transport")} />
                <Input label="Wardrobe Allowance" type="number" step="0.01" {...form.register("wardrobe")} />
                <Input label="Meal Allowance" type="number" step="0.01" {...form.register("meal")} />
                <Input label="Utility Allowance" type="number" step="0.01" {...form.register("utility")} />
              </div>
            </div>

            {/* Statutory deductions note */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              PAYE, Employee Pension (8%), and Employer Pension (10%) are calculated automatically from the tax engine — no need to enter them.
            </div>

            {/* Optional: Net Pay 40% split */}
            <Input
              label="Net Pay 40% (Manual complement, if split disbursement)"
              type="number"
              step="0.01"
              {...form.register("netPay40")}
            />
          </div>
        </Modal>

        {/* Bulk Upload Modal */}
        <Modal
          isOpen={uploadModalOpen}
          onClose={() => { setUploadModalOpen(false); setSelectedFile(null); }}
          title="Bulk Upload Payslips"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkUpload} loading={uploadPayslips.isPending} disabled={!selectedFile}>
                Upload
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Upload the Thelix payroll template (.xlsx). Expected columns:</p>
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 space-y-0.5">
              <p><span className="font-semibold">A</span> — Emp No. &nbsp;<span className="font-semibold">B</span> — Full Name &nbsp;<span className="font-semibold">C</span> — Department</p>
              <p><span className="font-semibold">F</span> — Basic Salary &nbsp;<span className="font-semibold">G</span> — Housing &nbsp;<span className="font-semibold">H</span> — Transport</p>
              <p><span className="font-semibold">I</span> — Wardrobe &nbsp;<span className="font-semibold">J</span> — Meal &nbsp;<span className="font-semibold">K</span> — Utility</p>
              <p><span className="font-semibold">S</span> — Net Pay 40% (manual input)</p>
              <p className="text-gray-500 mt-1">PAYE, pension and net pay are auto-calculated. Data rows start at row 6.</p>
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
                    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                  }}
                />
              </label>
              {selectedFile && <p className="mt-2 text-sm text-gray-500">{selectedFile.name}</p>}
            </div>
          </div>
        </Modal>

        {/* Reject Modal */}
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => { setRejectModalOpen(false); setRejectReason(""); }}
          title="Reject Payroll Run"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
              <Button onClick={handleReject} loading={rejectRun.isPending}>Reject</Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Rejecting will return this run to Draft and clear approvals. The reason is saved on the run.
            </p>
            <Input
              label="Reason"
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Bonus for John D. was missed"
            />
          </div>
        </Modal>

        {/* Generic confirm dialog (auto-populate, submit, approve, cancel) */}
        <ConfirmDialog
          isOpen={!!genericConfirm}
          onClose={() => setGenericConfirm(null)}
          onConfirm={genericConfirm?.onConfirm ?? (() => {})}
          title={genericConfirm?.title ?? ""}
          message={genericConfirm?.message ?? ""}
          confirmLabel={genericConfirm?.confirmLabel ?? "Confirm"}
          variant={genericConfirm?.variant ?? "primary"}
        />

        {/* Delete Payslip Modal */}
        <Modal
          isOpen={!!deletePayslipTarget}
          onClose={() => setDeletePayslipTarget(null)}
          title="Remove payslip"
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeletePayslipTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleDeletePayslip}
                loading={deletePayslip.isPending}
                className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          }
        >
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">
                This will permanently remove{" "}
                <span className="font-semibold text-gray-900">{deletePayslipTarget?.name}</span>
                &apos;s payslip from this run. The run totals will be updated automatically.
              </p>
              <p className="mt-2 text-xs text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
        </Modal>

        {/* Disburse confirmation Modal */}
        <Modal
          isOpen={disburseModalOpen}
          onClose={() => setDisburseModalOpen(false)}
          title="Disburse via Paystack"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDisburseModalOpen(false)}>Cancel</Button>
              <Button onClick={handleDisburse} loading={disburseRun.isPending}>
                <CircleDollarSign className="h-4 w-4" />
                Confirm disbursement
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {run.payslips?.length || 0} employees · Total to be paid:{" "}
              <strong>₦{formatCurrency(run.totalNet || 0)}</strong>
            </p>
            {missingBankInfo.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">{missingBankInfo.length} employee(s) are missing bank details — they will be marked Failed:</p>
                <ul className="mt-2 list-inside list-disc">
                  {missingBankInfo.slice(0, 5).map((p) => (
                    <li key={p.id}>{p.employee?.fullName}</li>
                  ))}
                  {missingBankInfo.length > 5 && <li>… and {missingBankInfo.length - 5} more</li>}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Transfers are initiated via Paystack with each payslip ID as the idempotency key. Status updates arrive via webhook; the run will move to Sent automatically once every transfer settles.
            </p>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

function TimelineEntry({
  label,
  actor,
  at,
}: {
  label: string;
  actor: string | null | undefined;
  at: string | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      {at ? (
        <>
          <p className="mt-1 text-sm font-medium text-gray-900">{actor ?? "—"}</p>
          <p className="text-xs text-gray-500">{formatDate(at)}</p>
        </>
      ) : (
        <p className="mt-1 text-sm italic text-gray-400">Pending</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-indigo-700" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
