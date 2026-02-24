"use client";

import React, { useState } from "react";
import {
  Building2,
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  useSbus,
  useCreateSbu,
  useUpdateSbu,
  useDeleteSbu,
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "@/hooks";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function SbusPage() {
  // ─── SBU state ───────────────────────────────────────
  const { data: sbus, isLoading: sbusLoading } = useSbus();
  const createSbu = useCreateSbu();
  const updateSbu = useUpdateSbu();
  const deleteSbu = useDeleteSbu();

  const [showSbuForm, setShowSbuForm] = useState(false);
  const [editingSbuId, setEditingSbuId] = useState<string | null>(null);
  const [sbuName, setSbuName] = useState("");
  const [sbuCode, setSbuCode] = useState("");

  // ─── Selected SBU for department management ──────────
  const [selectedSbuId, setSelectedSbuId] = useState<string | null>(null);
  const selectedSbu = sbus?.find((s: any) => s.id === selectedSbuId);

  // ─── Department state ────────────────────────────────
  const { data: departments, isLoading: deptsLoading } = useDepartments(
    selectedSbuId || undefined
  );
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptMinOnsite, setDeptMinOnsite] = useState("2");

  // ─── Delete confirmation ─────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "sbu" | "department";
    id: string;
    name: string;
  } | null>(null);

  // ─── SBU form handlers ──────────────────────────────
  const openCreateSbu = () => {
    setEditingSbuId(null);
    setSbuName("");
    setSbuCode("");
    setShowSbuForm(true);
  };

  const openEditSbu = (sbu: any) => {
    setEditingSbuId(sbu.id);
    setSbuName(sbu.name);
    setSbuCode(sbu.code);
    setShowSbuForm(true);
  };

  const closeSbuForm = () => {
    setShowSbuForm(false);
    setEditingSbuId(null);
    setSbuName("");
    setSbuCode("");
  };

  const handleSbuSubmit = async () => {
    if (!sbuName.trim() || !sbuCode.trim()) {
      toast.error("Name and code are required");
      return;
    }
    try {
      if (editingSbuId) {
        await updateSbu.mutateAsync({
          id: editingSbuId,
          data: { name: sbuName, code: sbuCode },
        });
        toast.success("SBU updated successfully");
      } else {
        await createSbu.mutateAsync({ name: sbuName, code: sbuCode });
        toast.success("SBU created successfully");
      }
      closeSbuForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "sbu") {
        await deleteSbu.mutateAsync(deleteTarget.id);
        toast.success("SBU deleted");
        if (selectedSbuId === deleteTarget.id) {
          setSelectedSbuId(null);
        }
      } else {
        await deleteDepartment.mutateAsync(deleteTarget.id);
        toast.success("Department deleted");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot delete");
    }
    setDeleteTarget(null);
  };

  // ─── Department form handlers ────────────────────────
  const openCreateDept = () => {
    setEditingDeptId(null);
    setDeptName("");
    setDeptMinOnsite("2");
    setShowDeptForm(true);
  };

  const openEditDept = (dept: any) => {
    setEditingDeptId(dept.id);
    setDeptName(dept.name);
    setDeptMinOnsite(String(dept.minOnsite ?? 2));
    setShowDeptForm(true);
  };

  const closeDeptForm = () => {
    setShowDeptForm(false);
    setEditingDeptId(null);
    setDeptName("");
    setDeptMinOnsite("2");
  };

  const handleDeptSubmit = async () => {
    if (!deptName.trim() || !selectedSbuId) {
      toast.error("Department name is required");
      return;
    }
    try {
      const payload = {
        name: deptName,
        sbuId: selectedSbuId,
        minOnsite: parseInt(deptMinOnsite) || 2,
      };
      if (editingDeptId) {
        await updateDepartment.mutateAsync({ id: editingDeptId, data: payload });
        toast.success("Department updated");
      } else {
        await createDepartment.mutateAsync(payload);
        toast.success("Department created");
      }
      closeDeptForm();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed");
    }
  };

  const sbuMutating =
    createSbu.isPending || updateSbu.isPending || deleteSbu.isPending;
  const deptMutating =
    createDepartment.isPending ||
    updateDepartment.isPending ||
    deleteDepartment.isPending;

  return (
    <AppLayout pageTitle="SBU Management">
      <div className="space-y-6">
        {/* ─── Page Header ───────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Strategic Business Units
              </h2>
              <p className="text-sm text-gray-500">
                {sbus?.length ?? 0} SBU{(sbus?.length ?? 0) !== 1 ? "s" : ""}{" "}
                configured
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={openCreateSbu}>
            <Plus className="h-4 w-4" />
            Add SBU
          </Button>
        </div>

        {/* ─── SBU Create/Edit Form ──────────────────── */}
        {showSbuForm && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <h4 className="mb-3 font-semibold text-gray-800">
                {editingSbuId ? "Edit SBU" : "Create New SBU"}
              </h4>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input
                    label="SBU Name"
                    placeholder="e.g. Digital Products"
                    value={sbuName}
                    onChange={(e) => setSbuName(e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Input
                    label="Code"
                    placeholder="e.g. DP"
                    value={sbuCode}
                    onChange={(e) => setSbuCode(e.target.value.toUpperCase())}
                    maxLength={5}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSbuSubmit}
                    disabled={sbuMutating}
                  >
                    {sbuMutating ? (
                      <Spinner size="sm" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {editingSbuId ? "Update" : "Create"}
                  </Button>
                  <Button variant="outline" onClick={closeSbuForm}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── SBU Table ─────────────────────────────── */}
        <Card>
          <CardContent className="p-0">
            {sbusLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : !sbus || sbus.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No SBUs yet"
                description="Create your first Strategic Business Unit to get started"
                action={{
                  label: "Add SBU",
                  onClick: openCreateSbu,
                  icon: Plus,
                }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Departments</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sbus.map((sbu: any) => {
                    const isSelected = selectedSbuId === sbu.id;
                    return (
                      <TableRow
                        key={sbu.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "hover:bg-gray-50"
                        )}
                        onClick={() => {
                          setSelectedSbuId(isSelected ? null : sbu.id);
                          closeDeptForm();
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 text-gray-400 transition-transform",
                                isSelected && "rotate-90 text-blue-600"
                              )}
                            />
                            <span className="font-medium">{sbu.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{sbu.code}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {sbu._count?.departments ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {sbu._count?.employees ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditSbu(sbu)}
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "sbu",
                                  id: sbu.id,
                                  name: sbu.name,
                                })
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ─── Department Management (selected SBU) ──── */}
        {selectedSbuId && selectedSbu && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Departments in{" "}
                  <span className="text-blue-600">{selectedSbu.name}</span>
                </h3>
              </div>
              <Button variant="outline" size="sm" onClick={openCreateDept}>
                <Plus className="h-4 w-4" />
                Add Department
              </Button>
            </div>

            {/* Department Create/Edit Form */}
            {showDeptForm && (
              <Card className="border-purple-200 bg-purple-50/50">
                <CardContent className="p-4">
                  <h4 className="mb-3 font-semibold text-gray-800">
                    {editingDeptId ? "Edit Department" : "Create New Department"}
                  </h4>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Input
                        label="Department Name"
                        placeholder="e.g. Engineering"
                        value={deptName}
                        onChange={(e) => setDeptName(e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        label="Min Onsite"
                        type="number"
                        value={deptMinOnsite}
                        onChange={(e) => setDeptMinOnsite(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleDeptSubmit}
                        disabled={deptMutating}
                      >
                        {deptMutating ? (
                          <Spinner size="sm" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {editingDeptId ? "Update" : "Create"}
                      </Button>
                      <Button variant="outline" onClick={closeDeptForm}>
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Department Table */}
            <Card>
              <CardContent className="p-0">
                {deptsLoading ? (
                  <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                  </div>
                ) : !departments || departments.length === 0 ? (
                  <EmptyState
                    icon={FolderTree}
                    title="No departments"
                    description={`No departments in ${selectedSbu.name} yet`}
                    action={{
                      label: "Add Department",
                      onClick: openCreateDept,
                      icon: Plus,
                    }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">
                          Min Onsite
                        </TableHead>
                        <TableHead className="text-right">
                          Employees
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept: any) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">
                            {dept.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {dept.minOnsite}
                          </TableCell>
                          <TableCell className="text-right">
                            {dept._count?.employees ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDept(dept)}
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "department",
                                    id: dept.id,
                                    name: dept.name,
                                  })
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ─── Delete Confirmation Dialog ──────────────── */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title={
          deleteTarget?.type === "sbu" ? "Delete SBU" : "Delete Department"
        }
        message={
          deleteTarget?.type === "sbu"
            ? `Are you sure you want to delete "${deleteTarget?.name}"? SBUs with departments or employees cannot be deleted.`
            : `Are you sure you want to delete "${deleteTarget?.name}"? Departments with employees cannot be deleted.`
        }
        confirmLabel="Delete"
        loading={deleteSbu.isPending || deleteDepartment.isPending}
      />
    </AppLayout>
  );
}
