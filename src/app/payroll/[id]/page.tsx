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
  useWalletBalance,
  useTransferHistory,
  useDispatchPayslips,
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
  commission: z.coerce.number().min(0).default(0),
  withholdingTax: z.coerce.number().min(0).default(0),
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
  const isAdmin = effectiveRole === "Admin" || effectiveRole === "CVO";
  const isCVO = effectiveRole === "CVO";
  const isFinance = effectiveRole === "Finance";
  const payrollRunId = params.id as string;

  const [addModalOpen, setAddModalOpen] = useState(false);
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
  const [populateReport, setPopulateReport] = useState<{
    populated: number;
    populatedWithZeroDefaults: Array<{ employeeIdCode: string; fullName: string; reason: string }>;
    failed: Array<{ employeeIdCode: string; fullName: string; error: string }>;
    excludedByStatus: {
      count: number;
      breakdown: Record<string, number>;
      employees: Array<{ employeeIdCode: string; fullName: string; status: string }>;
    };
  } | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { data: run, isLoading } = usePayrollRun(payrollRunId);
  const { data: allEmployees } = useAllEmployees();
  const { data: salaryDefaults } = useEmployeeSalaryDefaults(selectedEmployeeId);

  const filteredEmployees = allEmployees?.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()),
  );

  const createPayslip = useCreatePayslip();
  const populateRun = usePopulatePayrollRun();
  const submitRun = useSubmitPayroll();
  const approveFinance = useApproveFinance();
  const approveCvo = useApproveCvo();
  const rejectRun = useRejectPayroll();
  const disburseRun = useDisbursePayroll();
  const cancelRun = useCancelPayrollRun();
  const deletePayslip = useDeletePayslip();
  const dispatchPayslips = useDispatchPayslips();
  const { data: walletBalances } = useWalletBalance();
  const isDisbursingRun = run?.status === "Disbursing";
  const { data: transferHistory } = useTransferHistory(payrollRunId, isDisbursingRun);
  const ngnBalance = walletBalances?.find((b) => b.currency === "NGN");

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
      commission: 0, withholdingTax: 0,
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
    form.setValue("commission", salaryDefaults.commission ?? 0);
    form.setValue("withholdingTax", salaryDefaults.withholdingTax ?? 0);
    form.setValue("netPay40", salaryDefaults.netPay40 ?? 0);
    const known = ["housing", "transport", "wardrobe", "meal", "utility", "commission"];
    const others = salaryDefaults.allowances.filter(
      (a) => !known.some((k) => a.name.toLowerCase().includes(k)),
    );
    form.setValue("otherAllowances", others);
    const nonWithholding = (salaryDefaults.deductions ?? []).filter(
      (d) => !d.name.toLowerCase().includes("withholding"),
    );
    form.setValue("deductions", nonWithholding);
  }, [salaryDefaults, form]);

  const handleAddPayslip = async (data: PayslipFormData) => {
    const allowances = [
      { name: "Housing",    amount: data.housing },
      { name: "Transport",  amount: data.transport },
      { name: "Wardrobe",   amount: data.wardrobe },
      { name: "Meal",       amount: data.meal },
      { name: "Utility",    amount: data.utility },
      ...(data.commission > 0 ? [{ name: "Commission", amount: data.commission }] : []),
      ...data.otherAllowances,
    ].filter((a) => a.amount > 0);

    const deductions = [
      ...(data.withholdingTax > 0 ? [{ name: "Withholding Tax", amount: data.withholdingTax }] : []),
      ...data.deductions,
    ];

    try {
      await createPayslip.mutateAsync({
        payrollRunId,
        data: {
          employeeId: data.employeeId,
          basicSalary: data.basicSalary,
          allowances,
          deductions,
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

  const handlePopulate = () => {
    setGenericConfirm({
      title: "Auto-populate payslips",
      message: "This will generate payslips for all active employees using their current salary structure. Existing payslips for this run will be updated.",
      confirmLabel: "Auto-populate",
      variant: "primary",
      onConfirm: async () => {
        setGenericConfirm(null);
        try {
          const r = await populateRun.mutateAsync(payrollRunId);
          if (r.failed.length > 0) {
            toast.error(`Populated ${r.populated} payslip(s), ${r.failed.length} failed — see report`);
          } else {
            toast.success(`Populated ${r.populated} payslip(s)`);
          }
          if (
            r.populatedWithZeroDefaults.length > 0 ||
            r.failed.length > 0 ||
            r.excludedByStatus.count > 0
          ) {
            setPopulateReport(r);
          }
        } catch (err) {
          const e = err as { response?: { data?: { message?: string } }; code?: string; message?: string };
          // True network timeout / no response shape = no `e.response`. Surface
          // something actionable instead of the bare "Failed to populate".
          if (!e?.response) {
            const isTimeout = e?.code === "ECONNABORTED" || /timeout/i.test(e?.message ?? "");
            toast.error(
              isTimeout
                ? "Auto-populate timed out — the server may still be working. Refresh in a moment to check."
                : "Could not reach the server. Check your connection and try again.",
              { duration: 6000 },
            );
            return;
          }
          toast.error(e.response.data?.message || "Failed to populate");
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

  const handleDownloadSpreadsheet = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await fetch(`${API_URL}/payroll/${payrollRunId}/register.xlsx`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const monthName = run ? ["January","February","March","April","May","June","July","August","September","October","November","December"][run.month - 1] : "";
      a.download = `payroll-${monthName}-${run?.year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download spreadsheet");
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
              {isDisbursingRun && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                  </span>
                  Live — updating every 5s
                </span>
              )}
            </div>
          </div>

          {/* Action bar driven by status */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownloadSpreadsheet}>
              <Download className="h-4 w-4" />
              Download Spreadsheet
            </Button>
            {run.status === "Draft" && (
              <>
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
            {run.status === "PendingCVO" && isCVO && (
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
            {(run.status === "Approved" || run.status === "Disbursing" || run.status === "Sent") && isAdmin && (
              <Button
                variant="outline"
                loading={dispatchPayslips.isPending}
                onClick={async () => {
                  try {
                    const r = await dispatchPayslips.mutateAsync(payrollRunId);
                    toast.success(`Payslips sent: ${r.sent} delivered${r.failed ? `, ${r.failed} failed` : ""}${r.skipped ? `, ${r.skipped} skipped` : ""}`);
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || "Failed to send payslips");
                  }
                }}
              >
                <Send className="h-4 w-4" />
                Send Payslips
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
                      <th className="px-3 py-3 text-right">Net Pay</th>
                      <th className="px-3 py-3 text-center">Payslip Sent</th>
                      {(run.status === "Disbursing" || run.status === "Sent") && (
                        <th className="px-3 py-3">Payment</th>
                      )}
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {run.payslips.map((payslip) => {
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
                          <td className="px-3 py-3 text-right font-semibold">
                            {formatCurrency(
                              Number(payslip.netPay || 0) + Number(payslip.netPay40 || 0) ||
                              Number(payslip.netPayTotal || 0)
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {payslip.payslipEmailSentAt ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                                title={`Sent ${new Date(payslip.payslipEmailSentAt).toLocaleString("en-NG")}`}
                              >
                                ✓ Sent
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                                Pending
                              </span>
                            )}
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
              {salaryDefaults?.hasSalaryRecord && (
                <p className="mt-1 text-xs text-green-600">✓ Salary record loaded and pre-filled.</p>
              )}
            </div>

            {/* Gross Pay summary (read-only from salary record) */}
            {salaryDefaults?.grossPay ? (
              <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-gray-700">Gross Pay</span>
                <span className="text-sm font-bold text-orange-700">
                  ₦{formatCurrency(salaryDefaults.grossPay)}
                </span>
              </div>
            ) : null}

            {/* Salary Structure */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Salary Structure</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Basic Salary (35%) *" type="number" step="0.01"
                  error={form.formState.errors.basicSalary?.message} {...form.register("basicSalary")} />
                <Input label="Housing (20%)" type="number" step="0.01" {...form.register("housing")} />
                <Input label="Transport (15%)" type="number" step="0.01" {...form.register("transport")} />
                <Input label="Wardrobe (10%)" type="number" step="0.01" {...form.register("wardrobe")} />
                <Input label="Meal (10%)" type="number" step="0.01" {...form.register("meal")} />
                <Input label="Utility (10%)" type="number" step="0.01" {...form.register("utility")} />
              </div>
            </div>

            {/* Additional Compensation */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Additional Compensation</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Commission" type="number" step="0.01" {...form.register("commission")} />
                <Input label="Withholding Tax" type="number" step="0.01" {...form.register("withholdingTax")} />
              </div>
            </div>

            {/* Computed statutory values */}
            {salaryDefaults?.computed && (() => {
              const c = salaryDefaults.computed!;
              const StatRow = ({ label, value }: { label: string; value: number }) => (
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-semibold text-gray-800">₦{formatCurrency(value)}</span>
                </div>
              );
              return (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Statutory &amp; Net Pay (Auto-Calculated)
                  </p>
                  <div className="grid grid-cols-2 gap-x-6">
                    <div>
                      <StatRow label="Employee Pension (8%)" value={c.pension} />
                      <StatRow label="Employer Pension (10%)" value={c.employerPension} />
                      <StatRow label="Total Pension" value={c.totalPension} />
                    </div>
                    <div>
                      <StatRow label="PAYE Tax (Monthly)" value={c.paye} />
                      <StatRow label="Total Deductions" value={c.totalDeductions} />
                      <StatRow label="Net Pay 60%" value={c.netPay60} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Net Pay split */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Net Pay 40% (Manual Input)"
                type="number"
                step="0.01"
                {...form.register("netPay40")}
              />
              {salaryDefaults?.computed && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Net Pay 100% (60% + 40%)</label>
                  <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-800">
                    ₦{formatCurrency(
                      salaryDefaults.computed.netPay60 +
                      (parseFloat(String(form.watch("netPay40") || "0")) || 0)
                    )}
                  </div>
                </div>
              )}
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

        {/* Auto-populate result report — surfaces every employee the run did NOT include */}
        <Modal
          isOpen={!!populateReport}
          onClose={() => setPopulateReport(null)}
          title="Auto-populate report"
          size="lg"
          footer={
            <div className="flex justify-end">
              <Button onClick={() => setPopulateReport(null)}>Close</Button>
            </div>
          }
        >
          {populateReport && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Generated <strong>{populateReport.populated}</strong> payslip(s).
              </div>

              {populateReport.failed.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">
                    {populateReport.failed.length} employee(s) failed — no payslip written for these
                  </p>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-red-200 bg-red-50">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-red-100 text-red-900">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">ID</th>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody className="text-red-900">
                        {populateReport.failed.map((f) => (
                          <tr key={f.employeeIdCode} className="border-t border-red-200">
                            <td className="px-3 py-1.5 font-mono">{f.employeeIdCode}</td>
                            <td className="px-3 py-1.5">{f.fullName}</td>
                            <td className="px-3 py-1.5 break-all">{f.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Full error stacks are persisted to{" "}
                    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono">logs/payroll-populate.log</code>
                    {" "}on the server. Re-run Auto-populate after fixing the underlying issue — it&apos;s idempotent.
                  </p>
                </div>
              )}

              {populateReport.populatedWithZeroDefaults.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">
                    {populateReport.populatedWithZeroDefaults.length} payslip(s) generated with 0.00 — no usable salary record
                  </p>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-amber-100 text-amber-900">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">ID</th>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="text-amber-900">
                        {populateReport.populatedWithZeroDefaults.map((s) => (
                          <tr key={s.employeeIdCode} className="border-t border-amber-200">
                            <td className="px-3 py-1.5 font-mono">{s.employeeIdCode}</td>
                            <td className="px-3 py-1.5">{s.fullName}</td>
                            <td className="px-3 py-1.5">{s.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    These payslips were created with 0.00 values so totals reconcile against the headcount. Set their salary (Gross / Basic / Monthly) and re-run Auto-populate to compute real figures.
                  </p>
                </div>
              )}

              {populateReport.excludedByStatus.count > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-900">
                    {populateReport.excludedByStatus.count} employee(s) excluded by employment status
                  </p>
                  <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    {Object.entries(populateReport.excludedByStatus.breakdown).map(([status, n]) => (
                      <span key={status} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {status}: {n}
                      </span>
                    ))}
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">ID</th>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-800">
                        {populateReport.excludedByStatus.employees.map((e) => (
                          <tr key={e.employeeIdCode} className="border-t border-gray-200">
                            <td className="px-3 py-1.5 font-mono">{e.employeeIdCode}</td>
                            <td className="px-3 py-1.5">{e.fullName}</td>
                            <td className="px-3 py-1.5">{e.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    These employees are intentionally excluded. Change their status to Active if they should be paid.
                  </p>
                </div>
              )}
            </div>
          )}
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
            {/* Wallet balance pre-flight check */}
            {ngnBalance !== undefined && (
              <div className={`rounded-lg border px-4 py-3 text-sm ${
                ngnBalance.balance >= Number(run.totalNet || 0)
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Paystack NGN Balance</span>
                  <span className="font-bold">
                    ₦{Number(ngnBalance.balance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {ngnBalance.balance < Number(run.totalNet || 0) && (
                  <p className="mt-1 text-xs">
                    Balance is insufficient to cover total net pay of ₦{formatCurrency(run.totalNet || 0)}. Top up before disbursing.
                  </p>
                )}
              </div>
            )}
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
              Transfers use each payslip ID as the idempotency key — concurrent or duplicate requests are safely rejected. Status updates arrive via Paystack webhook; the run moves to Sent once every transfer settles.
            </p>
          </div>
        </Modal>

        {/* ── Transfer History ─────────────────────────────── */}
        {(run.status === "Disbursing" || run.status === "Sent") && transferHistory && transferHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Transfer Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Attempted</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Settled</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transferHistory.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{t.employee.fullName}</p>
                          <p className="text-xs text-gray-400">{t.employee.employeeId}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          ₦{(Number(t.netPay || 0) + Number(t.netPay40 || 0) || Number(t.netPayTotal || 0)).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PAY_STATUS_COLORS[t.paymentStatus as keyof typeof PAY_STATUS_COLORS] ?? "bg-gray-100 text-gray-600"}`}>
                            {t.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {t.paystackTransferCode ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {t.paymentAttemptedAt ? formatDate(t.paymentAttemptedAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {t.paymentCompletedAt ? formatDate(t.paymentCompletedAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-red-600 max-w-[200px] truncate" title={t.paymentFailureReason ?? ""}>
                          {t.paymentFailureReason ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
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
