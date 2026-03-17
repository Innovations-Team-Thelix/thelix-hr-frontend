"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useAuth, useEmployees, useEffectiveRole,
} from "@/hooks";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { AssetCondition, AssetFilters } from "@/types";

const EQUIPMENT_TYPES = [
  "Laptop", "Desktop Computer", "Monitor", "Keyboard", "Mouse",
  "Headset", "Webcam", "Mobile Phone", "Tablet", "Printer",
  "External Hard Drive", "USB Hub", "Docking Station", "Power Bank",
  "Office Chair", "Desk", "ID Card", "Access Card", "Other",
];

const CONDITION_STYLES: Record<AssetCondition, { bg: string; text: string; label: string }> = {
  BrandNew: { bg: "bg-green-100", text: "text-green-700", label: "Brand New" },
  Good:     { bg: "bg-blue-100",  text: "text-blue-700",  label: "Good"      },
  Fair:     { bg: "bg-amber-100", text: "text-amber-700", label: "Fair"      },
  Poor:     { bg: "bg-red-100",   text: "text-red-700",   label: "Poor"      },
};

const emptyForm = {
  employeeId: "",
  equipmentType: "",
  assetTag: "",
  brand: "",
  model: "",
  condition: "BrandNew" as AssetCondition,
  dateIssued: new Date().toISOString().split("T")[0],
  dateReturned: "",
  notes: "",
};

