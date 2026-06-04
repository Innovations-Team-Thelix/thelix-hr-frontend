'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, RefreshCw, ChevronLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { useLeaveTypes, useEffectiveRole, useSbus } from '@/hooks';
import {
  useLeaveTypeMutations,
  useHolidays,
  useHolidayMutations,
  useBlackouts,
  useBlackoutMutations,
  useRunRollover,
} from '@/hooks/useLeave';
import { formatDate } from '@/lib/utils';
import type { LeaveType, PublicHoliday, LeaveBlackoutDate } from '@/types';

const yesNo = (v?: boolean) => (v ? 'Yes' : 'No');

export default function LeaveSettingsPage() {
  const router = useRouter();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === 'Admin' || effectiveRole === 'CVO';
  const [tab, setTab] = useState('types');

  if (!isAdmin) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            You don&apos;t have permission to manage leave settings.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push('/leave')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Leave
        </button>
      </div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Leave Settings</h1>
      <p className="mb-6 text-sm text-gray-500">
        Configure leave types, public holidays, and restricted periods.
      </p>

      <Tabs
        tabs={[
          { id: 'types', label: 'Leave Types' },
          { id: 'holidays', label: 'Public Holidays' },
          { id: 'blackouts', label: 'Restricted Periods' },
        ]}
        activeTab={tab}
        onChange={setTab}
        className="mb-6"
      />

      {tab === 'types' && <LeaveTypesTab />}
      {tab === 'holidays' && <HolidaysTab />}
      {tab === 'blackouts' && <BlackoutsTab />}
    </AppLayout>
  );
}

// ─── Leave Types ───────────────────────────────────────────

const EMPTY_TYPE: Partial<LeaveType> = {
  name: '',
  defaultDays: 0,
  noticePeriod: 0,
  requiresDoc: false,
  isActive: true,
  isPaid: true,
  genderEligibility: 'All',
  carryOverMax: 0,
  minDurationDays: 1,
  requiresHrApproval: true,
};

function LeaveTypesTab() {
  const { data: types, isLoading } = useLeaveTypes();
  const { create, update, remove } = useLeaveTypeMutations();
  const rollover = useRunRollover();
  const [editing, setEditing] = useState<Partial<LeaveType> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const save = async () => {
    if (!editing) return;
    const payload = {
      ...editing,
      defaultDays: Number(editing.defaultDays) || 0,
      noticePeriod: Number(editing.noticePeriod) || 0,
      carryOverMax: Number(editing.carryOverMax) || 0,
      minDurationDays: Number(editing.minDurationDays) || 1,
      carryOverExpiryMonths: editing.carryOverExpiryMonths ? Number(editing.carryOverExpiryMonths) : null,
      maxConsecutiveDays: editing.maxConsecutiveDays ? Number(editing.maxConsecutiveDays) : null,
      autoApproveUnderDays: editing.autoApproveUnderDays ? Number(editing.autoApproveUnderDays) : null,
    };
    if (editing.id) await update.mutateAsync({ id: editing.id, data: payload });
    else await create.mutateAsync(payload);
    setEditing(null);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Leave Types</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={rollover.isPending}
              onClick={() => rollover.mutate(undefined)}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Run Year-End Rollover
            </Button>
            <Button size="sm" onClick={() => setEditing({ ...EMPTY_TYPE })}>
              <Plus className="mr-1 h-4 w-4" /> New Type
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Notice</TableHead>
              <TableHead>Carryover</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Doc</TableHead>
              <TableHead>Eligibility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="py-8 text-center text-gray-400">Loading…</TableCell></TableRow>
            ) : (types ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.defaultDays}</TableCell>
                <TableCell>{t.noticePeriod}d</TableCell>
                <TableCell>{t.carryOverMax ?? 0}{t.carryOverExpiryMonths ? ` (${t.carryOverExpiryMonths}mo)` : ''}</TableCell>
                <TableCell>{yesNo(t.isPaid)}</TableCell>
                <TableCell>{yesNo(t.requiresDoc)}</TableCell>
                <TableCell>{t.genderEligibility ?? 'All'}</TableCell>
                <TableCell>
                  <Badge variant={t.isActive === false ? 'neutral' : 'success'}>
                    {t.isActive === false ? 'Retired' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <button className="mr-3 text-gray-400 hover:text-primary" onClick={() => setEditing(t)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-600" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit Leave Type' : 'New Leave Type'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={create.isPending || update.isPending} onClick={save}>Save</Button>
          </div>
        }
      >
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input label="Default Days" type="number" value={String(editing.defaultDays ?? 0)} onChange={(e) => setEditing({ ...editing, defaultDays: Number(e.target.value) })} />
            <Input label="Notice Period (days)" type="number" value={String(editing.noticePeriod ?? 0)} onChange={(e) => setEditing({ ...editing, noticePeriod: Number(e.target.value) })} />
            <Input label="Min Duration (days)" type="number" value={String(editing.minDurationDays ?? 1)} onChange={(e) => setEditing({ ...editing, minDurationDays: Number(e.target.value) })} />
            <Input label="Carryover Max" type="number" value={String(editing.carryOverMax ?? 0)} onChange={(e) => setEditing({ ...editing, carryOverMax: Number(e.target.value) })} />
            <Input label="Carryover Expiry (months)" type="number" value={editing.carryOverExpiryMonths ? String(editing.carryOverExpiryMonths) : ''} onChange={(e) => setEditing({ ...editing, carryOverExpiryMonths: e.target.value ? Number(e.target.value) : null })} />
            <Input label="Max Consecutive Days" type="number" value={editing.maxConsecutiveDays ? String(editing.maxConsecutiveDays) : ''} onChange={(e) => setEditing({ ...editing, maxConsecutiveDays: e.target.value ? Number(e.target.value) : null })} />
            <Input label="Auto-approve under (days)" type="number" value={editing.autoApproveUnderDays ? String(editing.autoApproveUnderDays) : ''} onChange={(e) => setEditing({ ...editing, autoApproveUnderDays: e.target.value ? Number(e.target.value) : null })} />
            <Select
              label="Gender Eligibility"
              options={[{ label: 'All', value: 'All' }, { label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]}
              value={editing.genderEligibility ?? 'All'}
              onChange={(e) => setEditing({ ...editing, genderEligibility: e.target.value as LeaveType['genderEligibility'] })}
            />
            <Input label="Color (hex)" value={editing.color ?? ''} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
            <div className="col-span-2 flex flex-wrap gap-4 pt-2">
              <Checkbox label="Paid leave" checked={editing.isPaid ?? true} onChange={(v) => setEditing({ ...editing, isPaid: v })} />
              <Checkbox label="Requires document" checked={editing.requiresDoc ?? false} onChange={(v) => setEditing({ ...editing, requiresDoc: v })} />
              <Checkbox label="Requires HR approval" checked={editing.requiresHrApproval ?? true} onChange={(v) => setEditing({ ...editing, requiresHrApproval: v })} />
              <Checkbox label="Active" checked={editing.isActive ?? true} onChange={(v) => setEditing({ ...editing, isActive: v })} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId) await remove.mutateAsync(deleteId); setDeleteId(null); }}
        title="Remove Leave Type"
        message="If this type has existing requests it will be retired (hidden) rather than deleted."
        confirmLabel="Remove"
      />
    </Card>
  );
}

