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
  Package,
  Pencil,
  Trash2,
  LogOut,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/loading";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentList } from "@/components/documents/document-list";
import { UploadDocumentModal } from "@/components/documents/upload-document-modal";
import {
  useEmployee,
  useUpdateEmployee,
  useLifecycleEvents,
  useCreateLifecycleEvent,
  useEmployeeDisciplinaryActions,
  useUploadOfferLetter,
  useDeleteOfferLetter,
  useAuthStore,
  useEmployees,
  useSbus,
  useDepartments,
  useSalaryHistory,
  useEmployeeAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useExitEmployee,
  useEffectiveRole,
  useAssignSbu,
  useRemoveSbu,
} from "@/hooks";
import { useDownloadOfferLetter } from "@/hooks/useOfferLetters";
import { ProbationActionModal } from "@/components/employees/probation-action-modal";
import AuditLogList from "@/components/audit/audit-log-list";
import { EmployeeTags } from "@/components/employees/employee-tags";
import { formatDate, formatCurrency, getInitials, formatBirthDate,
} from "@/lib/utils";
import { AttendanceHistoryTab } from "@/components/employees/attendance-history-tab";
import { CompensationSummary } from "@/components/employees/compensation-summary";
import type { LifecycleEventType, ViolationType, DisciplinarySeverity, SalaryRecord, SalaryComponent, AssetCondition } from "@/types";

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

const editEmployeeSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  workEmail: z.string().email("Valid work email is required"),
  maritalStatus: z.string().optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinRelationship: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  emergencyContact: z.string().optional(),
  governmentId: z.string().optional(),
  tin: z.string().optional(),
  pensionNumber: z.string().optional(),
  hmoId: z.string().optional(),

  dateOfHire: z.string().optional(),
  employmentType: z.string().optional(),
  sbuId: z.string().optional(),
  departmentId: z.string().optional(),
  jobTitle: z.string().min(1, "Job title is required"),
  supervisorId: z.string().optional(),
  workArrangement: z.string().optional(),
  probationEndDate: z.string().optional(),
  employmentStatus: z.enum(["Active", "Suspended", "Terminated", "Resigned"]),

  monthlySalary: z.string().optional(),
  baseSalary: z.string().optional(),
  grossPay: z.string().optional(),
  netPay: z.string().optional(),
  simpleNetPay: z.string().optional(),
  pension: z.string().optional(),
  tax: z.string().optional(),
  allowances: z.array(z.object({ name: z.string(), amount: z.string() })).default([]),
  deductions: z.array(z.object({ name: z.string(), amount: z.string() })).default([]),
  salaryBand: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  currency: z.string().optional(),
  salaryEffectiveDate: z.string().optional(),
});

