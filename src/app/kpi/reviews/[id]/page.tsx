"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Printer, Star, CheckCircle2, Clock, AlertTriangle,
  TrendingDown, TrendingUp, XCircle, Award, FileText, User, Building2,
  CalendarDays, BadgeCheck,
} from "lucide-react";
import api from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading";
import { useAuth, useEffectiveRole } from "@/hooks";
import { formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────

interface ReviewDetail {
  id: string;
  reviewCycleId: string;
  kpiId: string;
  employeeId: string;
  managerId: string | null;
  selfRating: number | null;
  managerRating: number | null;
  behavioralScore: number | null;
  finalRating: number | null;
  reviewComment: string | null;
  strengths: string | null;
  improvementAreas: string | null;
  developmentActions: string | null;
  calibrationNote: string | null;
  signoffStatus: string;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
  // joined
  employee?: { id: string; fullName: string; jobTitle: string | null; sbu?: { name: string } | null; department?: { name: string } | null };
  manager?: { id: string; fullName: string; jobTitle: string | null } | null;
  reviewCycle?: { id: string; name: string; cycleType: string; startDate: string; endDate: string };
  kpi?: {
    id: string; title: string; kpiLevel: string; kpiCategory: string;
    targetValue: number | null; unit: string | null; targetType: string; status: string;
    updates?: Array<{ actualValue: number | null; percentComplete: number | null; narrative: string | null; submittedAt: string }>;
    reviews?: Array<{ selfRating: number | null; reviewComment: string | null; managerId: string | null; managerRating: number | null }>;
  };
}

// ─── Helpers ──────────────────────────────────────────────

const SIGNOFF_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  PendingSignoff: { label: "Pending Sign-off", bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
  SignedOff:      { label: "Signed Off",        bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
  Calibrated:     { label: "Calibrated",         bg: "bg-blue-100",  text: "text-blue-700",   icon: Award },
  Rejected:       { label: "Rejected",           bg: "bg-red-100",   text: "text-red-600",    icon: XCircle },
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  NotStarted:  { label: "Not Started", bg: "bg-gray-100",    text: "text-gray-600" },
  InProgress:  { label: "In Progress", bg: "bg-blue-100",    text: "text-blue-700" },
  OnTrack:     { label: "On Track",    bg: "bg-emerald-100", text: "text-emerald-700" },
  AtRisk:      { label: "At Risk",     bg: "bg-amber-100",   text: "text-amber-700" },
  OffTrack:    { label: "Off Track",   bg: "bg-red-100",     text: "text-red-700" },
  Completed:   { label: "Completed",   bg: "bg-green-100",   text: "text-green-700" },
  Overdue:     { label: "Overdue",     bg: "bg-red-100",     text: "text-red-800" },
  OnHold:      { label: "On Hold",     bg: "bg-purple-100",  text: "text-purple-700" },
  Cancelled:   { label: "Cancelled",   bg: "bg-gray-100",    text: "text-gray-500" },
};

const LEVEL_COLORS: Record<string, string> = {
  Company:    "bg-indigo-100 text-indigo-700",
  SBU:        "bg-blue-100 text-blue-700",
  Department: "bg-cyan-100 text-cyan-700",
  Team:       "bg-teal-100 text-teal-700",
  Individual: "bg-orange-100 text-orange-700",
};

const CYCLE_TYPE_COLORS: Record<string, string> = {
  Monthly:   "bg-blue-100 text-blue-700",
  Quarterly: "bg-violet-100 text-violet-700",
  Annual:    "bg-indigo-100 text-indigo-700",
};

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function ratingColor(rating: number | null): string {
  if (rating == null) return "text-gray-400";
  if (rating >= 4) return "text-emerald-600";
  if (rating >= 3) return "text-blue-600";
  if (rating >= 2) return "text-amber-600";
  return "text-red-600";
}

function ratingBg(rating: number | null): string {
  if (rating == null) return "bg-gray-50";
  if (rating >= 4) return "bg-emerald-50";
  if (rating >= 3) return "bg-blue-50";
  if (rating >= 2) return "bg-amber-50";
  return "bg-red-50";
}

function ratingLabel(rating: number | null): string {
  if (rating == null) return "—";
  if (rating >= 4.5) return "Outstanding";
  if (rating >= 3.5) return "Exceeds Expectations";
  if (rating >= 2.5) return "Meets Expectations";
  if (rating >= 1.5) return "Needs Improvement";
  return "Unsatisfactory";
}

function StarRating({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-sm text-gray-400">Not rated</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-4 w-4", i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-200")}
        />
      ))}
      <span className="ml-1.5 text-sm font-semibold text-gray-700">{Number(value).toFixed(1)}</span>
    </div>
  );
}

