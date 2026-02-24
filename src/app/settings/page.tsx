"use client";

import React, { useState } from "react";
import {
  Settings,
  FolderTree,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Shield,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/loading";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useSbus, useDepartments } from "@/hooks";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";

// ─── Department Management ───────────────────────────

function DepartmentManagement() {
  const queryClient = useQueryClient();
  const { data: sbus } = useSbus();
  const { data: departments, isLoading } = useDepartments();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sbuId, setSbuId] = useState("");
  const [minOnsite, setMinOnsite] = useState("2");
  const [submitting, setSubmitting] = useState(false);

  const sbuOptions = sbus?.map((s: any) => ({ label: s.name, value: s.id })) || [];

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setSbuId("");
    setMinOnsite("2");
    setShowForm(true);
  };

  const openEdit = (dept: any) => {
    setEditingId(dept.id);
    setName(dept.name);
    setSbuId(dept.sbuId);
    setMinOnsite(String(dept.minOnsite ?? 2));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !sbuId) {
      toast.error("Name and SBU are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name, sbuId, minOnsite: parseInt(minOnsite) || 2 };
      if (editingId) {
        await api.put(`/departments/${editingId}`, payload);
        toast.success("Department updated");
      } else {
        await api.post("/departments", payload);
        toast.success("Department created");
      }
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
      closeForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this department? Departments with employees cannot be deleted.")) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success("Department deleted");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot delete department");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Departments</h3>
        </div>
        <Button variant="outline" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      {showForm && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <h4 className="mb-3 font-semibold text-gray-800">
              {editingId ? "Edit Department" : "Create New Department"}
            </h4>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input label="Department Name" placeholder="e.g. Engineering" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex-1">
                <Select label="SBU" options={sbuOptions} value={sbuId} onChange={(e) => setSbuId(e.target.value)} placeholder="Select SBU" />
              </div>
              <div className="w-28">
                <Input label="Min Onsite" type="number" value={minOnsite} onChange={(e) => setMinOnsite(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                  {editingId ? "Update" : "Create"}
                </Button>
                <Button variant="outline" onClick={closeForm}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SBU</TableHead>
                  <TableHead className="text-right">Min Onsite</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments && departments.length > 0 ? (
                  departments.map((dept: any) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell><Badge variant="info">{dept.sbu?.name || "—"}</Badge></TableCell>
                      <TableCell className="text-right">{dept.minOnsite}</TableCell>
                      <TableCell className="text-right">{dept._count?.employees ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(dept)}>
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(dept.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                      No departments yet. Click &quot;Add Department&quot; above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── User Management ─────────────────────────────────

const ROLE_OPTIONS = [
  { label: "Admin", value: "Admin" },
  { label: "SBU Head", value: "SBUHead" },
  { label: "Finance", value: "Finance" },
  { label: "Employee", value: "Employee" },
];

function UserManagement() {
  const queryClient = useQueryClient();
  const { data: sbus } = useSbus();
  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await api.get<any[]>("/employees?limit=100");
      return res.data;
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const [sbuId, setSbuId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: departments } = useDepartments(sbuId || undefined);
  const sbuOptions = sbus?.map((s: any) => ({ label: s.name, value: s.id })) || [];
  const deptOptions = departments?.map((d: any) => ({ label: d.name, value: d.id })) || [];

  const closeForm = () => {
    setShowForm(false);
    setFullName("");
    setWorkEmail("");
    setPassword("");
    setRole("Admin");
    setSbuId("");
    setDeptId("");
    setJobTitle("");
    setPhone("");
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !workEmail.trim() || !password.trim()) {
      toast.error("Name, email, and password are required");
      return;
    }
    if (!sbuId || !deptId) {
      toast.error("SBU and department are required");
      return;
    }
    setSubmitting(true);
    try {
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

      await api.post("/auth/register", {
        employeeId: empRes.data.id,
        email: workEmail,
        password,
        role,
        ...(role === "SBUHead" && sbuId ? { sbuScopeId: sbuId } : {}),
      });

      toast.success(`${role} user created successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      closeForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-emerald-500" />
          <h3 className="text-lg font-semibold text-gray-900">User Accounts</h3>
        </div>
        <Button variant="outline" size="sm" onClick={() => { closeForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {showForm && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <h4 className="mb-3 font-semibold text-gray-800">Create New User</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Full Name" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                <Input label="Work Email" placeholder="jane@thelixholdings.com" type="email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Select label="Role" options={ROLE_OPTIONS} value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select label="SBU" options={sbuOptions} value={sbuId} onChange={(e) => { setSbuId(e.target.value); setDeptId(""); }} placeholder="Select SBU" />
                <Select label="Department" options={deptOptions} value={deptId} onChange={(e) => setDeptId(e.target.value)} placeholder={sbuId ? "Select Department" : "Select SBU first"} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Job Title" placeholder="e.g. HR Manager" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                <Input label="Phone" placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              {role === "Admin" && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <Shield className="mb-0.5 mr-1 inline h-4 w-4" />
                  Admin users have full access to all data and settings.
                </div>
              )}
              {role === "SBUHead" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <Shield className="mb-0.5 mr-1 inline h-4 w-4" />
                  This user will be scoped to the selected SBU only.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={handleCreate} disabled={submitting}>
                  {submitting ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                  Create User
                </Button>
                <Button variant="outline" onClick={closeForm}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.employeeId}</TableCell>
                      <TableCell className="font-medium">{u.fullName}</TableCell>
                      <TableCell className="text-sm text-gray-600">{u.workEmail}</TableCell>
                      <TableCell className="text-sm">{u.jobTitle}</TableCell>
                      <TableCell>
                        <Badge variant={u.employmentStatus === "Active" ? "success" : "neutral"}>
                          {u.employmentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-gray-500">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("departments");

  const tabs = [
    { id: "departments", label: "Departments" },
    { id: "users", label: "Users" },
  ];

  return (
    <AppLayout pageTitle="Settings">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-gray-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Organisation Settings</h2>
            <p className="text-sm text-gray-500">Manage departments and user accounts</p>
          </div>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "departments" && <DepartmentManagement />}
        {activeTab === "users" && <UserManagement />}
      </div>
    </AppLayout>
  );
}
