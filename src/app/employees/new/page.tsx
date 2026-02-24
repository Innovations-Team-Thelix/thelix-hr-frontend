"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useCreateEmployee, useSbus, useDepartments, useAuth } from "@/hooks";

const createEmployeeSchema = z.object({
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

  dateOfHire: z.string().min(1, "Date of hire is required"),
  employmentType: z.string().default("FullTime"),
  sbuId: z.string().min(1, "SBU is required"),
  departmentId: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  supervisorId: z.string().optional(),
  workArrangement: z.string().default("Hybrid"),
  probationEndDate: z.string().optional(),
  employmentStatus: z.string().default("Active"),

  monthlySalary: z.string().optional(),
  salaryBand: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  currency: z.string().default("NGN"),
  salaryEffectiveDate: z.string().optional(),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

const formTabs = [
  { id: "personal", label: "Personal Info" },
  { id: "employment", label: "Employment Details" },
  { id: "compensation", label: "Compensation" },
];

export default function CreateEmployeePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");

  const { data: sbus } = useSbus();
  const createEmployee = useCreateEmployee();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      employmentType: "FullTime",
      workArrangement: "Hybrid",
      employmentStatus: "Active",
      currency: "NGN",
    },
  });

  const selectedSbuId = watch("sbuId");
  const { data: departments } = useDepartments(selectedSbuId);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "Admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const sbuOptions = (sbus || []).map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const departmentOptions = (departments || []).map((d) => ({
    label: d.name,
    value: d.id,
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

  const onSubmit = async (data: CreateEmployeeFormData) => {
    try {
      const payload: Record<string, unknown> = {
        ...data,
        monthlySalary: data.monthlySalary
          ? parseFloat(data.monthlySalary)
          : undefined,
        personalEmail: data.personalEmail || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        probationEndDate: data.probationEndDate || undefined,
        salaryEffectiveDate: data.salaryEffectiveDate || undefined,
        supervisorId: data.supervisorId || undefined,
      };

      // Remove empty strings
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") {
          delete payload[key];
        }
      });

      const employee = await createEmployee.mutateAsync(payload);
      toast.success("Employee created successfully");
      router.push(`/employees/${employee.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to create employee");
    }
  };

  return (
    <AppLayout pageTitle="Add Employee">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Add New Employee
            </h2>
            <p className="text-sm text-gray-500">
              Fill in the employee details below
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs
            tabs={formTabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-6"
          />

          {/* Personal Info Tab */}
          {activeTab === "personal" && (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Full Name"
                    required
                    error={errors.fullName?.message}
                    {...register("fullName")}
                  />
                  <Input
                    label="Date of Birth"
                    type="date"
                    error={errors.dateOfBirth?.message}
                    {...register("dateOfBirth")}
                  />
                  <Select
                    label="Gender"
                    options={genderOptions}
                    placeholder="Select gender"
                    error={errors.gender?.message}
                    {...register("gender")}
                  />
                  <Input
                    label="Nationality"
                    error={errors.nationality?.message}
                    {...register("nationality")}
                  />
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
                  <Input
                    label="Phone"
                    type="tel"
                    error={errors.phone?.message}
                    {...register("phone")}
                  />
                  <Input
                    label="Address"
                    error={errors.address?.message}
                    {...register("address")}
                  />
                  <Select
                    label="Marital Status"
                    options={maritalStatusOptions}
                    placeholder="Select status"
                    error={errors.maritalStatus?.message}
                    {...register("maritalStatus")}
                  />
                  <Input
                    label="Next of Kin Name"
                    error={errors.nextOfKinName?.message}
                    {...register("nextOfKinName")}
                  />
                  <Input
                    label="Next of Kin Relationship"
                    error={errors.nextOfKinRelationship?.message}
                    {...register("nextOfKinRelationship")}
                  />
                  <Input
                    label="Next of Kin Phone"
                    type="tel"
                    error={errors.nextOfKinPhone?.message}
                    {...register("nextOfKinPhone")}
                  />
                  <Input
                    label="Emergency Contact"
                    type="tel"
                    error={errors.emergencyContact?.message}
                    {...register("emergencyContact")}
                  />
                  <Input
                    label="Government ID"
                    error={errors.governmentId?.message}
                    {...register("governmentId")}
                  />
                  <Input
                    label="TIN"
                    error={errors.tin?.message}
                    {...register("tin")}
                  />
                  <Input
                    label="Pension Number"
                    error={errors.pensionNumber?.message}
                    {...register("pensionNumber")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employment Details Tab */}
          {activeTab === "employment" && (
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Date of Hire"
                    type="date"
                    required
                    error={errors.dateOfHire?.message}
                    {...register("dateOfHire")}
                  />
                  <Select
                    label="Employment Type"
                    options={employmentTypeOptions}
                    error={errors.employmentType?.message}
                    {...register("employmentType")}
                  />
                  <Select
                    label="SBU"
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
                    placeholder="Select department"
                    error={errors.departmentId?.message}
                    {...register("departmentId")}
                  />
                  <Input
                    label="Job Title"
                    required
                    error={errors.jobTitle?.message}
                    {...register("jobTitle")}
                  />
                  <Input
                    label="Supervisor ID"
                    placeholder="Enter supervisor UUID"
                    error={errors.supervisorId?.message}
                    {...register("supervisorId")}
                  />
                  <Select
                    label="Work Arrangement"
                    options={workArrangementOptions}
                    error={errors.workArrangement?.message}
                    {...register("workArrangement")}
                  />
                  <Input
                    label="Probation End Date"
                    type="date"
                    error={errors.probationEndDate?.message}
                    {...register("probationEndDate")}
                  />
                  <Select
                    label="Employment Status"
                    options={statusOptions}
                    error={errors.employmentStatus?.message}
                    {...register("employmentStatus")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compensation Tab */}
          {activeTab === "compensation" && (
            <Card>
              <CardHeader>
                <CardTitle>Compensation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Input
                    label="Monthly Salary"
                    type="number"
                    error={errors.monthlySalary?.message}
                    {...register("monthlySalary")}
                  />
                  <Input
                    label="Salary Band"
                    placeholder="e.g. L3, L4"
                    error={errors.salaryBand?.message}
                    {...register("salaryBand")}
                  />
                  <Select
                    label="Currency"
                    options={[
                      { label: "NGN - Nigerian Naira", value: "NGN" },
                      { label: "USD - US Dollar", value: "USD" },
                      { label: "GBP - British Pound", value: "GBP" },
                      { label: "EUR - Euro", value: "EUR" },
                    ]}
                    error={errors.currency?.message}
                    {...register("currency")}
                  />
                  <Input
                    label="Account Name"
                    error={errors.accountName?.message}
                    {...register("accountName")}
                  />
                  <Input
                    label="Account Number"
                    error={errors.accountNumber?.message}
                    {...register("accountNumber")}
                  />
                  <Input
                    label="Bank Name"
                    error={errors.bankName?.message}
                    {...register("bankName")}
                  />
                  <Input
                    label="Salary Effective Date"
                    type="date"
                    error={errors.salaryEffectiveDate?.message}
                    {...register("salaryEffectiveDate")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createEmployee.isPending}
            >
              <Save className="h-4 w-4" />
              Create Employee
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