function ProgressBar({ value }: { value: number | null }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-10 text-right">{value != null ? `${Math.round(pct)}%` : "—"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────

export default function ReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const reviewId = params.id;
  const queryClient = useQueryClient();
  const effectiveRole = useEffectiveRole();
  const { profile } = useAuth();

  const canSignOff = effectiveRole === "Admin" || effectiveRole === "SBUHead" || effectiveRole === "Finance";

  const { data: review, isLoading } = useQuery<ReviewDetail | null>({
    queryKey: ["kpi-review-detail", reviewId],
    queryFn: async () => {
      // Fetch the review with full relations
      const res = await api.get<ReviewDetail[]>("/kpi-reviews", {
        params: { id: reviewId, limit: 1 },
      });
      return res.data?.[0] ?? null;
    },
    enabled: !!reviewId,
  });

  const signOffMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ReviewDetail>(`/kpi-reviews/${reviewId}/approve`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Review signed off successfully.");
      queryClient.invalidateQueries({ queryKey: ["kpi-review-detail", reviewId] });
      queryClient.invalidateQueries({ queryKey: ["kpi-reviews"] });
    },
    onError: () => toast.error("Failed to sign off review."),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!review) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">Review Not Found</h2>
          <p className="text-sm text-gray-500 mt-1">This review may have been deleted or you don&apos;t have access.</p>
          <Button className="mt-6" variant="secondary" onClick={() => router.push("/kpi")}>
            <ArrowLeft className="h-4 w-4" /> Back to KPI
          </Button>
        </div>
      </AppLayout>
    );
  }

  const signoffCfg = SIGNOFF_CONFIG[review.signoffStatus] ?? SIGNOFF_CONFIG["PendingSignoff"];
  const SignoffIcon = signoffCfg.icon;
  const kpi = review.kpi;
  const latestUpdate = kpi?.updates?.[0];
  const emp = review.employee;
  const mgr = review.manager;
  const cycle = review.reviewCycle;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 print:py-4 print:px-0">

        {/* Nav */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        {/* ── §20 Review Header ────────────────────────────── */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
          {/* Top accent strip */}
          <div className="h-1.5 bg-gradient-to-r from-primary-500 to-primary-400" />
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-800 text-lg font-bold">
                {emp ? getInitials(emp.fullName) : "?"}
              </div>
              {/* Employee info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900">{emp?.fullName ?? "—"}</h1>
                {emp?.jobTitle && <p className="text-sm text-gray-500 mt-0.5">{emp.jobTitle}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {emp?.sbu && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Building2 className="h-3.5 w-3.5" />
                      {emp.sbu.name}
                    </span>
                  )}
                  {emp?.department && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Building2 className="h-3.5 w-3.5" />
                      {emp.department.name}
                    </span>
                  )}
                  {mgr && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <User className="h-3.5 w-3.5" />
                      {mgr.fullName}
                    </span>
                  )}
                </div>
              </div>
              {/* Status */}
              <div className="shrink-0 flex flex-col items-end gap-2">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", signoffCfg.bg, signoffCfg.text)}>
                  <SignoffIcon className="h-3.5 w-3.5" />
                  {signoffCfg.label}
                </span>
                {cycle && (
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", CYCLE_TYPE_COLORS[cycle.cycleType] ?? "bg-gray-100 text-gray-600")}>
                    <CalendarDays className="h-3 w-3" />
                    {cycle.name}
                  </span>
                )}
              </div>
            </div>

            {/* Cycle dates */}
            {cycle && (
              <div className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Cycle Type</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{cycle.cycleType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Period</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Review Status</p>
                  <p className={cn("text-sm font-semibold mt-0.5", signoffCfg.text)}>{signoffCfg.label}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── §20 KPI Section ──────────────────────────────── */}
        {kpi && (
          <div className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary-500" />
              <h2 className="text-sm font-semibold text-gray-800">KPI Performance</h2>
              <span className={cn("ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", LEVEL_COLORS[kpi.kpiLevel] ?? "bg-gray-100 text-gray-600")}>
                {kpi.kpiLevel}
              </span>
            </div>
            <div className="p-6 space-y-5">
              {/* KPI title + status */}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">{kpi.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{kpi.kpiCategory} · {kpi.targetType}</p>
                </div>
                {kpi.status && (
                  <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold", STATUS_CFG[kpi.status]?.bg, STATUS_CFG[kpi.status]?.text)}>
                    {STATUS_CFG[kpi.status]?.label ?? kpi.status}
                  </span>
                )}
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Target</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">
                    {kpi.targetValue != null ? `${kpi.targetValue}${kpi.unit ? ` ${kpi.unit}` : ""}` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Actual</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">
                    {latestUpdate?.actualValue != null ? `${latestUpdate.actualValue}${kpi.unit ? ` ${kpi.unit}` : ""}` : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Completion</p>
                  <div className="mt-2">
                    <ProgressBar value={latestUpdate?.percentComplete != null ? Number(latestUpdate.percentComplete) : null} />
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Last Update</p>
                  <p className="text-sm font-semibold text-gray-700 mt-1">
                    {latestUpdate ? formatDate(latestUpdate.submittedAt) : "—"}
                  </p>
                </div>
              </div>

              {/* Ratings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Self Rating</p>
                  <StarRating value={review.selfRating} />
                  {latestUpdate?.narrative && (
                    <p className="mt-2 text-xs text-gray-600 italic">&ldquo;{latestUpdate.narrative}&rdquo;</p>
                  )}
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Manager Rating</p>
                  <StarRating value={review.managerRating} />
                  {review.reviewComment && (
                    <p className="mt-2 text-xs text-gray-600 italic">&ldquo;{review.reviewComment}&rdquo;</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── §20 Overall Assessment ───────────────────────── */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-800">Overall Assessment</h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Strengths */}
            {review.strengths && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Strengths</p>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  {review.strengths}
                </div>
              </div>
            )}
            {/* Areas for improvement */}
            {review.improvementAreas && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Areas for Improvement</p>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  {review.improvementAreas}
                </div>
              </div>
            )}
            {/* Development actions */}
            {review.developmentActions && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Development Action Items</p>
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  {review.developmentActions}
                </div>
              </div>
            )}
            {/* Calibration note */}
            {review.calibrationNote && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Calibration Note</p>
                <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-gray-700 leading-relaxed">
                  {review.calibrationNote}
                </div>
              </div>
            )}

            {/* Final Rating + Sign-off */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 border-t border-gray-100">
              {/* Final Rating */}
              <div className={cn("flex items-center gap-4 flex-1 rounded-2xl p-4", ratingBg(review.finalRating))}>
                <div className={cn("flex items-center justify-center h-16 w-16 rounded-2xl text-2xl font-black", ratingColor(review.finalRating))}>
                  {review.finalRating != null ? Number(review.finalRating).toFixed(1) : "—"}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Final Rating</p>
                  <p className={cn("text-base font-bold mt-0.5", ratingColor(review.finalRating))}>
                    {ratingLabel(review.finalRating)}
                  </p>
                  <StarRating value={review.finalRating} />
                </div>
              </div>

              {/* Sign-off */}
              <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold", signoffCfg.bg, signoffCfg.text)}>
                  <SignoffIcon className="h-4 w-4" />
                  {signoffCfg.label}
                </span>
                {canSignOff && review.signoffStatus === "PendingSignoff" && (
                  <Button
                    onClick={() => signOffMutation.mutate()}
                    disabled={signOffMutation.isPending}
                    className="gap-1.5"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    {signOffMutation.isPending ? "Signing off…" : "Sign Off Review"}
                  </Button>
                )}
                {review.signoffStatus === "SignedOff" && (
                  <p className="text-xs text-gray-400">Signed off on {formatDate(review.updatedAt)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Print footer */}
        <div className="hidden print:flex items-center justify-between text-xs text-gray-400 border-t pt-4">
          <span>ThelixHRIS — KPI Performance Review</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>

      </div>
    </AppLayout>
  );
}
