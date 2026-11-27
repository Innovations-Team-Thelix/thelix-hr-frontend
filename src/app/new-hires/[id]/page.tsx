"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { ArrowLeft, ExternalLink, UserCheck, UserPlus, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/loading";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useAuth, useDepartments, useEffectiveRole, useEmployees, useSbus } from "@/hooks";
import { NEW_HIRE_ROLES, useConvertNewHire, useDismissNewHire, useNewHire } from "@/hooks/useNewHires";
import type { NewHire } from "@/types/new-hires";

// The Add Employee rules (src/app/employees/new/page.tsx) for the fields HR
// completes here; the API validates the result with createEmployeeSchema.
const convertSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  personalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  workEmail: z.string().email("Valid work email is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  dateOfHire: z.string().min(1, "Date of hire is required"),
  employmentType: z.string().min(1, "Employment type is required"),
  sbuId: z.string().min(1, "SBU is required"),
  departmentId: z.string().min(1, "Department is required"),
  supervisorId: z.string().optional(),
  workArrangement: z.string().default("Hybrid"),
  probationPeriod: z.string().optional(),
  monthlySalary: z.string().optional().or(z.literal("")),
  currency: z.string().default("NGN"),
});

type ConvertFormData = z.infer<typeof convertSchema>;

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

const probationOptions = [
  { label: "No probation", value: "" },
  { label: "3 months", value: "3" },
  { label: "6 months", value: "6" },
  { label: "12 months", value: "12" },
];

const currencyOptions = [
  { label: "NGN", value: "NGN" },
  { label: "USD", value: "USD" },
  { label: "GBP", value: "GBP" },
];

function defaultsFrom(n: NewHire): Partial<ConvertFormData> {
  return {
    fullName: n.fullName,
    personalEmail: n.personalEmail,
    phone: n.phone ?? "",
    jobTitle: n.jobTitle,
    dateOfHire: n.proposedStartDate ? n.proposedStartDate.slice(0, 10) : "",
    employmentType: n.employmentType ?? "FullTime",
    workArrangement: "Hybrid",
    monthlySalary: n.offerSalary !== null ? String(n.offerSalary) : "",
    currency: n.currency ?? "NGN",
  };
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}

