"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/loading";
import {
  usePerformanceCycles, useCreatePerformanceCycle, useAdvanceCyclePhase,
  useCompetencyFrameworks, useEmployees, useAuth, useEffectiveRole,
} from "@/hooks";
import { Plus, ChevronRight, CalendarDays, Play, Users } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const PHASE_CONFIG: Record<string, { label: string; color: string; next: string }> = {
  Draft:         { label: "Draft",            color: "bg-gray-100 text-gray-600",    next: "Launch (Kickoff)" },
  Kickoff:       { label: "Kicked Off",       color: "bg-blue-100 text-blue-700",    next: "Open Peer Selection" },
  PeerSelection: { label: "Peer Selection",   color: "bg-purple-100 text-purple-700",next: "Open Assessments" },
  Assessments:   { label: "Assessments",      color: "bg-amber-100 text-amber-700",  next: "Manager Review" },
  ManagerReview: { label: "Manager Review",   color: "bg-orange-100 text-orange-700",next: "Conversations" },
  Conversation:  { label: "1:1 Conversations",color: "bg-teal-100 text-teal-700",    next: "Close Cycle" },
  Closed:        { label: "Closed",           color: "bg-green-100 text-green-700",  next: "" },
};

export default function CyclesPage() {
  const { data: cycles, isLoading } = usePerformanceCycles();
  const { data: frameworks } = useCompetencyFrameworks();
  const createCycle = useCreatePerformanceCycle();
  const advancePhase = useAdvanceCyclePhase();
  const role = useEffectiveRole();
  const isHR = ["Admin", "Finance", "SBUHead"].includes(role ?? "");

  const [showCreate, setShowCreate] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState<{ id: string; name: string; nextLabel: string } | null>(null);
  const [form, setForm] = useState({
    name: "", reviewPeriodStart: "", reviewPeriodEnd: "",
    peerSelectionDeadline: "", assessmentDeadline: "", managerReviewDeadline: "",
    conversationDeadline: "", frameworkId: "",
    minPeerNominations: 2, maxPeerNominations: 5,
  });

  function set(key: string, value: any) { setForm((p) => ({ ...p, [key]: value })); }

  async function handleCreate() {
    if (!form.name || !form.reviewPeriodStart || !form.reviewPeriodEnd) {
      return toast.error("Name and review period dates are required.");
    }
    try {
      await createCycle.mutateAsync({ ...form, frameworkId: form.frameworkId || undefined } as any);
      toast.success("Review cycle created.");
      setShowCreate(false);
    } catch { toast.error("Failed to create cycle."); }
  }

  async function confirmAdvance() {
    if (!advanceTarget) return;
    try {
      await advancePhase.mutateAsync(advanceTarget.id);
      toast.success("Cycle phase advanced.");
      setAdvanceTarget(null);
    } catch { toast.error("Failed to advance phase."); }
  }

  return (
    <AppLayout pageTitle="Review Cycles">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-indigo-500" /> 360° Review Cycles
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage performance review cycles from draft to close.</p>
          </div>
          {isHR && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Cycle
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
        ) : (cycles ?? []).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No review cycles yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cycles!.map((cycle) => {
              const cfg = PHASE_CONFIG[cycle.phase] ?? { label: cycle.phase, color: "bg-gray-100 text-gray-600", next: "" };
              return (
                <Card key={cycle.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{cycle.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(cycle.reviewPeriodStart)} – {formatDate(cycle.reviewPeriodEnd)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {cycle._count.participants} participants
                          </span>
                          {cycle.framework && <span>Framework: {cycle.framework.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isHR && cfg.next && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setAdvanceTarget({ id: cycle.id, name: cycle.name, nextLabel: cfg.next })}
                            disabled={advancePhase.isPending}
                          >
                            <Play className="w-3.5 h-3.5 mr-1" /> {cfg.next}
                          </Button>
                        )}
                        <Link href={`/performance/cycles/${cycle.id}`}>
                          <Button variant="secondary" size="sm">
                            View <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Advance Phase Confirm Modal */}
        <Modal
          isOpen={!!advanceTarget}
          onClose={() => setAdvanceTarget(null)}
          title="Advance Review Cycle"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              You are about to advance{" "}
              <span className="font-semibold">"{advanceTarget?.name}"</span> to:{" "}
              <span className="font-semibold text-indigo-600">{advanceTarget?.nextLabel}</span>.
            </p>
            <p className="text-xs text-gray-500">
              This action will notify all participants and cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={confirmAdvance}
                disabled={advancePhase.isPending}
                className="flex-1"
              >
                {advancePhase.isPending ? "Advancing..." : "Confirm"}
              </Button>
              <Button variant="secondary" onClick={() => setAdvanceTarget(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>

        {/* Create Modal */}
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Review Cycle">
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Name <span className="text-red-500">*</span></label>
              <Input placeholder="e.g., H1 2026 Performance Review" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Start <span className="text-red-500">*</span></label>
                <Input type="date" value={form.reviewPeriodStart} onChange={(e) => set("reviewPeriodStart", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period End <span className="text-red-500">*</span></label>
                <Input type="date" value={form.reviewPeriodEnd} onChange={(e) => set("reviewPeriodEnd", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Competency Framework (optional)</label>
              <Select
                value={form.frameworkId}
                onChange={(e) => set("frameworkId", e.target.value)}
                options={[
                  { value: "", label: "— None —" },
                  ...(frameworks ?? []).map((f) => ({ value: f.id, label: f.name })),
                ]}
              />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Phase Deadlines</p>
            {[
              { key: "peerSelectionDeadline", label: "Peer Selection Deadline" },
              { key: "assessmentDeadline", label: "Assessment Deadline" },
              { key: "managerReviewDeadline", label: "Manager Review Deadline" },
              { key: "conversationDeadline", label: "Conversation Deadline" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <Input type="date" value={(form as any)[key]} onChange={(e) => set(key, e.target.value)} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Peer Nominations</label>
                <Input type="number" min={1} max={10} value={form.minPeerNominations} onChange={(e) => set("minPeerNominations", parseInt(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Peer Nominations</label>
                <Input type="number" min={1} max={10} value={form.maxPeerNominations} onChange={(e) => set("maxPeerNominations", parseInt(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={createCycle.isPending} className="flex-1">
                {createCycle.isPending ? "Creating..." : "Create Cycle"}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
