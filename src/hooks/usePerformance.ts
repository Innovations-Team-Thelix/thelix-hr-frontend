"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────

export interface CompetencyDimension {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  sortOrder: number;
}

export interface CompetencyFramework {
  id: string;
  name: string;
  description: string | null;
  jobTitles: string[];
  dimensions: CompetencyDimension[];
  createdAt: string;
}

export interface ReviewCycle360 {
  id: string;
  name: string;
  phase: "Draft" | "Kickoff" | "PeerSelection" | "Assessments" | "ManagerReview" | "Conversation" | "Closed";
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  kickoffDate: string | null;
  peerSelectionDeadline: string | null;
  assessmentDeadline: string | null;
  managerReviewDeadline: string | null;
  conversationDeadline: string | null;
  minPeerNominations: number;
  maxPeerNominations: number;
  maxReviewsPerPerson: number;
  peerFeedbackAnonymous: boolean;
  upwardReviewMandatory: boolean;
  frameworkId: string | null;
  framework: CompetencyFramework | null;
  createdBy: { id: string; fullName: string };
  participants?: Array<{ employeeId: string; employee: { id: string; fullName: string; jobTitle: string } }>;
  _count: { participants: number; assessments: number };
}

export type NominationStatus = "PendingNomination" | "Nominated" | "Approved" | "Rejected" | "Expired";
export type AssessmentType = "Self" | "Peer" | "Upward" | "Manager";

export interface PeerNomination {
  id: string;
  cycleId: string;
  employeeId: string;
  nominatedPeerIds: string[];
  status: NominationStatus;
  managerNote: string | null;
  submittedAt: string | null;
}

export interface AssessmentQuestion {
  id: string;
  questionText: string;
  isOpenText: boolean;
  type: AssessmentType;
  dimension: { id: string; name: string } | null;
}

export interface AssessmentResponse {
  id: string;
  questionId: string;
  ratingValue: number | null;
  textValue: string | null;
  question: AssessmentQuestion;
}

export interface Assessment360 {
  id: string;
  cycleId: string;
  assessorId: string;
  subjectId: string;
  type: AssessmentType;
  isDraft: boolean;
  submittedAt: string | null;
  lastSavedAt: string;
  subject?: { id: string; fullName: string; jobTitle: string };
  assessor?: { id: string; fullName: string };
  responses: AssessmentResponse[];
}

export interface ConversationNote {
  id: string;
  cycleId: string;
  managerId: string;
  employeeId: string;
  body: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PraiseEntry {
  id: string;
  giverId: string;
  recipientId: string;
  message: string;
  valueTag: string | null;
  slackPosted: boolean;
  reactions: Record<string, string[]>;
  createdAt: string;
  giver: { id: string; fullName: string };
  recipient: { id: string; fullName: string };
}

export interface PrivateFeedback {
  id: string;
  senderId: string;
  recipientId: string;
  type: "Request" | "Proactive";
  context: string | null;
  message: string | null;
  requestNote: string | null;
  isRead: boolean;
  respondedAt: string | null;
  createdAt: string;
  sender?: { id: string; fullName: string };
  recipient?: { id: string; fullName: string };
}

export interface EmployeeNote {
  id: string;
  employeeId: string;
  body: string;
  sharedWithManagerAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompetencyScore {
  dimension: string;
  score: number;
}

export interface KpiProgressItem {
  kpiId: string;
  title: string;
  category: string;
  unit: string;
  targetValue: number;
  computedProgress: number;
  status: string;
  startDate: string;
  endDate: string;
}

export interface KpiRating {
  finalRating: number;
  managerRating: number;
  selfRating: number;
  behavioralScore: number;
  cycleName: string | null;
  reviewedAt: string;
}

export interface PerformanceDashboard {
  radarData: CompetencyScore[];
  goalSnapshot: { cycle: { id: string; name: string } | null; objectives: any[] };
  recentPraise: PraiseEntry[];
  recentNotes: EmployeeNote[];
  activeCycles: Pick<ReviewCycle360, "id" | "name" | "phase" | "assessmentDeadline" | "peerSelectionDeadline">[];
  kpiProgress: KpiProgressItem[];
  kpiRating: KpiRating | null;
}

export interface CycleProgress {
  cycle: { id: string; name: string; phase: string };
  totalParticipants: number;
  peerSelection: { submitted: number; approved: number; pct: number };
  assessments: { self: number; peer: number; upward: number; manager: number; selfPct: number; managerPct: number };
  participants: Array<{
    employee: { id: string; fullName: string; jobTitle: string; departmentId: string };
    nominationStatus: NominationStatus;
    selfAssessmentDone: boolean;
    managerReviewDone: boolean;
  }>;
}

// ─── Helpers ──────────────────────────────────────────

function buildParams(obj: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = String(value);
    }
  }
  return params;
}

