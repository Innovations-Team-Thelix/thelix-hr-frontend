"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import { CompetencyRadarChart } from "@/components/performance/CompetencyRadarChart";
import {
  useMyPerformanceDashboard,
  useEmployeeNotes,
  useCreateEmployeeNote,
  useDeleteEmployeeNote,
  useAuth,
} from "@/hooks";
import {
  Star, MessageSquare, Target, BookOpen, PlusCircle, Trash2,
  ChevronRight, Bell, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  Draft:         { label: "Draft",           color: "bg-gray-100 text-gray-600" },
  Kickoff:       { label: "Kicked Off",      color: "bg-blue-100 text-blue-700" },
  PeerSelection: { label: "Peer Selection",  color: "bg-purple-100 text-purple-700" },
  Assessments:   { label: "Assessments",     color: "bg-amber-100 text-amber-700" },
  ManagerReview: { label: "Manager Review",  color: "bg-orange-100 text-orange-700" },
  Conversation:  { label: "1:1 Conversation",color: "bg-teal-100 text-teal-700" },
  Closed:        { label: "Closed",          color: "bg-green-100 text-green-700" },
};

const GOAL_STATUS_COLOR: Record<string, string> = {
  OnTrack:  "text-emerald-600",
  AtRisk:   "text-amber-600",
  Behind:   "text-red-500",
  Completed:"text-green-600",
};

export default function PerformanceDashboardPage() {
  const { user } = useAuth();
  const { data: dashboard, isLoading } = useMyPerformanceDashboard();
  const { data: notes } = useEmployeeNotes();
  const createNote = useCreateEmployeeNote();
  const deleteNote = useDeleteEmployeeNote();

  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    try {
      await createNote.mutateAsync({ body: noteBody });
      setNoteBody("");
      setAddingNote(false);
      toast.success("Note saved.");
    } catch {
      toast.error("Failed to save note.");
    }
  }

  return (
    <AppLayout pageTitle="Performance">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Performance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your competency profile, goals, and review history.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/performance/praise">
              <Button variant="secondary" size="sm">
                <Star className="w-4 h-4 mr-1" /> Praise Wall
              </Button>
            </Link>
            <Link href="/performance/feedback">
              <Button variant="secondary" size="sm">
                <MessageSquare className="w-4 h-4 mr-1" /> Feedback
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Competency Radar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" /> Competency Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <CompetencyRadarChart data={dashboard?.radarData ?? []} />
              )}
            </CardContent>
          </Card>

          {/* Active Cycles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" /> Active Review Cycles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (dashboard?.activeCycles ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No active review cycles.</p>
              ) : (
                dashboard!.activeCycles.map((c) => {
                  const phaseConfig = PHASE_LABELS[c.phase] ?? { label: c.phase, color: "bg-gray-100 text-gray-600" };
                  return (
                    <Link key={c.id} href={`/performance/cycles/${c.id}`} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseConfig.color}`}>
                            {phaseConfig.label}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>
                  );
                })
              )}
              <Link href="/performance/cycles" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all cycles <ChevronRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goal Snapshot */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" /> Active Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (dashboard?.goalSnapshot?.objectives ?? []).length === 0 ? (
                <p className="text-sm text-gray-400">No active objectives found in current OKR cycle.</p>
              ) : (
                <div className="space-y-3">
                  {dashboard!.goalSnapshot.objectives.map((obj: any) => (
                    <div key={obj.id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-800">{obj.title}</p>
                        <span className={`text-xs font-semibold ml-2 ${GOAL_STATUS_COLOR[obj.keyResults?.[0]?.healthStatus] ?? "text-gray-500"}`}>
                          {obj.keyResults?.[0]?.healthStatus ?? "—"}
                        </span>
                      </div>
                      {obj.parentObjective && (
                        <p className="text-xs text-gray-400 mt-0.5">↳ {obj.parentObjective.title}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        {(obj.keyResults ?? []).map((kr: any) => {
                          const pct = kr.targetValue > 0
                            ? Math.min(100, Math.round(((kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue)) * 100))
                            : 0;
                          return (
                            <div key={kr.id}>
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-0.5">
                                <span className="truncate max-w-[220px]">{kr.title}</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-indigo-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Private Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-500" /> Private Notes
                </span>
                <button
                  onClick={() => setAddingNote(true)}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" /> Add
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addingNote && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Record an accomplishment, reflection, or observation..."
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddNote} disabled={createNote.isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => { setAddingNote(false); setNoteBody(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {(notes ?? []).length === 0 && !addingNote ? (
                <p className="text-sm text-gray-400">No notes yet. Start logging your accomplishments.</p>
              ) : (
                (notes ?? []).map((note) => (
                  <div key={note.id} className="group p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-gray-700 leading-relaxed line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: note.body }} />
                      <button
                        onClick={() => deleteNote.mutate(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(note.createdAt)}</p>
                  </div>
                ))
              )}
              <Link href="/performance/notes" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all notes <ChevronRight className="w-3 h-3" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Praise */}
        {(dashboard?.recentPraise ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" /> Recent Recognition
                </span>
                <Link href="/performance/praise" className="text-xs text-indigo-600 hover:underline">
                  View praise wall
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboard!.recentPraise.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border border-yellow-100 bg-yellow-50/40">
                    <p className="text-xs font-medium text-gray-700 mb-1">{p.giver.fullName}</p>
                    <p className="text-sm text-gray-800 leading-snug">{p.message}</p>
                    {p.valueTag && (
                      <span className="mt-1 inline-block text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {p.valueTag}
                      </span>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{formatDate(p.createdAt)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
