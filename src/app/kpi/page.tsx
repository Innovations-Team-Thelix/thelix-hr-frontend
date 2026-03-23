"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Target, Plus, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Clock, XCircle, BarChart3, Users, RefreshCw,
  Pencil, Trash2, Upload, MessageSquare, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon,
  Zap, Lock, Unlock, CalendarDays, ShieldCheck, ShieldX, Hourglass, FileEdit,
  Briefcase, Search, Filter, ThumbsUp, ThumbsDown, Eye, PenLine, GitBranch,
  Building2, User as UserIcon, ClipboardCheck as ClipboardCheckIcon,
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
  useKpiDashboard, useKpis, useKpi, useCreateKpi, useUpdateKpi, useDeleteKpi,
  useSubmitKpiUpdate, useAuth, useEmployees, useSbus, useDepartments,
  useEffectiveRole, useOkrDashboard, useOkrCycles, useCreateOkrCycle,
  useUpdateOkrCycle, useDeleteOkrCycle, useObjectives, useCreateObjective,
  useUpdateObjective, useDeleteObjective, useUpdateKeyResult, useOkrComments,
  useAddOkrComment, useObjective, useApproveObjective, useRejectObjective,
  useSubmitObjective, usePendingOkrApprovals, usePendingKpiReviews, useApproveKpiReview,
  useRejectKpiReview, useAllKpisForHR, useApprovers,
  useKpiWeeklySummary, useDownloadKpiReport, useDownloadOkrReport,
  useKpiReviewCycles, useSubmitKpiReview, useKpiReviews,
  useKpiComments, useAddKpiComment, useKpiEvidence, useUploadKpiEvidence,
  useKpiCascade, useSubmitSelfAssessment, useCreateReviewCycle, useSetProgressOverride,
  useSubmitKpiForApproval, useApproveKpi, useRejectKpi, usePendingKpiApprovals,
  useAcknowledgeKpi, useReviewKpiUpdate, useCalibrateKpiReview, useWeeklyReport,
  useLockReviewCycle, useKpiVersionHistory,
  useDownloadKpiRegister, useDownloadKpiProgressByDepartment, useDownloadIndividualKpiReport,
  useDownloadMonthlyReviewSummary, useDownloadQuarterlyReviewAnalysis, useDownloadAnnualPerformanceSummary,
  useDownloadOverdueAtRiskReport, useDownloadSharedKpiContributions, useDownloadWeeklyWrapReport,
} from "@/hooks";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type {
  Kpi, KpiStatus, KpiCategory, KpiLevel, KpiTimeHorizon, KpiTargetType, KpiFilters,
  OkrCycle, OkrCycleStatus, Objective, KeyResult, OkrHealthStatus, KeyResultType, OkrApprovalStatus,
  KpiReview, ReviewSignoffStatus, KpiReviewCycle, ReviewCycleType,
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

const APPROVAL_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  Draft:           { label: "Draft",            bg: "bg-gray-100",    text: "text-gray-500" },
  PendingApproval: { label: "Pending Approval", bg: "bg-amber-100",   text: "text-amber-700" },
  Approved:        { label: "Approved",         bg: "bg-emerald-100", text: "text-emerald-700" },
  Rejected:        { label: "Rejected",         bg: "bg-red-100",     text: "text-red-600" },
};

const CATEGORY_LABELS: Record<string, string> = {
  Strategic:   "Strategic",
  Operational: "Operational",
  Financial:   "Financial",
  Customer:    "Customer/Service",
  Compliance:  "Compliance",
  People:      "People/HR",
  Innovation:  "Innovation/Productivity",
};

const TARGET_TYPE_CONFIG: Record<string, { label: string; example: string; showNumeric: boolean; showUnit: boolean }> = {
  Numeric:    { label: "Numeric Target",      example: "e.g. 200 enrollments",            showNumeric: true,  showUnit: true  },
  Percentage: { label: "Percentage Target",   example: "e.g. 95 (for 95% completion)",    showNumeric: true,  showUnit: false },
  Milestone:  { label: "Milestone-based",     example: "e.g. System launched by Q3",      showNumeric: false, showUnit: false },
  Binary:     { label: "Binary (Done/Not Done)", example: "Mark as 1 = Done, 0 = Not Done", showNumeric: false, showUnit: false },
  Composite:  { label: "Composite Score",     example: "e.g. Weighted score 0–100",       showNumeric: true,  showUnit: false },
};