type LifecycleFormData = z.infer<typeof lifecycleEventSchema>;
type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>;

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

  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";
  const isFinance = effectiveRole === "Finance";
  const isSBUHead = effectiveRole === "SBUHead";
  const isSelf = user?.employeeId === employeeId;
  const canViewSensitiveInfo = isAdmin || isSelf;
  const canViewCompensation = isAdmin || isFinance || isSelf;
  // Restrict sensitive tabs to Admin and the employee themselves
  // Supervisors should not see these tabs
  const canViewTimeline = isAdmin || isSelf;
  const canViewDocuments = isAdmin || isSelf;
  const canViewDiscipline = isAdmin || isSelf || isSBUHead;
  const canViewAttendance = isAdmin || isSelf || isSBUHead;

  // Helper to format Date of Birth based on visibility
  const formatDateOfBirth = (dateString?: string | null) => {
    if (!dateString) return "-";
    
    // Only Admin sees the full date (including year)
    // Self and SBU Head see "Birth Day Date" (Month + Day)
    if (canViewSensitiveInfo || isSBUHead) {
      return formatBirthDate(dateString, isAdmin);
    }
    return "-";
  };

  const [activeTab, setActiveTab] = useState("personal");
  const [editActiveTab, setEditActiveTab] = useState("personal");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [probationModalOpen, setProbationModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({
    equipmentType: "",
    assetTag: "",
    brand: "",
    model: "",
    condition: "BrandNew" as AssetCondition,
    dateIssued: "",
    dateReturned: "",
    notes: "",
  });

  const { data: employee, isLoading } = useEmployee(employeeId);
  const { data: lifecycleEvents, isLoading: eventsLoading } =
    useLifecycleEvents(employeeId);
  const { data: disciplinaryActions, isLoading: disciplineLoading } =
    useEmployeeDisciplinaryActions(employeeId);
  const { data: salaryHistory } = useSalaryHistory(employeeId, { enabled: canViewCompensation });
  const { data: assets, isLoading: assetsLoading } = useEmployeeAssets(employeeId);
  const { data: employeesData } = useEmployees({ limit: 1000 });
  const { data: sbus } = useSbus();
  const updateEmployee = useUpdateEmployee();
  const assignSbu = useAssignSbu();
  const removeSbu = useRemoveSbu();
  const [editSecondarySbuIds, setEditSecondarySbuIds] = useState<string[]>([]);
  const createEvent = useCreateLifecycleEvent();
  const uploadOfferLetter = useUploadOfferLetter();
  const deleteOfferLetter = useDeleteOfferLetter();
  const downloadOfferLetter = useDownloadOfferLetter();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const exitEmployee = useExitEmployee();

  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitForm, setExitForm] = useState({
    exitType: "Resignation" as "Resignation" | "Termination",
    exitDate: new Date().toISOString().split("T")[0],
    reason: "",
    lastWorkingDay: "",
    notes: "",
  });

  const [offerLetterFile, setOfferLetterFile] = useState<File | null>(null);

  const editForm = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      allowances: [],
      deductions: [],
    },
  });

  const { fields: allowanceFields, append: appendAllowance, remove: removeAllowance } = useFieldArray({
    control: editForm.control,
    name: "allowances",
  });

  const { fields: deductionFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({
    control: editForm.control,
    name: "deductions",
  });

  const selectedSbuId = editForm.watch("sbuId");
  const { data: departments } = useDepartments(selectedSbuId);

  React.useEffect(() => {
    if (employee && editModalOpen) {
      // Use salaryBreakdown from employee, or fallback to active record from salary history
      const breakdown = employee.salaryBreakdown
        ?? salaryHistory?.find((r) => r.isActive);


      // Initialize secondary SBU IDs from memberships
      setEditSecondarySbuIds(
        (employee.sbuMemberships || [])
          .filter((m) => !m.isPrimary)
          .map((m) => m.sbuId)
      );

      editForm.reset({
        fullName: employee.fullName,
        dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : undefined,
        gender: employee.gender || undefined,
        nationality: employee.nationality || undefined,
        address: employee.address || undefined,
        phone: employee.phone || undefined,
        personalEmail: employee.personalEmail || "",
        workEmail: employee.workEmail,
        maritalStatus: employee.maritalStatus || undefined,
        nextOfKinName: employee.nextOfKinName || undefined,
        nextOfKinRelationship: employee.nextOfKinRelationship || undefined,
        nextOfKinPhone: employee.nextOfKinPhone || undefined,
        emergencyContact: employee.emergencyContact || undefined,
        governmentId: employee.governmentId || undefined,
        tin: employee.tin || undefined,
        pensionNumber: employee.pensionNumber || undefined,
        hmoId: employee.hmoId || undefined,

        dateOfHire: employee.dateOfHire ? new Date(employee.dateOfHire).toISOString().split('T')[0] : undefined,
        employmentType: employee.employmentType || undefined,
        sbuId: employee.sbu?.id || employee.sbuId || undefined,
        departmentId: employee.department?.id || employee.departmentId || undefined,
        jobTitle: employee.jobTitle,
        supervisorId: employee.supervisorId || undefined,
        workArrangement: employee.workArrangement || undefined,
        probationEndDate: employee.probationEndDate ? new Date(employee.probationEndDate).toISOString().split('T')[0] : undefined,
        employmentStatus: employee.employmentStatus,

        monthlySalary: employee.monthlySalary?.toString() || undefined,
        simpleNetPay: employee.netPay?.toString() || undefined,
        baseSalary: breakdown?.baseSalary?.toString() || undefined,
        grossPay: breakdown?.grossPay?.toString() || undefined,
        netPay: breakdown?.netPay?.toString() || undefined,
        pension: breakdown?.pension?.toString() || undefined,
        tax: breakdown?.tax?.toString() || undefined,
        allowances: (Array.isArray(breakdown?.allowances) ? breakdown.allowances : []).map(
          (a) => ({
            name: String(a.name ?? ""),
            amount: String(a.amount ?? "0"),
          })
        ),
        deductions: (Array.isArray(breakdown?.deductions) ? breakdown.deductions : []).map(
          (d) => ({
            name: String(d.name ?? ""),
            amount: String(d.amount ?? "0"),
          })
        ),
        salaryBand: employee.salaryBand || undefined,
        accountName: employee.accountName || undefined,
        accountNumber: employee.accountNumber || undefined,
        bankName: employee.bankName || undefined,
        currency: employee.currency || undefined,
        salaryEffectiveDate: employee.salaryEffectiveDate ? new Date(employee.salaryEffectiveDate).toISOString().split('T')[0] : undefined,
      });
    }
  }, [employee, editModalOpen, editForm, salaryHistory]);

  const handleEditSubmit = async (data: EditEmployeeFormData) => {
    try {
      // Remove form-only fields that the backend doesn't expect
      const { simpleNetPay, ...rest } = data;

      const payload: Record<string, unknown> = {
        ...rest,
        // Parse numeric fields from strings to numbers
        monthlySalary: data.monthlySalary ? parseFloat(data.monthlySalary) : undefined,
        netPay: data.netPay
          ? parseFloat(data.netPay)
          : (simpleNetPay ? parseFloat(simpleNetPay) : undefined),
        baseSalary: data.baseSalary ? parseFloat(data.baseSalary) : undefined,
        grossPay: data.grossPay ? parseFloat(data.grossPay) : undefined,
        pension: data.pension ? parseFloat(data.pension) : undefined,
        tax: data.tax ? parseFloat(data.tax) : undefined,
        allowances: data.allowances.length > 0
          ? data.allowances.map((a) => ({
              name: a.name,
              amount: parseFloat(a.amount || "0"),
            }))
          : undefined,
        deductions: data.deductions.length > 0
          ? data.deductions.map((d) => ({
              name: d.name,
              amount: parseFloat(d.amount || "0"),
            }))
          : undefined,
      };

      // Remove empty strings and undefined values
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "" || payload[key] === undefined) {
          delete payload[key];
        }
      });

      await updateEmployee.mutateAsync({
        id: employeeId,
        data: payload,
      });

      // Sync secondary SBU memberships
      const currentSecondary = (employee?.sbuMemberships || [])
        .filter((m) => !m.isPrimary)
        .map((m) => m.sbuId);

      // Remove SBUs that were deselected
      const toRemove = currentSecondary.filter((id) => !editSecondarySbuIds.includes(id));
      for (const sbuId of toRemove) {
        await removeSbu.mutateAsync({ employeeId, sbuId });
      }

      // Add newly selected SBUs
      const toAdd = editSecondarySbuIds.filter((id) => !currentSecondary.includes(id));
      for (const sbuId of toAdd) {
        await assignSbu.mutateAsync({ employeeId, sbuId, isPrimary: false });
      }

      toast.success("Employee updated successfully");
      setEditModalOpen(false);
    } catch (error) {
      toast.error("Failed to update employee");
    }
  };

  const sbuOptions = (sbus || []).map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const departmentOptions = (departments || []).map((d) => ({
    label: d.name,
    value: d.id,
  }));

  const supervisorOptions = (employeesData?.data || [])
    .filter((e) => e.id !== employeeId)
    .map((e) => ({
      label: `${e.fullName} (${e.jobTitle})`,
      value: e.id,
    }));

  const genderOptions = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Non-Binary", value: "NonBinary" },
    { label: "Prefer Not To Say", value: "PreferNotToSay" },
  ];

  const employmentTypeOptions = [
    { label: "Full Time", value: "FullTime" },
    { label: "Contract", value: "Contract" },
    { label: "Intern", value: "Intern" },
  ];

  const workArrangementOptions = [
    { label: "Hybrid", value: "Hybrid" },
    { label: "Remote", value: "Remote" },
    { label: "Onsite", value: "Onsite" },
  ];

  const statusOptions = [
    { label: "Active", value: "Active" },
    { label: "Suspended", value: "Suspended" },
    { label: "Terminated", value: "Terminated" },
    { label: "Resigned", value: "Resigned" },
  ];

  const maritalStatusOptions = [
    { label: "Single", value: "Single" },
    { label: "Married", value: "Married" },
    { label: "Divorced", value: "Divorced" },
    { label: "Widowed", value: "Widowed" },
  ];

  const formTabs = [
    { id: "personal", label: "Personal Info" },
    { id: "employment", label: "Employment Details" },
    { id: "compensation", label: "Compensation" },
  ];

  const profileTabs = [
    { id: "personal", label: "Personal" },
    { id: "employment", label: "Employment" },
    ...(canViewCompensation
      ? [
          { id: "compensation", label: "Compensation" },
          { id: "salary-history", label: "Salary History" },
        ]
      : []),
    ...(canViewTimeline ? [{ id: "timeline", label: "Timeline" }] : []),
    ...(canViewDiscipline
      ? [
          {
            id: "discipline",
            label: `Discipline${
              disciplinaryActions?.length
                ? ` (${disciplinaryActions.length})`
                : ""
            }`,
          },
        ]
      : []),
    ...(canViewDocuments ? [{ id: "documents", label: "Documents" }] : []),
    ...(employee?.subordinates?.length ? [{ id: "team", label: "Team" }] : []),
    ...(canViewAttendance ? [{ id: "attendance", label: "Attendance" }] : []),
    ...(isAdmin || isSBUHead || isSelf ? [{
      id: "assets",
      label: `Assets${assets?.length ? ` (${assets.length})` : ""}`,
    }] : []),
    ...(isAdmin ? [{ id: "offer-letter", label: "Offer Letter" }] : []),
    ...(isAdmin ? [{ id: "audit", label: "Audit Trail" }] : []),
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
                  {employee.sbuMemberships && employee.sbuMemberships.filter(m => !m.isPrimary).length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="text-xs text-gray-400">Also in:</span>
                      {employee.sbuMemberships
                        .filter((m) => !m.isPrimary)
                        .map((m) => (
                          <Badge key={m.id} variant="info">
                            {m.sbu.name}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={employee.employmentStatus} />
                <EmployeeTags tags={employee.tags} />
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
                {isAdmin && employee.employmentStatus === "Active" && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setExitForm({
                        exitType: "Resignation",
                        exitDate: new Date().toISOString().split("T")[0],
                        reason: "",
                        lastWorkingDay: "",
                        notes: "",
                      });
                      setExitModalOpen(true);
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Exit Employee
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
                  label="Birth Day Date"
                  value={formatDateOfBirth(employee.dateOfBirth)}
                />
                {canViewSensitiveInfo && (
                  <>
                    <InfoField label="Gender" value={employee.gender} />
                    <InfoField label="Nationality" value={employee.nationality} />
                    <InfoField label="Marital Status" value={employee.maritalStatus} />
                  </>
                )}
                <InfoField label="Primary SBU" value={employee.sbu?.name} />
                {employee.sbuMemberships && employee.sbuMemberships.filter(m => !m.isPrimary).length > 0 && (
                  <InfoField
                    label="Secondary SBUs"
                    value={
                      <div className="flex flex-wrap gap-1">
                        {employee.sbuMemberships
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
                <InfoField label="Department" value={employee.department?.name} />
                <InfoField label="Work Email" value={employee.workEmail} />
                {canViewSensitiveInfo && (
                  <InfoField
                    label="Personal Email"
                    value={employee.personalEmail}
                  />
                )}
                {canViewSensitiveInfo && (
                  <InfoField label="Phone" value={employee.phone} />
                )}
                {canViewSensitiveInfo && (
                  <InfoField label="Address" value={employee.address} />
                )}
                {canViewSensitiveInfo && (
                  <InfoField
                    label="Emergency Contact"
                    value={employee.emergencyContact}
                  />
                )}
                {canViewSensitiveInfo && (
                  <>
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
                  </>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Employment Tab */}
        {activeTab === "employment" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Employment Details</CardTitle>
              {isAdmin && employee.probationEndDate && (
                <Button size="sm" onClick={() => setProbationModalOpen(true)}>
                  Manage Probation
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <InfoField label="Employee ID" value={employee.employeeId} />
                <InfoField
                  label="Date of Hire"
                  value={formatDate(employee.dateOfHire)}
                />
                {canViewSensitiveInfo && (
                  <InfoField
                    label="Employment Type"
                    value={
                      <StatusBadge status={employee.employmentType} />
                    }
                  />
                )}
                <InfoField label="Primary SBU" value={employee.sbu?.name} />
                {employee.sbuMemberships && employee.sbuMemberships.filter(m => !m.isPrimary).length > 0 && (
                  <InfoField
                    label="Secondary SBUs"
                    value={
                      <div className="flex flex-wrap gap-1">
                        {employee.sbuMemberships
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
                <InfoField
                  label="Department"
                  value={employee.department?.name}
                />
                <InfoField label="Job Title" value={employee.jobTitle} />
                <InfoField
                  label="Supervisor"
                  value={employee.supervisor?.fullName}
                />
                {canViewSensitiveInfo && (
                  <InfoField
                    label="Work Arrangement"
                    value={
                      <StatusBadge status={employee.workArrangement} />
                    }
                  />
                )}
                <InfoField
                  label="Probation Period"
                  value={employee.probationPeriod ? `${employee.probationPeriod} Months` : undefined}
                />
                <InfoField
                  label="Probation End Date"
                  value={formatDate(employee.probationEndDate)}
                />
                <InfoField
                  label="Probation Status"
                  value={
                    employee.probationEndDate ? (
                      <StatusBadge
                        status={
                          new Date(employee.probationEndDate) <
                          new Date(new Date().setHours(0, 0, 0, 0))
                            ? "Overdue"
                            : "Probation"
                        }
                      />
                    ) : employee.probationPeriod && employee.probationPeriod > 0 ? (
                      <StatusBadge status="Confirmed" />
                    ) : (
                      "-"
                    )
                  }
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
          <CompensationSummary
            salaryBreakdown={employee.salaryBreakdown}
            currency={employee.currency}
            monthlySalary={employee.monthlySalary}
            netPay={employee.netPay}
            salaryBand={employee.salaryBand}
            salaryEffectiveDate={employee.salaryEffectiveDate}
            lastSalaryReview={employee.lastSalaryReview}
            accountName={employee.accountName}
            accountNumber={employee.accountNumber}
            bankName={employee.bankName}
          />
        )}


        {/* Salary History Tab */}
        {activeTab === "salary-history" && canViewCompensation && (
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
                            {formatCurrency(record.baseSalary, employee.currency || "NGN")}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatCurrency(record.grossPay, employee.currency || "NGN")}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatCurrency(record.netPay, employee.currency || "NGN")}
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

        {/* Timeline Tab */}
        {activeTab === "timeline" && canViewTimeline && (
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
                                      href={att.signedUrl || "#"}
                                      target="_blank"
                                      onClick={(e) => {
                                        if (!att.signedUrl) {
                                          e.preventDefault();
                                          toast.error("Attachment URL not available");
                                        }
                                      }}
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
        {activeTab === "discipline" && canViewDiscipline && (
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
                        <th className="px-4 py-3">Status</th>
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
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                action.status === "Approved"
                                  ? "success"
                                  : action.status === "Rejected"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {action.status}
                            </Badge>
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

        {/* Documents Tab */}
        {activeTab === "documents" && canViewDocuments && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <Button onClick={() => setUploadModalOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </CardHeader>
              <CardContent>
                <DocumentList employeeId={employeeId} />
              </CardContent>
            </Card>
          </div>
        )}

        <UploadDocumentModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          employeeId={employeeId}
        />

        <ProbationActionModal
          isOpen={probationModalOpen}
          onClose={() => setProbationModalOpen(false)}
          employeeId={employeeId}
          employeeName={employee.fullName}
        />

        {/* Team Tab */}
        {activeTab === "team" && (
          <Card>
            <CardHeader>
              <CardTitle>Direct Reports ({employee.subordinates?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!employee.subordinates?.length ? (
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
                      {employee.subordinates.map((sub) => (
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

        {/* Attendance Tab */}
        {activeTab === "attendance" && canViewAttendance && (
          <div className="space-y-6">
            <AttendanceHistoryTab employeeId={employeeId} />
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === "assets" && (isAdmin || isSBUHead || isSelf) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Issued Assets
              </CardTitle>
              {(isAdmin || isSBUHead) && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAssetId(null);
                    setAssetForm({ equipmentType: "", assetTag: "", brand: "", model: "", condition: "BrandNew", dateIssued: new Date().toISOString().split("T")[0], dateReturned: "", notes: "" });
                    setAssetModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Issue Asset
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {assetsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" variant="rectangular" />
                  ))}
                </div>
              ) : !assets || assets.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No assets issued to this employee
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Equipment</th>
                        <th className="px-4 py-3">Asset Tag</th>
                        <th className="px-4 py-3">Brand / Model</th>
                        <th className="px-4 py-3">Condition</th>
                        <th className="px-4 py-3">Date Issued</th>
                        <th className="px-4 py-3">Date Returned</th>
                        <th className="px-4 py-3">Status</th>
                        {(isAdmin || isSBUHead) && <th className="px-4 py-3" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{asset.equipmentType}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{asset.assetTag || "-"}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {[asset.brand, asset.model].filter(Boolean).join(" ") || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              asset.condition === "BrandNew" ? "bg-green-100 text-green-700" :
                              asset.condition === "Good" ? "bg-blue-100 text-blue-700" :
                              asset.condition === "Fair" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {asset.condition === "BrandNew" ? "Brand New" : asset.condition}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(asset.dateIssued)}</td>
                          <td className="px-4 py-3 text-gray-600">{asset.dateReturned ? formatDate(asset.dateReturned) : "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              asset.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                            }`}>
                              {asset.isActive ? "Active" : "Returned"}
                            </span>
                          </td>
                          {(isAdmin || isSBUHead) && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingAssetId(asset.id);
                                    setAssetForm({
                                      equipmentType: asset.equipmentType,
                                      assetTag: asset.assetTag || "",
                                      brand: asset.brand || "",
                                      model: asset.model || "",
                                      condition: asset.condition,
                                      dateIssued: asset.dateIssued.split("T")[0],
                                      dateReturned: asset.dateReturned ? asset.dateReturned.split("T")[0] : "",
                                      notes: asset.notes || "",
                                    });
                                    setAssetModalOpen(true);
                                  }}
                                  className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  title="Edit asset"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={async () => {
                                      if (!confirm("Delete this asset record?")) return;
                                      await deleteAsset.mutateAsync(asset.id);
                                    }}
                                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    title="Delete asset"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Asset Modal */}
        <Modal
          isOpen={assetModalOpen}
          onClose={() => { setAssetModalOpen(false); setEditingAssetId(null); }}
          title={editingAssetId ? "Edit Asset" : "Issue Asset"}
          size="md"
        >
          <div className="space-y-4">
            <Input
              label="Equipment Type"
              required
              placeholder="e.g. Laptop, Monitor, Phone"
              value={assetForm.equipmentType}
              onChange={(e) => setAssetForm((f) => ({ ...f, equipmentType: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Asset Tag / Serial No."
                placeholder="e.g. THL-001"
                value={assetForm.assetTag}
                onChange={(e) => setAssetForm((f) => ({ ...f, assetTag: e.target.value }))}
              />
              <Select
                label="Condition"
                options={[
                  { label: "Brand New", value: "BrandNew" },
                  { label: "Good", value: "Good" },
                  { label: "Fair", value: "Fair" },
                  { label: "Poor", value: "Poor" },
                ]}
                value={assetForm.condition}
                onChange={(e) => setAssetForm((f) => ({ ...f, condition: e.target.value as AssetCondition }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Brand"
                placeholder="e.g. Dell, Apple"
                value={assetForm.brand}
                onChange={(e) => setAssetForm((f) => ({ ...f, brand: e.target.value }))}
              />
              <Input
                label="Model"
                placeholder="e.g. XPS 15, MacBook Pro"
                value={assetForm.model}
                onChange={(e) => setAssetForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date Issued"
                type="date"
                required
                value={assetForm.dateIssued}
                onChange={(e) => setAssetForm((f) => ({ ...f, dateIssued: e.target.value }))}
              />
              <Input
                label="Date Returned"
                type="date"
                value={assetForm.dateReturned}
                onChange={(e) => setAssetForm((f) => ({ ...f, dateReturned: e.target.value }))}
              />
            </div>
            <Textarea
              label="Notes"
              placeholder="Additional notes..."
              rows={2}
              value={assetForm.notes}
              onChange={(e) => setAssetForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setAssetModalOpen(false); setEditingAssetId(null); }}>
                Cancel
              </Button>
              <Button
                loading={createAsset.isPending || updateAsset.isPending}
                onClick={async () => {
                  if (!assetForm.equipmentType || !assetForm.dateIssued) {
                    toast.error("Equipment type and date issued are required.");
                    return;
                  }
                  if (editingAssetId) {
                    await updateAsset.mutateAsync({
                      id: editingAssetId,
                      data: {
                        equipmentType: assetForm.equipmentType,
                        assetTag: assetForm.assetTag || undefined,
                        brand: assetForm.brand || undefined,
                        model: assetForm.model || undefined,
                        condition: assetForm.condition,
                        dateIssued: assetForm.dateIssued,
                        dateReturned: assetForm.dateReturned || null,
                        notes: assetForm.notes || undefined,
                        isActive: !assetForm.dateReturned,
                      },
                    });
                  } else {
                    await createAsset.mutateAsync({
                      employeeId,
                      equipmentType: assetForm.equipmentType,
                      assetTag: assetForm.assetTag || undefined,
                      brand: assetForm.brand || undefined,
                      model: assetForm.model || undefined,
                      condition: assetForm.condition,
                      dateIssued: assetForm.dateIssued,
                      notes: assetForm.notes || undefined,
                    });
                  }
                  setAssetModalOpen(false);
                  setEditingAssetId(null);
                }}
              >
                {editingAssetId ? "Save Changes" : "Issue Asset"}
              </Button>
            </div>
          </div>
        </Modal>

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
                        onClick={async () => {
                          try {
                            const url = await downloadOfferLetter.mutateAsync(employeeId);
                            if (url) window.open(url, "_blank");
                          } catch (e) {
                            console.error(e);
                            toast.error("Failed to download offer letter");
                          }
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
                          try {
                            await uploadOfferLetter.mutateAsync({ employeeId, file: offerLetterFile });
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

        {/* Audit Trail Tab */}
        {activeTab === "audit" && isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditLogList entityType="Employee" entityId={employeeId} />
            </CardContent>
          </Card>
        )}

        {/* Edit Modal */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Employee"
          size="lg"
          className="max-w-4xl"
        >
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)}>
            <Tabs
              tabs={formTabs}
              activeTab={editActiveTab}
              onChange={setEditActiveTab}
              className="mb-6"
            />

            {/* Personal Info Tab */}
            {editActiveTab === "personal" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Full Name"
                  required
                  error={editForm.formState.errors.fullName?.message}
                  {...editForm.register("fullName")}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  error={editForm.formState.errors.dateOfBirth?.message}
                  {...editForm.register("dateOfBirth")}
                />
                <Select
                  label="Gender"
                  options={genderOptions}
                  placeholder="Select gender"
                  error={editForm.formState.errors.gender?.message}
                  {...editForm.register("gender")}
                />
                <Input
                  label="Nationality"
                  error={editForm.formState.errors.nationality?.message}
                  {...editForm.register("nationality")}
                />
                <Input
                  label="Work Email"
                  type="email"
                  required
                  error={editForm.formState.errors.workEmail?.message}
                  {...editForm.register("workEmail")}
                />
                <Input
                  label="Personal Email"
                  type="email"
                  error={editForm.formState.errors.personalEmail?.message}
                  {...editForm.register("personalEmail")}
                />
                <Input
                  label="Phone"
                  type="tel"
                  error={editForm.formState.errors.phone?.message}
                  {...editForm.register("phone")}
                />
                <Input
                  label="Address"
                  error={editForm.formState.errors.address?.message}
                  {...editForm.register("address")}
                />
                <Select
                  label="Marital Status"
                  options={maritalStatusOptions}
                  placeholder="Select status"
                  error={editForm.formState.errors.maritalStatus?.message}
                  {...editForm.register("maritalStatus")}
                />
                <Input
                  label="Next of Kin Name"
                  error={editForm.formState.errors.nextOfKinName?.message}
                  {...editForm.register("nextOfKinName")}
                />
                <Input
                  label="Next of Kin Relationship"
                  error={editForm.formState.errors.nextOfKinRelationship?.message}
                  {...editForm.register("nextOfKinRelationship")}
                />
                <Input
                  label="Next of Kin Phone"
                  type="tel"
                  error={editForm.formState.errors.nextOfKinPhone?.message}
                  {...editForm.register("nextOfKinPhone")}
                />
                <Input
                  label="Emergency Contact"
                  type="tel"
                  error={editForm.formState.errors.emergencyContact?.message}
                  {...editForm.register("emergencyContact")}
                />
                <Input
                  label="Government ID"
                  error={editForm.formState.errors.governmentId?.message}
                  {...editForm.register("governmentId")}
                />
                <Input
                  label="TIN"
                  error={editForm.formState.errors.tin?.message}
                  {...editForm.register("tin")}
                />
                <Input
                  label="Pension Number"
                  error={editForm.formState.errors.pensionNumber?.message}
                  {...editForm.register("pensionNumber")}
                />
                <Input
                  label="HMO ID"
                  error={editForm.formState.errors.hmoId?.message}
                  {...editForm.register("hmoId")}
                />
              </div>
            )}

            {/* Employment Details Tab */}
            {editActiveTab === "employment" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Date of Hire"
                  type="date"
                  error={editForm.formState.errors.dateOfHire?.message}
                  {...editForm.register("dateOfHire")}
                />
                <Select
                  label="Employment Type"
                  options={employmentTypeOptions}
                  error={editForm.formState.errors.employmentType?.message}
                  {...editForm.register("employmentType")}
                />
                <Select
                  label="Primary SBU"
                  options={sbuOptions}
                  placeholder="Select SBU"
                  error={editForm.formState.errors.sbuId?.message}
                  {...editForm.register("sbuId")}
                />
                <MultiSelect
                  label="Secondary SBUs"
                  placeholder="Select additional SBUs"
                  options={sbuOptions.filter((o) => o.value !== selectedSbuId)}
                  value={editSecondarySbuIds}
                  onChange={setEditSecondarySbuIds}
                />
                <Select
                  label="Department"
                  options={departmentOptions}
                  placeholder="Select department"
                  error={editForm.formState.errors.departmentId?.message}
                  {...editForm.register("departmentId")}
                />
                <Input
                  label="Job Title"
                  required
                  error={editForm.formState.errors.jobTitle?.message}
                  {...editForm.register("jobTitle")}
                />
                <Select
                  label="Supervisor"
                  options={supervisorOptions}
                  placeholder="Select a supervisor"
                  error={editForm.formState.errors.supervisorId?.message}
                  {...editForm.register("supervisorId")}
                />
                <Select
                  label="Work Arrangement"
                  options={workArrangementOptions}
                  error={editForm.formState.errors.workArrangement?.message}
                  {...editForm.register("workArrangement")}
                />
                <Input
                  label="Probation End Date"
                  type="date"
                  error={editForm.formState.errors.probationEndDate?.message}
                  {...editForm.register("probationEndDate")}
                />
                <Select
                  label="Employment Status"
                  options={statusOptions}
                  error={editForm.formState.errors.employmentStatus?.message}
                  {...editForm.register("employmentStatus")}
                />
              </div>
            )}

            {/* Compensation Tab */}
            {editActiveTab === "compensation" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CurrencyInput
                    control={editForm.control}
                    name="monthlySalary"
                    label="Gross Pay"
                    currencyCode={editForm.watch("currency")}
                    error={editForm.formState.errors.monthlySalary?.message}
                  />
                  <CurrencyInput
                    control={editForm.control}
                    name="simpleNetPay"
                    label="Net Pay"
                    currencyCode={editForm.watch("currency")}
                    error={editForm.formState.errors.simpleNetPay?.message}
                  />
                  <Input
                    label="Salary Effective Date"
                    type="date"
                    error={editForm.formState.errors.salaryEffectiveDate?.message}
                    {...editForm.register("salaryEffectiveDate")}
                  />
                  <CurrencyInput
                    control={editForm.control}
                    name="baseSalary"
                    label="Base Salary (Breakdown)"
                    currencyCode={editForm.watch("currency")}
                    error={editForm.formState.errors.baseSalary?.message}
                  />
                  <CurrencyInput
                    control={editForm.control}
                    name="grossPay"
                    label="Gross Pay (Breakdown)"
                    currencyCode={editForm.watch("currency")}
                    error={editForm.formState.errors.grossPay?.message}
                  />
                  <CurrencyInput
                    control={editForm.control}
                    name="netPay"
                    label="Net Pay (Breakdown)"
                    currencyCode={editForm.watch("currency")}
                    error={editForm.formState.errors.netPay?.message}
                  />
                  <CurrencyInput
                    control={editForm.control}
                    name="pension"
                    label="Pension"
                    currencyCode={editForm.watch("currency")}
                    error={editForm.formState.errors.pension?.message}
                  />
                  <CurrencyInput
                    control={editForm.control}
                    name="tax"
                    label="Tax"
                    currencyCode={editForm.watch("currency")}
                    error={editForm.formState.errors.tax?.message}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Allowances</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendAllowance({ name: "", amount: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Allowance
                    </Button>
                  </div>
                  {allowanceFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Name"
                          error={editForm.formState.errors.allowances?.[index]?.name?.message}
                          {...editForm.register(`allowances.${index}.name`)}
                        />
                      </div>
                      <div className="flex-1">
                        <CurrencyInput
                          control={editForm.control}
                          name={`allowances.${index}.amount`}
                          currencyCode={editForm.watch("currency")}
                          error={editForm.formState.errors.allowances?.[index]?.amount?.message}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeAllowance(index)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Deductions</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendDeduction({ name: "", amount: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Deduction
                    </Button>
                  </div>
                  {deductionFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Name"
                          error={editForm.formState.errors.deductions?.[index]?.name?.message}
                          {...editForm.register(`deductions.${index}.name`)}
                        />
                      </div>
                      <div className="flex-1">
                        <CurrencyInput
                          control={editForm.control}
                          name={`deductions.${index}.amount`}
                          currencyCode={editForm.watch("currency")}
                          error={editForm.formState.errors.deductions?.[index]?.amount?.message}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeDeduction(index)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Salary Band"
                    placeholder="e.g. L3, L4"
                    error={editForm.formState.errors.salaryBand?.message}
                    {...editForm.register("salaryBand")}
                  />
                  <Select
                    label="Currency"
                    options={[
                      { label: "NGN - Nigerian Naira", value: "NGN" },
                      { label: "USD - US Dollar", value: "USD" },
                      { label: "GBP - British Pound", value: "GBP" },
                      { label: "EUR - Euro", value: "EUR" },
                    ]}
                    error={editForm.formState.errors.currency?.message}
                    {...editForm.register("currency")}
                  />
                  <Input
                    label="Account Name"
                    error={editForm.formState.errors.accountName?.message}
                    {...editForm.register("accountName")}
                  />
                  <Input
                    label="Account Number"
                    error={editForm.formState.errors.accountNumber?.message}
                    {...editForm.register("accountNumber")}
                  />
                  <Input
                    label="Bank Name"
                    error={editForm.formState.errors.bankName?.message}
                    {...editForm.register("bankName")}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={updateEmployee.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
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

        {/* Exit Employee Modal */}
        <Modal
          isOpen={exitModalOpen}
          onClose={() => setExitModalOpen(false)}
          title="Exit Employee"
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              This action will update the employee's status and send notification emails. It cannot be undone.
            </div>
            <Select
              label="Exit Type"
              required
              options={[
                { label: "Resignation (Voluntary)", value: "Resignation" },
                { label: "Termination (Dismissed)", value: "Termination" },
              ]}
              value={exitForm.exitType}
              onChange={(e) => setExitForm((f) => ({ ...f, exitType: e.target.value as "Resignation" | "Termination" }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Exit Date"
                type="date"
                required
                value={exitForm.exitDate}
                onChange={(e) => setExitForm((f) => ({ ...f, exitDate: e.target.value }))}
              />
              <Input
                label="Last Working Day"
                type="date"
                value={exitForm.lastWorkingDay}
                onChange={(e) => setExitForm((f) => ({ ...f, lastWorkingDay: e.target.value }))}
              />
            </div>
            <Textarea
              label="Reason"
              required
              placeholder={exitForm.exitType === "Resignation" ? "e.g. Personal reasons, better opportunity..." : "e.g. Performance issues, policy violation..."}
              rows={3}
              value={exitForm.reason}
              onChange={(e) => setExitForm((f) => ({ ...f, reason: e.target.value }))}
            />
            <Textarea
              label="Additional Notes"
              placeholder="Any additional details..."
              rows={2}
              value={exitForm.notes}
              onChange={(e) => setExitForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setExitModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={exitEmployee.isPending}
                onClick={async () => {
                  if (!exitForm.reason.trim()) {
                    toast.error("Reason is required.");
                    return;
                  }
                  await exitEmployee.mutateAsync({
                    id: employeeId,
                    data: {
                      exitType: exitForm.exitType,
                      exitDate: exitForm.exitDate,
                      reason: exitForm.reason,
                      lastWorkingDay: exitForm.lastWorkingDay || undefined,
                      notes: exitForm.notes || undefined,
                    },
                  });
                  setExitModalOpen(false);
                  toast.success(`Employee ${exitForm.exitType === "Termination" ? "terminated" : "resignation recorded"} successfully.`);
                }}
              >
                <LogOut className="h-4 w-4" />
                Confirm Exit
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
