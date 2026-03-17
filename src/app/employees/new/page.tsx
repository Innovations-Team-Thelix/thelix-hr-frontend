"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useCreateEmployee, useSbus, useDepartments, useAuth, useEmployees, useEffectiveRole } from "@/hooks";

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
  hmoId: z.string().optional(),

  dateOfHire: z.string().min(1, "Date of hire is required"),
  employmentType: z.string().default("FullTime"),
  sbuId: z.string().min(1, "SBU is required"),
  departmentId: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  supervisorId: z.string().optional(),
  workArrangement: z.string().default("Hybrid"),
  probationPeriod: z.string().optional(),
  probationEndDate: z.string().optional(),
  employmentStatus: z.string().default("Active"),
  
  monthlySalary: z.string().optional().or(z.literal("")),
  baseSalary: z.string().optional().or(z.literal("")),
  grossPay: z.string().optional().or(z.literal("")),
  netPay: z.string().optional().or(z.literal("")),
  simpleNetPay: z.string().optional().or(z.literal("")),
  pension: z.string().optional(),
  tax: z.string().optional(),
  allowances: z.array(z.object({ name: z.string(), amount: z.string() })).default([]),
  deductions: z.array(z.object({ name: z.string(), amount: z.string() })).default([]),
  
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
  const effectiveRole = useEffectiveRole();
  const [activeTab, setActiveTab] = useState("personal");

  const { data: sbus } = useSbus();
  const { data: employeesData } = useEmployees({ limit: 1000, status: "Active" });
  const createEmployee = useCreateEmployee();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      employmentType: "FullTime",
      workArrangement: "Hybrid",
      employmentStatus: "Active",
      currency: "NGN",
      allowances: [],
      deductions: [],
    },
  });

  const { fields: allowanceFields, append: appendAllowance, remove: removeAllowance } = useFieldArray({
    control,
    name: "allowances",
  });

  const { fields: deductionFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({
    control,
    name: "deductions",
  });

  const selectedSbuId = watch("sbuId");
  const { data: departments } = useDepartments(selectedSbuId);

  // Redirect non-admin users
  useEffect(() => {
    if (user && effectiveRole !== "Admin") {
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

  const supervisorOptions = (employeesData?.data || []).map((e) => ({
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

  const onSubmit = async (data: CreateEmployeeFormData) => {
    try {
      // Base payload with explicit nulls for optional fields
      const payload: Record<string, unknown> = {
        ...data,
        // Personal
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        nationality: data.nationality || null,
        address: data.address || null,
        phone: data.phone || null,
        personalEmail: data.personalEmail || null,
        maritalStatus: data.maritalStatus || null,
        nextOfKinName: data.nextOfKinName || null,
        nextOfKinRelationship: data.nextOfKinRelationship || null,
        nextOfKinPhone: data.nextOfKinPhone || null,
        emergencyContact: data.emergencyContact || null,
        governmentId: data.governmentId || null,
        tin: data.tin || null,
        pensionNumber: data.pensionNumber || null,
        hmoId: data.hmoId || null,
        
        // Employment
        supervisorId: data.supervisorId || null,
        probationPeriod: data.probationPeriod ? parseInt(data.probationPeriod) : null,
        probationEndDate: data.probationEndDate || null,
        
        // Compensation
        monthlySalary: data.monthlySalary ? parseFloat(data.monthlySalary) : null,
        netPay: data.netPay
          ? parseFloat(data.netPay)
          : (data.simpleNetPay ? parseFloat(data.simpleNetPay) : null),
        salaryBand: data.salaryBand || null,
        accountName: data.accountName || null,
        accountNumber: data.accountNumber || null,
        bankName: data.bankName || null,
        salaryEffectiveDate: data.salaryEffectiveDate || null,
        currency: data.currency || "NGN",
      };

      // Construct salaryBreakdown if any salary fields are present
      if (data.baseSalary || data.grossPay || data.allowances.length > 0 || data.deductions.length > 0) {
        payload.salaryBreakdown = {
          baseSalary: parseFloat(data.baseSalary || "0"),
          grossPay: parseFloat(data.grossPay || "0"),
          netPay: parseFloat(data.netPay || "0"),
          pension: parseFloat(data.pension || "0"),
          tax: parseFloat(data.tax || "0"),
          allowances: data.allowances.map((a) => ({
            name: a.name,
            amount: parseFloat(a.amount || "0"),
          })),
          deductions: data.deductions.map((d) => ({
            name: d.name,
            amount: parseFloat(d.amount || "0"),
          })),
          effectiveDate: data.salaryEffectiveDate || new Date().toISOString(),
        };
      }

      // Remove helper fields that are not part of the Employee entity
      delete payload.simpleNetPay;
      delete payload.baseSalary;
      delete payload.grossPay;
      delete payload.allowances;
      delete payload.deductions;
      delete payload.pension;
      delete payload.tax;

      // Remove any remaining empty strings (just in case)
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") {
          payload[key] = null;
        }
      });

      const employee = await createEmployee.mutateAsync(payload);
      toast.success("Employee created successfully");
      router.push(`/employees/${employee.id}`);
    } catch (error: unknown) {
      console.error("Create employee error:", error);
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
                  <Input
                    label="HMO ID"
                    error={errors.hmoId?.message}
                    {...register("hmoId")}
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
                  <Select
                    label="Supervisor"
                    options={supervisorOptions}
                    placeholder="Select a supervisor"
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
                    label="Probation Period (Months)"
                    type="number"
                    error={errors.probationPeriod?.message}
                    {...register("probationPeriod")}
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Compensation Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Gross Pay"
                      type="number"
                      error={errors.monthlySalary?.message}
                      {...register("monthlySalary")}
                    />
                    <Input
                      label="Net Pay"
                      type="number"
                      error={errors.simpleNetPay?.message}
                      {...register("simpleNetPay")}
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

              <Card>
                <CardHeader>
                  <CardTitle>Salary Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Input
                      label="Base Salary"
                      type="number"
                      error={errors.baseSalary?.message}
                      {...register("baseSalary")}
                    />
                    <Input
                      label="Gross Pay"
                      type="number"
                      error={errors.grossPay?.message}
                      {...register("grossPay")}
                    />
                    <Input
                      label="Net Pay"
                      type="number"
                      error={errors.netPay?.message}
                      {...register("netPay")}
                    />
                    <Input
                      label="Pension"
                      type="number"
                      error={errors.pension?.message}
                      {...register("pension")}
                    />
                    <Input
                      label="Tax"
                      type="number"
                      error={errors.tax?.message}
                      {...register("tax")}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Allowances */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-semibold">
                      Allowances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {allowanceFields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-3">
                          <div className="flex-1">
                            <Input
                              label={index === 0 ? "Name" : undefined}
                              placeholder="Name"
                              error={errors.allowances?.[index]?.name?.message}
                              {...register(`allowances.${index}.name`)}
                            />
                          </div>
                          <div className="w-32">
                            <Input
                              label={index === 0 ? "Amount" : undefined}
                              type="number"
                              placeholder="0.00"
                              error={
                                errors.allowances?.[index]?.amount?.message
                              }
                              {...register(`allowances.${index}.amount`)}
                            />
                          </div>
                          <div className={index === 0 ? "mt-8" : "mt-1"}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => removeAllowance(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          appendAllowance({ name: "", amount: "" })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Allowance
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Deductions */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-semibold">
                      Deductions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {deductionFields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-3">
                          <div className="flex-1">
                            <Input
                              label={index === 0 ? "Name" : undefined}
                              placeholder="Name"
                              error={errors.deductions?.[index]?.name?.message}
                              {...register(`deductions.${index}.name`)}
                            />
                          </div>
                          <div className="w-32">
                            <Input
                              label={index === 0 ? "Amount" : undefined}
                              type="number"
                              placeholder="0.00"
                              error={
                                errors.deductions?.[index]?.amount?.message
                              }
                              {...register(`deductions.${index}.amount`)}
                            />
                          </div>
                          <div className={index === 0 ? "mt-8" : "mt-1"}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => removeDeduction(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          appendDeduction({ name: "", amount: "" })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Deduction
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
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
