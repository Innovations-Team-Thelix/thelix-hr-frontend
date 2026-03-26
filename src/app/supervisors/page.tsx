"use client";

import React, { useState } from "react";
import {
  UserCog,
  Plus,
  Shield,
  Eye,
  EyeOff,
  Search,
  Users,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { useSbus, useDepartments, useEmployees } from "@/hooks";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

const ROLE_OPTIONS = [
  { label: "System Admin (8.6)", value: "Admin" },
  { label: "VP / Executive (8.1)", value: "SBUHead" },
  { label: "Director (8.2)", value: "Director" },
  { label: "Manager (8.3)", value: "Manager" },
  { label: "HR / Performance Admin (8.5)", value: "Finance" },
  { label: "Team Member (8.4)", value: "Employee" },
];

const ROLE_COLORS: Record<string, string> = {
  Admin: "bg-red-50 text-red-700 border-red-100",
  SBUHead: "bg-amber-50 text-amber-700 border-amber-100",
  Director: "bg-purple-50 text-purple-700 border-purple-100",
  Manager: "bg-blue-50 text-blue-700 border-blue-100",
  Finance: "bg-teal-50 text-teal-700 border-teal-100",
  Employee: "bg-gray-100 text-gray-700 border-gray-200",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getRoleLabel(role: string) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

export default function SupervisorsPage() {
  const queryClient = useQueryClient();
  const { data: sbus } = useSbus();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const { data: employeesData, isLoading } = useEmployees({
    page,
    limit,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const users = employeesData?.data || [];
  const pagination = employeesData?.pagination;

  const filtered = users.filter(
    (u: any) =>
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.workEmail?.toLowerCase().includes(search.toLowerCase()) ||
      u.jobTitle?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter((u: any) => u.employmentStatus === "Active").length;
  const withAccountCount = users.filter((u: any) => u.userAccount).length;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("Welcome@123");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Admin");
  const [sbuId, setSbuId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const { data: departments } = useDepartments(sbuId || undefined);
  const sbuOptions = sbus?.map((s: any) => ({ label: s.name, value: s.id })) || [];
  const deptOptions = departments?.map((d: any) => ({ label: d.name, value: d.id })) || [];

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEmployeeId(null);
    setFullName("");
    setWorkEmail("");
    setPassword("Welcome@123");
    setShowPassword(false);
    setRole("Admin");
    setSbuId("");
    setDeptId("");
    setJobTitle("");
    setPhone("");
  };

  const openAddUser = () => {
    closeModal();
    setModalOpen(true);
  };

  const openCreateForEmployee = (emp: any) => {
    setSelectedEmployeeId(emp.id);
    setFullName(emp.fullName);
    setWorkEmail(emp.workEmail);
    setJobTitle(emp.jobTitle || "");
    setPhone(emp.phone || "");
    setSbuId(emp.sbuId || emp.sbu?.id || "");
    setDeptId(emp.departmentId || emp.department?.id || "");
    setRole(emp.userAccount?.role || "Employee");
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !workEmail.trim() || !password.trim()) {
      toast.error("Name, email, and password are required");
      return;
    }
    if ((!sbuId || !deptId) && !selectedEmployeeId) {
      toast.error("SBU and department are required");
      return;
    }
    setSubmitting(true);
    try {
      let empId = selectedEmployeeId;

      if (!empId) {
        const empRes = await api.post<any>("/employees", {
          fullName,
          workEmail,
          sbuId,
          departmentId: deptId,
          jobTitle: jobTitle || "Administrator",
          phone: phone || "+0000000000",
          dateOfBirth: "1990-01-01",
          nationality: "Nigerian",
          personalEmail: workEmail,
          address: "Lagos, Nigeria",
          dateOfHire: new Date().toISOString().split("T")[0],
          employmentType: "FullTime",
          workArrangement: "Hybrid",
          employmentStatus: "Active",
          monthlySalary: 0,
          currency: "NGN",
          salaryEffectiveDate: new Date().toISOString().split("T")[0],
          bankName: "—",
          accountName: fullName,
          accountNumber: "0000000000",
        });
        empId = empRes.data.id;
      }

      await api.post("/auth/register", {
        employeeId: empId,
        email: workEmail,
        password,
        role,
        ...(role === "SBUHead" && sbuId ? { sbuScopeId: sbuId } : {}),
        ...(role === "Director" && deptId ? { departmentScopeId: deptId } : {}),
        ...(role === "Manager" && deptId ? { departmentScopeId: deptId } : {}),
      });

      toast.success(`User ${selectedEmployeeId ? "registered" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      closeModal();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout pageTitle="Supervisors">
      <div className="space-y-6">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
              <UserCog className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Supervisors</h1>
              <p className="text-sm text-gray-500">Manage system user accounts and role assignments</p>
            </div>
          </div>
          <button
            onClick={openAddUser}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                <Users className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Users</p>
                <p className="text-xl font-semibold text-gray-900">{pagination?.total ?? users.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <UserCheck className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-xl font-semibold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <ShieldCheck className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">With Portal Access</p>
                <p className="text-xl font-semibold text-gray-900">{withAccountCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-xl border border-gray-200 bg-white">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-gray-700">User Accounts</p>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <UserCog className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {search ? "No users match your search" : "No users yet"}
              </p>
              <p className="text-xs text-gray-400">
                {search ? "Try a different keyword" : "Click \"Add User\" to get started"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Job Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((u: any) => {
                      const userRole = u.userAccount?.role;
                      const roleColor = userRole ? ROLE_COLORS[userRole] : "";
                      return (
                        <tr key={u.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                                {getInitials(u.fullName || "?")}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{u.fullName}</p>
                                <p className="text-xs text-gray-400 font-mono">{u.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600">{u.workEmail}</td>
                          <td className="px-4 py-3.5 text-gray-600">{u.jobTitle || "—"}</td>
                          <td className="px-4 py-3.5">
                            {userRole ? (
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleColor}`}>
                                {getRoleLabel(userRole)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">No access</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.employmentStatus === "Active"
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {u.employmentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => openCreateForEmployee(u)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
                            >
                              <Shield className="h-3 w-3" />
                              {u.userAccount ? "Edit Access" : "Grant Access"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-gray-100 sm:hidden">
                {filtered.map((u: any) => {
                  const userRole = u.userAccount?.role;
                  const roleColor = userRole ? ROLE_COLORS[userRole] : "";
                  return (
                    <div key={u.id} className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                          {getInitials(u.fullName || "?")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{u.fullName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {userRole ? (
                              <span className={`inline-flex items-center rounded-full border px-1.5 py-0 text-xs font-medium ${roleColor}`}>
                                {getRoleLabel(userRole)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">No access</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => openCreateForEmployee(u)}
                        className="ml-3 shrink-0 rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                      >
                        <Shield className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="border-t border-gray-100 px-4 py-3">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={selectedEmployeeId ? `Grant Access — ${fullName}` : "Add New User"}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={closeModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting && <Spinner size="sm" />}
              {selectedEmployeeId ? "Register User" : "Create User"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={!!selectedEmployeeId}
            />
            <Input
              label="Work Email"
              placeholder="jane@thelixholdings.com"
              type="email"
              value={workEmail}
              onChange={(e) => setWorkEmail(e.target.value)}
              required
              disabled={!!selectedEmployeeId}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Select
              label="Role"
              options={ROLE_OPTIONS}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="SBU"
              options={sbuOptions}
              value={sbuId}
              onChange={(e) => { setSbuId(e.target.value); setDeptId(""); }}
              placeholder="Select SBU"
              disabled={!!selectedEmployeeId}
            />
            <Select
              label="Department"
              options={deptOptions}
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              placeholder={sbuId ? "Select Department" : "Select SBU first"}
              disabled={!!selectedEmployeeId}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Job Title"
              placeholder="e.g. HR Manager"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={!!selectedEmployeeId}
            />
            <Input
              label="Phone"
              placeholder="+234..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!!selectedEmployeeId}
            />
          </div>

          {role === "Admin" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Admin users have full access to all data and settings.</span>
            </div>
          )}
          {role === "SBUHead" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This user will be scoped to the selected SBU only.</span>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
