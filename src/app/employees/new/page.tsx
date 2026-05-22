"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Save, Plus, UserPlus, Search, ChevronDown, X } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useCreateEmployee, useCreateDepartment, useSbus, useDepartments, useAuth, useEmployees, useEffectiveRole } from "@/hooks";
import { CurrencyInput } from "@/components/ui/currency-input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/loading";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BankAccountFields } from "@/components/shared/bank-account-fields";

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
  employmentType: z.string().min(1, "Employment type is required"),
  sbuId: z.string().min(1, "SBU is required"),
  departmentId: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  supervisorId: z.string().optional(),
  workArrangement: z.string().default("Hybrid"),
  probationPeriod: z.string().optional(),
  probationEndDate: z.string().optional(),
  employmentStatus: z.string().default("Active"),
  role: z.string().default("Employee"),
  
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
  commission: z.string().optional(),
  withholdingTax: z.string().optional(),
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
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [supervisorOpen, setSupervisorOpen] = useState(false);
  const [supervisorValue, setSupervisorValue] = useState("");
  const supervisorRef = useRef<HTMLDivElement>(null);

  const [deptOpen, setDeptOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");
  const [deptValue, setDeptValue] = useState("");
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptSbuId, setNewDeptSbuId] = useState("");
  const [newDeptMinOnsite, setNewDeptMinOnsite] = useState("0");
  const deptRef = useRef<HTMLDivElement>(null);
  const createDepartment = useCreateDepartment();

  const { data: sbus } = useSbus();
  const { data: employeesData } = useEmployees({ limit: 1000, status: "Active" });
  const createEmployee = useCreateEmployee();
  const [secondarySbuIds, setSecondarySbuIds] = useState<string[]>([]);

  interface GrossBreakdown {
    basicSalary: number;
    allowancesBreakdown: { name: string; amount: number }[];
    grossPay: number;
    pension: number;
    employerPension: number;
    totalPension: number;
    paye: number;
    totalDeductions: number;
    netPay60: number;
  }
  const [grossBreakdown, setGrossBreakdown] = useState<GrossBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
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

  const selectedSbuId = watch("sbuId");
  const { data: departments } = useDepartments(selectedSbuId);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (supervisorRef.current && !supervisorRef.current.contains(e.target as Node)) {
        setSupervisorOpen(false);
      }
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
        setShowCreateDept(false);
        setNewDeptName("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    if (user && effectiveRole !== "Admin" && effectiveRole !== "CVO") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const watchedGrossPay = watch("monthlySalary");
  useEffect(() => {
    const grossPay = parseFloat(watchedGrossPay || "0");
    if (!grossPay || grossPay <= 0) {
      setGrossBreakdown(null);
      return;
    }
    setBreakdownLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<GrossBreakdown>("/payroll/gross-breakdown", {
          params: { grossPay },
        });
        setGrossBreakdown(res.data);
      } catch {
        // silently ignore
      } finally {
        setBreakdownLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedGrossPay]);

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

  const roleOptions = [
    { label: "CVO / CEO", value: "CVO" },
    { label: "Admin", value: "Admin" },
    { label: "Finance", value: "Finance" },
    { label: "SBU Head", value: "SBUHead" },
    { label: "Employee", value: "Employee" },
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

  const PERSONAL_FIELDS = ["fullName", "workEmail", "dateOfBirth", "gender", "nationality", "address", "phone", "personalEmail", "maritalStatus", "nextOfKinName", "nextOfKinRelationship", "nextOfKinPhone", "emergencyContact", "governmentId", "tin", "pensionNumber", "hmoId"];
  const EMPLOYMENT_FIELDS = ["dateOfHire", "employmentType", "sbuId", "departmentId", "jobTitle", "supervisorId", "workArrangement", "probationPeriod", "probationEndDate", "employmentStatus", "role"];

  const onFormError = (errs: typeof errors) => {
    const errorKeys = Object.keys(errs);
    if (errorKeys.some((k) => EMPLOYMENT_FIELDS.includes(k))) {
      setActiveTab("employment");
      toast.error("Please fill in the required Employment Details fields.");
    } else if (errorKeys.some((k) => PERSONAL_FIELDS.includes(k))) {
      setActiveTab("personal");
      toast.error("Please fill in the required Personal Info fields.");
    } else {
      setActiveTab("compensation");
      toast.error("Please check the Compensation fields.");
    }
  };

  const onSubmit = async (data: CreateEmployeeFormData) => {
    try {
      const grossPayNum = data.monthlySalary ? parseFloat(data.monthlySalary) : 0;
      const commissionNum = data.commission ? parseFloat(data.commission) : 0;
      const withholdingNum = data.withholdingTax ? parseFloat(data.withholdingTax) : 0;
      const r2 = (n: number) => Math.round(n * 100) / 100;

      const standardAllowances = grossPayNum > 0 ? [
        { name: "Housing",   amount: r2(grossPayNum * 0.20) },
        { name: "Transport", amount: r2(grossPayNum * 0.15) },
        { name: "Wardrobe",  amount: r2(grossPayNum * 0.10) },
        { name: "Meal",      amount: r2(grossPayNum * 0.10) },
        { name: "Utility",   amount: r2(grossPayNum * 0.10) },
      ] : [];
      const allAllowances = [
        ...standardAllowances,
        ...(commissionNum > 0 ? [{ name: "Commission", amount: commissionNum }] : []),
      ];
      const allDeductions = withholdingNum > 0
        ? [{ name: "Withholding Tax", amount: withholdingNum }]
        : [];

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

        // Compensation — auto-calculated structure
        monthlySalary: grossPayNum || null,
        grossPay: grossPayNum || undefined,
        baseSalary: grossPayNum ? r2(grossPayNum * 0.35) : undefined,
        allowances: allAllowances.length > 0 ? allAllowances : undefined,
        deductions: allDeductions.length > 0 ? allDeductions : undefined,
        salaryBand: data.salaryBand || null,
        accountName: data.accountName || null,
        accountNumber: data.accountNumber || null,
        bankName: data.bankName || null,
        salaryEffectiveDate: data.salaryEffectiveDate || null,
        currency: data.currency || "NGN",
      };

      // Remove form-only fields not in the backend schema
      const netPay40FromForm = data.simpleNetPay ? parseFloat(data.simpleNetPay) || 0 : 0;
      delete payload.simpleNetPay;
      delete payload.netPay;
      delete payload.baseSalary;
      delete payload.pension;
      delete payload.tax;
      delete payload.commission;
      delete payload.withholdingTax;
      // Re-add the computed ones
      if (grossPayNum) payload.baseSalary = r2(grossPayNum * 0.35);
      if (grossPayNum) payload.netPay40 = netPay40FromForm;
      if (allAllowances.length > 0) payload.allowances = allAllowances;
      if (allDeductions.length > 0) payload.deductions = allDeductions;

      // Attach secondary SBU assignments
      if (secondarySbuIds.length > 0) {
        payload.secondarySbuIds = secondarySbuIds;
      }

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
      const err = error as { response?: { data?: { message?: string; code?: number } } };
      // 422 validation errors are handled globally by the API interceptor
      if (err.response?.data?.code !== 422) {
        toast.error(err.response?.data?.message || "Failed to create employee");
      }
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

        <form
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }}
        >
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
                    searchable={false}
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
                    placeholder="Select marital status"
                    searchable={false}
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
                    required
                    options={employmentTypeOptions}
                    error={errors.employmentType?.message}
                    {...register("employmentType")}
                  />
                  <Select
                    label="Primary SBU"
                    required
                    options={sbuOptions}
                    placeholder="Select SBU"
                    error={errors.sbuId?.message}
                    {...register("sbuId")}
                  />
                  <MultiSelect
                    label="Secondary SBUs"
                    placeholder="Select additional SBUs"
                    options={sbuOptions.filter((o) => o.value !== selectedSbuId)}
                    value={secondarySbuIds}
                    onChange={setSecondarySbuIds}
                  />
                  {/* Searchable Department Combobox with inline create */}
                  <div className="flex flex-col gap-1" ref={deptRef}>
                    <label className="text-sm font-medium text-gray-700">Department <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setDeptOpen((o) => !o); setDeptSearch(""); }}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-left transition-colors hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        <span className={deptValue ? "text-gray-900" : "text-gray-400"}>
                          {deptValue
                            ? departmentOptions.find((o) => o.value === deptValue)?.label ?? "Select department"
                            : "Select department"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {deptValue && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeptValue("");
                                setValue("departmentId", "");
                              }}
                              className="rounded p-0.5 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${deptOpen ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {deptOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search department..."
                                value={deptSearch}
                                onChange={(e) => setDeptSearch(e.target.value)}
                                className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </div>
                          </div>
                          <ul className="max-h-52 overflow-y-auto py-1">
                            {departmentOptions
                              .filter((o) =>
                                o.label.toLowerCase().includes(deptSearch.toLowerCase())
                              )
                              .map((o) => (
                                <li
                                  key={o.value}
                                  onClick={() => {
                                    setDeptValue(o.value);
                                    setValue("departmentId", o.value);
                                    setDeptOpen(false);
                                    setDeptSearch("");
                                  }}
                                  className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-primary-50 hover:text-primary-900 ${
                                    deptValue === o.value ? "bg-primary-50 text-primary-900 font-medium" : "text-gray-700"
                                  }`}
                                >
                                  {o.label}
                                </li>
                              ))}
                            {departmentOptions.filter((o) =>
                              o.label.toLowerCase().includes(deptSearch.toLowerCase())
                            ).length === 0 && (
                              <li className="px-3 py-4 text-center text-sm text-gray-400">No departments found</li>
                            )}
                          </ul>
                          {/* Create new department */}
                          <div className="border-t border-gray-100 p-2">
                            <button
                              type="button"
                              onClick={() => { setShowCreateDept(true); setNewDeptName(deptSearch); setNewDeptSbuId(selectedSbuId || ""); setNewDeptMinOnsite("0"); setDeptOpen(false); }}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                            >
                              <Plus className="h-4 w-4" />
                              Create new department
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.departmentId && (
                      <p className="text-xs text-red-600">{errors.departmentId.message}</p>
                    )}
                  </div>
                  <Input
                    label="Job Title"
                    required
                    error={errors.jobTitle?.message}
                    {...register("jobTitle")}
                  />
                  {/* Searchable Supervisor Combobox */}
                  <div className="flex flex-col gap-1" ref={supervisorRef}>
                    <label className="text-sm font-medium text-gray-700">Supervisor</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setSupervisorOpen((o) => !o); setSupervisorSearch(""); }}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-left transition-colors hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
                      >
                        <span className={supervisorValue ? "text-gray-900" : "text-gray-400"}>
                          {supervisorValue
                            ? supervisorOptions.find((o) => o.value === supervisorValue)?.label ?? "Select a supervisor"
                            : "Select a supervisor"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {supervisorValue && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSupervisorValue("");
                                setValue("supervisorId", "");
                              }}
                              className="rounded p-0.5 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${supervisorOpen ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {supervisorOpen && (
                        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                          {/* Search input */}
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Search supervisor..."
                                value={supervisorSearch}
                                onChange={(e) => setSupervisorSearch(e.target.value)}
                                className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </div>
                          </div>
                          {/* Options list */}
                          <ul className="max-h-52 overflow-y-auto py-1">
                            {supervisorOptions
                              .filter((o) =>
                                o.label.toLowerCase().includes(supervisorSearch.toLowerCase())
                              )
                              .map((o) => (
                                <li
                                  key={o.value}
                                  onClick={() => {
                                    setSupervisorValue(o.value);
                                    setValue("supervisorId", o.value);
                                    setSupervisorOpen(false);
                                    setSupervisorSearch("");
                                  }}
                                  className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-primary-50 hover:text-primary-900 ${
                                    supervisorValue === o.value ? "bg-primary-50 text-primary-900 font-medium" : "text-gray-700"
                                  }`}
                                >
                                  {o.label}
                                </li>
                              ))}
                            {supervisorOptions.filter((o) =>
                              o.label.toLowerCase().includes(supervisorSearch.toLowerCase())
                            ).length === 0 && (
                              <li className="px-3 py-4 text-center text-sm text-gray-400">No supervisors found</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    {errors.supervisorId && (
                      <p className="text-xs text-red-600">{errors.supervisorId.message}</p>
                    )}
                  </div>
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
                  <Select
                    label="Role"
                    options={roleOptions}
                    error={errors.role?.message}
                    {...register("role")}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compensation Tab */}
          {activeTab === "compensation" && (() => {
            const currency = watch("currency") || "NGN";
            const bd = grossBreakdown;
            const netPay60 = Number(bd?.netPay60 ?? 0);
            const watchedNetPay40 = watch("simpleNetPay");
            const netPay40Val = parseFloat(watchedNetPay40 || "0") || 0;
            const netPay100 = netPay60 + netPay40Val;

            const CalcField = ({ label, value }: { label: string; value: number | undefined }) => (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                  bd ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-gray-50 border-gray-200 text-gray-400"
                }`}>
                  {breakdownLoading ? (
                    <span className="text-gray-400 italic text-xs">calculating…</span>
                  ) : (
                    <>
                      <span className="text-gray-400 text-xs">auto</span>
                      <span className="font-medium">
                        {value !== undefined ? formatCurrency(value, currency) : "—"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );

            return (
              <div className="space-y-6">
                {/* Gross Pay */}
                <Card>
                  <CardHeader>
                    <CardTitle>Compensation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CurrencyInput
                        control={control}
                        name="monthlySalary"
                        label="Gross Pay"
                        currencyCode={currency}
                        error={errors.monthlySalary?.message}
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

                {/* Salary Structure (auto-computed) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Salary Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CalcField label="Basic Salary (35%)" value={bd?.basicSalary} />
                      <CalcField label="Housing (20%)" value={bd?.allowancesBreakdown?.find((a) => a.name === "Housing")?.amount} />
                      <CalcField label="Transport (15%)" value={bd?.allowancesBreakdown?.find((a) => a.name === "Transport")?.amount} />
                      <CalcField label="Wardrobe (10%)" value={bd?.allowancesBreakdown?.find((a) => a.name === "Wardrobe")?.amount} />
                      <CalcField label="Meal (10%)" value={bd?.allowancesBreakdown?.find((a) => a.name === "Meal")?.amount} />
                      <CalcField label="Utility (10%)" value={bd?.allowancesBreakdown?.find((a) => a.name === "Utility")?.amount} />
                    </div>
                  </CardContent>
                </Card>

                {/* Statutory Deductions (auto-computed) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Statutory Deductions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CalcField label="Employee Pension (8%)" value={bd?.pension} />
                      <CalcField label="Employer Pension (10%)" value={bd?.employerPension} />
                      <CalcField label="Total Pension" value={bd?.totalPension} />
                      <CalcField label="PAYE Tax (Monthly)" value={bd?.paye} />
                      <CalcField label="Total Deductions" value={bd?.totalDeductions} />
                    </div>
                  </CardContent>
                </Card>

                {/* Net Pay */}
                <Card>
                  <CardHeader>
                    <CardTitle>Net Pay</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CalcField label="Net Pay 60% (Total - Deductions)" value={bd ? netPay60 : undefined} />
                      <CurrencyInput
                        control={control}
                        name="simpleNetPay"
                        label="Net Pay 40% (Manual Input)"
                        currencyCode={currency}
                        error={errors.simpleNetPay?.message}
                      />
                      <CalcField label="Net Pay 100% (60% + 40%)" value={bd ? netPay100 : undefined} />
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Compensation */}
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Compensation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CurrencyInput
                        control={control}
                        name="commission"
                        label="Commission"
                        currencyCode={currency}
                        error={errors.commission?.message}
                      />
                      <CurrencyInput
                        control={control}
                        name="withholdingTax"
                        label="Withholding Tax"
                        currencyCode={currency}
                        error={errors.withholdingTax?.message}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Banking & Admin */}
                <Card>
                  <CardHeader>
                    <CardTitle>Banking & Admin</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                      <BankAccountFields
                        accountNumber={watch("accountNumber") || ""}
                        accountName={watch("accountName") || ""}
                        bankName={watch("bankName") || ""}
                        onAccountNumberChange={(v) => setValue("accountNumber", v)}
                        onAccountNameChange={(v) => setValue("accountName", v)}
                        onBankNameChange={(v) => setValue("bankName", v)}
                        errors={{
                          accountNumber: errors.accountNumber?.message,
                          accountName: errors.accountName?.message,
                          bankName: errors.bankName?.message,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Navigation / Submit */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.back()}
              disabled={createEmployee.isPending}
            >
              Cancel
            </Button>
            {activeTab === "compensation" ? (
              <Button
                type="button"
                loading={createEmployee.isPending}
                onClick={() => handleSubmit(onSubmit, onFormError)()}
              >
                <Save className="h-4 w-4" />
                Create Employee
              </Button>
            ) : (
              <Button
                type="button"
                onClick={async () => {
                  const tabOrder = formTabs.map((t) => t.id);
                  const currentIndex = tabOrder.indexOf(activeTab);
                  if (currentIndex >= tabOrder.length - 1) return;

                  // Validate required fields for the current tab before advancing
                  const fieldsToValidate: (keyof CreateEmployeeFormData)[] =
                    activeTab === "personal"
                      ? ["fullName", "workEmail"]
                      : ["dateOfHire", "employmentType", "sbuId", "departmentId", "jobTitle"];

                  const valid = await trigger(fieldsToValidate);
                  if (!valid) return;

                  setActiveTab(tabOrder[currentIndex + 1]);
                }}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Full-screen loading overlay */}
      {createEmployee.isPending && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-2xl">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">Creating Employee</p>
              <p className="mt-0.5 text-xs text-gray-500">Setting up account, leave balances &amp; SBU memberships…</p>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Add Department Modal */}
      <Modal
        isOpen={showCreateDept}
        onClose={() => { setShowCreateDept(false); setNewDeptName(""); setNewDeptSbuId(""); setNewDeptMinOnsite("0"); }}
        title="Add Department"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowCreateDept(false); setNewDeptName(""); setNewDeptSbuId(""); setNewDeptMinOnsite("0"); }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  const dept = await createDepartment.mutateAsync({
                    name: newDeptName.trim(),
                    sbuId: newDeptSbuId,
                    minOnsite: parseInt(newDeptMinOnsite) || 0,
                  });
                  setDeptValue(dept.id);
                  setValue("departmentId", dept.id);
                  setShowCreateDept(false);
                  setNewDeptName("");
                  setNewDeptSbuId("");
                  setNewDeptMinOnsite("0");
                  toast.success(`Department "${dept.name}" created`);
                } catch {
                  toast.error("Failed to create department");
                }
              }}
              disabled={!newDeptName.trim() || !newDeptSbuId || createDepartment.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
            >
              {createDepartment.isPending && <Spinner size="sm" />}
              Create Department
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Department Name"
            placeholder="e.g. Engineering"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
          />
          <Select
            label="SBU"
            options={sbuOptions}
            value={newDeptSbuId}
            onChange={(e) => setNewDeptSbuId(e.target.value)}
            placeholder="Select SBU"
          />
          <Input
            label="Minimum Onsite Days"
            type="number"
            min={0}
            value={newDeptMinOnsite}
            onChange={(e) => setNewDeptMinOnsite(e.target.value)}
          />
        </div>
      </Modal>
    </AppLayout>
  );
}