// ─── Competency Frameworks ────────────────────────────

export function useCompetencyFrameworks() {
  return useQuery<CompetencyFramework[]>({
    queryKey: ["performance-frameworks"],
    queryFn: async () => {
      const res = await api.get("/performance/frameworks");
      return res.data as CompetencyFramework[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCompetencyFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      jobTitles: string[];
      dimensions: Array<{ name: string; description?: string; weight?: number; sortOrder?: number }>;
    }) => {
      const res = await api.post("/performance/frameworks", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance-frameworks"] }),
  });
}

// ─── Assessment Questions ─────────────────────────────

export function useAssessmentQuestions(frameworkId?: string, type?: AssessmentType) {
  return useQuery<AssessmentQuestion[]>({
    queryKey: ["performance-questions", frameworkId, type],
    queryFn: async () => {
      const params = buildParams({
        ...(frameworkId ? { frameworkId } : {}),
        ...(type ? { type } : {}),
      });
      const res = await api.get("/performance/questions", { params });
      return res.data as AssessmentQuestion[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAssessmentQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      dimensionId?: string;
      type: AssessmentType;
      questionText: string;
      isOpenText?: boolean;
      sortOrder?: number;
    }) => {
      const res = await api.post("/performance/questions", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance-questions"] }),
  });
}

// ─── Review Cycles 360 ───────────────────────────────

export function usePerformanceCycles() {
  return useQuery<ReviewCycle360[]>({
    queryKey: ["performance-cycles"],
    queryFn: async () => {
      const res = await api.get("/performance/cycles");
      return res.data as ReviewCycle360[];
    },
    staleTime: 60 * 1000,
  });
}

export function usePerformanceCycle(id?: string) {
  return useQuery<ReviewCycle360>({
    queryKey: ["performance-cycle", id],
    queryFn: async () => {
      const res = await api.get(`/performance/cycles/${id}`);
      return res.data as ReviewCycle360;
    },
    enabled: !!id,
  });
}

export function useCreatePerformanceCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ReviewCycle360> & { participantIds?: string[] }) => {
      const res = await api.post("/performance/cycles", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance-cycles"] }),
  });
}

export function useUpdatePerformanceCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReviewCycle360> }) => {
      const res = await api.put(`/performance/cycles/${id}`, data);
      return res.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["performance-cycles"] });
      qc.invalidateQueries({ queryKey: ["performance-cycle", v.id] });
    },
  });
}

export function useAdvanceCyclePhase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cycleId: string) => {
      const res = await api.post(`/performance/cycles/${cycleId}/advance`);
      return res.data;
    },
    onSuccess: (_d, cycleId) => {
      qc.invalidateQueries({ queryKey: ["performance-cycles"] });
      qc.invalidateQueries({ queryKey: ["performance-cycle", cycleId] });
      qc.invalidateQueries({ queryKey: ["performance-cycle-progress", cycleId] });
    },
  });
}

export function useAddCycleParticipants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cycleId, employeeIds }: { cycleId: string; employeeIds: string[] }) => {
      const res = await api.post(`/performance/cycles/${cycleId}/participants`, { employeeIds });
      return res.data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["performance-cycle", v.cycleId] }),
  });
}

export function useCycleProgress(cycleId?: string) {
  return useQuery<CycleProgress>({
    queryKey: ["performance-cycle-progress", cycleId],
    queryFn: async () => {
      const res = await api.get(`/performance/cycles/${cycleId}/progress`);
      return res.data as CycleProgress;
    },
    enabled: !!cycleId,
    refetchInterval: 60 * 1000,
  });
}

// ─── Peer Nominations ─────────────────────────────────

export function useMyNominations(cycleId?: string) {
  return useQuery<PeerNomination | null>({
    queryKey: ["my-nominations", cycleId],
    queryFn: async () => {
      const res = await api.get(`/performance/nominations/${cycleId}/me`);
      return res.data as PeerNomination | null;
    },
    enabled: !!cycleId,
  });
}

