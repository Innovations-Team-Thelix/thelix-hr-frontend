"use client";

import React from "react";
import toast from "react-hot-toast";
import {
  Receipt,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading";
import { useMyPayslips } from "@/hooks";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function formatCurrency(amount: number) {
  return Number(amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PayslipsPage() {
  const { data, isLoading } = useMyPayslips();

  const handleDownloadPdf = (payslipId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    fetch(`${API_URL}/payslips/${payslipId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error("Failed to download PDF"));
  };

  return (
    <AppLayout pageTitle="My Payslips">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">My Payslips</h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" variant="rectangular" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" variant="rectangular" />
          </div>
        ) : !data ? (
          <Card>
            <CardContent>
              <div className="py-12 text-center text-sm text-gray-500">
                No payslip data available
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* YTD Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">
                        YTD Basic Salary
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(data.ytd.basicSalary)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">
                        YTD Allowances
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(data.ytd.allowances)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">
                        YTD Deductions
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(data.ytd.deductions)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                      <Wallet className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">
                        YTD Net Pay
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(data.ytd.netPay)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payslips Table */}
            <Card>
              <CardHeader>
                <CardTitle>Payslip History</CardTitle>
              </CardHeader>
              <CardContent>
                {data.payslips.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    No payslips available yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-3">Period</th>
                          <th className="px-4 py-3 text-right">Basic Salary</th>
                          <th className="px-4 py-3 text-right">Allowances</th>
                          <th className="px-4 py-3 text-right">Deductions</th>
                          <th className="px-4 py-3 text-right">Net Pay</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.payslips.map((payslip) => (
                          <tr key={payslip.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {payslip.payrollRun
                                ? `${MONTH_NAMES[payslip.payrollRun.month - 1]} ${payslip.payrollRun.year}`
                                : "-"}
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
                                onClick={() => handleDownloadPdf(payslip.id)}
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