export default function NewHireDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole();
  const allowed = !!effectiveRole && NEW_HIRE_ROLES.includes(effectiveRole);

  useEffect(() => {
    if (user && !allowed) router.push("/dashboard");
  }, [user, allowed, router]);

  const { data: newHire, isLoading } = useNewHire(id);

  return (
    <AppLayout pageTitle="New Hire">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/new-hires")}>
            <ArrowLeft className="h-4 w-4" />
            New Hires
          </Button>
          {newHire && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{newHire.fullName}</h2>
              <p className="text-sm text-gray-500">
                {newHire.jobTitle}
                {newHire.companyName ? ` · ${newHire.companyName}` : ""}
              </p>
            </div>
          )}
        </div>

        {isLoading || !newHire ? (
          <div className="flex justify-center py-12">
            {isLoading ? <Spinner /> : <p className="text-sm text-gray-500">New hire not found.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <TalentCard newHire={newHire} />
            <div className="lg:col-span-2">
              {newHire.status === "pending" ? (
                <ConvertForm newHire={newHire} />
              ) : (
                <OutcomeCard newHire={newHire} />
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function TalentCard({ newHire: n }: { newHire: NewHire }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>From Thelix Talent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Detail label="Personal email" value={n.personalEmail} />
        <Detail label="Phone" value={n.phone} />
        <Detail label="Job title" value={n.jobTitle} />
        <Detail label="Company" value={n.companyName} />
        <Detail label="Department (Talent)" value={n.department} />
        <Detail label="Location" value={n.location} />
        <Detail
          label="Proposed start"
          value={n.proposedStartDate ? dayjs(n.proposedStartDate).format("MMM D, YYYY") : null}
        />
        <Detail
          label="Offer"
          value={n.offerSalary !== null ? `${n.currency ?? ""} ${n.offerSalary.toLocaleString()}`.trim() : null}
        />
        <Detail label="Notes" value={n.notes} />
        <Detail label="Received" value={dayjs(n.createdAt).format("MMM D, YYYY h:mm A")} />
        {n.talentUrl && (
          <a
            href={n.talentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open in Talent <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function OutcomeCard({ newHire: n }: { newHire: NewHire }) {
  const converted = n.status === "converted";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {converted ? <UserCheck className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-gray-400" />}
          {converted ? "Converted to an employee" : "Dismissed"}
          <Badge variant={converted ? "success" : "neutral"}>{converted ? "Converted" : "Dismissed"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Detail
          label={converted ? "Converted by" : "Dismissed by"}
          value={
            n.handledBy
              ? `${n.handledBy.fullName}${n.handledAt ? ` on ${dayjs(n.handledAt).format("MMM D, YYYY")}` : ""}`
              : null
          }
        />
        {!converted && <Detail label="Reason" value={n.dismissReason} />}
        {converted && n.employee && (
          <Link href={`/employees/${n.employee.id}`}>
            <Button>
              <UserCheck className="h-4 w-4" />
              View {n.employee.fullName} ({n.employee.employeeId})
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function ConvertForm({ newHire }: { newHire: NewHire }) {
  const router = useRouter();
  const convert = useConvertNewHire(newHire.id);
  const dismiss = useDismissNewHire(newHire.id);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: sbus } = useSbus();
  const { data: employeesData } = useEmployees({ limit: 1000, status: "Active" });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ConvertFormData>({
    resolver: zodResolver(convertSchema),
    defaultValues: defaultsFrom(newHire),
  });

  const selectedSbuId = useWatch({ control, name: "sbuId" });
  const currency = useWatch({ control, name: "currency" }) || "NGN";
  const { data: departments } = useDepartments(selectedSbuId || undefined);

  // A department belongs to one SBU: clear it when the SBU changes.
  useEffect(() => {
    setValue("departmentId", "");
  }, [selectedSbuId, setValue]);

  const sbuOptions = (sbus || []).map((s) => ({ label: s.name, value: s.id }));
  const departmentOptions = (departments || []).map((d) => ({ label: d.name, value: d.id }));
  const supervisorOptions = (employeesData?.data || []).map((e) => ({
    label: `${e.fullName} (${e.jobTitle})`,
    value: e.id,
  }));

  const onSubmit = async (data: ConvertFormData) => {
    const grossPayNum = data.monthlySalary ? parseFloat(data.monthlySalary) : 0;
    // Same payload rules as Add Employee: explicit nulls for empty optionals;
    // gross pay alone gets the standard split on the server.
    const payload: Record<string, unknown> = {
      fullName: data.fullName,
      personalEmail: data.personalEmail || null,
      phone: data.phone || null,
      workEmail: data.workEmail,
      jobTitle: data.jobTitle,
      dateOfHire: data.dateOfHire,
      employmentType: data.employmentType,
      sbuId: data.sbuId,
      departmentId: data.departmentId,
      supervisorId: data.supervisorId || null,
      workArrangement: data.workArrangement || "Hybrid",
      probationPeriod: data.probationPeriod ? parseInt(data.probationPeriod) : null,
      monthlySalary: grossPayNum || null,
      currency: data.currency || "NGN",
    };
    if (grossPayNum) payload.grossPay = grossPayNum;
    try {
      const result = await convert.mutateAsync(payload);
      toast.success("Employee created from new hire");
      router.push(`/employees/${result.employee.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; code?: number } } };
      // 422 validation errors are handled globally by the API interceptor
      if (err.response?.data?.code !== 422) {
        toast.error(err.response?.data?.message || "Failed to create employee");
      }
    }
  };

  const onDismiss = async () => {
    try {
      await dismiss.mutateAsync(reason.trim());
      toast.success("New hire dismissed");
      setDismissOpen(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; code?: number } } };
      if (err.response?.data?.code !== 422) {
        toast.error(err.response?.data?.message || "Failed to dismiss new hire");
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Complete as employee
            </CardTitle>
            <p className="text-sm text-gray-500">
              Prefilled from Talent. Choose the SBU, department, supervisor and work email; the employee gets the same
              portal account and welcome email as Add Employee.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Full Name" required error={errors.fullName?.message} {...register("fullName")} />
              <Input
                label="Work Email"
                type="email"
                required
                error={errors.workEmail?.message}
                {...register("workEmail")}
              />
              <Input
                label="Personal Email"
                type="email"
                error={errors.personalEmail?.message}
                {...register("personalEmail")}
              />
              <Input label="Phone" type="tel" error={errors.phone?.message} {...register("phone")} />
              <Input label="Job Title" required error={errors.jobTitle?.message} {...register("jobTitle")} />
              <Input
                label="Date of Hire"
                type="date"
                required
                error={errors.dateOfHire?.message}
                {...register("dateOfHire")}
              />
              <Select
                label="Primary SBU"
                required
                options={sbuOptions}
                placeholder="Select SBU"
                error={errors.sbuId?.message}
                {...register("sbuId")}
              />
              <Select
                label="Department"
                required
                options={departmentOptions}
                placeholder={selectedSbuId ? "Select department" : "Select an SBU first"}
                disabled={!selectedSbuId}
                error={errors.departmentId?.message}
                {...register("departmentId")}
              />
              <Select
                label="Supervisor"
                options={supervisorOptions}
                placeholder="Select supervisor"
                error={errors.supervisorId?.message}
                {...register("supervisorId")}
              />
              <Select
                label="Employment Type"
                required
                options={employmentTypeOptions}
                searchable={false}
                error={errors.employmentType?.message}
                {...register("employmentType")}
              />
              <Select
                label="Work Arrangement"
                options={workArrangementOptions}
                searchable={false}
                error={errors.workArrangement?.message}
                {...register("workArrangement")}
              />
              <Select
                label="Probation Period"
                options={probationOptions}
                searchable={false}
                placeholder="No probation"
                error={errors.probationPeriod?.message}
                {...register("probationPeriod")}
              />
              <CurrencyInput
                control={control}
                name="monthlySalary"
                label="Gross Pay"
                currencyCode={currency}
                error={errors.monthlySalary?.message}
              />
              <Select
                label="Currency"
                options={currencyOptions}
                searchable={false}
                error={errors.currency?.message}
                {...register("currency")}
              />
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Bank details, next of kin and the full salary breakdown can be added on the employee profile afterwards.
            </p>
          </CardContent>
        </Card>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setDismissOpen(true)}>
            <XCircle className="h-4 w-4" />
            Dismiss
          </Button>
          <Button type="submit" loading={convert.isPending}>
            <UserCheck className="h-4 w-4" />
            Create employee
          </Button>
        </div>
      </form>

      <Modal
        isOpen={dismissOpen}
        onClose={() => setDismissOpen(false)}
        title="Dismiss new hire"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDismissOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onDismiss}
              disabled={!reason.trim()}
              loading={dismiss.isPending}
            >
              Dismiss
            </Button>
          </div>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          {newHire.fullName} will not be added as an employee. Talent is told the reason.
        </p>
        <Textarea
          label="Reason"
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Candidate declined the offer"
        />
      </Modal>
    </>
  );
}