export function usePendingNominationApprovals(cycleId?: string) {
  return useQuery({
    queryKey: ["pending-nominations", cycleId],
    queryFn: async () => {
      const params = buildParams({ ...(cycleId ? { cycleId } : {}) });
      const res = await api.get("/performance/nominations/pending", { params });
      return res.data as any[];
    },
    staleTime: 30 * 1000,
  });
}

export function useSubmitNominations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { cycleId: string; nominatedPeerIds: string[] }) => {
      const res = await api.post("/performance/nominations", data);
      return res.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["my-nominations", v.cycleId] });
      qc.invalidateQueries({ queryKey: ["pending-nominations"] });
    },
  });
}

export function useApproveNomination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cycleId, nomineeId, finalPeerIds }: { cycleId: string; nomineeId: string; finalPeerIds?: string[] }) => {
      const res = await api.post(`/performance/nominations/${cycleId}/${nomineeId}/approve`, { finalPeerIds });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-nominations"] }),
  });
}

export function useRejectNomination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cycleId, nomineeId, managerNote }: { cycleId: string; nomineeId: string; managerNote: string }) => {
      const res = await api.post(`/performance/nominations/${cycleId}/${nomineeId}/reject`, { managerNote });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending-nominations"] }),
  });
}

// ─── Assessments ──────────────────────────────────────

export function useMyAssessments(cycleId?: string) {
  return useQuery<Assessment360[]>({
    queryKey: ["my-assessments", cycleId],
    queryFn: async () => {
      const res = await api.get(`/performance/assessments/${cycleId}/me`);
      return res.data as Assessment360[];
    },
    enabled: !!cycleId,
  });
}

export function useSubjectAssessments(cycleId?: string, subjectId?: string) {
  return useQuery<Assessment360[]>({
    queryKey: ["subject-assessments", cycleId, subjectId],
    queryFn: async () => {
      const res = await api.get(`/performance/assessments/${cycleId}/subject/${subjectId}`);
      return res.data as Assessment360[];
    },
    enabled: !!cycleId && !!subjectId,
  });
}

export function useSaveAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      cycleId: string;
      subjectId: string;
      type: AssessmentType;
      isDraft: boolean;
      responses: Array<{ questionId: string; ratingValue?: number; textValue?: string }>;
    }) => {
      const res = await api.post("/performance/assessments", data);
      return res.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["my-assessments", v.cycleId] });
      qc.invalidateQueries({ queryKey: ["subject-assessments", v.cycleId, v.subjectId] });
    },
  });
}

export function useGoalSnapshot() {
  return useQuery({
    queryKey: ["goal-snapshot"],
    queryFn: async () => {
      const res = await api.get("/performance/goal-snapshot");
      return res.data as { cycle: { id: string; name: string } | null; objectives: any[] };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Dashboard ────────────────────────────────────────

export function useMyPerformanceDashboard() {
  return useQuery<PerformanceDashboard>({
    queryKey: ["performance-dashboard-me"],
    queryFn: async () => {
      const res = await api.get("/performance/dashboard/me");
      return res.data as PerformanceDashboard;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useEmployeePerformanceDashboard(employeeId?: string) {
  return useQuery<PerformanceDashboard>({
    queryKey: ["performance-dashboard", employeeId],
    queryFn: async () => {
      const res = await api.get(`/performance/dashboard/${employeeId}`);
      return res.data as PerformanceDashboard;
    },
    enabled: !!employeeId,
  });
}

// ─── Conversation Notes ───────────────────────────────

export function useConversationNote(cycleId?: string, employeeId?: string) {
  return useQuery<ConversationNote | null>({
    queryKey: ["conversation-note", cycleId, employeeId],
    queryFn: async () => {
      const res = await api.get(`/performance/conversation-notes/${cycleId}/${employeeId}`);
      return res.data as ConversationNote | null;
    },
    enabled: !!cycleId && !!employeeId,
  });
}

export function useSaveConversationNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { cycleId: string; employeeId: string; body: string }) => {
      const res = await api.post("/performance/conversation-notes", data);
      return res.data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["conversation-note", v.cycleId, v.employeeId] }),
  });
}

// ─── Praise Wall ──────────────────────────────────────

export function usePraiseWall(params?: { page?: number; limit?: number; recipientId?: string }) {
  return useQuery({
    queryKey: ["praise-wall", params],
    queryFn: async () => {
      const p = buildParams({
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        ...(params?.recipientId ? { recipientId: params.recipientId } : {}),
      });
      const res = await api.get("/performance/praise", { params: p });
      return res as unknown as { data: PraiseEntry[]; pagination: { total: number; page: number; limit: number; totalPages: number } };
    },
    staleTime: 30 * 1000,
  });
}

export function usePostPraise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { recipientId: string; message: string; valueTag?: string }) => {
      const res = await api.post("/performance/praise", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["praise-wall"] }),
  });
}