const FREQUENCY_LABELS: Record<string, string> = {
  Weekly:    "Weekly",
  Biweekly:  "Biweekly",
  Monthly:   "Monthly",
  Manual:    "Manual / On-demand",
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
  const healthColor = kr.healthStatus === "Behind" ? "bg-red-400" : kr.healthStatus === "AtRisk" ? "bg-amber-400" : kr.healthStatus === "Completed" ? "bg-green-500" : "bg-emerald-500";
  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {kr.metricType === "Boolean"
            ? (kr.currentValue >= 1 ? "✓ Done" : "✗ Not done")
            : <>{kr.currentValue}{symbol} <span className="text-gray-300">/</span> {kr.targetValue}{symbol}</>
          }
        </span>
        <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
      </div>
      {kr.metricType !== "Boolean" && (
        <div className="w-28 bg-gray-200 rounded-full h-1">
          <div className={`h-1 rounded-full ${healthColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
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
  onDiscuss,
}: {
  objective: Objective;
  canEdit: boolean;
  onUpdateKr: (kr: KeyResult, objectiveId: string) => void;
  onEdit?: (obj: Objective) => void;
  onSubmitDraft?: (obj: Objective) => void;
  onDelete?: (id: string) => void;
  onDiscuss?: (krId: string, krTitle: string) => void;
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
              <div key={kr.id} className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{kr.title}</p>
                    <KrProgress kr={kr} />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <HealthBadge health={kr.healthStatus} />
                    {canEdit && objective.approvalStatus === 'Approved' && !objective.cycle?.isLocked && (
                      <button
                        onClick={() => onUpdateKr(kr, objective.id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
                        title="Log progress"
                      >
                        <PenLine className="h-3 w-3" />
                        Update
                      </button>
                    )}
                    {onDiscuss && (
                      <button
                        onClick={() => onDiscuss(kr.id, kr.title)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 transition-colors"
                        title="Discuss"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Discuss
                      </button>
                    )}
                  </div>
                </div>
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
  const { data: weeklySummary } = useKpiWeeklySummary();
  const effectiveRole = useEffectiveRole();
  const isAdminOrSBUHead = effectiveRole === "Admin" || effectiveRole === "SBUHead" || effectiveRole === "Director" || effectiveRole === "Manager";
  const { data: cycles = [] } = useOkrCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const activeCycle = cycles.find((c) => c.status === "Active");
  const effectiveCycleId = selectedCycleId || activeCycle?.id || "";
  const { data: cycleObjData } = useObjectives({ cycleId: effectiveCycleId || undefined, limit: 100 });
  const cycleObjectives = cycleObjData?.data ?? [];
  const allKeyResults = cycleObjectives.flatMap((o: any) => o.keyResults ?? []);
  const krOffTrack = allKeyResults.filter((kr: any) => kr.healthStatus === "Behind").length;
  const krOnTrack = allKeyResults.filter((kr: any) => kr.healthStatus === "OnTrack").length;
  const krTotal = allKeyResults.length;
  const selectedCycle = cycles.find((c) => c.id === effectiveCycleId) ?? activeCycle;
  // Key results by status breakdown
  const krByStatus = [
    { label: "Not Started", color: "bg-gray-300", count: allKeyResults.filter((kr: any) => !kr.healthStatus || kr.healthStatus === "NotStarted").length },
    { label: "Not Measured", color: "bg-gray-700", count: allKeyResults.filter((kr: any) => kr.healthStatus === "AtRisk").length },
    { label: "Off track", color: "bg-red-500", count: allKeyResults.filter((kr: any) => kr.healthStatus === "Behind").length },
    { label: "On Track", color: "bg-amber-400", count: allKeyResults.filter((kr: any) => kr.healthStatus === "OnTrack").length },
    { label: "Achieved", color: "bg-emerald-500", count: allKeyResults.filter((kr: any) => kr.healthStatus === "Completed").length },
  ];

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

  // ── Employee view ──────────────────────────────────────────────────────────
  if (!isAdminOrSBUHead) {
    return (
      <div className="space-y-6">
        {/* Cycle selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {activeCycle && <option value="">{activeCycle.name}</option>}
            {cycles.filter((c) => c.id !== activeCycle?.id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {cycles.length === 0 && <option value="">No cycles</option>}
          </select>
        </div>

        {/* Performance Period heading */}
        <h3 className="text-base font-bold text-gray-900">
          Performance Period: {selectedCycle?.name ?? "—"}
        </h3>

        {/* Key Results stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Key Results Off-track</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{krOffTrack}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Key Results On-track</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{krOnTrack}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Key Results (Current)</p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5">{krTotal}</p>
            </div>
          </div>
        </div>

        {/* Key results by status + Pending Feedback */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Key results by status */}
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800 mb-4">Key results by status</p>
            {krTotal === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-gray-400">Objective progress</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {krByStatus.filter(s => s.count > 0).map((s) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{s.label}</span>
                      <span className="font-semibold">{s.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-2 rounded-full ${s.color} transition-all duration-500`} style={{ width: `${Math.round((s.count / krTotal) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
              {krByStatus.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 rounded-sm ${s.color}`} />
                  <span className="text-xs text-gray-500">{s.count}-{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Feedback Requests */}
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5 flex flex-col">
            <p className="text-sm font-semibold text-gray-800 mb-4">Pending Feedback Requests</p>
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
              <div className="relative mb-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50">
                  <Clock className="h-7 w-7 text-red-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-400">
                  <Clock className="h-3 w-3 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Your pending feedback request will show here</p>
            </div>
          </div>
        </div>

        {/* Recent Feedback + Next Conversation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5 flex flex-col">
            <p className="text-sm font-semibold text-gray-800 mb-4">Recent Feedback</p>
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
              <div className="relative mb-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50">
                  <MessageSquare className="h-7 w-7 text-red-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-400">
                  <Clock className="h-3 w-3 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Your recent feedback will show here</p>
            </div>
          </div>

          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5 flex flex-col">
            <p className="text-sm font-semibold text-gray-800 mb-4">Next Conversation</p>
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 mb-3">
                <CalendarDays className="h-7 w-7 text-blue-400" />
              </div>
              <p className="text-sm text-gray-500">Your next conversation will appear here</p>
            </div>
          </div>
        </div>

        {/* Weekly Wrap-up Summary */}
        {weeklySummary && (
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-400" />
                <p className="text-sm font-semibold text-gray-800">Weekly Wrap-up</p>
              </div>
              <span className="text-xs text-gray-400">Last 7 days</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-center">
                <p className="text-2xl font-bold text-blue-700">{weeklySummary.updatesThisWeek.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Updates Submitted</p>
              </div>
              <div className={`rounded-xl px-3 py-2.5 text-center ${weeklySummary.atRiskCount > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
                <p className={`text-2xl font-bold ${weeklySummary.atRiskCount > 0 ? "text-amber-600" : "text-gray-700"}`}>{weeklySummary.atRiskCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">At Risk</p>
              </div>
              <div className={`rounded-xl px-3 py-2.5 text-center ${weeklySummary.overdueCount > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                <p className={`text-2xl font-bold ${weeklySummary.overdueCount > 0 ? "text-red-600" : "text-gray-700"}`}>{weeklySummary.overdueCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Overdue</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                <p className="text-2xl font-bold text-emerald-700">{weeklySummary.recentlyCompleted}</p>
                <p className="text-xs text-gray-500 mt-0.5">Completed</p>
              </div>
            </div>
            {weeklySummary.blockers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-red-600 mb-2">⚠️ Active Blockers</p>
                <div className="space-y-1.5">
                  {weeklySummary.blockers.map((b) => (
                    <div key={b.id} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{b.kpi.title}</p>
                        {b.blockerDetail && <p className="text-xs text-gray-500 truncate">{b.blockerDetail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* §13.1 Upcoming Deadlines */}
        {(dashboard as any)?.upcomingDeadlines?.length > 0 && (
          <Card className="border-0 shadow-sm ring-1 ring-amber-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-semibold text-gray-800">Due This Week</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-gray-50">
              {(dashboard as any).upcomingDeadlines.map((a: any) => (
                <div key={a.kpi?.id} className="py-2.5 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.kpi?.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-amber-600">{formatDate(a.kpi?.endDate)}</span>
                    <StatusBadge status={a.kpi?.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* §13.1 Latest Manager Feedback */}
        {(dashboard as any)?.latestManagerFeedback?.length > 0 && (
          <Card className="border-0 shadow-sm ring-1 ring-emerald-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                <CardTitle className="text-sm font-semibold text-gray-800">Latest Manager Feedback</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-gray-50">
              {(dashboard as any).latestManagerFeedback.map((u: any) => (
                <div key={u.id} className="py-2.5">
                  <p className="text-xs font-medium text-gray-600 truncate">{u.kpi?.title}</p>
                  <p className="text-sm text-gray-700 mt-0.5 italic">&ldquo;{u.reviewNote}&rdquo;</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* §13.1 Review History */}
        {(dashboard as any)?.reviewHistory?.length > 0 && (
          <Card className="border-0 shadow-sm ring-1 ring-blue-100">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold text-gray-800">My Review History</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-gray-50">
              {(dashboard as any).reviewHistory.map((r: any) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.kpi?.title}</p>
                    <p className="text-xs text-gray-400">{r.reviewCycle?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    {r.selfRating != null && <span className="text-gray-500">Self: <strong>{r.selfRating}</strong>/5</span>}
                    {r.finalRating != null && <span className="text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 font-bold">Final: {r.finalRating}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* My OKR Progress */}
        {okrDash && (
          <Card className="border-0 shadow-sm ring-1 ring-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-violet-500" />
                  <CardTitle className="text-sm font-semibold text-gray-800">My OKR Progress</CardTitle>
                </div>
                {okrDash.activeCycle && (
                  <span className="text-xs font-medium text-violet-700 bg-violet-50 rounded-full px-2 py-0.5">
                    {okrDash.activeCycle.name} · Active
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
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
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Admin / SBU Head view ───────────────────────────────────────────────────
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
              <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {dashboard && (dashboard.byStatus.length > 0 || dashboard.byLevel.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* §13.2 Manager: Team summary panels */}
      {effectiveRole === "Manager" && dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{(dashboard as any).teamSize ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Team Members</p>
          </div>
          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-emerald-700">{(dashboard as any).completionRate ?? 0}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Completion Rate</p>
          </div>
          <div className={`rounded-xl ring-1 shadow-sm p-4 text-center ${((dashboard as any).pendingReviews ?? 0) > 0 ? "bg-amber-50 ring-amber-100" : "bg-white ring-gray-200"}`}>
            <p className={`text-3xl font-bold ${((dashboard as any).pendingReviews ?? 0) > 0 ? "text-amber-600" : "text-gray-900"}`}>{(dashboard as any).pendingReviews ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending Reviews</p>
          </div>
          <div className={`rounded-xl ring-1 shadow-sm p-4 text-center ${((dashboard as any).pendingUpdates ?? 0) > 0 ? "bg-red-50 ring-red-100" : "bg-white ring-gray-200"}`}>
            <p className={`text-3xl font-bold ${((dashboard as any).pendingUpdates ?? 0) > 0 ? "text-red-600" : "text-gray-900"}`}>{(dashboard as any).pendingUpdates ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Overdue Updates</p>
          </div>
        </div>
      )}

      {effectiveRole === "Manager" && (dashboard as any)?.atRiskKpis?.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-amber-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold text-gray-800">At-Risk Team KPIs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-gray-50">
            {(dashboard as any).atRiskKpis.slice(0, 5).map((kpi: any) => (
              <div key={kpi.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{kpi.title}</p>
                  {kpi.assignments?.map((a: any) => (
                    <span key={a.id} className="text-xs text-gray-400">{a.employee?.fullName}</span>
                  ))}
                </div>
                <StatusBadge status={kpi.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {effectiveRole === "Manager" && ((dashboard as any)?.topPerformers?.length > 0 || (dashboard as any)?.bottomPerformers?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(dashboard as any).topPerformers?.length > 0 && (
            <Card className="border-0 shadow-sm ring-1 ring-emerald-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-emerald-700">Top Performers</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(dashboard as any).topPerformers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.employee?.fullName ?? "?"} size="sm" />
                      <span className="text-sm text-gray-800">{u.employee?.fullName}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{u.percentComplete ?? 0}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {(dashboard as any).bottomPerformers?.length > 0 && (
            <Card className="border-0 shadow-sm ring-1 ring-red-100">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-red-600">Needs Attention</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {(dashboard as any).bottomPerformers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.employee?.fullName ?? "?"} size="sm" />
                      <span className="text-sm text-gray-800">{u.employee?.fullName}</span>
                    </div>
                    <span className="text-sm font-bold text-red-500">{u.percentComplete ?? 0}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* §13.3 Director: Review completion & risk heatmap */}
      {effectiveRole === "Director" && dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-emerald-700">{(dashboard as any).completionRate ?? 0}%</p>
            <p className="text-xs text-gray-500 mt-0.5">KPI Completion Rate</p>
          </div>
          <div className="rounded-xl bg-blue-50 ring-1 ring-blue-100 shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{(dashboard as any).reviewCompletionRate ?? 0}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Review Completion Rate</p>
          </div>
          <div className="rounded-xl bg-white ring-1 ring-gray-200 shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{dashboard.totalKpis}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Department KPIs</p>
          </div>
        </div>
      )}

      {effectiveRole === "Director" && (dashboard as any)?.riskHeatmap?.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-red-100">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm font-semibold text-gray-800">Risk Heatmap by Category</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {(dashboard as any).riskHeatmap.map((r: any) => (
                <div key={`${r.category}-${r.status}`} className={`rounded-lg px-3 py-2 text-xs font-medium ${r.status === "Overdue" ? "bg-red-100 text-red-700" : r.status === "OffTrack" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                  {CATEGORY_LABELS[r.category] ?? r.category}: {r._count} {r.status}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* §13.4 SBU Head: Department rollup */}
      {effectiveRole === "SBUHead" && (dashboard as any)?.departmentRollup?.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <CardTitle className="text-sm font-semibold text-gray-800">Department KPI Rollup</CardTitle>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>Review Ready: <strong className="text-gray-800">{(dashboard as any).reviewReadiness ?? 0}</strong></span>
                <span>Pending Signoff: <strong className="text-amber-600">{(dashboard as any).pendingSignoff ?? 0}</strong></span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-gray-50">
            {(dashboard as any).departmentRollup.map((dept: any) => {
              const total = dept.statuses.reduce((s: number, st: any) => s + st.count, 0);
              const onTrack = dept.statuses.find((s: any) => s.status === "OnTrack")?.count ?? 0;
              const atRisk = dept.statuses.find((s: any) => ["AtRisk", "OffTrack"].includes(s.status))?.count ?? 0;
              const completed = dept.statuses.find((s: any) => s.status === "Completed")?.count ?? 0;
              return (
                <div key={dept.departmentId} className="py-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-gray-800 min-w-0 truncate">{dept.name}</p>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="text-gray-500">{total} KPIs</span>
                    <span className="text-emerald-600 font-medium">{onTrack} on track</span>
                    {atRisk > 0 && <span className="text-amber-600 font-medium">{atRisk} at risk</span>}
                    <span className="text-blue-600 font-medium">{completed} done</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* §13.5 Admin / Executive: Cross-SBU comparison */}
      {(effectiveRole === "Admin" || (effectiveRole as string) === "Finance") && (dashboard as any)?.strategicKpiHealth?.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-indigo-100">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-sm font-semibold text-gray-800">Strategic KPI Health (Company-level)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-3">
            {(dashboard as any).strategicKpiHealth.map((s: any) => {
              const cfg = STATUS_CONFIG[s.status as KpiStatus];
              return (
                <div key={s.status} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${cfg?.bg ?? "bg-gray-100"}`}>
                  <span className={`text-lg font-bold ${cfg?.text ?? "text-gray-700"}`}>{s.count}</span>
                  <span className={`text-xs ${cfg?.text ?? "text-gray-700"}`}>{cfg?.label ?? s.status}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(effectiveRole === "Admin" || (effectiveRole as string) === "Finance") && (dashboard as any)?.exceptionKpis?.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-red-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm font-semibold text-gray-800">Exception Report — Overdue / Off-Track Strategic KPIs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-gray-50">
            {(dashboard as any).exceptionKpis.map((kpi: any) => (
              <div key={kpi.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{kpi.title}</p>
                  <p className="text-xs text-gray-400">{kpi.kpiLevel} · Due {formatDate(kpi.endDate)}</p>
                </div>
                <StatusBadge status={kpi.status} />
              </div>
            ))}
          </CardContent>
        </Card>
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

      {/* OKR Overview */}
      {okrDash && okrDash.orgStats && (
        <Card className="border-0 shadow-sm ring-1 ring-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <CardTitle className="text-sm font-semibold text-gray-800">OKR Overview</CardTitle>
              </div>
              {okrDash.activeCycle && (
                <span className="text-xs font-medium text-violet-700 bg-violet-50 rounded-full px-2 py-0.5">
                  {okrDash.activeCycle.name} · Active
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
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
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const effectiveCycleId = selectedCycleId || activeCycle?.id || "";
  const { data: objData, isLoading } = useObjectives({ cycleId: effectiveCycleId || undefined, page, limit: PAGE_SIZE });
  const objectives = objData?.data ?? [];
  const pagination = objData?.pagination;

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

      {/* Stats row */}
      {okrDash && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">My Objectives</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{pagination?.total ?? okrDash.myObjectives.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Avg Completion</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              {okrDash.myObjectives.length > 0
                ? Math.round(okrDash.myObjectives.reduce((s, o) => s + Number(o.completionPct ?? 0), 0) / okrDash.myObjectives.length)
                : 0}%
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">Approved</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {okrDash.myObjectives.filter((o) => o.approvalStatus === "Approved").length}
            </p>
          </div>
          <div className={`rounded-xl border px-4 py-3 ${okrDash.staleKrCount > 0 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
            <p className={`text-xs ${okrDash.staleKrCount > 0 ? "text-amber-600" : "text-gray-500"}`}>Stale KRs</p>
            <p className={`text-xl font-bold mt-0.5 ${okrDash.staleKrCount > 0 ? "text-amber-700" : "text-gray-900"}`}>{okrDash.staleKrCount}</p>
          </div>
        </div>
      )}

      {/* Stale warning */}
      {okrDash && okrDash.staleKrCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <strong>{okrDash.staleKrCount}</strong> Key Result{okrDash.staleKrCount > 1 ? "s" : ""} haven&apos;t been updated in 14+ days — please log your progress.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Select
            placeholder="Filter by cycle"
            options={[{ label: "All cycles", value: "" }, ...cycles.map((c) => ({ label: c.name, value: c.id }))]}
            value={selectedCycleId}
            onChange={(e) => { setSelectedCycleId(e.target.value); setPage(1); }}
          />
          {activeCycle && !selectedCycleId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {activeCycle.name}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {pagination && pagination.total > 0 && (
            <span className="text-xs text-gray-400 hidden sm:block">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total}
            </span>
          )}
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
          <ObjectiveCard
            key={obj.id}
            objective={obj}
            canEdit={true}
            onUpdateKr={(kr, objectiveId) => { setKrModal({ kr, objectiveId }); setKrUpdateForm({ newValue: String(kr.currentValue), healthStatus: kr.healthStatus, note: "" }); }}
            onEdit={openEdit}
            onSubmitDraft={(o) => { setSubmitModal(o); setSubmitApproverId(""); }}
            onDelete={(id) => setDeleteObjConfirm(id)}
            onDiscuss={(krId, krTitle) => setCommentModal({ krId, krTitle })}
          />
        ))
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
          <span className="text-xs text-gray-500">
            Page {pagination.page} of {pagination.totalPages} &nbsp;·&nbsp; {pagination.total} objective{pagination.total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((n) => Math.abs(n - page) <= 2)
              .map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${n === page ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  {n}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
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
  const effectiveRole = useEffectiveRole();

  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const effectiveCycleId = selectedCycleId || activeCycle?.id || "";

  const { data: teamData, isLoading: teamLoading } = useObjectives({
    cycleId: effectiveCycleId || undefined,
    teamView: "true",
    limit: 100,
  });
  const teamObjectives = teamData?.data ?? [];

  const directReportCount = okrDash?.directReports?.length ?? 0;
  const isAdminOrBroad = effectiveRole === "Admin" || effectiveRole === "SBUHead" || effectiveRole === "Finance";

  // Group by owner
  const byOwner = teamObjectives.reduce<Record<string, { owner: Objective["owner"]; objectives: Objective[] }>>((acc, obj) => {
    const ownerId = obj.ownerId;
    if (!acc[ownerId]) acc[ownerId] = { owner: obj.owner, objectives: [] };
    acc[ownerId].objectives.push(obj);
    return acc;
  }, {});

  const scopeLabel = isAdminOrBroad
    ? "organisation"
    : effectiveRole === "Director"
    ? "department"
    : directReportCount > 0
    ? `${directReportCount} direct report${directReportCount !== 1 ? "s" : ""}`
    : "team";

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
        <p className="text-sm text-gray-500">
          {isLoading ? "" : `Showing OKRs for ${scopeLabel}`}
          {!isAdminOrBroad && directReportCount === 0 && !isLoading && (
            <span className="ml-2 text-xs text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">No direct reports assigned — showing your own OKRs</span>
          )}
        </p>
      </div>

      {teamLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ))
      ) : Object.keys(byOwner).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No OKRs found{effectiveCycleId ? " for this cycle" : ""}.</p>
            <p className="text-xs text-gray-400 mt-1">
              {directReportCount === 0 && !isAdminOrBroad
                ? "No direct reports are linked to you. Check that employees have their supervisor set in HR records."
                : "No objectives have been created yet for the selected scope."}
            </p>
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

  // KPI Review Cycles
  const { data: reviewCycles = [], isLoading: reviewCyclesLoading } = useKpiReviewCycles();
  const createReviewCycle = useCreateReviewCycle();
  const lockCycle = useLockReviewCycle();
  const emptyReviewForm = { name: "", cycleType: "Quarterly" as ReviewCycleType, startDate: "", endDate: "", isActive: false, kpiWeight: 0.7, behavioralWeight: 0.3 };
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState(emptyReviewForm);

  const handleSaveReviewCycle = async () => {
    if (!reviewForm.name || !reviewForm.startDate || !reviewForm.endDate) { toast.error("All fields required."); return; }
    try {
      await createReviewCycle.mutateAsync(reviewForm);
      toast.success("Review cycle created.");
      setReviewModal(false);
      setReviewForm(emptyReviewForm);
    } catch { toast.error("Failed to create review cycle."); }
  };

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

  // Summary counts
  const activeCycles = cycles.filter((c) => c.status === "Active").length;
  const upcomingCycles = cycles.filter((c) => c.status === "Upcoming").length;
  const closedCycles = cycles.filter((c) => c.status === "Closed").length;
  const activeReviewCycles = (reviewCycles as KpiReviewCycle[]).filter((r) => r.isActive).length;

  const CYCLE_STATUS_ACCENT: Record<string, string> = {
    Active:   "border-l-emerald-400",
    Upcoming: "border-l-blue-400",
    Closed:   "border-l-gray-300",
  };

  return (
    <div className="space-y-6">

      {/* ── OKR Cycles Section ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">OKR Cycles</p>
              <p className="text-xs text-gray-400">Planning periods for objectives &amp; key results</p>
            </div>
          </div>
          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-4 mr-4">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{activeCycles}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-lg font-bold text-blue-500">{upcomingCycles}</p>
              <p className="text-xs text-gray-400">Upcoming</p>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-lg font-bold text-gray-400">{closedCycles}</p>
              <p className="text-xs text-gray-400">Closed</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" />New Cycle</Button>
        </div>

        {/* Cycle list */}
        <div className="divide-y divide-gray-50">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            ))
          ) : cycles.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No cycles yet</p>
              <p className="text-xs text-gray-400 mt-1">Create your first OKR cycle to start planning objectives.</p>
              <Button onClick={openCreate} variant="outline" className="mt-4"><Plus className="h-4 w-4" />New Cycle</Button>
            </div>
          ) : (
            cycles.map((cycle) => {
              const cfg = CYCLE_STATUS_CONFIG[cycle.status];
              const objCount = cycle._count?.objectives ?? 0;
              const daysLeft = Math.ceil((new Date(cycle.endDate).getTime() - Date.now()) / 86400000);
              const isRunning = cycle.status === "Active";
              return (
                <div key={cycle.id} className={`group flex items-center gap-4 px-6 py-4 border-l-4 hover:bg-gray-50/60 transition-colors ${CYCLE_STATUS_ACCENT[cycle.status] ?? "border-l-transparent"}`}>
                  {/* Date block */}
                  <div className="shrink-0 w-16 text-center">
                    <div className={`rounded-xl px-2 py-2 ${cfg.bg}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.text}`}>{new Date(cycle.startDate).toLocaleString("default", { month: "short" })}</p>
                      <p className={`text-lg font-bold leading-none mt-0.5 ${cfg.text}`}>{new Date(cycle.startDate).getFullYear()}</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{cycle.name}</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      {cycle.isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
                          <Lock className="h-3 w-3" />Locked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400">{formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}</p>
                      <span className="text-gray-200">·</span>
                      <p className="text-xs font-medium text-gray-600">{objCount} objective{objCount !== 1 ? "s" : ""}</p>
                      {isRunning && daysLeft > 0 && (
                        <><span className="text-gray-200">·</span><p className="text-xs text-emerald-600 font-medium">{daysLeft}d remaining</p></>
                      )}
                      {isRunning && daysLeft <= 0 && (
                        <><span className="text-gray-200">·</span><p className="text-xs text-red-500 font-medium">Ended {Math.abs(daysLeft)}d ago</p></>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status quick-change */}
                    <div className="relative">
                      <select
                        value={cycle.status}
                        onChange={(e) => updateCycle.mutateAsync({ id: cycle.id, data: { status: e.target.value as OkrCycleStatus } }).catch(() => toast.error("Update failed."))}
                        className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-gray-300 transition-colors cursor-pointer"
                      >
                        <option value="Upcoming">Upcoming</option>
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                    </div>
                    <button
                      onClick={() => handleToggleLock(cycle)}
                      className={`rounded-lg p-1.5 transition-colors ${cycle.isLocked ? "text-amber-500 bg-amber-50 hover:bg-amber-100" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"}`}
                      title={cycle.isLocked ? "Unlock cycle" : "Lock cycle"}
                    >
                      {cycle.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openEdit(cycle)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteCycleConfirm(cycle.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── KPI Review Cycles Section ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
              <ClipboardCheckIcon className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">KPI Review Cycles</p>
              <p className="text-xs text-gray-400">Performance reviews with self-assessments &amp; manager ratings</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeReviewCycles > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{activeReviewCycles} active
              </span>
            )}
            <Button onClick={() => { setReviewForm(emptyReviewForm); setReviewModal(true); }}><Plus className="h-4 w-4" />New Review Cycle</Button>
          </div>
        </div>

        {/* Review cycle list */}
        <div className="divide-y divide-gray-50">
          {reviewCyclesLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
              </div>
            ))
          ) : (reviewCycles as KpiReviewCycle[]).length === 0 ? (
            <div className="py-14 text-center">
              <ClipboardCheckIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No KPI review cycles yet</p>
              <p className="text-xs text-gray-400 mt-1">Create a review cycle so employees can submit self-assessments.</p>
              <Button onClick={() => { setReviewForm(emptyReviewForm); setReviewModal(true); }} variant="outline" className="mt-4"><Plus className="h-4 w-4" />New Review Cycle</Button>
            </div>
          ) : (
            (reviewCycles as KpiReviewCycle[]).map((rc) => {
              const reviewCount = rc._count?.reviews ?? 0;
              return (
                <div key={rc.id} className={`group flex items-center gap-4 px-6 py-4 border-l-4 hover:bg-gray-50/60 transition-colors ${rc.isLocked ? "border-l-red-300" : rc.isActive ? "border-l-emerald-400" : "border-l-gray-200"}`}>
                  {/* Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${rc.isActive ? "bg-violet-100" : "bg-gray-100"}`}>
                    <CalendarDays className={`h-5 w-5 ${rc.isActive ? "text-violet-600" : "text-gray-400"}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{rc.name}</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${rc.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {rc.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-50 text-violet-600">{rc.cycleType}</span>
                      {rc.isLocked && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600">
                          <Lock className="h-3 w-3" />Locked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400">{formatDate(rc.startDate)} – {formatDate(rc.endDate)}</p>
                      <span className="text-gray-200">·</span>
                      <p className="text-xs font-medium text-gray-600">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
                      {rc.isLocked && rc.lockedAt && <><span className="text-gray-200">·</span><p className="text-xs text-red-400">Locked {formatDate(rc.lockedAt)}</p></>}
                    </div>
                    {/* Weight bars */}
                    {(rc as any).kpiWeight != null && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                          KPI {Math.round(((rc as any).kpiWeight ?? 0.7) * 100)}%
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
                          Behavioral {Math.round(((rc as any).behavioralWeight ?? 0.3) * 100)}%
                        </div>
                        <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-1.5 bg-primary rounded-l-full" style={{ width: `${Math.round(((rc as any).kpiWeight ?? 0.7) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lock action */}
                  {!rc.isLocked ? (
                    <button
                      onClick={async () => {
                        if (!confirm(`Lock "${rc.name}"? No further submissions will be accepted.`)) return;
                        try { await lockCycle.mutateAsync(rc.id); toast.success("Review cycle locked."); }
                        catch { toast.error("Failed to lock cycle."); }
                      }}
                      disabled={lockCycle.isPending}
                      className="flex items-center gap-1.5 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition-colors disabled:opacity-50"
                    >
                      <Lock className="h-3.5 w-3.5" />Lock Cycle
                    </button>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600">
                      <Lock className="h-3.5 w-3.5" />Locked
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals (unchanged) */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editingId ? "Edit Cycle" : "New OKR Cycle"} size="sm">
        <div className="space-y-4">
          <Input label="Cycle Name" required placeholder="e.g. Q2 2026" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" required value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <Select label="Status" options={[{ label: "Upcoming", value: "Upcoming" }, { label: "Active", value: "Active" }, { label: "Closed", value: "Closed" }]} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as OkrCycleStatus }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button loading={createCycle.isPending || updateCycle.isPending} onClick={handleSave}>{editingId ? "Save Changes" : "Create Cycle"}</Button>
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

      <Modal isOpen={reviewModal} onClose={() => setReviewModal(false)} title="New KPI Review Cycle" size="sm">
        <div className="space-y-4">
          <Input label="Cycle Name" required placeholder="e.g. Q1 2026 Performance Review" value={reviewForm.name} onChange={(e) => setReviewForm((f) => ({ ...f, name: e.target.value }))} />
          <Select label="Cycle Type" options={["Monthly", "Quarterly", "Annual"].map((v) => ({ label: v, value: v }))} value={reviewForm.cycleType} onChange={(e) => setReviewForm((f) => ({ ...f, cycleType: e.target.value as ReviewCycleType }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required value={reviewForm.startDate} onChange={(e) => setReviewForm((f) => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" required value={reviewForm.endDate} onChange={(e) => setReviewForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Final Rating Formula Weights</p>
            <p className="text-xs text-gray-400">KPI achievement + behavioral score — must total 1.0</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">KPI Weight</label>
                <input type="number" min="0" max="1" step="0.05" value={reviewForm.kpiWeight} onChange={(e) => setReviewForm((f) => ({ ...f, kpiWeight: parseFloat(e.target.value) || 0.7 }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Behavioral Weight</label>
                <input type="number" min="0" max="1" step="0.05" value={reviewForm.behavioralWeight} onChange={(e) => setReviewForm((f) => ({ ...f, behavioralWeight: parseFloat(e.target.value) || 0.3 }))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            {/* Weight visual */}
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden mt-1">
              <div className="h-2 bg-primary rounded-l-full transition-all" style={{ width: `${Math.round(reviewForm.kpiWeight * 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />KPI {Math.round(reviewForm.kpiWeight * 100)}%</span>
              <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300" />Behavioral {Math.round(reviewForm.behavioralWeight * 100)}%</span>
            </div>
            {Math.abs((reviewForm.kpiWeight + reviewForm.behavioralWeight) - 1) > 0.01 && (
              <p className="text-xs text-amber-600">Weights should sum to 1.0 (currently {(reviewForm.kpiWeight + reviewForm.behavioralWeight).toFixed(2)})</p>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300 text-primary" checked={reviewForm.isActive} onChange={(e) => setReviewForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span className="text-sm text-gray-700">Set as active cycle immediately</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setReviewModal(false)}>Cancel</Button>
            <Button loading={createReviewCycle.isPending} onClick={handleSaveReviewCycle}>Create Review Cycle</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── KPI List Tab ─────────────────────────────────────

function KpiListTab({ canManage, canAssign, isAdmin, employeeId }: { canManage: boolean; canAssign: boolean; isAdmin: boolean; employeeId: string }) {
  const [filters, setFilters] = useState<KpiFilters>({ page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateKpiId, setUpdateKpiId] = useState("");
  const [drawerKpiId, setDrawerKpiId] = useState<string | null>(null);

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
    weight: "1", evidenceRequired: false, assigneeIds: [] as string[],
    assignees: [] as Array<{ employeeId: string; taskDescription: string }>,
    reviewerId: "",
    businessObjective: "", calculationFormula: "", dataSource: "",
  };
  const [form, setForm] = useState(emptyForm);
  const { data: departments } = useDepartments(form.sbuId || undefined);
  const deptOptions = (departments ?? []).map((d) => ({ label: d.name, value: d.id }));
  const kpiOptions = kpis.map((k) => ({ label: k.title, value: k.id, subLabel: k.kpiLevel }));

  const createKpi = useCreateKpi();
  const updateKpi = useUpdateKpi();
  const deleteKpi = useDeleteKpi();
  const submitUpdate = useSubmitKpiUpdate();
  const submitForApproval = useSubmitKpiForApproval();
  const acknowledgeKpi = useAcknowledgeKpi();

  const emptyUpdateForm = { updatePeriod: new Date().toISOString().slice(0, 7), actualValue: "", percentComplete: "", narrative: "", blockerFlag: false, blockerDetail: "", confidenceLevel: "3", nextSteps: "" };
  const [updateForm, setUpdateForm] = useState(emptyUpdateForm);
  const [deleteKpiConfirm, setDeleteKpiConfirm] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setAssigneeSearch(""); setModalOpen(true); };
  const openEdit = (kpi: Kpi) => {
    setEditingId(kpi.id);
    setForm({ title: kpi.title, description: kpi.description ?? "", category: kpi.category, kpiLevel: kpi.kpiLevel, timeHorizon: kpi.timeHorizon, targetType: kpi.targetType, targetValue: kpi.targetValue?.toString() ?? "", unit: kpi.unit ?? "", startDate: kpi.startDate.split("T")[0], endDate: kpi.endDate.split("T")[0], sbuId: kpi.sbuId ?? kpi.department?.sbuId ?? "", departmentId: kpi.departmentId ?? "", parentKpiId: kpi.parentKpiId ?? "", updateFrequency: kpi.updateFrequency, rollupMethod: kpi.rollupMethod, weight: (kpi as any).weight?.toString() ?? "1", evidenceRequired: kpi.evidenceRequired, assigneeIds: [], assignees: [], reviewerId: kpi.reviewerId ?? "", businessObjective: kpi.businessObjective ?? "", calculationFormula: kpi.calculationFormula ?? "", dataSource: kpi.dataSource ?? "" } as any);
    setModalOpen(true);
  };
  const openUpdate = (kpiId: string) => { setUpdateKpiId(kpiId); setUpdateForm(emptyUpdateForm); setUpdateModalOpen(true); };

  const handleSaveKpi = async () => {
    if (!form.title || !form.startDate || !form.endDate) { toast.error("Title and dates required."); return; }
    const payload: any = { title: form.title, description: form.description || undefined, category: form.category, kpiLevel: form.kpiLevel, timeHorizon: form.timeHorizon, targetType: form.targetType, targetValue: form.targetValue ? parseFloat(form.targetValue) : undefined, unit: form.unit || undefined, startDate: form.startDate, endDate: form.endDate, sbuId: form.sbuId || undefined, departmentId: form.departmentId || undefined, parentKpiId: form.parentKpiId || undefined, updateFrequency: form.updateFrequency, rollupMethod: form.rollupMethod, weight: (form as any).weight ? parseFloat((form as any).weight) : 1, evidenceRequired: form.evidenceRequired, assignees: (form as any).assignees?.length > 0 ? (form as any).assignees : undefined, reviewerId: (form as any).reviewerId || undefined, businessObjective: (form as any).businessObjective || undefined, calculationFormula: (form as any).calculationFormula || undefined, dataSource: (form as any).dataSource || undefined };
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

  // local search (client-side title filter)
  const [search, setSearch] = useState("");
  const displayedKpis = search.trim()
    ? kpis.filter((k) => k.title.toLowerCase().includes(search.toLowerCase()))
    : kpis;

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search KPIs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-colors"
            />
          </div>
          <div className="w-36"><Select placeholder="All Levels" options={[{ label: "All Levels", value: "" }, ...["Company","SBU","Department","Team","Individual"].map((v) => ({ label: v, value: v }))]} value={filters.kpiLevel ?? ""} onChange={(e) => setFilters((f) => ({ ...f, kpiLevel: (e.target.value as any) || undefined, page: 1 }))} /></div>
          <div className="w-36"><Select placeholder="All Statuses" options={[{ label: "All Statuses", value: "" }, ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ label: c.label, value: v }))]} value={filters.status ?? ""} onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value as any) || undefined, page: 1 }))} /></div>
          <div className="w-40"><Select placeholder="All Categories" options={[{ label: "All Categories", value: "" }, ...Object.entries(CATEGORY_LABELS).map(([v, label]) => ({ label, value: v }))]} value={filters.category ?? ""} onChange={(e) => setFilters((f) => ({ ...f, category: (e.target.value as any) || undefined, page: 1 }))} /></div>
          <div className="w-32"><Select placeholder="Horizon" options={[{ label: "All Horizons", value: "" }, ...["Annual","Quarterly","Monthly"].map((v) => ({ label: v, value: v }))]} value={filters.timeHorizon ?? ""} onChange={(e) => setFilters((f) => ({ ...f, timeHorizon: (e.target.value as any) || undefined, page: 1 }))} /></div>
          <button onClick={() => { setFilters({ page: 1, limit: 20 }); setSearch(""); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title="Reset filters"><RefreshCw className="h-4 w-4" /></button>
          {canManage && <Button onClick={openCreate} className="ml-auto shrink-0"><Plus className="h-4 w-4" />Create KPI</Button>}
        </div>
        {(filters.kpiLevel || filters.status || filters.category || filters.timeHorizon || search) && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
            {search && <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-700 px-2.5 py-0.5 text-xs font-medium">Search: {search}<button onClick={() => setSearch("")} className="ml-0.5 hover:text-primary-900">×</button></span>}
            {filters.kpiLevel && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-medium">{filters.kpiLevel}<button onClick={() => setFilters((f) => ({ ...f, kpiLevel: undefined }))} className="ml-0.5 hover:text-gray-900">×</button></span>}
            {filters.status && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-medium">{STATUS_CONFIG[filters.status]?.label ?? filters.status}<button onClick={() => setFilters((f) => ({ ...f, status: undefined }))} className="ml-0.5 hover:text-gray-900">×</button></span>}
            {filters.category && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-medium">{CATEGORY_LABELS[filters.category] ?? filters.category}<button onClick={() => setFilters((f) => ({ ...f, category: undefined }))} className="ml-0.5 hover:text-gray-900">×</button></span>}
            {filters.timeHorizon && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-medium">{filters.timeHorizon}<button onClick={() => setFilters((f) => ({ ...f, timeHorizon: undefined }))} className="ml-0.5 hover:text-gray-900">×</button></span>}
          </div>
        )}
      </div>

      {!kpisLoading && (
        <p className="text-xs text-gray-400 px-0.5">
          {displayedKpis.length} KPI{displayedKpis.length !== 1 ? "s" : ""}{pagination?.total ? ` of ${pagination.total}` : ""}
        </p>
      )}

      {/* ── KPI Cards ── */}
      <div className="space-y-2.5">
        {kpisLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-2 w-full rounded-full mt-3" />
                </div>
              </div>
            </div>
          ))
        ) : displayedKpis.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
            <Target className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No KPIs found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or create a new KPI.</p>
            {canManage && <Button onClick={openCreate} className="mt-4" variant="outline"><Plus className="h-4 w-4" />Create KPI</Button>}
          </div>
        ) : (
          displayedKpis.map((kpi) => {
            const StatusIcon = STATUS_CONFIG[kpi.status]?.icon ?? Clock;
            const statusCfg = STATUS_CONFIG[kpi.status];
            const aStatus = (kpi as any).approvalStatus as string | undefined;
            const approvalCfg = aStatus ? APPROVAL_STATUS_CONFIG[aStatus] : null;
            const lastUpdate = kpi.updates?.[0];
            const pct = lastUpdate?.percentComplete ?? (kpi.targetValue && lastUpdate?.actualValue != null ? Math.min(100, Math.round((lastUpdate.actualValue / kpi.targetValue) * 100)) : null);
            const progressBarColor =
              kpi.status === "OnTrack" || kpi.status === "Completed" ? "bg-emerald-500"
              : kpi.status === "AtRisk" ? "bg-amber-400"
              : kpi.status === "OffTrack" || kpi.status === "Overdue" ? "bg-red-500"
              : "bg-primary";
            const daysLeft = Math.ceil((new Date(kpi.endDate).getTime() - Date.now()) / 86400000);
            const dueSoon = daysLeft >= 0 && daysLeft <= 14;
            const overdue = daysLeft < 0 && kpi.status !== "Completed";
            const needsAck = kpi.assignments?.some((a: any) => a.employeeId === employeeId && !a.acknowledgedAt);

            return (
              <div key={kpi.id} className="group relative rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-150 overflow-hidden">
                <div className={`absolute inset-y-0 left-0 w-1 ${progressBarColor}`} />
                <div className="pl-5 pr-4 py-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${statusCfg?.bg ?? "bg-gray-100"}`}>
                      <StatusIcon className={`h-5 w-5 ${statusCfg?.text ?? "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button onClick={() => setDrawerKpiId(kpi.id)} className="text-sm font-semibold text-gray-900 hover:text-primary text-left leading-snug block max-w-xl transition-colors">
                            {kpi.title}
                          </button>
                          {kpi.parent && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <ChevronRightIcon className="h-3 w-3" />{kpi.parent.title}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => setDrawerKpiId(kpi.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="View details"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => openUpdate(kpi.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors" title="Submit progress update"><Upload className="h-4 w-4" /></button>
                          {canManage && aStatus === "Draft" && (
                            <button onClick={async () => { try { await submitForApproval.mutateAsync(kpi.id); toast.success("Submitted for approval."); } catch { toast.error("Failed."); } }} disabled={submitForApproval.isPending} className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors disabled:opacity-50" title="Submit for approval"><ShieldCheck className="h-4 w-4" /></button>
                          )}
                          {!canManage && needsAck && (
                            <button onClick={async () => { try { await acknowledgeKpi.mutateAsync(kpi.id); toast.success("KPI acknowledged."); } catch { toast.error("Failed."); } }} disabled={acknowledgeKpi.isPending} className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50" title="Acknowledge assignment"><CheckCircle2 className="h-4 w-4" /></button>
                          )}
                          {canManage && <button onClick={() => openEdit(kpi)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit KPI"><Pencil className="h-4 w-4" /></button>}
                          {isAdmin && <button onClick={() => setDeleteKpiConfirm(kpi.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete KPI"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[kpi.kpiLevel] ?? "bg-gray-100 text-gray-600"}`}>{kpi.kpiLevel}</span>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">{CATEGORY_LABELS[kpi.category] ?? kpi.category}</span>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">{kpi.timeHorizon}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg?.bg} ${statusCfg?.text}`}>
                          <StatusIcon className="h-3 w-3" />{statusCfg?.label ?? kpi.status}
                        </span>
                        {approvalCfg && <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${approvalCfg.bg} ${approvalCfg.text}`}>{approvalCfg.label}</span>}
                        {needsAck && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600">Needs acknowledgment</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex-1 min-w-[140px] max-w-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-400">Progress</span>
                            <span className="text-xs font-semibold text-gray-700">{pct != null ? `${pct}%` : "—"}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100">
                            {pct != null && <div className={`h-1.5 rounded-full ${progressBarColor}`} style={{ width: `${Math.min(100, pct)}%` }} />}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Target</p>
                          <p className="text-xs font-semibold text-gray-700">
                            {kpi.targetType === "Binary" ? "Done/Not Done" : kpi.targetType === "Milestone" ? "Milestone" : kpi.targetValue != null ? `${kpi.targetValue}${kpi.targetType === "Percentage" ? "%" : kpi.unit ? ` ${kpi.unit}` : ""}` : "—"}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Due</p>
                          <p className={`text-xs font-semibold ${overdue ? "text-red-600" : dueSoon ? "text-amber-600" : "text-gray-700"}`}>
                            {formatDate(kpi.endDate)}
                            {overdue && <span className="ml-1">({Math.abs(daysLeft)}d ago)</span>}
                            {dueSoon && !overdue && <span className="ml-1">({daysLeft}d left)</span>}
                          </p>
                        </div>
                        {kpi.assignments && kpi.assignments.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Assignees</span>
                            <div className="flex -space-x-1.5">
                              {kpi.assignments.slice(0, 4).map((a) => (
                                <div key={a.id} title={a.employee?.fullName}><Avatar name={a.employee?.fullName ?? "?"} size="sm" /></div>
                              ))}
                              {kpi.assignments.length > 4 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium border-2 border-white text-gray-600">+{kpi.assignments.length - 4}</span>}
                            </div>
                          </div>
                        )}
                        {(kpi.sbu || kpi.department) && (
                          <div className="text-center">
                            <p className="text-xs text-gray-400">{kpi.department ? "Dept" : "SBU"}</p>
                            <p className="text-xs font-medium text-gray-600">{kpi.department?.name ?? kpi.sbu?.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </div>
      )}

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
            <Select label="Category" options={Object.entries(CATEGORY_LABELS).map(([v, label]) => ({ label, value: v }))} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as KpiCategory }))} />
            <Select label="Update Frequency" options={Object.entries(FREQUENCY_LABELS).map(([v, label]) => ({ label, value: v }))} value={form.updateFrequency} onChange={(e) => setForm((f) => ({ ...f, updateFrequency: e.target.value }))} />
          </div>
          <div>
            <Select label="Target Type" options={Object.entries(TARGET_TYPE_CONFIG).map(([v, cfg]) => ({ label: cfg.label, value: v }))} value={form.targetType} onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value as KpiTargetType, targetValue: "", unit: e.target.value === "Percentage" ? "%" : f.unit }))} />
            {TARGET_TYPE_CONFIG[form.targetType] && (
              <p className="mt-1 text-xs text-gray-400">{TARGET_TYPE_CONFIG[form.targetType].example}</p>
            )}
          </div>
          {TARGET_TYPE_CONFIG[form.targetType]?.showNumeric ? (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Target Value" type="number" placeholder={form.targetType === "Percentage" ? "0–100" : "e.g. 200"} value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))} />
              {TARGET_TYPE_CONFIG[form.targetType]?.showUnit ? (
                <Input label="Unit" placeholder="e.g. enrollments, days" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
              ) : (
                <div className="flex items-end pb-1"><span className="text-sm text-gray-500">{form.targetType === "Percentage" ? "Unit: %" : form.targetType === "Composite" ? "Unit: score (0–100)" : ""}</span></div>
              )}
            </div>
          ) : form.targetType === "Binary" ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Binary KPIs track a simple <strong>Done / Not Done</strong> outcome. No numeric target is needed — progress updates will record completion as 100% when done.
            </div>
          ) : form.targetType === "Milestone" ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Milestone KPIs track delivery of a specific outcome. Use the description field above to define the milestone, and mark progress updates as 0% or 100% when reached.
            </div>
          ) : null}
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
          {/* Cascade / rollup fields */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Roll-up Method"
              options={[
                { label: "Weighted Average", value: "WeightedAverage" },
                { label: "Sum", value: "Sum" },
                { label: "Manual (Leadership)", value: "Manual" },
              ]}
              value={form.rollupMethod}
              onChange={(e) => setForm((f) => ({ ...f, rollupMethod: e.target.value }))}
            />
            <Input
              label="Weight (for parent rollup)"
              type="number"
              placeholder="e.g. 1.0"
              value={(form as any).weight ?? "1"}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value } as any))}
            />
          </div>
          <p className="text-xs text-gray-400 -mt-2">Weight determines how much this KPI contributes to its parent's rolled-up progress when using Weighted Average.</p>
          {!editingId && employeeOptions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-0.5">Assign to Employees (optional)</p>
              <p className="text-xs text-gray-400 mb-2">Select employees and describe each person's specific task to achieve this KPI.</p>
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
              {/* Employee list with inline task description */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto border rounded-lg p-2">
                {employeeOptions
                  .filter((emp) => emp.label.toLowerCase().includes(assigneeSearch.toLowerCase()) || emp.subLabel.toLowerCase().includes(assigneeSearch.toLowerCase()))
                  .map((emp) => {
                    const assigneesList: Array<{ employeeId: string; taskDescription: string }> = (form as any).assignees ?? [];
                    const isChecked = assigneesList.some((a) => a.employeeId === emp.value);
                    const taskDesc = assigneesList.find((a) => a.employeeId === emp.value)?.taskDescription ?? "";
                    return (
                      <div key={emp.value} className={`rounded-lg border transition-colors ${isChecked ? "border-primary/30 bg-primary-50" : "border-transparent hover:bg-gray-50"}`}>
                        <label className="flex items-center gap-2 cursor-pointer px-2 py-1.5">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary shrink-0"
                            checked={isChecked}
                            onChange={(e) => setForm((f) => {
                              const prev = (f as any).assignees as Array<{ employeeId: string; taskDescription: string }>;
                              if (e.target.checked) {
                                return { ...f, assignees: [...prev, { employeeId: emp.value, taskDescription: "" }] } as any;
                              }
                              return { ...f, assignees: prev.filter((a) => a.employeeId !== emp.value) } as any;
                            })}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-gray-900">{emp.label}</span>
                            <span className="text-xs text-gray-400 ml-1.5">{emp.subLabel}</span>
                          </div>
                        </label>
                        {isChecked && (
                          <div className="px-3 pb-2">
                            <input
                              type="text"
                              placeholder="Describe this person's specific task for this KPI…"
                              value={taskDesc}
                              onChange={(e) => setForm((f) => {
                                const prev = (f as any).assignees as Array<{ employeeId: string; taskDescription: string }>;
                                return { ...f, assignees: prev.map((a) => a.employeeId === emp.value ? { ...a, taskDescription: e.target.value } : a) } as any;
                              })}
                              className="w-full rounded-md border border-primary/20 bg-white px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                {employeeOptions.filter((emp) => emp.label.toLowerCase().includes(assigneeSearch.toLowerCase()) || emp.subLabel.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">No employees match &quot;{assigneeSearch}&quot;</p>
                )}
              </div>
              {((form as any).assignees ?? []).length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {((form as any).assignees ?? []).length} selected ·{" "}
                  {((form as any).assignees ?? []).filter((a: any) => a.taskDescription?.trim()).length} with task descriptions
                </p>
              )}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded border-gray-300 text-primary" checked={form.evidenceRequired} onChange={(e) => setForm((f) => ({ ...f, evidenceRequired: e.target.checked }))} /><span className="text-sm text-gray-700">Evidence required for updates</span></label>

          {/* §21 — Reviewer */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Reviewer & KPI Definition</p>
            <SearchableSelect
              label="Reviewer (optional)"
              placeholder="Search for a reviewer..."
              options={employeeOptions}
              value={(form as any).reviewerId ?? ""}
              onChange={(value) => setForm((f) => ({ ...f, reviewerId: value } as any))}
            />
            <p className="text-xs text-gray-400 mt-1 mb-3">Person responsible for reviewing and signing off this KPI's performance.</p>
          </div>

          {/* §25 — KPI Definition Template */}
          <Textarea
            label="Business Objective (optional)"
            placeholder="Which business goal does this KPI support?"
            rows={2}
            value={(form as any).businessObjective ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, businessObjective: e.target.value } as any))}
          />
          <Textarea
            label="Calculation Formula (optional)"
            placeholder="e.g. (Placed Candidates / Total Applicants) × 100"
            rows={2}
            value={(form as any).calculationFormula ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, calculationFormula: e.target.value } as any))}
          />
          <Input
            label="Data Source (optional)"
            placeholder="e.g. ATS system, HR database, Finance ERP"
            value={(form as any).dataSource ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, dataSource: e.target.value } as any))}
          />
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

      {drawerKpiId && <KpiDetailDrawer kpiId={drawerKpiId} onClose={() => setDrawerKpiId(null)} />}
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
  const [kpiApprovalNote, setKpiApprovalNote] = useState<Record<string, string>>({});
  const [calibrateReviewId, setCalibrateReviewId] = useState<string | null>(null);
  const [calibrateForm, setCalibrateForm] = useState({ finalRating: 3, calibrationNote: "" });
  const [selectedReview, setSelectedReview] = useState<KpiReview | null>(null);
  const lockCycle = useLockReviewCycle();

  const { data: kpisResult, isLoading: kpisLoading } = useAllKpisForHR(filters);
  const kpis = (kpisResult?.data ?? []) as Kpi[];
  const pagination = kpisResult?.pagination;

  const { data: okrDash } = useOkrDashboard();

  const { data: pendingReviews = [], isLoading: reviewsLoading } = usePendingKpiReviews();
  const { data: pendingKpiApprovals = [], isLoading: approvalsLoading } = usePendingKpiApprovals();
  const approveReview = useApproveKpiReview();
  const rejectReview = useRejectKpiReview();
  const approveKpi = useApproveKpi();
  const rejectKpi = useRejectKpi();
  const calibrateReview = useCalibrateKpiReview();

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
  const handleApproveKpi = async (kpiId: string) => {
    try { await approveKpi.mutateAsync({ kpiId, note: kpiApprovalNote[kpiId] }); toast.success("KPI approved."); }
    catch { toast.error("Failed to approve KPI."); }
  };
  const handleRejectKpi = async (kpiId: string) => {
    if (!kpiApprovalNote[kpiId]?.trim()) { toast.error("Please provide a rejection note."); return; }
    try { await rejectKpi.mutateAsync({ kpiId, note: kpiApprovalNote[kpiId] }); toast.success("KPI rejected."); }
    catch { toast.error("Failed to reject KPI."); }
  };
  const handleCalibrate = async () => {
    if (!calibrateReviewId) return;
    try {
      await calibrateReview.mutateAsync({ reviewId: calibrateReviewId, finalRating: calibrateForm.finalRating, calibrationNote: calibrateForm.calibrationNote || undefined });
      toast.success("Calibration saved. Review is now signed off.");
      setCalibrateReviewId(null);
    } catch { toast.error("Failed to calibrate review."); }
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

      {/* Pending KPI Approvals (Section 9.1) */}
      {(pendingKpiApprovals.length > 0 || approvalsLoading) && (
        <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-amber-100 bg-amber-50/30">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                <Hourglass className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Pending KPI Approvals</p>
                <p className="text-xs text-gray-500">KPIs submitted by Directors/Managers awaiting approval</p>
              </div>
            </div>
            {pendingKpiApprovals.length > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white px-1.5">{pendingKpiApprovals.length}</span>
            )}
          </div>
          <div className="p-5 space-y-3">
            {approvalsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
            ) : (
              pendingKpiApprovals.map((kpi: any) => (
                <div key={kpi.id} className="rounded-xl border border-amber-100 bg-amber-50/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{kpi.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {kpi.creator?.fullName && <span>By: {kpi.creator.fullName}</span>}
                        {kpi.sbu?.name && <span className="ml-2 text-gray-400">{kpi.sbu.name}</span>}
                        {kpi.department?.name && <span className="ml-1 text-gray-400">/ {kpi.department.name}</span>}
                      </p>
                      {kpi.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{kpi.description}</p>}
                    </div>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Note (required for rejection)..."
                      value={kpiApprovalNote[kpi.id] ?? ""}
                      onChange={(e) => setKpiApprovalNote((n) => ({ ...n, [kpi.id]: e.target.value }))}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={() => handleApproveKpi(kpi.id)}
                      disabled={approveKpi.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleRejectKpi(kpi.id)}
                      disabled={rejectKpi.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
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
              options={[{ label: "All Categories", value: "" }, ...Object.entries(CATEGORY_LABELS).map(([v, label]) => ({ label, value: v }))]}
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
                      <TableCell className="text-xs text-gray-600">{CATEGORY_LABELS[kpi.category] ?? kpi.category}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {kpi.sbu?.name && <span className="block">{kpi.sbu.name}</span>}
                        {kpi.department?.name && <span className="text-gray-400">{kpi.department.name}</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {kpi.targetType === "Binary" ? <span className="text-xs text-gray-500 italic">Done/Not Done</span>
                          : kpi.targetType === "Milestone" ? <span className="text-xs text-gray-500 italic">Milestone</span>
                          : kpi.targetValue != null ? `${kpi.targetValue}${kpi.targetType === "Percentage" ? "%" : kpi.unit ? ` ${kpi.unit}` : ""}` : "—"}
                      </TableCell>
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
                          {review.kpi?.category && <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">{CATEGORY_LABELS[review.kpi.category] ?? review.kpi.category}</span>}
                          {review.reviewCycle?.name && <span className="text-xs text-gray-400">· {review.reviewCycle.name}</span>}
                          {review.selfRating != null && <span className="text-xs text-gray-500">Self: <strong>{review.selfRating}</strong>/5</span>}
                          {review.managerRating != null && <span className="text-xs text-gray-500">Manager: <strong>{review.managerRating}</strong>/5</span>}
                          {(review as any).behavioralScore != null && <span className="text-xs text-violet-600 bg-violet-50 rounded px-1.5 py-0.5">Behavioral: <strong>{(review as any).behavioralScore}</strong>/5</span>}
                          {(review as any).finalRating != null && <span className="text-xs text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 font-semibold">Final: {(review as any).finalRating}/5</span>}
                        </div>
                        {review.reviewComment && <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">&ldquo;{review.reviewComment}&rdquo;</p>}
                        {(review as any).developmentActions && <p className="text-xs text-blue-600 mt-1 line-clamp-1">Dev: {(review as any).developmentActions}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        {(review as any).signoffStatus === "SignedOff" ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1">
                            <Lock className="h-3 w-3" /> Signed Off
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedReview(review)}
                              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                              title="View full review"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            <button
                              onClick={() => { setCalibrateReviewId(review.id); setCalibrateForm({ finalRating: review.managerRating ?? review.selfRating ?? 3, calibrationNote: "" }); }}
                              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
                              title="Calibrate & sign off"
                            >
                              <PenLine className="h-3.5 w-3.5" /> Calibrate
                            </button>
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
                          </>
                        )}
                      </div>
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

      {/* §20 Review Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onCalibrate={(id, rating) => { setSelectedReview(null); setCalibrateReviewId(id); setCalibrateForm({ finalRating: rating, calibrationNote: "" }); }}
          onApprove={handleApproveReview}
          onReject={handleRejectReview}
          approving={approveReview.isPending}
          rejecting={rejectReview.isPending}
        />
      )}

      {/* Calibration Modal (Section 9.3) */}
      <Modal isOpen={!!calibrateReviewId} onClose={() => setCalibrateReviewId(null)} title="Calibrate & Sign Off Review" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Set the final calibrated rating for this KPI review. Once signed off, the review will be locked.</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Final Rating (1–5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setCalibrateForm((f) => ({ ...f, finalRating: n }))}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold border-2 transition-all ${calibrateForm.finalRating === n ? "border-violet-600 bg-violet-600 text-white" : "border-gray-200 text-gray-500 hover:border-violet-300"}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
              <span>Needs Improvement</span><span>Exceptional</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Calibration Note (optional)</label>
            <textarea value={calibrateForm.calibrationNote} onChange={(e) => setCalibrateForm((f) => ({ ...f, calibrationNote: e.target.value }))} placeholder="Rationale for final rating..." rows={3} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setCalibrateReviewId(null)}>Cancel</Button>
            <Button className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={calibrateReview.isPending} onClick={handleCalibrate}>
              {calibrateReview.isPending ? "Saving..." : "Sign Off & Lock"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── §20 Review Detail Modal ──────────────────────────

function RatingStars({ value, max = 5 }: { value: number | null | undefined; max?: number }) {
  if (value == null) return <span className="text-xs text-gray-400">—</span>;
  const rounded = Math.round(Number(value) * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} className={`h-3.5 w-3.5 ${i < rounded ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-700">{Number(value).toFixed(1)}</span>
    </span>
  );
}

function ReviewDetailModal({
  review,
  onClose,
  onCalibrate,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  review: KpiReview;
  onClose: () => void;
  onCalibrate: (id: string, rating: number) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const isSignedOff = (review as any).signoffStatus === "SignedOff";
  const isRejected  = (review as any).signoffStatus === "Rejected";

  return (
    <Modal isOpen onClose={onClose} title="KPI Review Detail" size="lg">
      <div className="space-y-5">

        {/* ── §20 Header ── */}
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={review.employee?.fullName ?? "?"} size="md" />
            <div>
              <p className="font-semibold text-gray-900">{review.employee?.fullName}</p>
              <p className="text-xs text-gray-500">{(review.employee as any)?.jobTitle ?? ""}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {(review.employee as any)?.department?.name && (
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{(review.employee as any).department.name}</span>
                )}
                {(review.employee as any)?.sbu?.name && (
                  <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{(review.employee as any).sbu.name}</span>
                )}
                {review.manager?.fullName && (
                  <span className="text-xs text-gray-400">Manager: <strong className="text-gray-600">{review.manager.fullName}</strong></span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isSignedOff ? "bg-emerald-100 text-emerald-700" : isRejected ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
              {isSignedOff ? <><Lock className="h-3 w-3" /> Approved</> : isRejected ? <><ShieldX className="h-3 w-3" /> Rejected</> : <><Hourglass className="h-3 w-3" /> Pending Sign-off</>}
            </span>
            {review.reviewCycle?.name && <span className="text-xs text-gray-400">{review.reviewCycle.name}</span>}
          </div>
        </div>

        {/* ── §20 KPI Section ── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-semibold text-gray-800">KPI Performance</p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-0.5">KPI Title</p>
              <p className="text-sm font-semibold text-gray-900">{review.kpi?.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {review.kpi?.kpiLevel && <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[review.kpi.kpiLevel] ?? "bg-gray-100 text-gray-600"}`}>{review.kpi.kpiLevel}</span>}
                {review.kpi?.category && <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">{CATEGORY_LABELS[review.kpi.category] ?? review.kpi.category}</span>}
                {review.kpi?.status && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[review.kpi.status as KpiStatus]?.bg ?? "bg-gray-100"} ${STATUS_CONFIG[review.kpi.status as KpiStatus]?.text ?? "text-gray-600"}`}>
                    {STATUS_CONFIG[review.kpi.status as KpiStatus]?.label ?? review.kpi.status}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Target", value: (review.kpi as any)?.targetValue != null ? `${(review.kpi as any).targetValue}${(review.kpi as any).unit ? ` ${(review.kpi as any).unit}` : ""}` : "—" },
                { label: "% Complete", value: (review.kpi as any)?.percentComplete != null ? `${(review.kpi as any).percentComplete}%` : "—" },
                { label: "Start", value: (review.kpi as any)?.startDate ? formatDate((review.kpi as any).startDate) : "—" },
                { label: "End", value: (review.kpi as any)?.endDate ? formatDate((review.kpi as any).endDate) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── §20 Ratings ── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-semibold text-gray-800">Ratings</p>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Self Rating",      value: review.selfRating,                color: "text-blue-700",   bg: "bg-blue-50"   },
              { label: "Manager Rating",   value: review.managerRating,             color: "text-violet-700", bg: "bg-violet-50" },
              { label: "Behavioral Score", value: (review as any).behavioralScore,  color: "text-orange-700", bg: "bg-orange-50" },
              { label: "Final Rating",     value: (review as any).finalRating,      color: "text-emerald-700",bg: "bg-emerald-50"},
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-lg ${bg} px-3 py-3 text-center`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <RatingStars value={value} />
              </div>
            ))}
          </div>
        </div>

        {/* ── §20 Overall Assessment ── */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-500" />
            <p className="text-sm font-semibold text-gray-800">Assessment</p>
          </div>
          <div className="p-4 space-y-3">
            {[
              { label: "Review Comment",      value: review.reviewComment },
              { label: "Strengths",           value: review.strengths },
              { label: "Areas for Improvement", value: review.improvementAreas },
              { label: "Development Actions", value: (review as any).developmentActions },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{value}</p>
              </div>
            ) : null)}
            {!review.reviewComment && !review.strengths && !review.improvementAreas && !(review as any).developmentActions && (
              <p className="text-sm text-gray-400 italic">No assessment notes provided.</p>
            )}
          </div>
        </div>

        {/* ── §20 Sign-off Actions ── */}
        {!isSignedOff && !isRejected && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => onCalibrate(review.id, Number((review as any).finalRating ?? review.managerRating ?? review.selfRating ?? 3))}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <PenLine className="h-4 w-4" /> Calibrate & Sign Off
            </button>
            <button
              onClick={() => onApprove(review.id)}
              disabled={approving}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <ThumbsUp className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => onReject(review.id)}
              disabled={rejecting}
              className="flex items-center gap-1.5 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <ThumbsDown className="h-4 w-4" /> Reject
            </button>
          </div>
        )}
        {(isSignedOff || isRejected) && (
          <div className="flex justify-end pt-1 border-t border-gray-100">
            <button onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">Close</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Phase Badge ──────────────────────────────────────

function PhaseBadge({ status }: { status: KpiStatus }) {
  if (["NotStarted"].includes(status))
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">Planning</span>;
  if (["InProgress", "OnTrack", "AtRisk", "OffTrack", "Overdue", "OnHold"].includes(status))
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Execution</span>;
  if (["Completed", "Cancelled"].includes(status))
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Review</span>;
  return null;
}

// ─── KPI Detail Drawer ────────────────────────────────

function KpiDetailDrawer({ kpiId, onClose }: { kpiId: string; onClose: () => void }) {
  const { data: kpiDetail } = useKpi(kpiId);
  const { data: comments = [], isLoading: commentsLoading } = useKpiComments(kpiId);
  const { data: evidence = [] } = useKpiEvidence(kpiId);
  const { data: updates = [] } = useQuery<any[]>({
    queryKey: ["kpi-updates", kpiId],
    queryFn: async () => {
      const { default: api } = await import("@/lib/api");
      const res = await api.get<any[]>(`/kpi/${kpiId}/updates`);
      return res.data;
    },
    enabled: !!kpiId,
  });
  const { data: reviewCycles = [] } = useKpiReviewCycles();
  const addComment = useAddKpiComment();
  const uploadEvidence = useUploadKpiEvidence();
  const submitSelf = useSubmitSelfAssessment();
  const reviewUpdate = useReviewKpiUpdate();
  const effectiveRole = useEffectiveRole();
  const { profile } = useAuth();
  const canManagerReview = effectiveRole === "Admin" || effectiveRole === "SBUHead" || effectiveRole === "Director" || effectiveRole === "Manager";
  const { data: versionHistory = [] } = useKpiVersionHistory(kpiId);

  const [commentBody, setCommentBody] = useState("");
  const [activeDrawerTab, setActiveDrawerTab] = useState<"updates" | "evidence" | "comments" | "review" | "history">("updates");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [selfForm, setSelfForm] = useState({ reviewCycleId: "", selfRating: 0, reviewComment: "", strengths: "", improvementAreas: "", developmentActions: "" });
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const activeReviewCycle = (reviewCycles as any[]).find((c) => c.isActive);

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    await addComment.mutateAsync({ kpiId, body: commentBody.trim() });
    setCommentBody("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadEvidence.mutateAsync({ kpiId, file, note: evidenceNote || undefined });
    setEvidenceNote("");
    e.target.value = "";
    toast.success("Evidence uploaded.");
  };

  const handleSelfAssess = async () => {
    if (!selfForm.reviewCycleId) { toast.error("Select a review cycle."); return; }
    if (selfForm.selfRating > 0 && selfForm.selfRating <= 2 && !selfForm.reviewComment.trim()) {
      toast.error("A comment is required when self-rating is 2 or below."); return;
    }
    try {
      await submitSelf.mutateAsync({ ...selfForm, kpiId });
      toast.success("Self-assessment submitted.");
    } catch { toast.error("Failed to submit self-assessment."); }
  };

  const drawerTabs = [
    { id: "updates" as const, label: "Progress History" },
    { id: "evidence" as const, label: `Evidence (${evidence.length})` },
    { id: "comments" as const, label: `Comments (${comments.length})` },
    { id: "review" as const, label: "Self-Assessment" },
    { id: "history" as const, label: `Edit History (${versionHistory.length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30" />
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">KPI Details</p>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* KPI Framework Info */}
        {kpiDetail && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 space-y-2">
            <p className="text-sm font-semibold text-gray-900 leading-snug">{(kpiDetail as any).title}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[(kpiDetail as any).kpiLevel] ?? "bg-gray-100 text-gray-600"}`}>{(kpiDetail as any).kpiLevel}</span>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">{CATEGORY_LABELS[(kpiDetail as any).category] ?? (kpiDetail as any).category}</span>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600">{(kpiDetail as any).timeHorizon}</span>
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-600">{TARGET_TYPE_CONFIG[(kpiDetail as any).targetType]?.label ?? (kpiDetail as any).targetType}</span>
              {(kpiDetail as any).updateFrequency && (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600">
                  {FREQUENCY_LABELS[(kpiDetail as any).updateFrequency] ?? (kpiDetail as any).updateFrequency}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {(kpiDetail as any).targetType === "Binary" ? (
                <span>Target: <strong>Done / Not Done</strong></span>
              ) : (kpiDetail as any).targetType === "Milestone" ? (
                <span>Target: <strong>Milestone delivery</strong></span>
              ) : (kpiDetail as any).targetValue != null ? (
                <span>Target: <strong>{(kpiDetail as any).targetValue}{(kpiDetail as any).targetType === "Percentage" ? "%" : (kpiDetail as any).unit ? ` ${(kpiDetail as any).unit}` : ""}</strong></span>
              ) : null}
              <StatusBadge status={(kpiDetail as any).status} />
            </div>
          </div>
        )}

        {/* Assignees & Tasks panel */}
        {kpiDetail && (kpiDetail as any).assignments?.length > 0 && (
          <div className="mx-4 mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned To</p>
            <div className="space-y-2">
              {(kpiDetail as any).assignments.filter((a: any) => a.isActive).map((a: any) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-800 text-xs font-bold">
                    {(a.employee?.fullName ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-800">{a.employee?.fullName ?? "—"}</span>
                      {a.employee?.jobTitle && <span className="text-[10px] text-gray-400">{a.employee.jobTitle}</span>}
                      {a.acknowledgedAt && <span className="text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">Acknowledged</span>}
                    </div>
                    {a.taskDescription ? (
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{a.taskDescription}</p>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic mt-0.5">No task description set</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-100 overflow-x-auto">
          {drawerTabs.map((t) => (
            <button key={t.id} onClick={() => setActiveDrawerTab(t.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeDrawerTab === t.id ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Progress History */}
          {activeDrawerTab === "updates" && (
            <div className="space-y-3">
              {/* Approval status banner */}
              {kpiDetail && (kpiDetail as any).approvalStatus && (kpiDetail as any).approvalStatus !== "Draft" && (() => {
                const aStatus = (kpiDetail as any).approvalStatus as string;
                const cfg = APPROVAL_STATUS_CONFIG[aStatus];
                return cfg ? (
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${cfg.bg}`}>
                    <ShieldCheck className={`h-4 w-4 ${cfg.text}`} />
                    <p className={`text-xs font-semibold ${cfg.text}`}>KPI Approval: {cfg.label}</p>
                    {(kpiDetail as any).approvalNote && <p className="text-xs text-gray-500 ml-1">— {(kpiDetail as any).approvalNote}</p>}
                  </div>
                ) : null;
              })()}
              {(updates as any[]).length === 0 && <p className="text-sm text-gray-400 text-center py-8">No progress updates yet.</p>}
              {(updates as any[]).map((u) => (
                <div key={u.id} className={`rounded-xl border p-4 space-y-2 ${u.reviewedById ? "border-emerald-100 bg-emerald-50/30" : "border-gray-100 bg-gray-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{u.updatePeriod}</span>
                    <div className="flex items-center gap-2">
                      {u.percentComplete != null && <span className="text-xs font-bold text-primary">{u.percentComplete}%</span>}
                      {u.blockerFlag && <span className="text-xs font-medium text-red-600 bg-red-50 rounded-full px-2 py-0.5">Blocker</span>}
                      {u.reviewedById
                        ? <span className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">Reviewed</span>
                        : canManagerReview && (
                          <button
                            onClick={async () => {
                              try { await reviewUpdate.mutateAsync({ updateId: u.id }); toast.success("Update marked as reviewed."); }
                              catch { toast.error("Failed."); }
                            }}
                            disabled={reviewUpdate.isPending}
                            className="text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            Mark Reviewed
                          </button>
                        )
                      }
                    </div>
                  </div>
                  {u.actualValue != null && <p className="text-xs text-gray-600">Actual: <strong>{u.actualValue}</strong></p>}
                  {u.narrative && <p className="text-xs text-gray-600">{u.narrative}</p>}
                  {u.blockerDetail && <p className="text-xs text-red-500">⚠️ {u.blockerDetail}</p>}
                  {u.nextSteps && <p className="text-xs text-gray-400">Next: {u.nextSteps}</p>}
                  {u.reviewNote && <p className="text-xs text-emerald-600 italic">Manager note: {u.reviewNote}</p>}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400">{u.employee?.fullName}</span>
                    <span className="text-xs text-gray-400">{formatDate(u.submittedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Evidence */}
          {activeDrawerTab === "evidence" && (
            <div className="space-y-4">
              {/* Upload */}
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 text-center">
                <Upload className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-2">PDF, DOC, JPG, PNG — max 5MB</p>
                <input type="text" placeholder="Optional note..." value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} className="w-full mb-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <label className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors">
                  {uploadEvidence.isPending ? "Uploading..." : "Choose File"}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileUpload} disabled={uploadEvidence.isPending} />
                </label>
              </div>
              {/* Evidence list */}
              {(evidence as any[]).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No evidence uploaded yet.</p>}
              {(evidence as any[]).map((ev) => {
                const isImage = /\.(jpe?g|png|gif|webp)$/i.test(ev.fileName ?? "");
                const isPdf = /\.pdf$/i.test(ev.fileName ?? "");
                return (
                  <div key={ev.id} className="rounded-xl border border-gray-100 overflow-hidden">
                    {/* Image preview */}
                    {isImage && ev.signedUrl && (
                      <a href={ev.signedUrl} target="_blank" rel="noopener noreferrer">
                        <img src={ev.signedUrl} alt={ev.fileName} className="w-full max-h-48 object-cover bg-gray-50" />
                      </a>
                    )}
                    <div className="flex items-center gap-3 p-3">
                      {/* File type icon */}
                      {!isImage && (
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPdf ? "bg-red-50" : "bg-blue-50"}`}>
                          <Eye className={`h-4 w-4 ${isPdf ? "text-red-500" : "text-blue-500"}`} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={ev.signedUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-800 hover:text-primary transition-colors truncate block"
                        >
                          {ev.fileName}
                        </a>
                        {ev.note && <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>}
                        <p className="text-xs text-gray-400">{ev.uploadedBy?.fullName} · {formatDate(ev.uploadedAt)}</p>
                      </div>
                      {ev.signedUrl && (
                        <a href={ev.signedUrl} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title="Open file">
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comments */}
          {activeDrawerTab === "comments" && (
            <div className="space-y-3">
              {commentsLoading && <p className="text-sm text-gray-400 text-center py-4">Loading comments...</p>}
              {!commentsLoading && (comments as any[]).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No comments yet. Start the discussion.</p>}
              {(comments as any[]).map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author?.fullName ?? "?"} size="sm" />
                  <div className="flex-1 rounded-xl bg-gray-50 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-800">{c.author?.fullName}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
                  </div>
                </div>
              ))}
              {/* Input */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Avatar name={profile?.fullName ?? "?"} size="sm" />
                <div className="flex-1 flex gap-2">
                  <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Add a comment..." rows={2}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button onClick={handleAddComment} disabled={!commentBody.trim() || addComment.isPending}
                    className="self-end rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Self-Assessment */}
          {activeDrawerTab === "review" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Submit your self-assessment for this KPI in a review cycle. Your manager will review and provide their rating.</p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Review Cycle</label>
                <select value={selfForm.reviewCycleId} onChange={(e) => setSelfForm((f) => ({ ...f, reviewCycleId: e.target.value }))} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Select cycle...</option>
                  {(reviewCycles as any[]).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.cycleType})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Self Rating (1–5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setSelfForm((f) => ({ ...f, selfRating: n }))}
                      className={`flex-1 rounded-lg py-2 text-sm font-bold border-2 transition-all ${selfForm.selfRating === n ? "border-primary bg-primary text-white" : "border-gray-200 text-gray-500 hover:border-primary/50"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                  <span>Needs Improvement</span><span>Exceptional</span>
                </div>
                {selfForm.selfRating > 0 && selfForm.selfRating <= 2 && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    A comment is required when rating is 2 or below.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Strengths</label>
                <textarea value={selfForm.strengths} onChange={(e) => setSelfForm((f) => ({ ...f, strengths: e.target.value }))} placeholder="What went well this period?" rows={2} className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Areas for Improvement</label>
                <textarea value={selfForm.improvementAreas} onChange={(e) => setSelfForm((f) => ({ ...f, improvementAreas: e.target.value }))} placeholder="What could be improved?" rows={2} className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Development Actions</label>
                <textarea value={selfForm.developmentActions} onChange={(e) => setSelfForm((f) => ({ ...f, developmentActions: e.target.value }))} placeholder="Training, mentoring, or other development plans..." rows={2} className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Overall Comment</label>
                <textarea value={selfForm.reviewComment} onChange={(e) => setSelfForm((f) => ({ ...f, reviewComment: e.target.value }))} placeholder="Any additional comments..." rows={2} className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <Button className="w-full" disabled={submitSelf.isPending || !selfForm.reviewCycleId} onClick={handleSelfAssess}>
                {submitSelf.isPending ? "Submitting..." : "Submit Self-Assessment"}
              </Button>
            </div>
          )}

          {/* §16 Version / Edit History */}
          {activeDrawerTab === "history" && (
            <div className="space-y-3 p-4">
              {versionHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No edit history recorded yet.</p>
              ) : (
                versionHistory.map((v: any) => (
                  <div key={v.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileEdit className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-xs font-medium text-gray-700">
                          {v.changedBy?.fullName ?? "Unknown"}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">{formatDate(v.createdAt)}</span>
                    </div>
                    {v.fieldChanges && Object.keys(v.fieldChanges).length > 0 && (
                      <div className="space-y-1 pl-6">
                        {Object.entries(v.fieldChanges as Record<string, { before: unknown; after: unknown }>).map(([field, change]) => (
                          <div key={field} className="text-xs text-gray-600">
                            <span className="font-medium capitalize">{field}</span>
                            {": "}
                            <span className="line-through text-red-400">{String(change.before ?? "—")}</span>
                            {" → "}
                            <span className="text-emerald-600">{String(change.after ?? "—")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {v.changeNote && (
                      <p className="pl-6 text-xs text-gray-500 italic">"{v.changeNote}"</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cascade helpers ──────────────────────────────────

const ROLLUP_LABEL: Record<string, string> = {
  WeightedAverage: "Weighted Avg",
  Sum: "Sum",
  Manual: "Manual",
};

const ROLLUP_COLOR: Record<string, string> = {
  WeightedAverage: "bg-violet-50 text-violet-600",
  Sum: "bg-blue-50 text-blue-600",
  Manual: "bg-amber-50 text-amber-600",
};

function effectiveProgress(kpi: any): number | null {
  const override = kpi.progressOverride != null ? Number(kpi.progressOverride) : null;
  const computed = kpi.computedProgress != null ? Number(kpi.computedProgress) : null;
  const latest = kpi.updates?.[0]?.percentComplete != null ? Number(kpi.updates[0].percentComplete) : null;
  return override ?? computed ?? latest ?? null;
}

// ─── Cascade Tree Node ────────────────────────────────

const LEVEL_ACCENT: Record<string, string> = {
  Company:    "border-indigo-400 bg-indigo-50",
  SBU:        "border-blue-400 bg-blue-50",
  Department: "border-cyan-400 bg-cyan-50",
  Team:       "border-teal-400 bg-teal-50",
  Individual: "border-orange-400 bg-orange-50",
};

function CascadeNode({
  kpi, depth = 0, onSelect, canManage,
}: {
  kpi: any; depth?: number; onSelect: (id: string) => void; canManage: boolean;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const setOverride = useSetProgressOverride();

  const hasChildren = kpi.children && kpi.children.length > 0;
  const childCount = kpi._count?.children ?? kpi.children?.length ?? 0;
  const progress = effectiveProgress(kpi);
  const isOverridden = kpi.progressOverride != null;
  const isRolledUp = !isOverridden && kpi.computedProgress != null;

  const progressColor = isOverridden
    ? "bg-amber-400"
    : progress == null ? "bg-gray-200"
    : progress >= 100 ? "bg-emerald-500"
    : progress >= 60 ? "bg-primary"
    : progress >= 30 ? "bg-blue-400"
    : "bg-red-400";

  const handleSetOverride = async (clear = false) => {
    const val = clear ? null : parseFloat(overrideValue);
    if (!clear && (isNaN(val!) || val! < 0 || val! > 100)) { toast.error("Enter a value between 0 and 100."); return; }
    if (!clear && !overrideReason.trim()) { toast.error("Please provide a reason for the override."); return; }
    try {
      await setOverride.mutateAsync({ kpiId: kpi.id, override: clear ? null : val, reason: clear ? undefined : overrideReason.trim() });
      toast.success(clear ? "Override cleared." : "Progress override set.");
      setOverrideOpen(false); setOverrideValue(""); setOverrideReason("");
    } catch { toast.error("Failed to set override."); }
  };

  return (
    <div className={depth > 0 ? "relative ml-8 mt-1" : "mt-2"}>
      {/* Vertical connector line */}
      {depth > 0 && (
        <div className="absolute -left-4 top-0 bottom-0 w-px bg-gray-200" />
      )}
      {depth > 0 && (
        <div className="absolute -left-4 top-5 w-4 h-px bg-gray-200" />
      )}

      <div className={`group relative rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden ${LEVEL_ACCENT[kpi.kpiLevel] ?? "border-gray-200 bg-white"}`}>
        {/* Left accent border */}
        <div className={`absolute inset-y-0 left-0 w-1 ${progressColor}`} />

        <div className="pl-4 pr-3 py-3">
          <div className="flex items-start gap-3">
            {/* Expand toggle + level badge */}
            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); if (hasChildren) setExpanded((v) => !v); }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${LEVEL_COLORS[kpi.kpiLevel] ?? "bg-gray-100 text-gray-600"} ${hasChildren ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
                title={kpi.kpiLevel}
              >
                {hasChildren
                  ? (expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />)
                  : <span>{kpi.kpiLevel[0]}</span>}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => onSelect(kpi.id)}
                  className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors text-left leading-snug"
                >
                  {kpi.title}
                </button>
                {/* Action buttons */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onSelect(kpi.id)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="View details">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  {canManage && (
                    <button
                      onClick={() => { setOverrideValue(progress != null ? String(Math.round(progress)) : ""); setOverrideOpen((v) => !v); }}
                      className={`rounded-lg p-1 transition-colors ${isOverridden ? "text-amber-500 hover:bg-amber-50" : "text-gray-400 hover:bg-amber-50 hover:text-amber-600"}`}
                      title={isOverridden ? "Edit progress override" : "Set progress override"}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Meta line */}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                <span className="text-xs text-gray-400">{kpi.kpiLevel}</span>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">{CATEGORY_LABELS[kpi.category] ?? kpi.category}</span>
                {kpi.sbu && <><span className="text-gray-200">·</span><span className="text-xs text-gray-400">{kpi.sbu.name}</span></>}
                {kpi.department && <><span className="text-gray-200">·</span><span className="text-xs text-gray-400">{kpi.department.name}</span></>}
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <StatusBadge status={kpi.status} />
                {hasChildren && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLLUP_COLOR[kpi.rollupMethod] ?? "bg-gray-100 text-gray-500"}`}>
                    {ROLLUP_LABEL[kpi.rollupMethod] ?? kpi.rollupMethod}
                  </span>
                )}
                {kpi.weight != null && !hasChildren && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                    w={Number(kpi.weight).toFixed(1)}
                  </span>
                )}
                {isOverridden && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Override</span>}
                {isRolledUp && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-600">Auto rolled up</span>}
                {childCount > 0 && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">{childCount} child KPI{childCount !== 1 ? "s" : ""}</span>}
              </div>

              {/* Progress + target row */}
              <div className="mt-2.5 flex items-center gap-4">
                {/* Progress bar */}
                <div className="flex-1 min-w-[80px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Progress</span>
                    <span className={`text-xs font-bold tabular-nums ${isOverridden ? "text-amber-600" : "text-gray-700"}`}>
                      {progress != null ? `${Math.round(progress)}%` : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    {progress != null && (
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                    )}
                  </div>
                </div>

                {/* Target */}
                {kpi.targetValue != null && (
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400">Target</p>
                    <p className="text-sm font-bold text-gray-800">{kpi.targetValue}{kpi.unit ? ` ${kpi.unit}` : ""}</p>
                  </div>
                )}

                {/* Assignees */}
                {kpi.assignments && kpi.assignments.length > 0 && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {kpi.assignments.slice(0, 3).map((a: any) => (
                        <div key={a.id} title={a.employee?.fullName}><Avatar name={a.employee?.fullName ?? "?"} size="sm" /></div>
                      ))}
                    </div>
                    {kpi.assignments.length > 3 && <span className="text-xs text-gray-400">+{kpi.assignments.length - 3}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Override panel */}
          {overrideOpen && canManage && (
            <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-800">Manual Progress Override</p>
                <button onClick={() => setOverrideOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-4 w-4" /></button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-amber-700 shrink-0">Override % (0–100):</label>
                <input
                  type="number" min={0} max={100} step={1}
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") setOverrideOpen(false); }}
                  placeholder="e.g. 75"
                  className="w-24 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  autoFocus
                />
              </div>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override (required)…"
                className="w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => handleSetOverride()} disabled={setOverride.isPending}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors">
                  Apply Override
                </button>
                {isOverridden && (
                  <button onClick={() => handleSetOverride(true)} disabled={setOverride.isPending}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                    Clear Override
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="ml-4 mt-0 space-y-0">
          {kpi.children.map((child: any) => (
            <CascadeNode key={child.id} kpi={child} depth={depth + 1} onSelect={onSelect} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cascade Tab ──────────────────────────────────────

function CascadeTab() {
  const { data: cascade = [], isLoading, refetch } = useKpiCascade();
  const effectiveRole = useEffectiveRole();
  const canManage = effectiveRole === "Admin" || effectiveRole === "SBUHead" || effectiveRole === "Director";
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const allKpis: any[] = [];
  const collectAll = (kpis: any[]) => { for (const k of kpis) { allKpis.push(k); if (k.children) collectAll(k.children); } };
  collectAll(cascade as any[]);

  const levelCounts: Record<string, number> = {};
  for (const k of allKpis) { levelCounts[k.kpiLevel] = (levelCounts[k.kpiLevel] ?? 0) + 1; }

  const filtered = (cascade as any[]).filter((k) => {
    if (levelFilter && k.kpiLevel !== levelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSelf = k.title?.toLowerCase().includes(q) || k.category?.toLowerCase().includes(q);
      const matchChild = (k.children ?? []).some((c: any) => c.title?.toLowerCase().includes(q));
      return matchSelf || matchChild;
    }
    return true;
  });

  // Aggregate rollup stats
  const withProgress = allKpis.filter((k) => effectiveProgress(k) != null);
  const avgProgress = withProgress.length
    ? Math.round(withProgress.reduce((s, k) => s + (effectiveProgress(k) ?? 0), 0) / withProgress.length)
    : null;
  const overriddenCount = allKpis.filter((k) => k.progressOverride != null).length;
  const rolledUpCount = allKpis.filter((k) => k.progressOverride == null && k.computedProgress != null).length;

  const LEVEL_CFG: Record<string, { Icon: React.ElementType; activeBg: string; activeText: string; activeBorder: string; dotColor: string }> = {
    Company:    { Icon: Building2,    activeBg: "bg-indigo-50", activeText: "text-indigo-700", activeBorder: "border-indigo-300", dotColor: "bg-indigo-400" },
    SBU:        { Icon: BarChart3,    activeBg: "bg-blue-50",   activeText: "text-blue-700",   activeBorder: "border-blue-300",   dotColor: "bg-blue-400" },
    Department: { Icon: Briefcase,    activeBg: "bg-cyan-50",   activeText: "text-cyan-700",   activeBorder: "border-cyan-300",   dotColor: "bg-cyan-400" },
    Team:       { Icon: Users,        activeBg: "bg-teal-50",   activeText: "text-teal-700",   activeBorder: "border-teal-300",   dotColor: "bg-teal-400" },
    Individual: { Icon: UserIcon,     activeBg: "bg-orange-50", activeText: "text-orange-700", activeBorder: "border-orange-300", dotColor: "bg-orange-400" },
  };

  const progressColor = avgProgress == null ? "bg-gray-200"
    : avgProgress >= 75 ? "bg-emerald-500"
    : avgProgress >= 50 ? "bg-primary"
    : avgProgress >= 25 ? "bg-amber-400"
    : "bg-red-400";

  return (
    <div className="space-y-4">
      {/* ── Row 1: Level filter cards ── */}
      <div className="grid grid-cols-5 gap-3">
        {["Company", "SBU", "Department", "Team", "Individual"].map((level) => {
          const { Icon, activeBg, activeText, activeBorder, dotColor } = LEVEL_CFG[level];
          const count = levelCounts[level] ?? 0;
          const isActive = levelFilter === level;
          return (
            <button
              key={level}
              onClick={() => setLevelFilter(isActive ? "" : level)}
              className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-center transition-all duration-150 ${
                isActive
                  ? `${activeBg} ${activeBorder} shadow-sm`
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isActive ? activeBg : "bg-gray-100 group-hover:bg-gray-200"}`}>
                <Icon className={`h-4.5 w-4.5 ${isActive ? activeText : "text-gray-500"}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold leading-none ${isActive ? activeText : count > 0 ? "text-gray-900" : "text-gray-400"}`}>{count}</p>
                <p className={`text-xs mt-1 font-medium ${isActive ? activeText : "text-gray-500"}`}>{level}</p>
              </div>
              {isActive && <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full ${dotColor}`} />}
            </button>
          );
        })}
      </div>

      {/* ── Row 2: Metric cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Avg Progress */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Avg Progress</p>
            </div>
            <p className={`text-2xl font-bold ${avgProgress == null ? "text-gray-300" : "text-gray-900"}`}>
              {avgProgress != null ? `${avgProgress}%` : "—"}
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-2 rounded-full transition-all duration-700 ${progressColor}`} style={{ width: `${avgProgress ?? 0}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">{allKpis.length} KPI{allKpis.length !== 1 ? "s" : ""} tracked</p>
        </div>

        {/* Auto Rolled Up */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-xl bg-violet-100">
            <RefreshCw className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{rolledUpCount}</p>
            <p className="text-sm font-medium text-gray-600 mt-0.5">Auto Rolled Up</p>
            <p className="text-xs text-gray-400">progress from children</p>
          </div>
        </div>

        {/* Manual Overrides */}
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 flex items-center justify-center rounded-xl bg-amber-100">
            <PenLine className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{overriddenCount}</p>
            <p className="text-sm font-medium text-gray-600 mt-0.5">Manual Overrides</p>
            <p className="text-xs text-gray-400">set by managers</p>
          </div>
        </div>
      </div>

      {/* ── Cascade tree ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <GitBranch className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-semibold text-gray-800">KPI Cascade Hierarchy</p>
          {filtered.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{filtered.length} root</span>
          )}
          <div className="relative flex-1 max-w-sm ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search KPIs by title or category…"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white focus:border-primary transition-colors"
            />
          </div>
          {/* Roll-up legend */}
          <div className="hidden lg:flex items-center gap-2 ml-2 pl-3 border-l border-gray-100">
            {Object.entries(ROLLUP_LABEL).map(([k, label]) => (
              <span key={k} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLLUP_COLOR[k]}`}>{label}</span>
            ))}
            <span className="flex items-center gap-1 text-xs text-gray-400"><span className="inline-block h-2 w-3 rounded-full bg-amber-400" />Override</span>
            <span className="flex items-center gap-1 text-xs text-gray-400"><span className="inline-block h-2 w-3 rounded-full bg-violet-400" />Rollup</span>
          </div>
          {levelFilter && <button onClick={() => setLevelFilter("")} className="text-xs text-primary hover:underline shrink-0">Clear filter</button>}
          <button onClick={() => refetch()} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {isLoading && (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-3/5" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16">
              <GitBranch className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">
                {searchQuery ? "No KPIs match your search." : levelFilter ? `No ${levelFilter}-level KPIs found.` : "No KPIs found."}
              </p>
              <p className="text-xs text-gray-400 mt-1">Create KPIs with parent relationships to build the cascade hierarchy.</p>
            </div>
          )}
          {!isLoading && filtered.map((kpi: any) => (
            <CascadeNode key={kpi.id} kpi={kpi} depth={0} onSelect={setSelectedKpiId} canManage={canManage} />
          ))}
        </div>
      </div>

      {/* Detail drawer */}
      {selectedKpiId && <KpiDetailDrawer kpiId={selectedKpiId} onClose={() => setSelectedKpiId(null)} />}
    </div>
  );
}

// ─── Reports & Analytics Tab ──────────────────────────

function ReportsAnalyticsTab() {
  const effectiveRole = useEffectiveRole();
  const canExport = effectiveRole === "Admin" || effectiveRole === "SBUHead" || effectiveRole === "Finance" || effectiveRole === "Director";
  const { data: sbusData = [] } = useSbus();
  const { data: departmentsData = [] } = useDepartments();
  const { data: dashboard } = useKpiDashboard();
  const { data: okrDash } = useOkrDashboard();
  const { data: weeklySummary } = useKpiWeeklySummary();
  const { data: reviewCycles = [] } = useKpiReviewCycles();
  const downloadKpi = useDownloadKpiReport();
  const downloadOkr = useDownloadOkrReport();

  // §14 Standard report hooks
  const dlRegister = useDownloadKpiRegister();
  const dlProgress = useDownloadKpiProgressByDepartment();
  const dlIndividual = useDownloadIndividualKpiReport();
  const dlMonthly = useDownloadMonthlyReviewSummary();
  const dlQuarterly = useDownloadQuarterlyReviewAnalysis();
  const dlAnnual = useDownloadAnnualPerformanceSummary();
  const dlOverdue = useDownloadOverdueAtRiskReport();
  const dlShared = useDownloadSharedKpiContributions();
  const dlWeeklyWrap = useDownloadWeeklyWrapReport();

  const [kpiExportForm, setKpiExportForm] = useState({ format: "xlsx" as "csv" | "xlsx", sbuId: "", dateFrom: "", dateTo: "" });
  const [okrExportForm, setOkrExportForm] = useState({ format: "xlsx" as "csv" | "xlsx", dateFrom: "", dateTo: "" });

  // Shared filter state for standard reports
  const [stdFilters, setStdFilters] = useState({ format: "xlsx" as "csv" | "xlsx" | "pdf", sbuId: "", departmentId: "", reviewCycleId: "", dateFrom: "", dateTo: "" });

  const maxStatusCount = Math.max(...(dashboard?.byStatus ?? []).map((s) => s.count), 1);
  const maxCategoryCount = Math.max(...(dashboard?.byCategory ?? []).map((c) => c.count), 1);

  const CATEGORY_COLORS: Record<string, string> = {
    Strategic: "bg-violet-500", Operational: "bg-blue-500", Financial: "bg-emerald-500",
    Customer: "bg-orange-500", Compliance: "bg-red-500", People: "bg-pink-500", Innovation: "bg-indigo-500",
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KPI Status Breakdown */}
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm font-semibold text-gray-800">KPI Status Breakdown</p>
          </div>
          {(dashboard?.byStatus ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No KPI data available</p>
          ) : (
            <div className="space-y-3">
              {(dashboard?.byStatus ?? []).map((s) => {
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
            </div>
          )}
        </div>

        {/* KPI by Category */}
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            <p className="text-sm font-semibold text-gray-800">KPIs by Category</p>
          </div>
          {(dashboard?.byCategory ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No KPI data available</p>
          ) : (
            <div className="space-y-3">
              {(dashboard?.byCategory ?? []).map((c) => {
                const pct = Math.round((c.count / maxCategoryCount) * 100);
                const barColor = CATEGORY_COLORS[c.category] ?? "bg-gray-400";
                return (
                  <div key={c.category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                      <span className="text-xs font-semibold text-gray-700">{c.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-2 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* OKR Analytics (for admins) */}
      {okrDash?.orgStats && (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-violet-500" />
            <p className="text-sm font-semibold text-gray-800">OKR Organisation Analytics</p>
            {okrDash.activeCycle && (
              <span className="ml-auto text-xs font-medium text-violet-700 bg-violet-50 rounded-full px-2 py-0.5">{okrDash.activeCycle.name} · Active</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-center">
              <p className="text-2xl font-bold text-blue-700">{okrDash.orgStats.avgCompletion}%</p>
              <p className="text-xs text-gray-500 mt-0.5">Avg. Completion</p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Summary Analytics */}
      {weeklySummary && (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-orange-400" />
            <p className="text-sm font-semibold text-gray-800">This Week's Activity</p>
            <span className="ml-auto text-xs text-gray-400">Last 7 days</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl bg-blue-50 px-3 py-2.5 text-center">
              <p className="text-2xl font-bold text-blue-700">{weeklySummary.updatesThisWeek.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Updates</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center">
              <p className="text-2xl font-bold text-amber-600">{weeklySummary.atRiskCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">At Risk</p>
            </div>
            <div className="rounded-xl bg-red-50 px-3 py-2.5 text-center">
              <p className="text-2xl font-bold text-red-600">{weeklySummary.overdueCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Overdue</p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
              <p className="text-2xl font-bold text-emerald-700">{weeklySummary.recentlyCompleted}</p>
              <p className="text-xs text-gray-500 mt-0.5">Completed</p>
            </div>
          </div>
          {weeklySummary.updatesThisWeek.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Updates</p>
              {weeklySummary.updatesThisWeek.slice(0, 5).map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{u.kpi.title}</p>
                    <p className="text-xs text-gray-400">{u.employee.fullName} · {formatDate(u.submittedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.percentComplete != null && <span className="text-xs font-semibold text-gray-600">{u.percentComplete}%</span>}
                    {u.blockerFlag && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Cycles Summary */}
      {reviewCycles.length > 0 && (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-teal-500" />
            <p className="text-sm font-semibold text-gray-800">Review Cycles</p>
          </div>
          <div className="divide-y divide-gray-50">
            {reviewCycles.slice(0, 5).map((cycle: any) => (
              <div key={cycle.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">{cycle.name}</p>
                  <p className="text-xs text-gray-400">{cycle.cycleType} · {formatDate(cycle.startDate)} → {formatDate(cycle.endDate)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{cycle._count?.reviews ?? 0} reviews</span>
                  {cycle.signoffRequired && <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">Signoff Required</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* §14 Standard KPI Reports */}
      {canExport && (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-sm font-semibold text-gray-800">Standard KPI Reports</p>
            <span className="ml-auto text-xs text-gray-400">Supports PDF, Excel, CSV</span>
          </div>
          {/* Shared filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Format</label>
              <select value={stdFilters.format} onChange={(e) => setStdFilters((f) => ({ ...f, format: e.target.value as any }))} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="xlsx">Excel</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">SBU</label>
              <select value={stdFilters.sbuId} onChange={(e) => setStdFilters((f) => ({ ...f, sbuId: e.target.value }))} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">All SBUs</option>
                {sbusData.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Department</label>
              <select value={stdFilters.departmentId} onChange={(e) => setStdFilters((f) => ({ ...f, departmentId: e.target.value }))} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">All Departments</option>
                {(departmentsData as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Review Cycle</label>
              <select value={stdFilters.reviewCycleId} onChange={(e) => setStdFilters((f) => ({ ...f, reviewCycleId: e.target.value }))} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">All Cycles</option>
                {(reviewCycles as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" value={stdFilters.dateFrom} onChange={(e) => setStdFilters((f) => ({ ...f, dateFrom: e.target.value }))} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" value={stdFilters.dateTo} onChange={(e) => setStdFilters((f) => ({ ...f, dateTo: e.target.value }))} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          {/* Report cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "KPI Register by SBU", desc: "Full KPI list with status & assignees", hook: dlRegister, color: "bg-indigo-50 text-indigo-600" },
              { label: "Progress by Department", desc: "Aggregated on-track/at-risk counts", hook: dlProgress, color: "bg-blue-50 text-blue-600" },
              { label: "Individual KPI Performance", desc: "Per-employee KPI breakdown", hook: dlIndividual, color: "bg-cyan-50 text-cyan-600" },
              { label: "Monthly Review Summary", desc: "Monthly cycle ratings overview", hook: dlMonthly, color: "bg-teal-50 text-teal-600" },
              { label: "Quarterly Review Analysis", desc: "Behavioral scores + strengths", hook: dlQuarterly, color: "bg-emerald-50 text-emerald-600" },
              { label: "Annual Performance Summary", desc: "Yearly self/manager/final ratings", hook: dlAnnual, color: "bg-green-50 text-green-600" },
              { label: "Overdue & At-Risk KPIs", desc: "KPIs needing urgent attention", hook: dlOverdue, color: "bg-red-50 text-red-600" },
              { label: "Shared KPI Contributions", desc: "Multi-assignee KPI breakdown", hook: dlShared, color: "bg-orange-50 text-orange-600" },
              { label: "Weekly Wrap Report", desc: "Last 7 days of updates & blockers", hook: dlWeeklyWrap, color: "bg-amber-50 text-amber-600" },
            ].map(({ label, desc, hook, color }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => hook.mutate({ format: stdFilters.format, sbuId: stdFilters.sbuId || undefined, departmentId: stdFilters.departmentId || undefined, reviewCycleId: stdFilters.reviewCycleId || undefined, dateFrom: stdFilters.dateFrom || undefined, dateTo: stdFilters.dateTo || undefined })}
                  disabled={hook.isPending}
                  className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${color} hover:opacity-80 disabled:opacity-50 transition-opacity`}
                >
                  {hook.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Export
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Reports */}
      {canExport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* KPI Export */}
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">KPI Performance Report</p>
                <p className="text-xs text-gray-400">Export all KPI data with progress</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">SBU</label>
                  <select value={kpiExportForm.sbuId} onChange={(e) => setKpiExportForm((f) => ({ ...f, sbuId: e.target.value }))} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">All SBUs</option>
                    {sbusData.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Format</label>
                  <select value={kpiExportForm.format} onChange={(e) => setKpiExportForm((f) => ({ ...f, format: e.target.value as "csv" | "xlsx" }))} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From Date</label>
                  <input type="date" value={kpiExportForm.dateFrom} onChange={(e) => setKpiExportForm((f) => ({ ...f, dateFrom: e.target.value }))} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To Date</label>
                  <input type="date" value={kpiExportForm.dateTo} onChange={(e) => setKpiExportForm((f) => ({ ...f, dateTo: e.target.value }))} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <Button className="w-full" disabled={downloadKpi.isPending} onClick={() => downloadKpi.mutate({ format: kpiExportForm.format, sbuId: kpiExportForm.sbuId || undefined, dateFrom: kpiExportForm.dateFrom || undefined, dateTo: kpiExportForm.dateTo || undefined })}>
                {downloadKpi.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {downloadKpi.isPending ? "Exporting..." : "Export KPI Report"}
              </Button>
            </div>
          </div>

          {/* OKR Export */}
          <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <Zap className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">OKR Performance Report</p>
                <p className="text-xs text-gray-400">Export objectives & key results data</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Format</label>
                <select value={okrExportForm.format} onChange={(e) => setOkrExportForm((f) => ({ ...f, format: e.target.value as "csv" | "xlsx" }))} className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From Date</label>
                  <input type="date" value={okrExportForm.dateFrom} onChange={(e) => setOkrExportForm((f) => ({ ...f, dateFrom: e.target.value }))} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To Date</label>
                  <input type="date" value={okrExportForm.dateTo} onChange={(e) => setOkrExportForm((f) => ({ ...f, dateTo: e.target.value }))} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <Button className="w-full" variant="secondary" disabled={downloadOkr.isPending} onClick={() => downloadOkr.mutate({ format: okrExportForm.format, dateFrom: okrExportForm.dateFrom || undefined, dateTo: okrExportForm.dateTo || undefined })}>
                {downloadOkr.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {downloadOkr.isPending ? "Exporting..." : "Export OKR Report"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── §25 KPI Dictionary Tab ───────────────────────────

function KpiDictionaryTab({ canManage }: { canManage: boolean }) {
  const [filters, setFilters] = useState<KpiFilters>({ page: 1, limit: 50 });
  const [search, setSearch] = useState("");
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null);
  const { data: kpisResult, isLoading } = useKpis(filters);
  const kpis = (kpisResult?.data ?? []) as Kpi[];

  const filtered = search
    ? kpis.filter((k) => k.title.toLowerCase().includes(search.toLowerCase()) || k.category?.toLowerCase().includes(search.toLowerCase()) || k.businessObjective?.toLowerCase().includes(search.toLowerCase()))
    : kpis;

  const definedCount = kpis.filter((k) => k.businessObjective || k.calculationFormula || k.dataSource || k.reviewerId).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">KPI Dictionary</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Standardised definitions ensuring consistency across SBUs — {definedCount} of {kpis.length} KPIs fully defined.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search KPI dictionary..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-56" />
          </div>
          <Select placeholder="All Categories" options={[{ label: "All Categories", value: "" }, ...Object.entries(CATEGORY_LABELS).map(([v, label]) => ({ label, value: v }))]} value={filters.category ?? ""} onChange={(e) => setFilters((f) => ({ ...f, category: (e.target.value as any) || undefined, page: 1 }))} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <FileEdit className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No KPIs found</p>
          <p className="text-xs text-gray-400 mt-1">{canManage ? "Create KPIs and fill in the definition fields." : "No KPIs match your search."}</p>
        </CardContent></Card>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["KPI Name", "Category", "Level", "Owner / Reviewer", "Formula", "Data Source", "Definition"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((kpi) => {
                const fullyDefined = !!(kpi.businessObjective && kpi.calculationFormula && kpi.dataSource && kpi.reviewerId);
                return (
                  <tr key={kpi.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedKpi(kpi)}>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${fullyDefined ? "bg-emerald-400" : "bg-amber-400"}`} title={fullyDefined ? "Fully defined" : "Incomplete definition"} />
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-2">{kpi.title}</p>
                          {kpi.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{kpi.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-600 bg-gray-100 rounded-md px-2 py-0.5">{CATEGORY_LABELS[kpi.category] ?? kpi.category}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[kpi.kpiLevel] ?? "bg-gray-100 text-gray-600"}`}>{kpi.kpiLevel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {kpi.createdBy && <p className="text-xs text-gray-600"><span className="text-gray-400">Owner:</span> {kpi.createdBy.fullName}</p>}
                        {kpi.reviewer ? (
                          <p className="text-xs text-violet-700"><span className="text-gray-400">Reviewer:</span> {kpi.reviewer.fullName}</p>
                        ) : (
                          <p className="text-xs text-amber-600 italic">No reviewer set</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-48">
                      {kpi.calculationFormula ? (
                        <p className="text-xs text-gray-700 line-clamp-2 font-mono bg-gray-50 rounded px-1.5 py-0.5">{kpi.calculationFormula}</p>
                      ) : (
                        <span className="text-xs text-gray-300 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {kpi.dataSource ? (
                        <span className="text-xs text-gray-600 bg-blue-50 text-blue-700 rounded px-2 py-0.5">{kpi.dataSource}</span>
                      ) : (
                        <span className="text-xs text-gray-300 italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${fullyDefined ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {fullyDefined ? <><CheckCircle2 className="h-3 w-3" /> Complete</> : <><AlertTriangle className="h-3 w-3" /> Incomplete</>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* KPI Definition Detail Modal */}
      {selectedKpi && (
        <Modal isOpen onClose={() => setSelectedKpi(null)} title="KPI Definition" size="lg">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-gray-900 text-base">{selectedKpi.title}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLORS[selectedKpi.kpiLevel] ?? "bg-gray-100 text-gray-600"}`}>{selectedKpi.kpiLevel}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">{CATEGORY_LABELS[selectedKpi.category] ?? selectedKpi.category}</span>
                  <span className="text-xs text-gray-400">{selectedKpi.timeHorizon}</span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CONFIG[selectedKpi.status]?.bg ?? "bg-gray-100"} ${STATUS_CONFIG[selectedKpi.status]?.text ?? "text-gray-600"}`}>
                {STATUS_CONFIG[selectedKpi.status]?.label ?? selectedKpi.status}
              </span>
            </div>

            {/* §25 Template fields */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: "Business Objective", value: selectedKpi.businessObjective, full: true },
                { label: "Calculation Formula", value: selectedKpi.calculationFormula, mono: true, full: true },
                { label: "Data Source", value: selectedKpi.dataSource },
                { label: "Update Frequency", value: FREQUENCY_LABELS[selectedKpi.updateFrequency] ?? selectedKpi.updateFrequency },
                { label: "Target", value: selectedKpi.targetValue != null ? `${selectedKpi.targetValue}${selectedKpi.unit ? ` ${selectedKpi.unit}` : ""}` : selectedKpi.targetType },
                { label: "Review Frequency", value: selectedKpi.timeHorizon },
                { label: "Owner", value: selectedKpi.createdBy?.fullName },
                { label: "Reviewer", value: selectedKpi.reviewer?.fullName ?? "—" },
                { label: "SBU", value: selectedKpi.sbu?.name ?? "—" },
                { label: "Department", value: selectedKpi.department?.name ?? "—" },
                { label: "Evidence Required", value: selectedKpi.evidenceRequired ? "Yes" : "No" },
                { label: "Roll-up Method", value: selectedKpi.rollupMethod },
              ].map(({ label, value, full, mono }) => (value ? (
                <div key={label} className={full ? "sm:col-span-2" : ""}>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                  <p className={`text-sm text-gray-800 ${mono ? "font-mono bg-gray-50 rounded px-2 py-1" : ""}`}>{value}</p>
                </div>
              ) : null))}
            </div>

            {selectedKpi.description && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-0.5">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedKpi.description}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              {canManage && (
                <button onClick={() => setSelectedKpi(null)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Edit KPI
                </button>
              )}
              <button onClick={() => setSelectedKpi(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────

export default function KpiPage() {
  const { user } = useAuth();
  const effectiveRole = useEffectiveRole();
  const isAdmin    = effectiveRole === "Admin";
  const isSBUHead  = effectiveRole === "SBUHead";
  const isDirector = effectiveRole === "Director";
  const isManager  = effectiveRole === "Manager";
  const isFinance  = effectiveRole === "Finance";
  // canManage: can create / edit KPIs (VP/Executive, Director, System Admin)
  const canManage  = isAdmin || isSBUHead || isDirector;
  // canAssign: can assign KPIs to people (adds Manager)
  const canAssign  = canManage || isManager;
  // canReview: can submit manager ratings
  const canReview  = canAssign;
  // isHR: sees org-wide HR review panel and exports
  const isHR       = isAdmin || isFinance;
  // canExport: can download reports
  const canExport  = isAdmin || isSBUHead || isFinance || isDirector;

  const pathname = usePathname();

  // Derive active section from URL path — each sub-page navigates to its own route
  const activeTab = (() => {
    if (pathname.startsWith("/kpi/list"))        return "kpis";
    if (pathname.startsWith("/kpi/my-okrs"))     return "my-okrs";
    if (pathname.startsWith("/kpi/team-okrs"))   return "team-okrs";
    if (pathname.startsWith("/kpi/cascade"))     return "cascade";
    if (pathname.startsWith("/kpi/cycles"))      return "cycles";
    if (pathname.startsWith("/kpi/hr-review"))   return "hr-review";
    if (pathname.startsWith("/kpi/reports"))     return "reports";
    if (pathname.startsWith("/kpi/dictionary"))  return "dictionary";
    return "dashboard";
  })();

  const PAGE_TITLES: Record<string, string> = {
    dashboard:   "Dashboard",
    kpis:        "KPI List",
    "my-okrs":   "My OKRs",
    "team-okrs": "Team OKRs",
    cascade:     "Cascade View",
    cycles:      "Cycles",
    "hr-review": "HR Review",
    reports:     "Reports & Analytics",
    dictionary:  "KPI Dictionary",
  };

  return (
    <AppLayout pageTitle={`KPI & Performance — ${PAGE_TITLES[activeTab] ?? "Dashboard"}`}>
      <div className="space-y-6">
        {activeTab === "dashboard" && <KpiDashboardView />}
        {activeTab === "kpis" && <KpiListTab canManage={canManage} canAssign={canAssign} isAdmin={isAdmin} employeeId={user?.employeeId ?? ""} />}
        {activeTab === "my-okrs" && <MyOkrsTab employeeId={user?.employeeId ?? ""} canManage={true} />}
        {activeTab === "team-okrs" && <TeamOkrsTab />}
        {activeTab === "cycles" && (canManage || isManager) && <CyclesTab />}
        {activeTab === "hr-review" && isHR && <HrKpiTab />}
        {activeTab === "cascade" && <CascadeTab />}
        {activeTab === "reports" && <ReportsAnalyticsTab />}
        {activeTab === "dictionary" && <KpiDictionaryTab canManage={canManage} />}
      </div>
    </AppLayout>
  );
}
