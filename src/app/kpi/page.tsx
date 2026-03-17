"use client";

import { useState } from "react";
import {
  Target, Plus, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Clock, XCircle, BarChart3, Users, RefreshCw,
  Pencil, Trash2, Upload, MessageSquare, ChevronDown, ChevronRight as ChevronRightIcon,
  Zap, Lock, Unlock, CalendarDays, ShieldCheck, ShieldX, Hourglass, FileEdit,
  Briefcase, Search, Filter, ThumbsUp, ThumbsDown, Eye, PenLine,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { Avatar } from "@/components/ui/avatar";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  useKpiDashboard, useKpis, useCreateKpi, useUpdateKpi, useDeleteKpi,
  useSubmitKpiUpdate, useAuth, useEmployees, useSbus, useDepartments,
  useEffectiveRole, useOkrDashboard, useOkrCycles, useCreateOkrCycle,
  useUpdateOkrCycle, useDeleteOkrCycle, useObjectives, useCreateObjective,
  useUpdateObjective, useDeleteObjective, useUpdateKeyResult, useOkrComments,
  useAddOkrComment, useObjective, useApproveObjective, useRejectObjective,
  useSubmitObjective, usePendingOkrApprovals, usePendingKpiReviews, useApproveKpiReview,
  useRejectKpiReview, useAllKpisForHR, useApprovers,
} from "@/hooks";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type {
  Kpi, KpiStatus, KpiCategory, KpiLevel, KpiTimeHorizon, KpiTargetType, KpiFilters,
  OkrCycle, OkrCycleStatus, Objective, KeyResult, OkrHealthStatus, KeyResultType, OkrApprovalStatus,
  KpiReview, ReviewSignoffStatus,
} from "@/types";

// ─── KPI Constants ────────────────────────────────────

const STATUS_CONFIG: Record<KpiStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  NotStarted:  { label: "Not Started",  bg: "bg-gray-100",    text: "text-gray-600",   icon: Clock },
  InProgress:  { label: "In Progress",  bg: "bg-blue-100",    text: "text-blue-700",   icon: TrendingUp },
  OnTrack:     { label: "On Track",     bg: "bg-emerald-100", text: "text-emerald-700",icon: CheckCircle2 },
  AtRisk:      { label: "At Risk",      bg: "bg-amber-100",   text: "text-amber-700",  icon: AlertTriangle },
  OffTrack:    { label: "Off Track",    bg: "bg-red-100",     text: "text-red-700",    icon: TrendingDown },
  Completed:   { label: "Completed",    bg: "bg-green-100",   text: "text-green-700",  icon: CheckCircle2 },
  Overdue:     { label: "Overdue",      bg: "bg-red-100",     text: "text-red-800",    icon: XCircle },
  OnHold:      { label: "On Hold",      bg: "bg-purple-100",  text: "text-purple-700", icon: Clock },
  Cancelled:   { label: "Cancelled",    bg: "bg-gray-100",    text: "text-gray-500",   icon: XCircle },
};

const LEVEL_COLORS: Record<string, string> = {
  Company:    "bg-indigo-100 text-indigo-700",
  SBU:        "bg-blue-100 text-blue-700",
  Department: "bg-cyan-100 text-cyan-700",
  Team:       "bg-teal-100 text-teal-700",
  Individual: "bg-orange-100 text-orange-700",
};

// ─── OKR Constants ────────────────────────────────────

const HEALTH_CONFIG: Record<OkrHealthStatus, { label: string; bg: string; text: string; barColor: string }> = {
  OnTrack:   { label: "On Track",   bg: "bg-emerald-100", text: "text-emerald-700", barColor: "bg-emerald-500" },
  AtRisk:    { label: "At Risk",    bg: "bg-amber-100",   text: "text-amber-700",   barColor: "bg-amber-500" },
  Behind:    { label: "Behind",     bg: "bg-red-100",     text: "text-red-700",     barColor: "bg-red-500" },
  Completed: { label: "Completed",  bg: "bg-green-100",   text: "text-green-700",   barColor: "bg-green-500" },
};

const CYCLE_STATUS_CONFIG: Record<OkrCycleStatus, { label: string; bg: string; text: string }> = {
  Upcoming: { label: "Upcoming", bg: "bg-blue-100",   text: "text-blue-700" },
  Active:   { label: "Active",   bg: "bg-green-100",  text: "text-green-700" },
  Closed:   { label: "Closed",   bg: "bg-gray-100",   text: "text-gray-600" },
};

const METRIC_LABELS: Record<KeyResultType, string> = {
  Percentage: "%",
  Currency: "$",
  Number: "#",
  Boolean: "✓",
};

// ─── Approval Constants ───────────────────────────────

const APPROVAL_CONFIG: Record<OkrApprovalStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  Draft:           { label: "Draft",            bg: "bg-gray-100",   text: "text-gray-600",   icon: FileEdit },
  PendingApproval: { label: "Pending Approval", bg: "bg-amber-100",  text: "text-amber-700",  icon: Hourglass },
  Approved:        { label: "Approved",         bg: "bg-emerald-100",text: "text-emerald-700",icon: ShieldCheck },
  Rejected:        { label: "Rejected",         bg: "bg-red-100",    text: "text-red-700",    icon: ShieldX },
};