// ─── Public Holidays ───────────────────────────────────────

function HolidaysTab() {
  const year = new Date().getFullYear();
  const { data: holidays, isLoading } = useHolidays(year);
  const { create, remove } = useHolidayMutations();
  const { data: sbus } = useSbus();
  const [form, setForm] = useState<{ date: string; name: string; sbuId: string } | null>(null);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Public Holidays ({year})</h2>
          <Button size="sm" onClick={() => setForm({ date: '', name: '', sbuId: '' })}>
            <Plus className="mr-1 h-4 w-4" /> Add Holiday
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-gray-400">Loading…</TableCell></TableRow>
            ) : (holidays ?? []).map((h: PublicHoliday) => (
              <TableRow key={h.id}>
                <TableCell>{formatDate(h.date)}</TableCell>
                <TableCell className="font-medium">{h.name}</TableCell>
                <TableCell>{h.sbuId ? (sbus ?? []).find((s) => s.id === h.sbuId)?.name ?? 'SBU' : 'All SBUs'}</TableCell>
                <TableCell className="text-right">
                  <button className="text-gray-400 hover:text-red-600" onClick={() => remove.mutate(h.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Modal
        isOpen={!!form}
        onClose={() => setForm(null)}
        title="Add Public Holiday"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button
              loading={create.isPending}
              onClick={async () => {
                if (!form) return;
                await create.mutateAsync({ date: form.date, name: form.name, sbuId: form.sbuId || null });
                setForm(null);
              }}
            >Save</Button>
          </div>
        }
      >
        {form && (
          <div className="space-y-3">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select
              label="Scope"
              options={[{ label: 'All SBUs', value: '' }, ...(sbus ?? []).map((s) => ({ label: s.name, value: s.id }))]}
              value={form.sbuId}
              onChange={(e) => setForm({ ...form, sbuId: e.target.value })}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
}

// ─── Restricted Periods ────────────────────────────────────

function BlackoutsTab() {
  const { data: blackouts, isLoading } = useBlackouts();
  const { create, remove } = useBlackoutMutations();
  const { data: sbus } = useSbus();
  const [form, setForm] = useState<{ date: string; endDate: string; reason: string; sbuId: string } | null>(null);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700">Restricted Periods</h2>
          <Button size="sm" onClick={() => setForm({ date: '', endDate: '', reason: '', sbuId: '' })}>
            <Plus className="mr-1 h-4 w-4" /> Add Period
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-gray-400">Loading…</TableCell></TableRow>
            ) : (blackouts ?? []).map((b: LeaveBlackoutDate) => (
              <TableRow key={b.id}>
                <TableCell>{formatDate(b.date)}</TableCell>
                <TableCell>{b.endDate ? formatDate(b.endDate) : '—'}</TableCell>
                <TableCell className="font-medium">{b.reason}</TableCell>
                <TableCell>{b.sbuId ? (sbus ?? []).find((s) => s.id === b.sbuId)?.name ?? 'SBU' : 'All SBUs'}</TableCell>
                <TableCell><Badge variant={b.isActive ? 'success' : 'neutral'}>{b.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell className="text-right">
                  <button className="text-gray-400 hover:text-red-600" onClick={() => remove.mutate(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Modal
        isOpen={!!form}
        onClose={() => setForm(null)}
        title="Add Restricted Period"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button
              loading={create.isPending}
              onClick={async () => {
                if (!form) return;
                await create.mutateAsync({
                  date: form.date,
                  endDate: form.endDate || null,
                  reason: form.reason,
                  sbuId: form.sbuId || null,
                  isActive: true,
                });
                setForm(null);
              }}
            >Save</Button>
          </div>
        }
      >
        {form && (
          <div className="space-y-3">
            <Input label="From" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="To (optional)" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <Select
              label="Scope"
              options={[{ label: 'All SBUs', value: '' }, ...(sbus ?? []).map((s) => ({ label: s.name, value: s.id }))]}
              value={form.sbuId}
              onChange={(e) => setForm({ ...form, sbuId: e.target.value })}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
}

// ─── Small checkbox helper ─────────────────────────────────

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" />
      {label}
    </label>
  );
}
