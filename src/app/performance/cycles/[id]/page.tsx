"use client";

import { use } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading";
import {
  usePerformanceCycle, useCycleProgress, useMyNominations, useSubmitNominations,
  usePendingNominationApprovals, useApproveNomination, useRejectNomination,
  useMyAssessments, useSaveAssessment, useAssessmentQuestions,
  useGoalSnapshot, useAuth, useEffectiveRole, useEmployees,
} from "@/hooks";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle, Users, ChevronLeft, Send, UserCheck, Target } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

const PHASE_CONFIG: Record<string, { label: string; color: string }> = {
  Draft:         { label: "Draft",            color: "bg-gray-100 text-gray-600" },
  Kickoff:       { label: "Kicked Off",       color: "bg-blue-100 text-blue-700" },
  PeerSelection: { label: "Peer Selection",   color: "bg-purple-100 text-purple-700" },
  Assessments:   { label: "Assessments",      color: "bg-amber-100 text-amber-700" },
  ManagerReview: { label: "Manager Review",   color: "bg-orange-100 text-orange-700" },
  Conversation:  { label: "1:1 Conversations",color: "bg-teal-100 text-teal-700" },
  Closed:        { label: "Closed",           color: "bg-green-100 text-green-700" },
};

export default function CycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const role = useEffectiveRole();
  const isHR = ["Admin", "Finance", "SBUHead"].includes(role ?? "");
  const isMgr = ["Admin", "SBUHead", "Director", "Manager"].includes(role ?? "");

  const { data: cycle, isLoading } = usePerformanceCycle(id);
  const { data: progress } = useCycleProgress(isHR ? id : undefined);
  const { data: myNomination } = useMyNominations(id);
  const { data: pendingApprovals } = usePendingNominationApprovals(id);
  const { data: myAssessments } = useMyAssessments(id);
  const { data: goalSnapshot } = useGoalSnapshot();
  const { data: employees } = useEmployees({});
  const { data: questions } = useAssessmentQuestions(cycle?.frameworkId ?? undefined);

  const submitNominations = useSubmitNominations();
  const approveNomination = useApproveNomination();
  const rejectNomination = useRejectNomination();
  const saveAssessment = useSaveAssessment();

  const [selectedPeers, setSelectedPeers] = useState<string[]>([]);
  const [rejectModal, setRejectModal] = useState<{ cycleId: string; nomineeId: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [assessModal, setAssessModal] = useState<{ type: string; subjectId: string } | null>(null);
  const [responses, setResponses] = useState<Record<string, { ratingValue?: number; textValue?: string }>>({});
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-save assessment every 30 seconds while modal is open
  useEffect(() => {
    if (assessModal) {
      autoSaveRef.current = setInterval(() => {
        handleSaveAssessment(true);
      }, 30000);
    } else {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    }
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [assessModal, responses]);

  const phaseConfig = cycle ? (PHASE_CONFIG[cycle.phase] ?? { label: cycle.phase, color: "bg-gray-100 text-gray-600" }) : null;

  const eligiblePeers = (employees?.data ?? []).filter((e) => {
    const isSelf = e.id === user?.employeeId;
    const isMyManager = cycle?.participants?.find((p: any) => p.employeeId === user?.employeeId) !== undefined; // simplification
    return !isSelf;
  });

  async function handleSubmitNominations() {
    if (selectedPeers.length < (cycle?.minPeerNominations ?? 2)) {
      return toast.error(`Select at least ${cycle?.minPeerNominations} peers.`);
    }
    try {
      await submitNominations.mutateAsync({ cycleId: id, nominatedPeerIds: selectedPeers });
      toast.success("Nominations submitted for manager approval.");
    } catch (e: any) { toast.error(e.response?.data?.message ?? "Failed to submit."); }
  }

  async function handleApprove(nomineeId: string) {
    try {
      await approveNomination.mutateAsync({ cycleId: id, nomineeId });
      toast.success("Nominations approved.");
    } catch { toast.error("Failed to approve."); }
  }

  async function handleReject() {
    if (!rejectModal || !rejectNote.trim()) return toast.error("Reason is required.");
    try {
      await rejectNomination.mutateAsync({ cycleId: id, nomineeId: rejectModal.nomineeId, managerNote: rejectNote });
      toast.success("Nominations rejected.");
      setRejectModal(null); setRejectNote("");
    } catch { toast.error("Failed to reject."); }
  }

  function setResponse(qId: string, field: "ratingValue" | "textValue", value: any) {
    setResponses((p) => ({ ...p, [qId]: { ...p[qId], [field]: value } }));
  }

  async function handleSaveAssessment(isDraft = true) {
    if (!assessModal) return;
    const payload = {
      cycleId: id,
      subjectId: assessModal.subjectId,
      type: assessModal.type as any,
      isDraft,
      responses: Object.entries(responses).map(([qId, r]) => ({
        questionId: qId,
        ratingValue: r.ratingValue,
        textValue: r.textValue,
      })),
    };
    try {
      await saveAssessment.mutateAsync(payload);
      if (!isDraft) { toast.success("Assessment submitted!"); setAssessModal(null); }
    } catch { if (!isDraft) toast.error("Failed to submit assessment."); }
  }

  if (isLoading) {
    return (
      <AppLayout pageTitle="Review Cycle">
        <div className="p-6"><Skeleton className="h-64 w-full" /></div>
      </AppLayout>
    );
  }

  if (!cycle) {
    return (
      <AppLayout pageTitle="Review Cycle">
        <div className="p-6 text-center text-gray-400">Cycle not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle={cycle.name}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/performance/cycles" className="text-sm text-indigo-600 hover:underline flex items-center gap-1 mb-3">
            <ChevronLeft className="w-4 h-4" /> All Cycles
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{cycle.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${phaseConfig!.color}`}>
                  {phaseConfig!.label}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(cycle.reviewPeriodStart)} – {formatDate(cycle.reviewPeriodEnd)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* HR: Progress Dashboard */}
        {isHR && progress && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Cycle Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: "Participants", value: progress.totalParticipants },
                  { label: "Nominations Submitted", value: `${progress.peerSelection.submitted} / ${progress.totalParticipants}` },
                  { label: "Self-Assessments", value: `${progress.assessments.selfPct}%` },
                  { label: "Manager Reviews", value: `${progress.assessments.managerPct}%` },
                ].map((s) => (
                  <div key={s.label} className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Employee</th>
                      <th className="text-center py-2 px-3 text-gray-500 font-medium">Nominations</th>
                      <th className="text-center py-2 px-3 text-gray-500 font-medium">Self-Assessment</th>
                      <th className="text-center py-2 px-3 text-gray-500 font-medium">Manager Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.participants.map((p) => (
                      <tr key={p.employee.id} className="border-b border-gray-50">
                        <td className="py-2 px-3 font-medium text-gray-700">{p.employee.fullName}</td>
                        <td className="py-2 px-3 text-center">
                          {p.nominationStatus === "Approved" ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> :
                           p.nominationStatus === "Nominated" ? <Clock className="w-4 h-4 text-amber-500 mx-auto" /> :
                           <AlertCircle className="w-4 h-4 text-red-400 mx-auto" />}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {p.selfAssessmentDone ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Clock className="w-4 h-4 text-gray-300 mx-auto" />}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {p.managerReviewDone ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Clock className="w-4 h-4 text-gray-300 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee: Peer Nomination */}
        {cycle.phase === "PeerSelection" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-500" /> Peer Nomination
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myNomination?.status === "Approved" ? (
                <p className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Your peer nominations have been approved.</p>
              ) : myNomination?.status === "Nominated" ? (
                <p className="text-sm text-amber-600 flex items-center gap-2"><Clock className="w-4 h-4" /> Nominations submitted. Awaiting manager approval.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Select between {cycle.minPeerNominations} and {cycle.maxPeerNominations} colleagues to review your work.
                  </p>
                  {myNomination?.status === "Rejected" && (
                    <p className="text-sm text-red-600 bg-red-50 rounded p-2">
                      Your nominations were rejected. Reason: {myNomination.managerNote}. Please re-nominate.
                    </p>
                  )}
                  <div className="space-y-2">
                    {selectedPeers.map((peerId) => {
                      const emp = (employees?.data ?? []).find((e) => e.id === peerId);
                      return (
                        <div key={peerId} className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-100">
                          <span className="text-sm text-gray-700">{emp?.fullName ?? peerId}</span>
                          <button onClick={() => setSelectedPeers((p) => p.filter((id) => id !== peerId))} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        </div>
                      );
                    })}
                    {selectedPeers.length < cycle.maxPeerNominations && (
                      <SearchableSelect
                        options={eligiblePeers.filter((e) => !selectedPeers.includes(e.id)).map((e) => ({ value: e.id, label: e.fullName }))}
                        value=""
                        onChange={(v) => v && setSelectedPeers((p) => [...p, v])}
                        placeholder="Add a colleague..."
                      />
                    )}
                  </div>
                  <Button
                    onClick={handleSubmitNominations}
                    disabled={submitNominations.isPending || selectedPeers.length < cycle.minPeerNominations}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Submit Nominations ({selectedPeers.length}/{cycle.maxPeerNominations})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manager: Pending Nomination Approvals */}
        {isMgr && (pendingApprovals ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-500" /> Pending Nomination Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals!.map((nom: any) => (
                <div key={nom.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{nom.employee.fullName}</p>
                    <p className="text-xs text-gray-500">{nom.nominatedPeerIds.length} peer(s) nominated · {nom.cycle.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(nom.employeeId)}>Approve</Button>
                    <Button size="sm" variant="secondary" onClick={() => setRejectModal({ cycleId: nom.cycleId, nomineeId: nom.employeeId })}>Reject</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Employee: Assessments */}
        {(cycle.phase === "Assessments" || cycle.phase === "ManagerReview") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" /> My Assessments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Goal Snapshot (read-only) */}
              {goalSnapshot && goalSnapshot.objectives.length > 0 && (
                <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/30 mb-2">
                  <p className="text-xs font-semibold text-indigo-700 mb-2">Goal Progress Snapshot (read-only)</p>
                  {goalSnapshot.objectives.slice(0, 3).map((obj: any) => (
                    <div key={obj.id} className="text-xs text-gray-700 mb-1">
                      <span className="font-medium">{obj.title}</span>
                      {obj.keyResults?.map((kr: any) => (
                        <span key={kr.id} className="ml-2 text-gray-500">· {kr.title}: {kr.currentValue}/{kr.targetValue}</span>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { type: "Self", subjectId: user?.employeeId ?? "", label: "Self-Assessment" },
                ].map((a) => {
                  const existing = (myAssessments ?? []).find((m) => m.type === a.type && m.subjectId === a.subjectId);
                  return (
                    <div key={a.type} className="p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{a.label}</p>
                          {existing && !existing.isDraft && (
                            <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Submitted</p>
                          )}
                          {existing && existing.isDraft && (
                            <p className="text-xs text-amber-600">Draft saved</p>
                          )}
                        </div>
                        {(!existing || existing.isDraft) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setAssessModal({ type: a.type, subjectId: a.subjectId });
                              if (existing?.responses) {
                                const r: Record<string, any> = {};
                                existing.responses.forEach((resp) => {
                                  r[resp.questionId] = { ratingValue: resp.ratingValue ?? undefined, textValue: resp.textValue ?? undefined };
                                });
                                setResponses(r);
                              }
                            }}
                          >
                            {existing?.isDraft ? "Continue" : "Start"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject Nomination Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Nominations">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Provide a reason. The employee will be notified and asked to re-nominate.</p>
          <Textarea placeholder="Reason for rejection..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} />
          <div className="flex gap-2">
            <Button onClick={handleReject} disabled={rejectNomination.isPending} className="flex-1">Reject & Notify</Button>
            <Button variant="secondary" onClick={() => setRejectModal(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Assessment Form Modal */}
      <Modal isOpen={!!assessModal} onClose={() => setAssessModal(null)} title={`${assessModal?.type} Assessment`}>
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {(questions ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">No questions configured for this framework yet.</p>
          ) : (
            (questions ?? []).map((q: any) => (
              <div key={q.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-800">{q.questionText}</label>
                {q.dimension && <p className="text-xs text-gray-400">{q.dimension.name}</p>}
                {q.isOpenText ? (
                  <Textarea
                    rows={3}
                    value={responses[q.id]?.textValue ?? ""}
                    onChange={(e) => setResponse(q.id, "textValue", e.target.value)}
                    placeholder="Your response..."
                  />
                ) : (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setResponse(q.id, "ratingValue", v)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${responses[q.id]?.ratingValue === v ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300"}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-1">
            <Button variant="secondary" onClick={() => handleSaveAssessment(true)} disabled={saveAssessment.isPending}>Save Draft</Button>
            <Button onClick={() => handleSaveAssessment(false)} disabled={saveAssessment.isPending} className="flex-1">
              Submit Assessment
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
