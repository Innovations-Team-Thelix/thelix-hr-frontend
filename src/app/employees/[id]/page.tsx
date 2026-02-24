"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Calendar,
  Briefcase,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  Award,
  UserX,
  FileText,
  Paperclip,
  Plus,
  Upload,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/loading";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useEmployee,
  useUpdateEmployee,
  useLifecycleEvents,
  useCreateLifecycleEvent,
  useEmployeeDisciplinaryActions,
  useUploadOfferLetter,
  useDeleteOfferLetter,
  useAuthStore,
} from "@/hooks";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import type { LifecycleEventType, ViolationType, DisciplinarySeverity } from "@/types";

const EVENT_ICONS: Record<string, React.ElementType> = {
  Promotion: TrendingUp,
  Demotion: TrendingDown,
  RoleTransfer: ArrowRight,
  InternalTransfer: ArrowRight,
  SalaryChange: DollarSign,
  Suspension: AlertTriangle,
  WrittenWarning: AlertTriangle,
  Commendation: Award,
  Termination: UserX,
  Resignation: UserX,
};

const lifecycleEventSchema = z.object({
  eventType: z.string().min(1, "Event type is required"),
  eventDate: z.string().min(1, "Event date is required"),
  description: z.string().min(1, "Description is required"),
});

type LifecycleFormData = z.infer<typeof lifecycleEventSchema>;

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

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const employeeId = params.id as string;

  const isAdmin = user?.role === "Admin";
  const isFinance = user?.role === "Finance";
  const canViewCompensation = isAdmin || isFinance;

  const [activeTab, setActiveTab] = useState("personal");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: employee, isLoading } = useEmployee(employeeId);
  const { data: lifecycleEvents, isLoading: eventsLoading } =
    useLifecycleEvents(employeeId);
  const { data: disciplinaryActions, isLoading: disciplineLoading } =
    useEmployeeDisciplinaryActions(employeeId);
  const updateEmployee = useUpdateEmployee();
  const createEvent = useCreateLifecycleEvent();
  const uploadOfferLetter = useUploadOfferLetter();
  const deleteOfferLetter = useDeleteOfferLetter();

  const [offerLetterFile, setOfferLetterFile] = useState<File | null>(null);

  const profileTabs = [
    { id: "personal", label: "Personal" },
    { id: "employment", label: "Employment" },
    ...(canViewCompensation
      ? [{ id: "compensation", label: "Compensation" }]
      : []),
    { id: "timeline", label: "Timeline" },
    { id: "discipline", label: `Discipline${disciplinaryActions?.length ? ` (${disciplinaryActions.length})` : ""}` },
    ...(isAdmin ? [{ id: "offer-letter", label: "Offer Letter" }] : []),
  ];

  const eventForm = useForm<LifecycleFormData>({
    resolver: zodResolver(lifecycleEventSchema),
  });

  const eventTypeOptions = [
    { label: "Promotion", value: "Promotion" },
    { label: "Demotion", value: "Demotion" },
    { label: "Role Transfer", value: "RoleTransfer" },
    { label: "Internal Transfer", value: "InternalTransfer" },
    { label: "Salary Change", value: "SalaryChange" },
    { label: "Suspension", value: "Suspension" },
    { label: "Written Warning", value: "WrittenWarning" },
    { label: "Commendation", value: "Commendation" },
    { label: "Termination", value: "Termination" },
    { label: "Resignation", value: "Resignation" },
  ];

  const handleCreateEvent = async (data: LifecycleFormData) => {
    try {
      const formData = new FormData();
      formData.append("eventType", data.eventType);
      formData.append("eventDate", data.eventDate);
      formData.append("description", data.description);
      if (selectedFile) {
        formData.append("attachment", selectedFile);
      }

      await createEvent.mutateAsync({
        employeeId,
        data: formData,
      });
      toast.success("Lifecycle event created successfully");
      setEventModalOpen(false);
      eventForm.reset();
      setSelectedFile(null);
    } catch {
      toast.error("Failed to create lifecycle event");
    }
  };

  if (isLoading) {
    return (
      <AppLayout pageTitle="Employee Profile">
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

  if (!employee) {
    return (
      <AppLayout pageTitle="Employee Not Found">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg text-gray-500">Employee not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/employees")}
          >
            Back to Employees
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Employee Profile">
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Profile header */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar name={employee.fullName} size="lg" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {employee.fullName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {employee.employeeId} | {employee.jobTitle}
                  </p>
                  <p className="text-sm text-gray-500">
                    {employee.sbu?.name} - {employee.department?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={employee.employmentStatus} />
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditModalOpen(true)}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs tabs={profileTabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Personal Tab */}
        {activeTab === "personal" && (
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoField label="Full Name" value={employee.fullName} />
                <InfoField
                  label="Date of Birth"
                  value={formatDate(employee.dateOfBirth)}
                />
                <InfoField label="Gender" value={employee.gender} />
                <InfoField label="Nationality" value={employee.nationality} />
                <InfoField label="Marital Status" value={employee.maritalStatus} />
                <InfoField label="Work Email" value={employee.workEmail} />
                <InfoField
                  label="Personal Email"
                  value={employee.personalEmail}
                />
                <InfoField label="Phone" value={employee.phone} />
                <InfoField label="Address" value={employee.address} />
                <InfoField
                  label="Emergency Contact"
                  value={employee.emergencyContact}
                />
                <InfoField
                  label="Next of Kin Name"
                  value={employee.nextOfKinName}
                />
                <InfoField
                  label="Next of Kin Relationship"
                  value={employee.nextOfKinRelationship}
                />
                <InfoField
                  label="Next of Kin Phone"
                  value={employee.nextOfKinPhone}
                />
                <InfoField label="Government ID" value={employee.governmentId} />
                <InfoField label="TIN" value={employee.tin} />
                <InfoField
                  label="Pension Number"
                  value={employee.pensionNumber}
                />
                <InfoField label="HMO ID" value={employee.hmoId} />
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Employment Tab */}
        {activeTab === "employment" && (
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoField label="Employee ID" value={employee.employeeId} />
                <InfoField
                  label="Date of Hire"
                  value={formatDate(employee.dateOfHire)}
                />
                <InfoField
                  label="Employment Type"
                  value={
                    <StatusBadge status={employee.employmentType} />
                  }
                />
                <InfoField label="SBU" value={employee.sbu?.name} />
                <InfoField
                  label="Department"
                  value={employee.department?.name}
                />
                <InfoField label="Job Title" value={employee.jobTitle} />
                <InfoField
                  label="Supervisor"
                  value={employee.supervisor?.fullName}
                />
                <InfoField
                  label="Work Arrangement"
                  value={
                    <StatusBadge status={employee.workArrangement} />
                  }
                />
                <InfoField
                  label="Probation End Date"
                  value={formatDate(employee.probationEndDate)}
                />
                <InfoField
                  label="Employment Status"
                  value={
                    <StatusBadge status={employee.employmentStatus} />
                  }
                />
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Compensation Tab */}
        {activeTab === "compensation" && canViewCompensation && (
          <Card>
            <CardHeader>
              <CardTitle>Compensation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoField
                  label="Monthly Salary"
                  value={formatCurrency(
                    employee.monthlySalary,
                    employee.currency || "NGN"
                  )}
                />
                <InfoField label="Salary Band" value={employee.salaryBand} />
                <InfoField label="Currency" value={employee.currency} />
                <InfoField
                  label="Salary Effective Date"
                  value={formatDate(employee.salaryEffectiveDate)}
                />
                <InfoField
                  label="Last Salary Review"
                  value={formatDate(employee.lastSalaryReview)}
                />
                <InfoField label="Account Name" value={employee.accountName} />
                <InfoField
                  label="Account Number"
                  value={employee.accountNumber}
                />
                <InfoField label="Bank Name" value={employee.bankName} />
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lifecycle Timeline</CardTitle>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => setEventModalOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" variant="rectangular" />
                  ))}
                </div>
              ) : !lifecycleEvents || lifecycleEvents.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No lifecycle events recorded
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />

                  <div className="space-y-6">
                    {lifecycleEvents.map((event) => {
                      const Icon =
                        EVENT_ICONS[event.eventType] || FileText;
                      return (
                        <div
                          key={event.id}
                          className="relative flex gap-4 pl-2"
                        >
                          {/* Icon dot */}
                          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white">
                            <Icon className="h-4 w-4 text-gray-600" />
                          </div>

                          {/* Event content */}
                          <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={event.eventType} />
                                  <span className="text-xs text-gray-500">
                                    {formatDate(event.eventDate)}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-gray-700">
                                  {event.description}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                              {event.initiatedBy && (
                                <span>
                                  Initiated by: {event.initiatedBy.fullName}
                                </span>
                              )}
                              {event.approvedBy && (
                                <span>
                                  Approved by: {event.approvedBy.fullName}
                                </span>
                              )}
                            </div>

                            {event.attachments &&
                              event.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {event.attachments.map((att) => (
                                    <a
                                      key={att.id}
                                      href={att.fileKey}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      {att.fileName}
                                    </a>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Discipline Tab */}
        {activeTab === "discipline" && (
          <Card>
            <CardHeader>
              <CardTitle>Disciplinary History</CardTitle>
            </CardHeader>
            <CardContent>
              {disciplineLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" variant="rectangular" />
                  ))}
                </div>
              ) : !disciplinaryActions || disciplinaryActions.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No disciplinary actions recorded
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Violation</th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Issued By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {disciplinaryActions.map((action) => (
                        <tr key={action.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {action.violationType.replace(/([A-Z])/g, " $1").trim()}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                action.severity === "Warning"
                                  ? "neutral"
                                  : action.severity === "Strike"
                                    ? "warning"
                                    : "danger"
                              }
                            >
                              {action.severity}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-gray-600">
                            {action.description}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDate(action.date)}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {action.issuedBy?.fullName}
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

        {/* Offer Letter Tab */}
        {activeTab === "offer-letter" && isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Offer Letter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employee.offerLetterFileName ? (
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{employee.offerLetterFileName}</p>
                        <p className="text-xs text-gray-500">Current offer letter</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
                          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
                          fetch(`${API_URL}/employees/${employeeId}/offer-letter`, {
                            headers: { Authorization: `Bearer ${token}` },
                          })
                            .then((res) => res.blob())
                            .then((blob) => {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = employee.offerLetterFileName || "offer-letter.pdf";
                              a.click();
                              URL.revokeObjectURL(url);
                            });
                        }}
                      >
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!confirm("Delete the offer letter?")) return;
                          try {
                            await deleteOfferLetter.mutateAsync(employeeId);
                            toast.success("Offer letter deleted");
                          } catch {
                            toast.error("Failed to delete offer letter");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No offer letter uploaded</p>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {employee.offerLetterFileName ? "Replace" : "Upload"} Offer Letter (PDF)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                      <Upload className="h-4 w-4" />
                      Choose PDF
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setOfferLetterFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                    {offerLetterFile && (
                      <span className="text-sm text-gray-500">{offerLetterFile.name}</span>
                    )}
                    {offerLetterFile && (
                      <Button
                        size="sm"
                        loading={uploadOfferLetter.isPending}
                        onClick={async () => {
                          const formData = new FormData();
                          formData.append("file", offerLetterFile);
                          try {
                            await uploadOfferLetter.mutateAsync({ employeeId, data: formData });
                            toast.success("Offer letter uploaded");
                            setOfferLetterFile(null);
                          } catch {
                            toast.error("Failed to upload offer letter");
                          }
                        }}
                      >
                        Upload
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Employee"
          size="lg"
        >
          <p className="text-sm text-gray-500">
            To edit this employee, update the fields and save.
            Full edit functionality is available through the Admin panel.
          </p>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </Modal>

        {/* Lifecycle Event Modal */}
        <Modal
          isOpen={eventModalOpen}
          onClose={() => {
            setEventModalOpen(false);
            eventForm.reset();
            setSelectedFile(null);
          }}
          title="Add Lifecycle Event"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setEventModalOpen(false);
                  eventForm.reset();
                  setSelectedFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={eventForm.handleSubmit(handleCreateEvent)}
                loading={createEvent.isPending}
              >
                Create Event
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Select
              label="Event Type"
              required
              options={eventTypeOptions}
              placeholder="Select event type"
              error={eventForm.formState.errors.eventType?.message}
              {...eventForm.register("eventType")}
            />
            <Input
              label="Event Date"
              type="date"
              required
              error={eventForm.formState.errors.eventDate?.message}
              {...eventForm.register("eventDate")}
            />
            <Textarea
              label="Description"
              required
              rows={3}
              error={eventForm.formState.errors.description?.message}
              {...eventForm.register("description")}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Attachment (optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  Choose file
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {selectedFile && (
                  <span className="text-sm text-gray-500">
                    {selectedFile.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