export default function AssetsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";

  const [filters, setFilters] = useState<AssetFilters>({ page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useAssets(filters);
  const assets = data?.data || [];
  const pagination = data?.pagination;

  const { data: employeesData } = useEmployees({ limit: 1000, status: "Active" });
  const employeeOptions = (employeesData?.data || []).map((e) => ({
    label: e.fullName,
    value: e.id,
    subLabel: `${e.employeeId} · ${e.jobTitle}`,
  }));

  const equipmentOptions = EQUIPMENT_TYPES.map((t) => ({ label: t, value: t }));

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (asset: (typeof assets)[0]) => {
    setEditingId(asset.id);
    setForm({
      employeeId: asset.employeeId,
      equipmentType: asset.equipmentType,
      assetTag: asset.assetTag || "",
      brand: asset.brand || "",
      model: asset.model || "",
      condition: asset.condition,
      dateIssued: asset.dateIssued.split("T")[0],
      dateReturned: asset.dateReturned ? asset.dateReturned.split("T")[0] : "",
      notes: asset.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.equipmentType || !form.dateIssued) {
      toast.error("Equipment type and date issued are required.");
      return;
    }
    if (!editingId && !form.employeeId) {
      toast.error("Please provide the employee ID.");
      return;
    }

    if (editingId) {
      await updateAsset.mutateAsync({
        id: editingId,
        data: {
          equipmentType: form.equipmentType,
          assetTag: form.assetTag || undefined,
          brand: form.brand || undefined,
          model: form.model || undefined,
          condition: form.condition,
          dateIssued: form.dateIssued,
          dateReturned: form.dateReturned || null,
          notes: form.notes || undefined,
          isActive: !form.dateReturned,
        },
      });
    } else {
      await createAsset.mutateAsync({
        employeeId: form.employeeId,
        equipmentType: form.equipmentType,
        assetTag: form.assetTag || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        condition: form.condition,
        dateIssued: form.dateIssued,
        notes: form.notes || undefined,
      });
    }
    setModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset record? This cannot be undone.")) return;
    await deleteAsset.mutateAsync(id);
  };

  return (
    <AppLayout pageTitle="Assets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Asset Management</h2>
              <p className="text-sm text-gray-500">{pagination?.total ?? 0} assets total</p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Issue Asset
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Input
              placeholder="Search equipment type..."
              value={filters.equipmentType || ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, equipmentType: e.target.value || undefined, page: 1 }))
              }
            />
          </div>
          <div className="w-40">
            <Select
              options={[
                { label: "All Conditions", value: "" },
                { label: "Brand New", value: "BrandNew" },
                { label: "Good", value: "Good" },
                { label: "Fair", value: "Fair" },
                { label: "Poor", value: "Poor" },
              ]}
              value={filters.condition || ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  condition: (e.target.value as AssetCondition) || undefined,
                  page: 1,
                }))
              }
              placeholder="All Conditions"
            />
          </div>
          <div className="w-36">
            <Select
              options={[
                { label: "All Status", value: "" },
                { label: "Active", value: "true" },
                { label: "Returned", value: "false" },
              ]}
              value={filters.isActive === undefined ? "" : String(filters.isActive)}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  isActive: e.target.value === "" ? undefined : e.target.value === "true",
                  page: 1,
                }))
              }
              placeholder="All Status"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Brand / Model</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Date Issued</TableHead>
                    <TableHead>Date Returned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-3/4" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : assets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16 text-center text-sm text-gray-500">
                        No assets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    assets.map((asset) => {
                      const cond = CONDITION_STYLES[asset.condition];
                      return (
                        <TableRow
                          key={asset.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/employees/${asset.employeeId}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar name={asset.employee?.fullName || ""} size="sm" />
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{asset.employee?.fullName}</p>
                                <p className="text-xs text-gray-500">{asset.employee?.department?.name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{asset.equipmentType}</TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">{asset.assetTag || "-"}</TableCell>
                          <TableCell className="text-gray-600">
                            {[asset.brand, asset.model].filter(Boolean).join(" ") || "-"}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cond.bg} ${cond.text}`}>
                              {cond.label}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(asset.dateIssued)}</TableCell>
                          <TableCell>{asset.dateReturned ? formatDate(asset.dateReturned) : "-"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              asset.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                            }`}>
                              {asset.isActive ? "Active" : "Returned"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openEdit(asset)}
                                className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDelete(asset.id)}
                                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        title={editingId ? "Edit Asset" : "Issue Asset"}
        size="md"
      >
        <div className="space-y-4">
          {!editingId && (
            <SearchableSelect
              label="Employee"
              required
              placeholder="Search by name or ID..."
              options={employeeOptions}
              value={form.employeeId}
              onChange={(value) => setForm((f) => ({ ...f, employeeId: value }))}
            />
          )}
          <SearchableSelect
            label="Equipment Type"
            required
            placeholder="Select equipment type..."
            options={equipmentOptions}
            value={form.equipmentType}
            onChange={(value) => setForm((f) => ({ ...f, equipmentType: value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Asset Tag / Serial No."
              placeholder="e.g. THL-001"
              value={form.assetTag}
              onChange={(e) => setForm((f) => ({ ...f, assetTag: e.target.value }))}
            />
            <Select
              label="Condition"
              options={[
                { label: "Brand New", value: "BrandNew" },
                { label: "Good", value: "Good" },
                { label: "Fair", value: "Fair" },
                { label: "Poor", value: "Poor" },
              ]}
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as AssetCondition }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Brand"
              placeholder="e.g. Dell, Apple, HP"
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            />
            <Input
              label="Model"
              placeholder="e.g. XPS 15, MacBook Pro"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date Issued"
              type="date"
              required
              value={form.dateIssued}
              onChange={(e) => setForm((f) => ({ ...f, dateIssued: e.target.value }))}
            />
            <Input
              label="Date Returned"
              type="date"
              value={form.dateReturned}
              onChange={(e) => setForm((f) => ({ ...f, dateReturned: e.target.value }))}
            />
          </div>
          <Textarea
            label="Notes"
            placeholder="Any additional notes about this asset..."
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingId(null); }}>
              Cancel
            </Button>
            <Button
              loading={createAsset.isPending || updateAsset.isPending}
              onClick={handleSave}
            >
              {editingId ? "Save Changes" : "Issue Asset"}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