function ApprovalBadge({ status }: { status: OkrApprovalStatus }) {
  const cfg = APPROVAL_CONFIG[status] ?? APPROVAL_CONFIG.Draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

// ─── Pending Approvals Panel ──────────────────────────

function PendingApprovalsPanel() {
  const { data: pending = [], isLoading } = usePendingOkrApprovals();
  const approve = useApproveObjective();
  const reject = useRejectObjective();
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  if (isLoading) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><Skeleton className="h-20 w-full" /></div>;
  if (pending.length === 0) return null;

  const handleApprove = async (id: string) => {
    try { await approve.mutateAsync({ id }); toast.success("OKR approved."); } catch { toast.error("Failed to approve."); }
  };
  const handleReject = async () => {
    if (!rejectModal || !rejectNote.trim()) { toast.error("Rejection note is required."); return; }
    try {
      await reject.mutateAsync({ id: rejectModal.id, note: rejectNote });
      toast.success("OKR rejected.");
      setRejectModal(null); setRejectNote("");
    } catch { toast.error("Failed to reject."); }
  };

  return (
    <>
      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400">
            <Hourglass className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-amber-800">Pending OKR Approvals</p>
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white px-1">{pending.length}</span>
        </div>
        <div className="divide-y divide-amber-100">
          {pending.map((obj) => (
            <div key={obj.id} className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Avatar name={obj.owner?.fullName ?? "?"} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{obj.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {obj.owner?.fullName} · {obj.cycle?.name} · {obj.keyResults?.length ?? 0} KRs
                  </p>
                  {obj.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{obj.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleApprove(obj.id)}
                  disabled={approve.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => { setRejectModal({ id: obj.id, title: obj.title }); setRejectNote(""); }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ShieldX className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject OKR" size="sm">
        {rejectModal && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs font-medium text-red-800 truncate">{rejectModal.title}</p>
            </div>
            <Textarea
              label="Rejection Note *"
              placeholder="Explain why this OKR is being rejected..."
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button variant="danger" loading={reject.isPending} onClick={handleReject}>Reject OKR</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── Confirm Modal ────────────────────────────────────

function ConfirmModal({
  isOpen, onClose, onConfirm, title, message, confirmLabel = "Delete", loading = false,
}: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmLabel?: string; loading?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ─── Shared Badges ────────────────────────────────────

function StatusBadge({ status }: { status: KpiStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NotStarted;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

function HealthBadge({ health }: { health: OkrHealthStatus }) {
  const cfg = HEALTH_CONFIG[health] ?? HEALTH_CONFIG.OnTrack;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────

function ProgressBar({ pct, health = "OnTrack" }: { pct: number; health?: OkrHealthStatus }) {
  const cfg = HEALTH_CONFIG[health];
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${cfg.barColor} transition-all`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-9 text-right">{Math.round(clamped)}%</span>
    </div>
  );
}

// ─── KR inline progress display ──────────────────────

function KrProgress({ kr }: { kr: KeyResult }) {
  const pct = kr.metricType === "Boolean"
    ? (kr.currentValue >= 1 ? 100 : 0)
    : kr.targetValue > 0 ? Math.min(100, (kr.currentValue / kr.targetValue) * 100) : 0;
  const symbol = METRIC_LABELS[kr.metricType];
  return (
    <div className="text-xs text-gray-600">
      {kr.metricType === "Boolean"
        ? <span>{kr.currentValue >= 1 ? "✓ Done" : "✗ Not done"}</span>
        : <span>{kr.currentValue}{symbol} / {kr.targetValue}{symbol}</span>
      }
    </div>
  );
}

// ─── Objective Card ───────────────────────────────────

function ObjectiveCard({
  objective,
  canEdit,
  onUpdateKr,
  onEdit,
  onSubmitDraft,
  onDelete,
}: {
  objective: Objective;
  canEdit: boolean;
  onUpdateKr: (kr: KeyResult, objectiveId: string) => void;
  onEdit?: (obj: Objective) => void;
  onSubmitDraft?: (obj: Objective) => void;
  onDelete?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const pct = Number(objective.completionPct ?? 0);
  const worstHealth: OkrHealthStatus = (objective.keyResults ?? []).reduce<OkrHealthStatus>((worst, kr) => {
    const order: OkrHealthStatus[] = ["Completed", "OnTrack", "AtRisk", "Behind"];
    return order.indexOf(kr.healthStatus) < order.indexOf(worst) ? kr.healthStatus : worst;
  }, "Completed");

  const healthCfg = HEALTH_CONFIG[worstHealth];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Left accent bar based on health */}
      <div className={`h-1 w-full ${healthCfg.barColor}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-2.5 text-left flex-1 min-w-0"
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${healthCfg.bg}`}>
              {expanded ? <ChevronDown className={`h-3.5 w-3.5 ${healthCfg.text}`} /> : <ChevronRightIcon className={`h-3.5 w-3.5 ${healthCfg.text}`} />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{objective.title}</p>
              {objective.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{objective.description}</p>}
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {objective.approvalStatus && <ApprovalBadge status={objective.approvalStatus} />}
            {objective.parentObjective && (
              <span className="text-xs text-gray-400 hidden sm:block">↳ {objective.parentObjective.title}</span>
            )}
            {objective.cycle && (
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${CYCLE_STATUS_CONFIG[objective.cycle.status].bg} ${CYCLE_STATUS_CONFIG[objective.cycle.status].text}`}>
                {objective.cycle.name}
              </span>
            )}
            {canEdit && onEdit && !objective.cycle?.isLocked && (
              <button
                onClick={() => onEdit(objective)}
                className="rounded-lg p-1.5 text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                title="Edit objective"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canEdit && onDelete && (
              <button
                onClick={() => onDelete(objective.id)}
                className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Delete objective"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 pl-9">
          <ProgressBar pct={pct} health={worstHealth} />
        </div>

        {expanded && (objective.keyResults ?? []).length > 0 && (
          <div className="mt-3 pl-9 space-y-2">
            {objective.approvalStatus === 'PendingApproval' && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <Hourglass className="h-4 w-4 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Awaiting HR Approval</p>
                  <p className="text-xs text-amber-700 mt-0.5">This OKR is under review{objective.approver ? ` by ${objective.approver.fullName}` : ""}. Progress tracking will be enabled once approved.</p>
                </div>
              </div>
            )}
            {objective.approvalStatus === 'Draft' && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileEdit className="h-4 w-4 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-500">This OKR is a draft. Submit it for HR approval to start tracking progress.</p>
                </div>
                {onSubmitDraft && (
                  <button
                    onClick={() => onSubmitDraft(objective)}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
                  >
                    <Hourglass className="h-3 w-3" />
                    Submit for Approval
                  </button>
                )}
              </div>
            )}
            {(objective.keyResults ?? []).map((kr) => (
              <div key={kr.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{kr.title}</p>
                  <KrProgress kr={kr} />
                </div>
                <HealthBadge health={kr.healthStatus} />
                {canEdit && objective.approvalStatus === 'Approved' && !objective.cycle?.isLocked && (
                  <button
                    onClick={() => onUpdateKr(kr, objective.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 transition-colors shrink-0"
                    title="Log progress"
                  >
                    <PenLine className="h-3 w-3" />
                    Update
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {expanded && (objective.owner || objective.approver) && (
          <div className="mt-3 pl-9 flex flex-wrap items-center gap-3">
            {objective.owner && (
              <div className="flex items-center gap-1.5">
                <Avatar name={objective.owner.fullName} size="sm" />
                <span className="text-xs text-gray-500">{objective.owner.fullName}</span>
              </div>
            )}
            {objective.approver && (
              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-400">Approver:</span>
                <Avatar name={objective.approver.fullName} size="sm" />
                <span className="text-xs text-gray-500">{objective.approver.fullName}</span>
              </div>
            )}
            {objective.approvalNote && objective.approvalStatus === "Rejected" && (
              <div className="w-full mt-1 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                <p className="text-xs text-red-700"><span className="font-medium">Rejection note:</span> {objective.approvalNote}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Objective Comment Thread ─────────────────────────

function CommentThread({ krId }: { krId: string }) {
  const { data: comments = [], isLoading } = useOkrComments(krId);
  const addComment = useAddOkrComment();
  const [body, setBody] = useState("");

  const handleSubmit = async () => {
    if (!body.trim()) return;
    try {
      await addComment.mutateAsync({ krId, body: body.trim() });
      setBody("");
    } catch {
      toast.error("Failed to post comment.");
    }
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Skeleton className="h-12 w-full" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No comments yet. Start the conversation.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar name={c.author?.fullName ?? "?"} size="sm" />
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-900">{c.author?.fullName}</span>
                  <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Add a comment... (use @name to mention)"
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
        />
        <Button onClick={handleSubmit} loading={addComment.isPending} variant="ghost">
          Post
        </Button>
      </div>
    </div>
  );
}

// ─── KPI Dashboard Tab ────────────────────────────────

const STAT_STYLES = [
  { gradient: "from-primary-500 to-primary-700", iconBg: "bg-white/20", ring: "ring-primary-200" },
  { gradient: "from-emerald-500 to-teal-600",    iconBg: "bg-white/20", ring: "ring-emerald-200" },
  { gradient: "from-blue-400 to-blue-600",       iconBg: "bg-white/20", ring: "ring-blue-200" },
  { gradient: "from-primary-700 to-primary-900", iconBg: "bg-white/20", ring: "ring-primary-300" },
];

const STATUS_BAR_COLOR: Partial<Record<KpiStatus, string>> = {
  OnTrack:    "bg-emerald-500",
  InProgress: "bg-blue-500",
  AtRisk:     "bg-amber-500",
  OffTrack:   "bg-red-500",
  Completed:  "bg-green-500",
  Overdue:    "bg-red-700",
  OnHold:     "bg-purple-400",
  Cancelled:  "bg-gray-400",
  NotStarted: "bg-gray-300",
};

function KpiDashboardView() {
  const { data: dashboard, isLoading } = useKpiDashboard();
  const { data: okrDash } = useOkrDashboard();
  const effectiveRole = useEffectiveRole();
  const isAdminOrSBUHead = effectiveRole === "Admin" || effectiveRole === "SBUHead";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 h-32 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total KPIs", value: dashboard?.totalKpis ?? 0, icon: Target, sub: "across all levels" },
    { label: "On Track", value: dashboard?.byStatus?.find(s => s.status === "OnTrack")?.count ?? 0, icon: CheckCircle2, sub: "performing well" },
    { label: "At Risk", value: dashboard?.byStatus?.find(s => s.status === "AtRisk")?.count ?? 0, icon: AlertTriangle, sub: "need attention" },
    { label: "Completed", value: dashboard?.byStatus?.find(s => s.status === "Completed")?.count ?? 0, icon: TrendingUp, sub: "this period" },
  ];

  const maxStatusCount = Math.max(...(dashboard?.byStatus ?? []).map(s => s.count), 1);
  const maxLevelCount  = Math.max(...(dashboard?.byLevel  ?? []).map(l => l.count), 1);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          const style = STAT_STYLES[i];
          return (
            <div key={s.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient} p-5 text-white ring-1 ${style.ring} shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white/75">{s.label}</p>
                  <p className="font-display text-4xl font-bold mt-1 tracking-tight">{s.value}</p>
                  <p className="text-xs text-white/60 mt-1">{s.sub}</p>
                </div>
                <div className={`${style.iconBg} rounded-xl p-2.5 backdrop-blur-sm`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              {/* Subtle decorative circle */}
              <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {dashboard && (dashboard.byStatus.length > 0 || dashboard.byLevel.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Distribution */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <CardTitle className="text-sm font-semibold text-gray-800">Status Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {dashboard.byStatus.map((s) => {
                const cfg = STATUS_CONFIG[s.status as KpiStatus];
                const pct = Math.round((s.count / maxStatusCount) * 100);
                const barColor = STATUS_BAR_COLOR[s.status as KpiStatus] ?? "bg-gray-400";
                return (
                  <div key={s.status} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cfg?.bg} ${cfg?.text}`}>{cfg?.label ?? s.status}</span>
                      <span className="text-xs font-semibold text-gray-700">{s.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-2 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* By Level */}
          <Card className="border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <CardTitle className="text-sm font-semibold text-gray-800">KPIs by Level</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {dashboard.byLevel.map((l) => {
                const pct = Math.round((l.count / maxLevelCount) * 100);
                return (
                  <div key={l.level} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[l.level] ?? "bg-gray-100 text-gray-600"}`}>{l.level}</span>
                      <span className="text-xs font-semibold text-gray-700">{l.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-2 rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Assigned KPIs */}
      {dashboard?.myAssignments && dashboard.myAssignments.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <CardTitle className="text-sm font-semibold text-gray-800">My Assigned KPIs</CardTitle>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{dashboard.myAssignments.length} total</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-gray-50">
              {dashboard.myAssignments.map((a: any) => (
                <div key={a.kpi.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.kpi.title}</p>
                      <p className="text-xs text-gray-400">Due {formatDate(a.kpi.endDate)}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.kpi.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OKR Summary */}
      {okrDash && (
        <Card className="border-0 shadow-sm ring-1 ring-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <CardTitle className="text-sm font-semibold text-gray-800">
                  {isAdminOrSBUHead ? "OKR Overview" : "My OKR Progress"}
                </CardTitle>
              </div>
              {okrDash.activeCycle && (
                <span className="text-xs font-medium text-violet-700 bg-violet-50 rounded-full px-2 py-0.5">
                  {okrDash.activeCycle.name} · Active
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Org-wide stats for Admin/SBUHead */}
            {isAdminOrSBUHead && okrDash.orgStats ? (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl bg-violet-50 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold text-violet-700">{okrDash.orgStats.totalObjectives}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total Objectives</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{okrDash.orgStats.approvedCount}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Approved</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold text-amber-600">{okrDash.orgStats.pendingCount}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pending Approval</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold text-gray-900">{okrDash.orgStats.avgCompletion}%</p>
                    <p className="text-xs text-gray-500 mt-0.5">Avg. Completion</p>
                  </div>
                </div>
                {/* Team objectives */}
                {(okrDash.teamObjectives ?? []).length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Team Progress</p>
                    {(okrDash.teamObjectives as any[]).slice(0, 5).map((obj: any) => {
                      const pct = Math.min(100, Math.round(Number(obj.completionPct ?? 0)));
                      const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-violet-500" : "bg-amber-500";
                      return (
                        <div key={obj.id} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-gray-700 truncate flex-1">{obj.title}</p>
                            <span className="text-xs text-gray-400 shrink-0">{obj.owner?.fullName}</span>
                            <span className="text-xs font-semibold text-gray-500 shrink-0">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {(okrDash.teamObjectives ?? []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No objectives in the active cycle yet.</p>
                )}
              </>
            ) : (
              <>
                {/* Personal stats for non-admin */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold text-gray-900">{okrDash.myObjectives?.length ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">My Objectives</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {okrDash.myObjectives?.length
                        ? Math.round(okrDash.myObjectives.reduce((sum: number, o: any) => sum + Number(o.completionPct ?? 0), 0) / okrDash.myObjectives.length)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Avg. Completion</p>
                  </div>
                  <div className={`rounded-xl px-3 py-2.5 text-center ${okrDash.staleKrCount > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
                    <p className={`text-2xl font-bold ${okrDash.staleKrCount > 0 ? "text-amber-600" : "text-gray-900"}`}>{okrDash.staleKrCount}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Stale Key Results</p>
                  </div>
                </div>

                {/* Objective progress bars */}
                {(okrDash.myObjectives ?? []).length > 0 && (
                  <div className="space-y-2.5">
                    {(okrDash.myObjectives as any[]).slice(0, 5).map((obj: any) => {
                      const pct = Math.min(100, Math.round(Number(obj.completionPct ?? 0)));
                      const health = (obj.keyResults ?? []).reduce((worst: OkrHealthStatus, kr: any) => {
                        const order: OkrHealthStatus[] = ["Completed", "OnTrack", "AtRisk", "Behind"];
                        return order.indexOf(kr.healthStatus) < order.indexOf(worst) ? kr.healthStatus : worst;
                      }, "Completed" as OkrHealthStatus);
                      const barColor = health === "Behind" ? "bg-red-500" : health === "AtRisk" ? "bg-amber-500" : health === "Completed" ? "bg-emerald-500" : "bg-violet-500";
                      return (
                        <div key={obj.id} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-gray-700 truncate flex-1">{obj.title}</p>
                            <span className="text-xs font-semibold text-gray-500 shrink-0">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(okrDash.myObjectives ?? []).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No objectives in the active cycle yet.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {dashboard && dashboard.totalKpis === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Target className="h-7 w-7 text-gray-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-900">No KPIs yet</p>
          <p className="mt-1 text-xs text-gray-500">Create your first KPI to start tracking performance.</p>
        </div>
      )}
    </div>
  );
}

// ─── My OKRs Tab ─────────────────────────────────────

function MyOkrsTab({ employeeId, canManage }: { employeeId: string; canManage: boolean }) {
  const { data: cycles = [] } = useOkrCycles();
  const activeCycle = cycles.find((c) => c.status === "Active");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");

  const effectiveCycleId = selectedCycleId || activeCycle?.id || "";
  const { data: objData, isLoading } = useObjectives({ cycleId: effectiveCycleId || undefined, limit: 50 });
  const objectives = objData?.data ?? [];

  const { data: okrDash } = useOkrDashboard();

  // Load lead-role employees for approver selection
  const { data: approversData = [] } = useApprovers();
  const approverOptions = approversData;

  const createObjective = useCreateObjective();
  const updateObjective = useUpdateObjective();
  const deleteObjective = useDeleteObjective();
  const submitObjective = useSubmitObjective();
  const updateKr = useUpdateKeyResult();

  const [createModal, setCreateModal] = useState(false);
  const [submitModal, setSubmitModal] = useState<Objective | null>(null);
  const [submitApproverId, setSubmitApproverId] = useState("");
  const [editModal, setEditModal] = useState<Objective | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", parentObjectiveId: "" });
  const [krModal, setKrModal] = useState<{ kr: KeyResult; objectiveId: string } | null>(null);
  const [commentModal, setCommentModal] = useState<{ krId: string; krTitle: string } | null>(null);
  const [deleteObjConfirm, setDeleteObjConfirm] = useState<string | null>(null);

  const openEdit = (obj: Objective) => {
    setEditForm({ title: obj.title, description: obj.description ?? "", parentObjectiveId: obj.parentObjectiveId ?? "" });
    setEditModal(obj);
  };

  const handleEditObjective = async () => {
    if (!editModal || !editForm.title) { toast.error("Title is required."); return; }
    try {
      await updateObjective.mutateAsync({ id: editModal.id, data: { title: editForm.title, description: editForm.description || undefined, parentObjectiveId: editForm.parentObjectiveId || null } });
      toast.success("Objective updated.");
      setEditModal(null);
    } catch { toast.error("Failed to update objective."); }
  };

  const handleSubmitForApproval = async () => {
    if (!submitModal || !submitApproverId) { toast.error("Please select an approver."); return; }
    try {
      await submitObjective.mutateAsync({ id: submitModal.id, approverId: submitApproverId });
      toast.success("OKR submitted for approval.");
      setSubmitModal(null);
      setSubmitApproverId("");
    } catch { toast.error("Failed to submit OKR."); }
  };

  const emptyObjForm = {
    cycleId: effectiveCycleId,
    title: "",
    description: "",
    parentObjectiveId: "",
    approverId: "",
    keyResults: [{ title: "", metricType: "Number" as KeyResultType, targetValue: "", startValue: "0" }] as Array<{ title: string; metricType: KeyResultType; targetValue: string; startValue: string }>,
  };
  const [objForm, setObjForm] = useState(emptyObjForm);

  const emptyKrUpdateForm = { newValue: "", healthStatus: "OnTrack" as OkrHealthStatus, note: "" };
  const [krUpdateForm, setKrUpdateForm] = useState(emptyKrUpdateForm);

  const openCreate = () => {
    setObjForm({ ...emptyObjForm, cycleId: effectiveCycleId });
    setCreateModal(true);
  };

  const handleCreateObjective = async () => {
    if (!objForm.cycleId || !objForm.title) { toast.error("Cycle and title are required."); return; }
    if (!objForm.approverId) { toast.error("Please select an approver."); return; }
    const validKrs = objForm.keyResults.filter((kr) => kr.title && kr.targetValue);
    if (validKrs.length === 0) { toast.error("Add at least one Key Result with a title and target."); return; }
    try {
      await createObjective.mutateAsync({
        cycleId: objForm.cycleId,
        title: objForm.title,
        description: objForm.description || undefined,
        parentObjectiveId: objForm.parentObjectiveId || undefined,
        approverId: objForm.approverId || undefined,
        keyResults: validKrs.map((kr) => ({
          title: kr.title,
          metricType: kr.metricType,
          targetValue: parseFloat(kr.targetValue),
          startValue: parseFloat(kr.startValue || "0"),
        })),
      });
      toast.success(objForm.approverId ? "Objective submitted for approval." : "Objective created.");
      setCreateModal(false);
    } catch { toast.error("Failed to create objective."); }
  };

  const handleKrUpdate = async () => {
    if (!krModal || !krUpdateForm.newValue) { toast.error("New value is required."); return; }
    try {
      await updateKr.mutateAsync({
        krId: krModal.kr.id,
        objectiveId: krModal.objectiveId,
        data: {
          newValue: parseFloat(krUpdateForm.newValue),
          healthStatus: krUpdateForm.healthStatus,
          note: krUpdateForm.note || undefined,
        },
      });
      toast.success("Progress updated.");
      setKrModal(null);
    } catch { toast.error("Failed to update progress."); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteObjective.mutateAsync(id); toast.success("Deleted."); setDeleteObjConfirm(null); } catch { toast.error("Delete failed."); }
  };

  const addKr = () => {
    if (objForm.keyResults.length >= 5) { toast.error("Maximum 5 Key Results."); return; }
    setObjForm((f) => ({ ...f, keyResults: [...f.keyResults, { title: "", metricType: "Number", targetValue: "", startValue: "0" }] }));
  };

  const removeKr = (i: number) => setObjForm((f) => ({ ...f, keyResults: f.keyResults.filter((_, idx) => idx !== i) }));

  const parentOptions = objectives.map((o) => ({ label: o.title, value: o.id }));

  return (
    <div className="space-y-4">
      {/* Pending Approvals Panel (visible to SBU Heads / Admins) */}
      <PendingApprovalsPanel />

      {/* Stale warning */}
      {okrDash && okrDash.staleKrCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            You have <strong>{okrDash.staleKrCount}</strong> Key Result{okrDash.staleKrCount > 1 ? "s" : ""} that haven&apos;t been updated in 14+ days. Please log your progress.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            placeholder="Filter by cycle"
            options={[{ label: "All cycles", value: "" }, ...cycles.map((c) => ({ label: c.name, value: c.id }))]}
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
          />
        </div>
        <div className="ml-auto">
          <Button onClick={openCreate} disabled={!effectiveCycleId}>
            <Plus className="h-4 w-4" />
            New Objective
          </Button>
        </div>
      </div>

      {!effectiveCycleId && (
        <Card><CardContent className="py-12 text-center text-sm text-gray-500">No active cycle found. Ask your HR Admin to create a cycle first.</CardContent></Card>
      )}

      {/* Objectives list */}
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))
      ) : objectives.length === 0 && effectiveCycleId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Zap className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No objectives yet for this cycle.</p>
            <p className="text-xs text-gray-400 mt-1">Create your first objective to get started.</p>
          </CardContent>
        </Card>
      ) : (
        objectives.map((obj) => (
          <div key={obj.id}>
            <ObjectiveCard
              objective={obj}
              canEdit={true}
              onUpdateKr={(kr, objectiveId) => { setKrModal({ kr, objectiveId }); setKrUpdateForm({ newValue: String(kr.currentValue), healthStatus: kr.healthStatus, note: "" }); }}
              onEdit={openEdit}
              onSubmitDraft={(o) => { setSubmitModal(o); setSubmitApproverId(""); }}
              onDelete={(id) => setDeleteObjConfirm(id)}
            />
            {/* Comments link per KR */}
            {(obj.keyResults ?? []).length > 0 && (
              <div className="pl-10 mt-1 flex gap-3 flex-wrap">
                {(obj.keyResults ?? []).map((kr) => (
                  <button
                    key={kr.id}
                    onClick={() => setCommentModal({ krId: kr.id, krTitle: kr.title })}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Discuss
                  </button>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {/* Create Objective Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="New Objective" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Select
            label="Cycle"
            required
            options={cycles.filter((c) => c.status !== "Closed" && !c.isLocked).map((c) => ({ label: c.name, value: c.id }))}
            value={objForm.cycleId}
            onChange={(e) => setObjForm((f) => ({ ...f, cycleId: e.target.value }))}
          />
          <Input
            label="Objective Title"
            required
            placeholder="e.g. Improve customer satisfaction scores"
            value={objForm.title}
            onChange={(e) => setObjForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label="Description (optional)"
            placeholder="Why does this objective matter?"
            rows={2}
            value={objForm.description}
            onChange={(e) => setObjForm((f) => ({ ...f, description: e.target.value }))}
          />
          {parentOptions.length > 0 && (
            <SearchableSelect
              label="Align to Parent Objective (optional)"
              placeholder="Search objectives..."
              options={parentOptions}
              value={objForm.parentObjectiveId}
              onChange={(value) => setObjForm((f) => ({ ...f, parentObjectiveId: value }))}
            />
          )}

          {/* Approver */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Select Approver <span className="text-red-500">*</span></p>
                <p className="text-xs text-gray-500 mt-0.5">Your OKR will be automatically submitted for approval on creation. Progress tracking starts once approved.</p>
              </div>
            </div>
            <Select
              label="Approver"
              required
              options={[
                { label: "Select an approver...", value: "", disabled: true },
                ...approverOptions.map((e) => ({ label: `${e.fullName} · ${e.role}`, value: e.id })),
              ]}
              value={objForm.approverId}
              onChange={(ev) => setObjForm((f) => ({ ...f, approverId: ev.target.value }))}
            />
            {objForm.approverId && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2">
                <Hourglass className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">This OKR will be <strong>automatically submitted for approval</strong> upon creation.</p>
              </div>
            )}
          </div>

          {/* Key Results */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Key Results <span className="text-red-500">*</span></label>
              <button onClick={addKr} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add KR
              </button>
            </div>
            <div className="space-y-3">
              {objForm.keyResults.map((kr, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 w-4">{i + 1}.</span>
                    <input
                      className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Key result title"
                      value={kr.title}
                      onChange={(e) => setObjForm((f) => ({ ...f, keyResults: f.keyResults.map((k, idx) => idx === i ? { ...k, title: e.target.value } : k) }))}
                    />
                    {objForm.keyResults.length > 1 && (
                      <button onClick={() => removeKr(i)} className="text-gray-400 hover:text-red-500 transition-colors"><XCircle className="h-4 w-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pl-5">
                    <Select
                      options={[
                        { label: "% Percentage", value: "Percentage" },
                        { label: "$ Currency", value: "Currency" },
                        { label: "# Number", value: "Number" },
                        { label: "✓ Boolean", value: "Boolean" },
                      ]}
                      value={kr.metricType}
                      onChange={(e) => setObjForm((f) => ({ ...f, keyResults: f.keyResults.map((k, idx) => idx === i ? { ...k, metricType: e.target.value as KeyResultType } : k) }))}
                    />
                    <input
                      type="number"
                      className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Start"
                      value={kr.startValue}
                      onChange={(e) => setObjForm((f) => ({ ...f, keyResults: f.keyResults.map((k, idx) => idx === i ? { ...k, startValue: e.target.value } : k) }))}
                    />
                    <input
                      type="number"
                      className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Target"
                      value={kr.targetValue}
                      onChange={(e) => setObjForm((f) => ({ ...f, keyResults: f.keyResults.map((k, idx) => idx === i ? { ...k, targetValue: e.target.value } : k) }))}
                    />
                  </div>
                  <p className="text-xs text-gray-400 pl-5">Start value → Target value (metric type: {kr.metricType})</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
          <Button variant="outline" onClick={() => setCreateModal(false)}>Cancel</Button>
          <Button loading={createObjective.isPending} onClick={handleCreateObjective}>Create Objective</Button>
        </div>
      </Modal>

      {/* Submit for Approval Modal */}
      {submitModal && (
        <Modal isOpen={true} onClose={() => setSubmitModal(null)} title="Submit OKR for Approval" size="sm">
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
              <p className="text-sm font-medium text-amber-900">{submitModal.title}</p>
              <p className="text-xs text-amber-700 mt-0.5">Select an HR/SBU Head to review this OKR.</p>
            </div>
            <Select
              label="Approver"
              required
              options={[
                { label: "Select an approver...", value: "", disabled: true },
                ...approverOptions.map((e) => ({ label: `${e.fullName} · ${e.role}`, value: e.id })),
              ]}
              value={submitApproverId}
              onChange={(e) => setSubmitApproverId(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setSubmitModal(null)}>Cancel</Button>
              <Button loading={submitObjective.isPending} onClick={handleSubmitForApproval}>Submit for Approval</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Objective Modal */}
      {editModal && (
        <Modal isOpen={true} onClose={() => setEditModal(null)} title="Edit Objective" size="md">
          <div className="space-y-4">
            <Input
              label="Objective Title"
              required
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              label="Description (optional)"
              rows={2}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />
            {parentOptions.length > 1 && (
              <SearchableSelect
                label="Align to Parent Objective (optional)"
                placeholder="Search objectives..."
                options={parentOptions.filter((o) => o.value !== editModal.id)}
                value={editForm.parentObjectiveId}
                onChange={(value) => setEditForm((f) => ({ ...f, parentObjectiveId: value }))}
              />
            )}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button loading={updateObjective.isPending} onClick={handleEditObjective}>Save Changes</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Update KR Modal */}
      {krModal && (
        <Modal isOpen={true} onClose={() => setKrModal(null)} title="Log Key Result Progress" size="sm">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">{krModal.kr.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Current: {krModal.kr.currentValue}{METRIC_LABELS[krModal.kr.metricType]} → Target: {krModal.kr.targetValue}{METRIC_LABELS[krModal.kr.metricType]}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Value <span className="text-red-500">*</span></label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                value={krUpdateForm.newValue}
                onChange={(e) => setKrUpdateForm((f) => ({ ...f, newValue: e.target.value }))}
              />
            </div>
            <Select
              label="Health Status"
              options={[
                { label: "On Track", value: "OnTrack" },
                { label: "At Risk", value: "AtRisk" },
                { label: "Behind", value: "Behind" },
                { label: "Completed", value: "Completed" },
              ]}
              value={krUpdateForm.healthStatus}
              onChange={(e) => setKrUpdateForm((f) => ({ ...f, healthStatus: e.target.value as OkrHealthStatus }))}
            />
            <Textarea
              label="Note (optional)"
              placeholder="Any context about this update..."
              rows={2}
              value={krUpdateForm.note}
              onChange={(e) => setKrUpdateForm((f) => ({ ...f, note: e.target.value }))}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setKrModal(null)}>Cancel</Button>
              <Button loading={updateKr.isPending} onClick={handleKrUpdate}>Save Progress</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <Modal isOpen={true} onClose={() => setCommentModal(null)} title={`Discussion: ${commentModal.krTitle}`} size="md">
          <CommentThread krId={commentModal.krId} />
        </Modal>
      )}

      {/* Delete Objective Confirm */}
      <ConfirmModal
        isOpen={!!deleteObjConfirm}
        onClose={() => setDeleteObjConfirm(null)}
        onConfirm={() => deleteObjConfirm && handleDelete(deleteObjConfirm)}
        title="Delete Objective"
        message="Are you sure you want to delete this objective and all its key results? This action cannot be undone."
        loading={deleteObjective.isPending}
      />
    </div>
  );
}

// ─── Team OKRs Tab ────────────────────────────────────

function TeamOkrsTab() {
  const { data: okrDash, isLoading } = useOkrDashboard();
  const { data: cycles = [] } = useOkrCycles();
  const activeCycle = cycles.find((c) => c.status === "Active");

  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const effectiveCycleId = selectedCycleId || activeCycle?.id || "";

  const { data: teamData, isLoading: teamLoading } = useObjectives({
    cycleId: effectiveCycleId || undefined,
    teamView: "true",
    limit: 100,
  });
  const teamObjectives = teamData?.data ?? [];

  // Group by owner
  const byOwner = teamObjectives.reduce<Record<string, { owner: Objective["owner"]; objectives: Objective[] }>>((acc, obj) => {
    const ownerId = obj.ownerId;
    if (!acc[ownerId]) acc[ownerId] = { owner: obj.owner, objectives: [] };
    acc[ownerId].objectives.push(obj);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            placeholder="Filter by cycle"
            options={[{ label: "All cycles", value: "" }, ...cycles.map((c) => ({ label: c.name, value: c.id }))]}
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
          />
        </div>
        {okrDash?.directReports && okrDash.directReports.length > 0 && (
          <p className="text-sm text-gray-500">{okrDash.directReports.length} direct report(s)</p>
        )}
      </div>

      {teamLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))
      ) : Object.keys(byOwner).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No team OKRs found for this cycle.</p>
            <p className="text-xs text-gray-400 mt-1">Your direct reports haven&apos;t created any objectives yet.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(byOwner).map(([ownerId, { owner, objectives: ownerObjs }]) => {
          const avgPct = ownerObjs.length > 0 ? ownerObjs.reduce((s, o) => s + Number(o.completionPct), 0) / ownerObjs.length : 0;
          return (
            <Card key={ownerId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={owner?.fullName ?? "?"} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{owner?.fullName}</p>
                      <p className="text-xs text-gray-500">{owner?.jobTitle} · {owner?.department?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">{Math.round(avgPct)}% avg</span>
                    <span className="text-xs text-gray-500">{ownerObjs.length} objective{ownerObjs.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar pct={avgPct} />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {ownerObjs.map((obj) => (
                  <ObjectiveCard
                    key={obj.id}
                    objective={obj}
                    canEdit={false}
                    onUpdateKr={() => {}}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ─── Cycles Tab ───────────────────────────────────────

function CyclesTab() {
  const { data: cycles = [], isLoading } = useOkrCycles();
  const createCycle = useCreateOkrCycle();
  const updateCycle = useUpdateOkrCycle();
  const deleteCycle = useDeleteOkrCycle();

  const emptyCycleForm = { name: "", startDate: "", endDate: "", status: "Upcoming" as OkrCycleStatus };
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCycleForm);
  const [deleteCycleConfirm, setDeleteCycleConfirm] = useState<string | null>(null);

  const openCreate = () => { setEditingId(null); setForm(emptyCycleForm); setModal(true); };
  const openEdit = (c: OkrCycle) => { setEditingId(c.id); setForm({ name: c.name, startDate: c.startDate.split("T")[0], endDate: c.endDate.split("T")[0], status: c.status }); setModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) { toast.error("All fields required."); return; }
    try {
      if (editingId) {
        await updateCycle.mutateAsync({ id: editingId, data: form });
        toast.success("Cycle updated.");
      } else {
        await createCycle.mutateAsync(form);
        toast.success("Cycle created.");
      }
      setModal(false);
    } catch { toast.error("Save failed."); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteCycle.mutateAsync(id); toast.success("Deleted."); setDeleteCycleConfirm(null); } catch { toast.error("Delete failed."); }
  };

  const handleToggleLock = async (cycle: OkrCycle) => {
    try {
      await updateCycle.mutateAsync({ id: cycle.id, data: { isLocked: !cycle.isLocked } });
      toast.success(cycle.isLocked ? "Cycle unlocked." : "Cycle locked.");
    } catch { toast.error("Failed."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="h-4 w-4" />New Cycle</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}</div>
      ) : cycles.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">No cycles yet. Create your first OKR cycle.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => {
            const cfg = CYCLE_STATUS_CONFIG[cycle.status];
            return (
              <Card key={cycle.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-gray-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{cycle.name}</p>
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {cycle.isLocked && <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-gray-100 text-gray-600 flex items-center gap-1"><Lock className="h-3 w-3" />Locked</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(cycle.startDate)} – {formatDate(cycle.endDate)} · {cycle._count?.objectives ?? 0} objectives</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        options={[
                          { label: "Upcoming", value: "Upcoming" },
                          { label: "Active", value: "Active" },
                          { label: "Closed", value: "Closed" },
                        ]}
                        value={cycle.status}
                        onChange={(e) => updateCycle.mutateAsync({ id: cycle.id, data: { status: e.target.value as OkrCycleStatus } }).catch(() => toast.error("Update failed."))}
                      />
                      <button
                        onClick={() => handleToggleLock(cycle)}
                        className={`rounded p-1.5 transition-colors ${cycle.isLocked ? "text-amber-600 hover:bg-amber-50" : "text-gray-400 hover:bg-gray-100"}`}
                        title={cycle.isLocked ? "Unlock cycle" : "Lock cycle"}
                      >
                        {cycle.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </button>
                      <button onClick={() => openEdit(cycle)} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteCycleConfirm(cycle.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editingId ? "Edit Cycle" : "New Cycle"} size="sm">
        <div className="space-y-4">
          <Input label="Cycle Name" required placeholder="e.g. Q2 2026" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" required value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <Select label="Status" options={[{ label: "Upcoming", value: "Upcoming" }, { label: "Active", value: "Active" }, { label: "Closed", value: "Closed" }]} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as OkrCycleStatus }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button loading={createCycle.isPending || updateCycle.isPending} onClick={handleSave}>{editingId ? "Save" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteCycleConfirm}
        onClose={() => setDeleteCycleConfirm(null)}
        onConfirm={() => deleteCycleConfirm && handleDelete(deleteCycleConfirm)}
        title="Delete Cycle"
        message="Are you sure you want to delete this cycle? All objectives within it will also be permanently deleted."
        loading={deleteCycle.isPending}
      />
    </div>
  );
}

// ─── KPI List Tab ─────────────────────────────────────

function KpiListTab({ canManage, isAdmin, employeeId }: { canManage: boolean; isAdmin: boolean; employeeId: string }) {
  const [filters, setFilters] = useState<KpiFilters>({ page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateKpiId, setUpdateKpiId] = useState("");

  const { data: kpisData, isLoading: kpisLoading } = useKpis(filters);
  const kpis = kpisData?.data ?? [];
  const pagination = kpisData?.pagination;

  const { data: employeesData } = useEmployees({ limit: 1000, status: "Active" });
  const employeeOptions = (employeesData?.data ?? []).map((e) => ({ label: e.fullName, value: e.id, subLabel: `${e.employeeId} · ${e.jobTitle}` }));
  const { data: sbus } = useSbus();
  const sbuOptions = (sbus ?? []).map((s) => ({ label: s.name, value: s.id }));

  const emptyForm = {
    title: "", description: "", category: "Strategic" as KpiCategory, kpiLevel: "Individual" as KpiLevel,
    timeHorizon: "Monthly" as KpiTimeHorizon, targetType: "Numeric" as KpiTargetType, targetValue: "", unit: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0],
    sbuId: "", departmentId: "", parentKpiId: "", updateFrequency: "Monthly", rollupMethod: "WeightedAverage",
    evidenceRequired: false, assigneeIds: [] as string[],
  };
  const [form, setForm] = useState(emptyForm);
  const { data: departments } = useDepartments(form.sbuId || undefined);
  const deptOptions = (departments ?? []).map((d) => ({ label: d.name, value: d.id }));
  const kpiOptions = kpis.map((k) => ({ label: k.title, value: k.id, subLabel: k.kpiLevel }));

  const createKpi = useCreateKpi();
  const updateKpi = useUpdateKpi();
  const deleteKpi = useDeleteKpi();
  const submitUpdate = useSubmitKpiUpdate();

  const emptyUpdateForm = { updatePeriod: new Date().toISOString().slice(0, 7), actualValue: "", percentComplete: "", narrative: "", blockerFlag: false, blockerDetail: "", confidenceLevel: "3", nextSteps: "" };
  const [updateForm, setUpdateForm] = useState(emptyUpdateForm);
  const [deleteKpiConfirm, setDeleteKpiConfirm] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setAssigneeSearch(""); setModalOpen(true); };
  const openEdit = (kpi: Kpi) => {
    setEditingId(kpi.id);
    setForm({ title: kpi.title, description: kpi.description ?? "", category: kpi.category, kpiLevel: kpi.kpiLevel, timeHorizon: kpi.timeHorizon, targetType: kpi.targetType, targetValue: kpi.targetValue?.toString() ?? "", unit: kpi.unit ?? "", startDate: kpi.startDate.split("T")[0], endDate: kpi.endDate.split("T")[0], sbuId: kpi.sbuId ?? kpi.department?.sbuId ?? "", departmentId: kpi.departmentId ?? "", parentKpiId: kpi.parentKpiId ?? "", updateFrequency: kpi.updateFrequency, rollupMethod: kpi.rollupMethod, evidenceRequired: kpi.evidenceRequired, assigneeIds: [] });
    setModalOpen(true);
  };
  const openUpdate = (kpiId: string) => { setUpdateKpiId(kpiId); setUpdateForm(emptyUpdateForm); setUpdateModalOpen(true); };

  const handleSaveKpi = async () => {
    if (!form.title || !form.startDate || !form.endDate) { toast.error("Title and dates required."); return; }
    const payload: any = { title: form.title, description: form.description || undefined, category: form.category, kpiLevel: form.kpiLevel, timeHorizon: form.timeHorizon, targetType: form.targetType, targetValue: form.targetValue ? parseFloat(form.targetValue) : undefined, unit: form.unit || undefined, startDate: form.startDate, endDate: form.endDate, sbuId: form.sbuId || undefined, departmentId: form.departmentId || undefined, parentKpiId: form.parentKpiId || undefined, updateFrequency: form.updateFrequency, rollupMethod: form.rollupMethod, evidenceRequired: form.evidenceRequired, assigneeIds: form.assigneeIds.length > 0 ? form.assigneeIds : undefined };
    try {
      if (editingId) { await updateKpi.mutateAsync({ id: editingId, data: payload }); toast.success("KPI updated."); }
      else { await createKpi.mutateAsync(payload); toast.success("KPI created."); }
      setModalOpen(false);
    } catch { toast.error("Failed to save KPI."); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteKpi.mutateAsync(id); toast.success("Deleted."); setDeleteKpiConfirm(null); } catch { toast.error("Delete failed."); }
  };

  const handleSubmitUpdate = async () => {
    if (!updateKpiId || !updateForm.updatePeriod) { toast.error("Required fields missing."); return; }
    try {
      await submitUpdate.mutateAsync({ kpiId: updateKpiId, updatePeriod: updateForm.updatePeriod, actualValue: updateForm.actualValue ? parseFloat(updateForm.actualValue) : undefined, percentComplete: updateForm.percentComplete ? parseFloat(updateForm.percentComplete) : undefined, narrative: updateForm.narrative || undefined, blockerFlag: updateForm.blockerFlag, blockerDetail: updateForm.blockerDetail || undefined, confidenceLevel: updateForm.confidenceLevel ? parseInt(updateForm.confidenceLevel) : undefined, nextSteps: updateForm.nextSteps || undefined });
      toast.success("Update submitted.");
      setUpdateModalOpen(false);
    } catch { toast.error("Failed."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40"><Select placeholder="All Levels" options={[{ label: "All Levels", value: "" }, ...["Company","SBU","Department","Team","Individual"].map((v) => ({ label: v, value: v }))]} value={filters.kpiLevel ?? ""} onChange={(e) => setFilters((f) => ({ ...f, kpiLevel: (e.target.value as any) || undefined, page: 1 }))} /></div>
        <div className="w-40"><Select placeholder="All Statuses" options={[{ label: "All Statuses", value: "" }, ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ label: c.label, value: v }))]} value={filters.status ?? ""} onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value as any) || undefined, page: 1 }))} /></div>
        <div className="w-40"><Select placeholder="All Horizons" options={[{ label: "All Horizons", value: "" }, ...["Annual","Quarterly","Monthly"].map((v) => ({ label: v, value: v }))]} value={filters.timeHorizon ?? ""} onChange={(e) => setFilters((f) => ({ ...f, timeHorizon: (e.target.value as any) || undefined, page: 1 }))} /></div>
        {canManage && <div className="ml-auto"><Button onClick={openCreate}><Plus className="h-4 w-4" />Create KPI</Button></div>}
        <button onClick={() => setFilters({ page: 1, limit: 20 })} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"><RefreshCw className="h-3.5 w-3.5" />Reset</button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI Title</TableHead><TableHead>Level</TableHead><TableHead>Horizon</TableHead><TableHead>Target</TableHead><TableHead>End Date</TableHead><TableHead>Status</TableHead><TableHead>Assignees</TableHead><TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpisLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-3/4" /></TableCell>)}</TableRow>)
                  : kpis.length === 0 ? <TableRow><TableCell colSpan={8} className="py-16 text-center text-sm text-gray-500">No KPIs found</TableCell></TableRow>
                  : kpis.map((kpi) => (
                    <TableRow key={kpi.id}>
                      <TableCell><div><p className="font-medium text-sm text-gray-900">{kpi.title}</p>{kpi.parent && <p className="text-xs text-gray-400">↳ {kpi.parent.title}</p>}</div></TableCell>
                      <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[kpi.kpiLevel] ?? "bg-gray-100 text-gray-600"}`}>{kpi.kpiLevel}</span></TableCell>
                      <TableCell className="text-sm text-gray-600">{kpi.timeHorizon}</TableCell>
                      <TableCell className="text-sm">{kpi.targetValue != null ? `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}` : "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDate(kpi.endDate)}</TableCell>
                      <TableCell><StatusBadge status={kpi.status} /></TableCell>
                      <TableCell>{kpi.assignments && kpi.assignments.length > 0 ? <div className="flex -space-x-1">{kpi.assignments.slice(0, 3).map((a) => <Avatar key={a.id} name={a.employee?.fullName ?? "?"} size="sm" />)}{kpi.assignments.length > 3 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs border border-white">+{kpi.assignments.length - 3}</span>}</div> : <span className="text-xs text-gray-400">—</span>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openUpdate(kpi.id)} className="rounded p-1 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors" title="Submit update"><Upload className="h-4 w-4" /></button>
                          {canManage && <button onClick={() => openEdit(kpi)} className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>}
                          {isAdmin && <button onClick={() => setDeleteKpiConfirm(kpi.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          {pagination && pagination.totalPages > 1 && <div className="border-t border-gray-100 px-4 py-3"><Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} /></div>}
        </CardContent>
      </Card>

      {/* Create/Edit KPI Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} title={editingId ? "Edit KPI" : "Create KPI"} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="KPI Title" required placeholder="e.g. Increase placement rate to 65%" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" placeholder="Describe this KPI..." rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="KPI Level" required options={["Company","SBU","Department","Team","Individual"].map((v) => ({ label: v, value: v }))} value={form.kpiLevel} onChange={(e) => setForm((f) => ({ ...f, kpiLevel: e.target.value as KpiLevel }))} />
            <Select label="Time Horizon" required options={["Annual","Quarterly","Monthly"].map((v) => ({ label: v, value: v }))} value={form.timeHorizon} onChange={(e) => setForm((f) => ({ ...f, timeHorizon: e.target.value as KpiTimeHorizon }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" options={["Strategic","Operational","Financial","Customer","Compliance","People","Innovation"].map((v) => ({ label: v, value: v }))} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as KpiCategory }))} />
            <Select label="Target Type" options={[{label:"Numeric",value:"Numeric"},{label:"Percentage",value:"Percentage"},{label:"Milestone",value:"Milestone"},{label:"Binary (Yes/No)",value:"Binary"},{label:"Composite",value:"Composite"}]} value={form.targetType} onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value as KpiTargetType }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Target Value" type="number" placeholder="e.g. 95" value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))} />
            <Input label="Unit" placeholder="e.g. %, days" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" required value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          {sbuOptions.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Select label="SBU" options={[{ label: "None", value: "" }, ...sbuOptions]} value={form.sbuId} onChange={(e) => setForm((f) => ({ ...f, sbuId: e.target.value, departmentId: "" }))} />
              <Select label="Department" options={[{ label: "None", value: "" }, ...deptOptions]} value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} />
            </div>
          )}
          <SearchableSelect label="Parent KPI (optional)" placeholder="Search KPIs..." options={kpiOptions} value={form.parentKpiId} onChange={(value) => setForm((f) => ({ ...f, parentKpiId: value }))} />
          {!editingId && employeeOptions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Assign to Employees (optional)</p>
              <div className="relative mb-1.5">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto border rounded-lg p-2">
                {employeeOptions
                  .filter((emp) => emp.label.toLowerCase().includes(assigneeSearch.toLowerCase()) || emp.subLabel.toLowerCase().includes(assigneeSearch.toLowerCase()))
                  .map((emp) => (
                    <label key={emp.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1">
                      <input type="checkbox" className="rounded border-gray-300 text-primary" checked={form.assigneeIds.includes(emp.value)} onChange={(e) => setForm((f) => ({ ...f, assigneeIds: e.target.checked ? [...f.assigneeIds, emp.value] : f.assigneeIds.filter((id) => id !== emp.value) }))} />
                      <span className="text-sm text-gray-900">{emp.label}</span><span className="text-xs text-gray-500 ml-1">{emp.subLabel}</span>
                    </label>
                  ))}
                {employeeOptions.filter((emp) => emp.label.toLowerCase().includes(assigneeSearch.toLowerCase()) || emp.subLabel.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">No employees match &quot;{assigneeSearch}&quot;</p>
                )}
              </div>
              {form.assigneeIds.length > 0 && <p className="text-xs text-gray-500 mt-1">{form.assigneeIds.length} selected</p>}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded border-gray-300 text-primary" checked={form.evidenceRequired} onChange={(e) => setForm((f) => ({ ...f, evidenceRequired: e.target.checked }))} /><span className="text-sm text-gray-700">Evidence required for updates</span></label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
          <Button variant="outline" onClick={() => { setModalOpen(false); setEditingId(null); }}>Cancel</Button>
          <Button loading={createKpi.isPending || updateKpi.isPending} onClick={handleSaveKpi}>{editingId ? "Save Changes" : "Create KPI"}</Button>
        </div>
      </Modal>

      {/* Update Modal */}
      <Modal isOpen={updateModalOpen} onClose={() => setUpdateModalOpen(false)} title="Submit KPI Progress Update" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Update Period <span className="text-red-500">*</span></label>
            <input type="month" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={updateForm.updatePeriod} onChange={(e) => setUpdateForm((f) => ({ ...f, updatePeriod: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Actual Value" type="number" placeholder="e.g. 85" value={updateForm.actualValue} onChange={(e) => setUpdateForm((f) => ({ ...f, actualValue: e.target.value }))} />
            <Input label="% Complete" type="number" placeholder="0-100" value={updateForm.percentComplete} onChange={(e) => setUpdateForm((f) => ({ ...f, percentComplete: e.target.value }))} />
          </div>
          <Textarea label="Narrative" placeholder="Describe progress..." rows={3} value={updateForm.narrative} onChange={(e) => setUpdateForm((f) => ({ ...f, narrative: e.target.value }))} />
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded border-gray-300 text-primary" checked={updateForm.blockerFlag} onChange={(e) => setUpdateForm((f) => ({ ...f, blockerFlag: e.target.checked }))} /><span className="text-sm text-gray-700">Blocker exists</span></label>
          {updateForm.blockerFlag && <Textarea label="Blocker Detail" rows={2} value={updateForm.blockerDetail} onChange={(e) => setUpdateForm((f) => ({ ...f, blockerDetail: e.target.value }))} />}
          <Select label="Confidence" options={[1,2,3,4,5].map((v) => ({ label: `${v} - ${["Very Low","Low","Moderate","High","Very High"][v-1]}`, value: String(v) }))} value={updateForm.confidenceLevel} onChange={(e) => setUpdateForm((f) => ({ ...f, confidenceLevel: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>Cancel</Button>
            <Button loading={submitUpdate.isPending} onClick={handleSubmitUpdate}>Submit</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteKpiConfirm}
        onClose={() => setDeleteKpiConfirm(null)}
        onConfirm={() => deleteKpiConfirm && handleDelete(deleteKpiConfirm)}
        title="Delete KPI"
        message="Are you sure you want to delete this KPI? This action cannot be undone."
        loading={deleteKpi.isPending}
      />
    </div>
  );
}

// ─── HR KPI Tab ───────────────────────────────────────

const SIGNOFF_CONFIG: Record<ReviewSignoffStatus, { label: string; bg: string; text: string }> = {
  Pending:   { label: "Pending",    bg: "bg-amber-100",   text: "text-amber-700" },
  SignedOff: { label: "Approved",   bg: "bg-emerald-100", text: "text-emerald-700" },
  Rejected:  { label: "Rejected",   bg: "bg-red-100",     text: "text-red-700" },
};

function HrKpiTab() {
  const { data: sbus } = useSbus();
  const [filters, setFilters] = useState<KpiFilters>({ page: 1, limit: 20 });
  const [reviewTab, setReviewTab] = useState<"pending" | "all">("pending");
  const [reviewCycleFilter, setReviewCycleFilter] = useState("");
  const [kpiSearch, setKpiSearch] = useState("");

  const { data: kpisResult, isLoading: kpisLoading } = useAllKpisForHR(filters);
  const kpis = (kpisResult?.data ?? []) as Kpi[];
  const pagination = kpisResult?.pagination;

  const { data: okrDash } = useOkrDashboard();

  const { data: pendingReviews = [], isLoading: reviewsLoading } = usePendingKpiReviews();
  const approveReview = useApproveKpiReview();
  const rejectReview = useRejectKpiReview();

  const sbuOptions = (sbus ?? []).map((s) => ({ label: s.name, value: s.id }));

  const filteredKpis = kpiSearch
    ? kpis.filter((k) => k.title.toLowerCase().includes(kpiSearch.toLowerCase()) || k.kpiLevel?.toLowerCase().includes(kpiSearch.toLowerCase()) || k.category?.toLowerCase().includes(kpiSearch.toLowerCase()))
    : kpis;

  const handleApproveReview = async (id: string) => {
    try { await approveReview.mutateAsync(id); toast.success("Review approved."); }
    catch { toast.error("Failed to approve."); }
  };
  const handleRejectReview = async (id: string) => {
    try { await rejectReview.mutateAsync(id); toast.success("Review rejected."); }
    catch { toast.error("Failed to reject."); }
  };

  return (
    <div className="space-y-6">

      {/* OKR Stats Summary */}
      {okrDash?.orgStats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <Target className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{okrDash.orgStats.totalObjectives}</p>
              <p className="text-xs text-gray-500">Total OKRs</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">{okrDash.orgStats.approvedCount}</p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-amber-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <Hourglass className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">{okrDash.orgStats.pendingCount}</p>
              <p className="text-xs text-gray-500">Pending Approval</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{okrDash.orgStats.avgCompletion}%</p>
              <p className="text-xs text-gray-500">Avg. Completion</p>
            </div>
          </div>
        </div>
      )}

      {/* Pending OKR Approvals */}
      <PendingApprovalsPanel />

      {/* Section 1: KPI Overview */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
              <Eye className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">All KPIs — HR View</p>
              <p className="text-xs text-gray-500">Full visibility across all levels, SBUs, and employees</p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{pagination?.total ?? 0} total</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/40">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search KPIs..."
              className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              value={kpiSearch}
              onChange={(e) => setKpiSearch(e.target.value)}
            />
          </div>
          <div className="w-36">
            <Select
              placeholder="All SBUs"
              options={[{ label: "All SBUs", value: "" }, ...sbuOptions]}
              value={filters.sbuId ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, sbuId: e.target.value || undefined, page: 1 }))}
            />
          </div>
          <div className="w-36">
            <Select
              placeholder="All Levels"
              options={[{ label: "All Levels", value: "" }, ...["Company","SBU","Department","Team","Individual"].map((v) => ({ label: v, value: v }))]}
              value={filters.kpiLevel ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, kpiLevel: (e.target.value as KpiLevel) || undefined, page: 1 }))}
            />
          </div>
          <div className="w-36">
            <Select
              placeholder="All Categories"
              options={[{ label: "All Categories", value: "" }, ...["Strategic","Operational","Financial","Customer","Compliance","People","Innovation"].map((v) => ({ label: v, value: v }))]}
              value={filters.category ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, category: (e.target.value as KpiCategory) || undefined, page: 1 }))}
            />
          </div>
          <div className="w-36">
            <Select
              placeholder="All Statuses"
              options={[{ label: "All Statuses", value: "" }, ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ label: c.label, value: v }))]}
              value={filters.status ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value as KpiStatus) || undefined, page: 1 }))}
            />
          </div>
          <button
            onClick={() => { setFilters({ page: 1, limit: 20 }); setKpiSearch(""); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-gray-200 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>

        {/* KPI Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI Title</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>SBU / Dept</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>Last Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpisLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-3/4" /></TableCell>)}</TableRow>
                  ))
                : filteredKpis.length === 0
                ? <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-gray-400">No KPIs match the current filters.</TableCell></TableRow>
                : filteredKpis.map((kpi) => (
                    <TableRow key={kpi.id} className="hover:bg-gray-50/60">
                      <TableCell>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{kpi.title}</p>
                          {kpi.parent && <p className="text-xs text-gray-400 mt-0.5">↳ {kpi.parent.title}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[kpi.kpiLevel] ?? "bg-gray-100 text-gray-600"}`}>{kpi.kpiLevel}</span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">{kpi.category}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {kpi.sbu?.name && <span className="block">{kpi.sbu.name}</span>}
                        {kpi.department?.name && <span className="text-gray-400">{kpi.department.name}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{kpi.targetValue != null ? `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}` : "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{formatDate(kpi.endDate)}</TableCell>
                      <TableCell><StatusBadge status={kpi.status} /></TableCell>
                      <TableCell>
                        {kpi.assignments && kpi.assignments.length > 0
                          ? <div className="flex -space-x-1">
                              {kpi.assignments.slice(0, 3).map((a) => <Avatar key={a.id} name={a.employee?.fullName ?? "?"} size="sm" />)}
                              {kpi.assignments.length > 3 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs border border-white">+{kpi.assignments.length - 3}</span>}
                            </div>
                          : <span className="text-xs text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {(kpi as any).updates?.[0] ? formatDate((kpi as any).updates[0].submittedAt) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
          </div>
        )}
      </div>

      {/* Section 2: KPI Review Signoff */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <ShieldCheck className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">KPI Review Approvals</p>
              <p className="text-xs text-gray-500">Review and sign off on employee KPI assessments</p>
            </div>
          </div>
          {pendingReviews.length > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white px-1.5">{pendingReviews.length}</span>
          )}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-gray-100">
          {(["pending", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setReviewTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${reviewTab === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t === "pending" ? `Pending (${pendingReviews.length})` : "All Reviews"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {reviewTab === "pending" ? (
            reviewsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : pendingReviews.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                  <ShieldCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="mt-3 text-sm font-medium text-gray-900">All caught up!</p>
                <p className="mt-1 text-xs text-gray-500">No KPI reviews are pending your approval.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReviews.map((review) => (
                  <div key={review.id} className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar name={review.employee?.fullName ?? "?"} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{review.employee?.fullName}</p>
                          <span className="text-xs text-gray-400">{review.employee?.jobTitle}</span>
                          {review.employee?.department?.name && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{review.employee.department.name}</span>}
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 font-medium">{review.kpi?.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {review.kpi?.kpiLevel && <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[review.kpi.kpiLevel] ?? "bg-gray-100 text-gray-600"}`}>{review.kpi.kpiLevel}</span>}
                          {review.kpi?.category && <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">{review.kpi.category}</span>}
                          {review.reviewCycle?.name && <span className="text-xs text-gray-400">· {review.reviewCycle.name}</span>}
                          {review.selfRating != null && <span className="text-xs text-gray-500">Self: <strong>{review.selfRating}</strong>/5</span>}
                          {review.managerRating != null && <span className="text-xs text-gray-500">Manager: <strong>{review.managerRating}</strong>/5</span>}
                        </div>
                        {review.reviewComment && <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">&ldquo;{review.reviewComment}&rdquo;</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveReview(review.id)}
                        disabled={approveReview.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectReview(review.id)}
                        disabled={rejectReview.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              <Filter className="h-6 w-6 mx-auto mb-2 text-gray-300" />
              Use the KPI List tab and filter by review cycle to see all submitted reviews.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────

export default function KpiPage() {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "Admin";
  const isSBUHead = effectiveRole === "SBUHead";
  const isFinance = effectiveRole === "Finance";
  const canManage = isAdmin || isSBUHead;
  const isHR = isAdmin || isFinance;

  const [activeTab, setActiveTab] = useState<"dashboard" | "kpis" | "my-okrs" | "team-okrs" | "cycles" | "hr-review">("dashboard");

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
    { id: "kpis" as const, label: "KPI List", icon: Target },
    { id: "my-okrs" as const, label: "My OKRs", icon: Zap },
    { id: "team-okrs" as const, label: "Team OKRs", icon: Users },
    ...(canManage ? [{ id: "cycles" as const, label: "Cycles", icon: CalendarDays }] : []),
    ...(isHR ? [{ id: "hr-review" as const, label: "HR Review", icon: Briefcase }] : []),
  ];

  return (
    <AppLayout pageTitle="KPI & Performance">
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-black via-gray-900 to-black px-6 py-6 shadow-lg">
          {/* Decorative blobs */}
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-6 left-16 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/30">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-white tracking-tight">KPI & Performance</h2>
                <p className="text-sm text-gray-400 mt-0.5">Track KPIs, set OKRs, and manage performance cycles</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/10">
                Performance Hub
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
                  active
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "dashboard" && <KpiDashboardView />}
        {activeTab === "kpis" && <KpiListTab canManage={canManage} isAdmin={isAdmin} employeeId={user?.employeeId ?? ""} />}
        {activeTab === "my-okrs" && <MyOkrsTab employeeId={user?.employeeId ?? ""} canManage={true} />}
        {activeTab === "team-okrs" && <TeamOkrsTab />}
        {activeTab === "cycles" && canManage && <CyclesTab />}
        {activeTab === "hr-review" && isHR && <HrKpiTab />}
      </div>
    </AppLayout>
  );
}
