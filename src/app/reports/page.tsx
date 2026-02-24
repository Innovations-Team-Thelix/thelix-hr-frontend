"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  Download,
  Users,
  DollarSign,
  BarChart3,
  AlertTriangle,
  PieChart,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuthStore, useSbus } from "@/hooks";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  endpoint: string;
  roles: string[];
  color: string;
}

const REPORTS: ReportConfig[] = [
  {
    id: "employees",
    title: "Employee Data",
    description:
      "Export complete employee directory with personal and employment details.",
    icon: Users,
    endpoint: "/reports/employees",
    roles: ["Admin"],
    color: "text-blue-600 bg-blue-100",
  },
  {
    id: "payroll",
    title: "Payroll Report",
    description:
      "Export compensation and bank details for payroll processing.",
    icon: DollarSign,
    endpoint: "/reports/payroll",
    roles: ["Admin", "Finance"],
    color: "text-emerald-600 bg-emerald-100",
  },
  {
    id: "headcount",
    title: "Headcount Report",
    description:
      "Aggregated headcount breakdown by SBU and department.",
    icon: BarChart3,
    endpoint: "/reports/headcount",
    roles: ["Admin", "SBUHead"],
    color: "text-purple-600 bg-purple-100",
  },
  {
    id: "disciplinary",
    title: "Disciplinary Report",
    description:
      "Export disciplinary lifecycle events including warnings and suspensions.",
    icon: AlertTriangle,
    endpoint: "/reports/disciplinary",
    roles: ["Admin"],
    color: "text-red-600 bg-red-100",
  },
  {
    id: "demographics",
    title: "Demographics Report",
    description:
      "Employee demographics including gender, nationality, and age distribution.",
    icon: PieChart,
    endpoint: "/reports/demographics",
    roles: ["Admin"],
    color: "text-amber-600 bg-amber-100",
  },
];

export default function ReportsPage() {
  const { user } = useAuthStore();
  const { data: sbus } = useSbus();

  const [filters, setFilters] = useState<Record<string, { sbuId: string; dateFrom: string; dateTo: string }>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  const userRole = user?.role || "Employee";

  const visibleReports = REPORTS.filter((r) =>
    r.roles.includes(userRole)
  );

  const sbuOptions = [
    { label: "All SBUs", value: "" },
    ...(sbus?.map((s) => ({ label: s.name, value: s.id })) || []),
  ];

  const getFilters = (reportId: string) => {
    return filters[reportId] || { sbuId: "", dateFrom: "", dateTo: "" };
  };

  const updateFilter = (
    reportId: string,
    key: string,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [reportId]: {
        ...(prev[reportId] || { sbuId: "", dateFrom: "", dateTo: "" }),
        [key]: value,
      },
    }));
  };

  const handleExport = async (
    reportId: string,
    endpoint: string,
    format: "csv" | "xlsx"
  ) => {
    const reportFilters = getFilters(reportId);
    const downloadKey = `${reportId}-${format}`;

    setDownloading((prev) => ({ ...prev, [downloadKey]: true }));

    try {
      const params: Record<string, string> = { format };
      if (reportFilters.sbuId) params.sbuId = reportFilters.sbuId;
      if (reportFilters.dateFrom) params.dateFrom = reportFilters.dateFrom;
      if (reportFilters.dateTo) params.dateTo = reportFilters.dateTo;

      const response = await api.instance.get(endpoint, {
        params,
        responseType: "blob",
      });

      const contentDisposition = response.headers["content-disposition"];
      let filename = `${reportId}-report.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) filename = match[1];
      }

      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${reportId} report exported successfully`);
    } catch {
      toast.error("Failed to export report. Please try again.");
    } finally {
      setDownloading((prev) => ({ ...prev, [downloadKey]: false }));
    }
  };

  return (
    <AppLayout pageTitle="Reports">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Reports & Export
            </h2>
            <p className="text-sm text-gray-500">
              Generate and download organization reports
            </p>
          </div>
        </div>

        {visibleReports.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                You do not have access to any reports
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {visibleReports.map((report) => {
              const Icon = report.icon;
              const reportFilters = getFilters(report.id);

              return (
                <Card key={report.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "rounded-lg p-2.5",
                          report.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {report.title}
                        </CardTitle>
                        <p className="mt-1 text-sm text-gray-500">
                          {report.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Select
                        label="SBU"
                        options={sbuOptions}
                        value={reportFilters.sbuId}
                        onChange={(e) =>
                          updateFilter(report.id, "sbuId", e.target.value)
                        }
                      />
                      <Input
                        label="From Date"
                        type="date"
                        value={reportFilters.dateFrom}
                        onChange={(e) =>
                          updateFilter(report.id, "dateFrom", e.target.value)
                        }
                      />
                      <Input
                        label="To Date"
                        type="date"
                        value={reportFilters.dateTo}
                        onChange={(e) =>
                          updateFilter(report.id, "dateTo", e.target.value)
                        }
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleExport(report.id, report.endpoint, "csv")
                      }
                      loading={downloading[`${report.id}-csv`]}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export CSV
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        handleExport(report.id, report.endpoint, "xlsx")
                      }
                      loading={downloading[`${report.id}-xlsx`]}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export Excel
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
