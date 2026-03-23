"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  User,
  Edit,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Shield,
  Clock,
  Download,
  FileText,
  Upload,
} from "lucide-react";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import { Tabs, Tab } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/documents/document-list";
import { UploadDocumentModal } from "@/components/documents/upload-document-modal";
import { useMyProfile, useUpdateMyProfile, useMyLeaveBalances, useSalaryHistory,
  useAuthStore, useEffectiveRole
} from "@/hooks";
import { AttendanceHistoryTab } from "@/components/employees/attendance-history-tab";
import { CompensationSummary } from "@/components/employees/compensation-summary";
import { useRoster } from "@/hooks/useRoster";
import { formatDate, formatCurrency, cn, formatBirthDate } from "@/lib/utils";

const updateSelfSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  emergencyContact: z.string().optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinRelationship: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  maritalStatus: z.string().optional(),
});

type UpdateSelfFormData = z.infer<typeof updateSelfSchema>;

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900">{value || "-"}</dd>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      {Icon && <Icon className="mt-0.5 h-4 w-4 text-gray-400 shrink-0" />}
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-gray-900">{value || "-"}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { user } = useAuthStore();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";
  const { data: profile, isLoading } = useMyProfile();
  const { data: leaveBalances, isLoading: balancesLoading } = useMyLeaveBalances();
  const { data: salaryHistory } = useSalaryHistory(profile?.id || "", { enabled: !!profile });
  const updateProfile = useUpdateMyProfile();

  const [activeTab, setActiveTab] = useState("overview");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const tabs: Tab[] = [
    { id: "overview", label: "Overview" },
    { id: "compensation", label: "Compensation" },
    { id: "salary-history", label: "Salary History" },
    { id: "attendance", label: "Attendance" },
    { id: "documents", label: "Documents" },
    ...(profile?.subordinates?.length ? [{ id: "team", label: "Team" }] : []),
  ];

  // Get this week's roster
  const [weekDates, setWeekDates] = useState<{ monday: Date; friday: Date } | null>(null);

  useEffect(() => {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    setWeekDates({ monday, friday });
  }, []);

  const { data: rosterEntries } = useRoster({
    startDate: weekDates ? weekDates.monday.toISOString().split("T")[0] : "",
    endDate: weekDates ? weekDates.friday.toISOString().split("T")[0] : "",
  }, { enabled: !!weekDates });

  const form = useForm<UpdateSelfFormData>({
    resolver: zodResolver(updateSelfSchema),
  });

  const handleEdit = () => {
    if (profile) {
      form.reset({
        phone: profile.phone || "",
        address: profile.address || "",
        personalEmail: profile.personalEmail || "",
        emergencyContact: profile.emergencyContact || "",
        nextOfKinName: profile.nextOfKinName || "",
        nextOfKinRelationship: profile.nextOfKinRelationship || "",
        nextOfKinPhone: profile.nextOfKinPhone || "",
        maritalStatus: profile.maritalStatus || "",
      });
    }
    setEditModalOpen(true);
  };

  const handleSave = async (data: UpdateSelfFormData) => {
    try {
      const payload: Record<string, unknown> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          payload[key] = value;
        }
      });

      await updateProfile.mutateAsync(payload);
      toast.success("Profile updated successfully");
      setEditModalOpen(false);
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const maritalStatusOptions = [
    { label: "Single", value: "Single" },
    { label: "Married", value: "Married" },
    { label: "Divorced", value: "Divorced" },
    { label: "Widowed", value: "Widowed" },
  ];

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  if (isLoading) {
    return (
      <AppLayout pageTitle="My Profile">
        <div className="space-y-6">
          <div className="flex items-center gap-6">
            <Skeleton variant="circular" className="h-20 w-20" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" variant="rectangular" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout pageTitle="My Profile">
        <div className="flex items-center justify-center py-20 text-gray-500">
          Unable to load profile
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="My Profile">
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar name={profile.fullName} size="lg" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profile.fullName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {profile.employeeId} | {profile.jobTitle}
                  </p>
                  <p className="text-sm text-gray-500">
                    {profile.sbu?.name} - {profile.department?.name}
                  </p>
                  {profile.sbuMemberships && profile.sbuMemberships.filter(m => !m.isPrimary).length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="text-xs text-gray-400">Also in:</span>
                      {profile.sbuMemberships
                        .filter((m) => !m.isPrimary)
                        .map((m) => (
                          <Badge key={m.id} variant="info">
                            {m.sbu.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                  <StatusBadge status={profile.employmentStatus} />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Personal Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                  <InfoRow icon={User} label="Full Name" value={profile.fullName} />
                  <InfoRow
                    icon={Calendar}
                    label="Birth Day Date"
                    value={formatBirthDate(profile.dateOfBirth, isAdmin)}
                  />
                  <InfoRow label="Gender" value={profile.gender} />
                  <InfoRow label="Nationality" value={profile.nationality} />
                  <InfoRow label="Marital Status" value={profile.maritalStatus} />
                  <InfoRow icon={Mail} label="Work Email" value={profile.workEmail} />
                  <InfoRow
                    icon={Mail}
                    label="Personal Email"
                    value={profile.personalEmail}
                  />
                  <InfoRow icon={Phone} label="Phone" value={profile.phone} />
                  <InfoRow icon={MapPin} label="Address" value={profile.address} />
                  <InfoRow
                    icon={Phone}
                    label="Emergency Contact"
                    value={profile.emergencyContact}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next of Kin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                  <InfoRow label="Name" value={profile.nextOfKinName} />
                  <InfoRow
                    label="Relationship"
                    value={profile.nextOfKinRelationship}
                  />
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={profile.nextOfKinPhone}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                  <InfoRow label="Employee ID" value={profile.employeeId} />
                  <InfoRow
                    label="Date of Hire"
                    value={formatDate(profile.dateOfHire)}
                  />
                  <InfoRow
                    label="Employment Type"
                    value={<StatusBadge status={profile.employmentType} />}
                  />
                  <InfoRow
                    label="Work Arrangement"
                    value={<StatusBadge status={profile.workArrangement} />}
                  />
                  <InfoRow label="Job Title" value={profile.jobTitle} />
                  <InfoRow
                    label="Supervisor"
                    value={profile.supervisor?.fullName}
                  />
                  <InfoRow label="Primary SBU" value={profile.sbu?.name} />
                  {profile.sbuMemberships && profile.sbuMemberships.filter(m => !m.isPrimary).length > 0 && (
                    <InfoRow
                      label="Secondary SBUs"
                      value={
                        <div className="flex flex-wrap gap-1">
                          {profile.sbuMemberships
                            .filter((m) => !m.isPrimary)
                            .map((m) => (
                              <Badge key={m.id} variant="info">
                                {m.sbu.name}
                              </Badge>
                            ))}
                        </div>
                      }
                    />
                  )}
                  <InfoRow label="Department" value={profile.department?.name} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Leave Balances + Roster */}
          <div className="space-y-6">
            {/* Clock In Widget */}
            <ClockInWidget />

            {/* Leave Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Leave Balances
                </CardTitle>
              </CardHeader>
              <CardContent>
                {balancesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : !leaveBalances || leaveBalances.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No leave balances found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {leaveBalances.map((balance) => {
                      const remaining = balance.totalDays - balance.usedDays;
                      const percentUsed =
                        balance.totalDays > 0
                          ? (balance.usedDays / balance.totalDays) * 100
                          : 0;
                      return (
                        <div key={balance.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">
                              {balance.leaveType?.name || "Leave"}
                            </span>
                            <span className="text-gray-500">
                              {remaining} / {balance.totalDays} days
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                percentUsed > 80
                                  ? "bg-red-500"
                                  : percentUsed > 50
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(percentUsed, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Offer Letter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Offer Letter
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.offerLetterFileName ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      {profile.offerLetterFileName}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
                        fetch(`${API_URL}/employees/${profile.id}/offer-letter`, {
                          headers: { Authorization: `Bearer ${token}` },
                        })
                          .then((res) => res.blob())
                          .then((blob) => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = profile.offerLetterFileName || "offer-letter.pdf";
                            a.click();
                            URL.revokeObjectURL(url);
                          });
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download Offer Letter
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No offer letter uploaded
                  </p>
                )}
              </CardContent>
            </Card>

            {/* This Week's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  This Week&apos;s Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rosterEntries && rosterEntries.length > 0 ? (
                  <div className="space-y-2">
                    {dayNames.map((dayName, index) => {
                      if (!weekDates) return null;
                      const date = new Date(weekDates.monday);
                      date.setDate(date.getDate() + index);
                      const dateStr = date.toISOString().split("T")[0];
                      const entry = rosterEntries.find(
                        (e) => e.date?.split("T")[0] === dateStr
                      );
                      const dayType = entry?.dayType || "Unscheduled";
                      return (
                        <div
                          key={dayName}
                          className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-gray-700">
                            {dayName}
                          </span>
                          {entry ? (
                            <StatusBadge status={dayType} />
                          ) : (
                            <Badge variant="neutral">-</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No roster schedule for this week
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        )}

        {/* Compensation Tab */}
        {activeTab === "compensation" && (
          <CompensationSummary
            salaryBreakdown={profile.salaryBreakdown}
            currency={profile.currency}
            monthlySalary={profile.monthlySalary}
            salaryBand={profile.salaryBand}
            salaryEffectiveDate={profile.salaryEffectiveDate}
            lastSalaryReview={profile.lastSalaryReview}
            accountName={profile.accountName}
            accountNumber={profile.accountNumber}
            bankName={profile.bankName}
          />
        )}

        {/* Salary History Tab */}
        {activeTab === "salary-history" && (
          <Card>
            <CardHeader>
              <CardTitle>Salary History</CardTitle>
            </CardHeader>
            <CardContent>
              {!salaryHistory || salaryHistory.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No salary history recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Effective Date</th>
                        <th className="px-4 py-3 font-medium">Base Salary</th>
                        <th className="px-4 py-3 font-medium">Gross Pay</th>
                        <th className="px-4 py-3 font-medium">Net Pay</th>
                        <th className="px-4 py-3 font-medium">Created By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salaryHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">
                            {formatDate(record.effectiveDate)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatCurrency(record.baseSalary, profile.currency || "NGN")}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatCurrency(record.grossPay, profile.currency || "NGN")}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatCurrency(record.netPay, profile.currency || "NGN")}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {record.createdBy?.fullName || record.createdById}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">My Documents</h3>
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
            <DocumentList />
            <UploadDocumentModal
              isOpen={isUploadModalOpen}
              onClose={() => setIsUploadModalOpen(false)}
            />
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <AttendanceHistoryTab employeeId={profile.id} />
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <Card>
            <CardHeader>
              <CardTitle>Direct Reports ({profile.subordinates?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!profile.subordinates?.length ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No direct reports found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Job Title</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {profile.subordinates.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {sub.fullName}
                            <div className="text-xs text-gray-500">{sub.employeeId}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{sub.jobTitle}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {sub.department?.name || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{sub.workEmail}</td>
                          <td className="px-4 py-3 text-gray-600">{sub.phone || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Profile Modal (Self) */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Profile"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(handleSave)}
                loading={updateProfile.isPending}
              >
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Input
              label="Phone"
              type="tel"
              error={form.formState.errors.phone?.message}
              {...form.register("phone")}
            />
            <Input
              label="Address"
              error={form.formState.errors.address?.message}
              {...form.register("address")}
            />
            <Input
              label="Personal Email"
              type="email"
              error={form.formState.errors.personalEmail?.message}
              {...form.register("personalEmail")}
            />
            <Input
              label="Emergency Contact"
              type="tel"
              error={form.formState.errors.emergencyContact?.message}
              {...form.register("emergencyContact")}
            />
            <Select
              label="Marital Status"
              options={maritalStatusOptions}
              placeholder="Select status"
              error={form.formState.errors.maritalStatus?.message}
              {...form.register("maritalStatus")}
            />
            <Input
              label="Next of Kin Name"
              error={form.formState.errors.nextOfKinName?.message}
              {...form.register("nextOfKinName")}
            />
            <Input
              label="Next of Kin Relationship"
              error={form.formState.errors.nextOfKinRelationship?.message}
              {...form.register("nextOfKinRelationship")}
            />
            <Input
              label="Next of Kin Phone"
              type="tel"
              error={form.formState.errors.nextOfKinPhone?.message}
              {...form.register("nextOfKinPhone")}
            />
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
