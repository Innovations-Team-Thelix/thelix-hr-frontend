"use client";

import React, { useState } from "react";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  Users,
  Layers,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { useSbus, usePaginatedDepartments, useDepartments } from "@/hooks";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const { data: sbus } = useSbus();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const { data: departmentsData, isLoading } = usePaginatedDepartments({ page, limit });
  const departments = departmentsData?.data || [];
  const pagination = departmentsData?.pagination;

  // Fetch ALL departments (unpaginated) so stats don't change on pagination
  const { data: allDepartments } = useDepartments();
  const totalDeptCount = allDepartments?.length ?? pagination?.total ?? 0;
  const totalEmployees = (allDepartments || []).reduce(
    (sum: number, d: any) => sum + (d._count?.employees ?? 0),
    0
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sbuId, setSbuId] = useState("");
  const [minOnsite, setMinOnsite] = useState("2");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sbuOptions = sbus?.map((s: any) => ({ label: s.name, value: s.id })) || [];

  const filtered = departments.filter((d: any) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setSbuId("");
    setMinOnsite("2");
    setModalOpen(true);
  };

  const openEdit = (dept: any) => {
    setEditingId(dept.id);
    setName(dept.name);
    setSbuId(dept.sbuId || "");
    setMinOnsite(String(dept.minOnsite ?? 2));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !sbuId) {
      toast.error("Department name and SBU are required.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), sbuId, minOnsite: parseInt(minOnsite) || 2 };
      if (editingId) {
        await api.put(`/departments/${editingId}`, payload);
        toast.success("Department updated successfully.");
      } else {
        await api.post("/departments", payload);
        toast.success("Department created successfully.");
      }
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
      closeModal();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this department? Departments with employees cannot be deleted.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/departments/${id}`);
      toast.success("Department deleted.");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Cannot delete department.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout pageTitle="Departments">
      <div className="space-y-6">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
              <FolderTree className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Departments</h1>
              <p className="text-sm text-gray-500">Manage organisational departments and SBU assignments</p>
            </div>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                <Layers className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Departments</p>
                <p className="text-xl font-semibold text-gray-900">{totalDeptCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Building2 className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">SBUs</p>
                <p className="text-xl font-semibold text-gray-900">{sbus?.length ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <Users className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Employees</p>
                <p className="text-xl font-semibold text-gray-900">{totalEmployees}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-xl border border-gray-200 bg-white">
          {/* Table toolbar */}
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-gray-700">All Departments</p>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search departments..."
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
                <FolderTree className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {search ? "No departments match your search" : "No departments yet"}
              </p>
              <p className="text-xs text-gray-400">
                {search ? "Try a different keyword" : "Click \"Add Department\" to get started"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SBU</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Min Onsite</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Employees</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((dept: any) => (
                      <tr key={dept.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-50">
                              <FolderTree className="h-3.5 w-3.5 text-primary-600" />
                            </div>
                            <span className="font-medium text-gray-900">{dept.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                            {dept.sbu?.name || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {dept.minOnsite}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                            {dept._count?.employees ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(dept)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(dept.id)}
                              disabled={deletingId === dept.id}
                              className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-500 transition-all hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                            >
                              {deletingId === dept.id ? (
                                <Spinner size="sm" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-gray-100 sm:hidden">
                {filtered.map((dept: any) => (
                  <div key={dept.id} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                        <FolderTree className="h-4 w-4 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{dept.name}</p>
                        <p className="text-xs text-gray-500">{dept.sbu?.name || "No SBU"} · {dept._count?.employees ?? 0} employees</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 ml-3">
                      <button
                        onClick={() => openEdit(dept)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        disabled={deletingId === dept.id}
                        className="rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-500 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Department" : "Add Department"}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={closeModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors disabled:opacity-60"
            >
              {submitting && <Spinner size="sm" />}
              {editingId ? "Save Changes" : "Create Department"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Department Name"
            placeholder="e.g. Engineering"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="SBU"
            options={sbuOptions}
            value={sbuId}
            onChange={(e) => setSbuId(e.target.value)}
            placeholder="Select SBU"
          />
          <Input
            label="Minimum Onsite Days"
            type="number"
            min={0}
            value={minOnsite}
            onChange={(e) => setMinOnsite(e.target.value)}
          />
        </div>
      </Modal>
    </AppLayout>
  );
}