export function useReactToPraise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ praiseId, emoji }: { praiseId: string; emoji: string }) => {
      const res = await api.post(`/performance/praise/${praiseId}/react`, { emoji });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["praise-wall"] }),
  });
}

// ─── Private Feedback ─────────────────────────────────

export function useMyPrivateFeedback() {
  return useQuery({
    queryKey: ["my-feedback"],
    queryFn: async () => {
      const res = await api.get("/performance/feedback/me");
      return res.data as { received: PrivateFeedback[]; sent: PrivateFeedback[] };
    },
    staleTime: 60 * 1000,
  });
}

export function useRequestFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { recipientId: string; requestNote?: string; context?: string }) => {
      const res = await api.post("/performance/feedback/request", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-feedback"] }),
  });
}

export function useSendPrivateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { recipientId: string; message: string; context?: string }) => {
      const res = await api.post("/performance/feedback/send", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-feedback"] }),
  });
}

export function useRespondToFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ feedbackId, message }: { feedbackId: string; message: string }) => {
      const res = await api.post(`/performance/feedback/${feedbackId}/respond`, { message });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-feedback"] }),
  });
}

// ─── Employee Notes ───────────────────────────────────

export function useEmployeeNotes() {
  return useQuery<EmployeeNote[]>({
    queryKey: ["employee-notes"],
    queryFn: async () => {
      const res = await api.get("/performance/notes");
      return res.data as EmployeeNote[];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateEmployeeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { body: string; shareWithManager?: boolean }) => {
      const res = await api.post("/performance/notes", data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-notes"] }),
  });
}

export function useUpdateEmployeeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, shareWithManager }: { id: string; body: string; shareWithManager?: boolean }) => {
      const res = await api.put(`/performance/notes/${id}`, { body, shareWithManager });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-notes"] }),
  });
}

export function useDeleteEmployeeNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/performance/notes/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-notes"] }),
  });
}

// ─── Analytics ────────────────────────────────────────

export function useCompetencyHeatmap(cycleId?: string) {
  return useQuery({
    queryKey: ["competency-heatmap", cycleId],
    queryFn: async () => {
      const params = buildParams({ ...(cycleId ? { cycleId } : {}) });
      const res = await api.get("/performance/analytics/heatmap", { params });
      return res.data as {
        cycle: { id: string; name: string } | null;
        heatmap: Array<{
          departmentId: string;
          departmentName: string;
          dimensions: Array<{
            dimensionId: string;
            dimensionName: string;
            averageScore: number;
            participantCount: number;
          }>;
        }>;
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useGoalAlignmentMetrics() {
  return useQuery({
    queryKey: ["goal-alignment"],
    queryFn: async () => {
      const res = await api.get("/performance/analytics/goal-alignment");
      return res.data as {
        totalObjectives: number;
        linkedObjectives: number;
        alignmentPct: number;
        kpi: { onTrack: number; atRisk: number; offTrack: number; completed: number; avgCompletion: number };
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeedbackVolumeMetrics(months = 3) {
  return useQuery({
    queryKey: ["feedback-volume", months],
    queryFn: async () => {
      const res = await api.get("/performance/analytics/feedback-volume", { params: { months } });
      return res.data as { praiseCount: number; feedbackCount: number };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface KpiRatingMetrics {
  avgFinalRating: number;
  avgManagerRating: number;
  ratedCount: number;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    avgFinalRating: number;
    avgManagerRating: number;
    ratedCount: number;
  }>;
}

export function useKpiRatingMetrics() {
  return useQuery<KpiRatingMetrics>({
    queryKey: ["kpi-rating-metrics"],
    queryFn: async () => {
      const res = await api.get("/performance/analytics/kpi-ratings");
      return res.data as KpiRatingMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}
