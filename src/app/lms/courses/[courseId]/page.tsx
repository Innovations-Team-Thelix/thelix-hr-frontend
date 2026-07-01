"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useLmsCourse, useCourseProgress, useMarkLessonProgress,
  useSelfEnroll, useEffectiveRole, useBulkEnroll,
  useSbus, useDepartments, useEmployees,
  useUpdateLmsModule, useDeleteLmsModule,
  useUpdateLmsLesson, useDeleteLmsLesson,
} from "@/hooks";
import {
  PlayCircle, FileText, Headphones, Globe, CheckCircle2, Clock, Users,
  ChevronDown, ChevronRight, ChevronLeft, ChevronRight as Next,
  ArrowLeft, BookOpen, Play, Loader2, Award, Lock,
  Search, X, Building2, Layers, User, Globe2,
  Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/loading";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";

const CONTENT_ICONS: Record<string, any> = {
  Video: Play,
  PDF: FileText,
  Article: FileText,
  Audio: Headphones,
  LiveSession: Globe,
  Embed: Globe,
  SCORM: FileText,
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-100 text-green-700",
  Intermediate: "bg-blue-100 text-blue",
  Advanced:     "bg-primary-100 text-primary-700",
  Expert:       "bg-red-100 text-red-700",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  "#EF4444": "from-red-500 to-red-800",
  "#F97316": "from-orange-500 to-orange-800",
  "#8B5CF6": "from-violet-500 to-violet-800",
  "#EC4899": "from-pink-500 to-pink-800",
  "#3B82F6": "from-blue-500 to-blue-800",
  "#10B981": "from-emerald-500 to-emerald-800",
  "#F59E0B": "from-amber-500 to-amber-800",
  "#6366F1": "from-indigo-500 to-indigo-800",
  "#14B8A6": "from-teal-500 to-teal-800",
  "#84CC16": "from-lime-500 to-lime-800",
};

function VideoPlayer({ lesson, categoryColor }: { lesson: any; categoryColor?: string }) {
  const gradient = categoryColor ? (CATEGORY_GRADIENTS[categoryColor] ?? "from-gray-800 to-gray-950") : "from-gray-800 to-gray-950";
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!lesson) {
    return (
      <div className={`w-full aspect-video bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-3 text-white`}>
        <BookOpen className="w-16 h-16 opacity-30" />
        <p className="text-sm opacity-50">Select a lesson to begin</p>
      </div>
    );
  }

  const isVideo = lesson.contentType === "Video";
  const isPDF = lesson.contentType === "PDF";
  const isArticle = lesson.contentType === "Article";
  const isEmbed = lesson.contentType === "Embed" || lesson.contentType === "LiveSession";

  if (isVideo && lesson.contentUrl) {
    if (lesson.contentUrl.includes("youtube.com") || lesson.contentUrl.includes("youtu.be")) {
      const ytId = lesson.contentUrl.includes("youtu.be")
        ? lesson.contentUrl.split("/").pop()?.split("?")[0]
        : new URL(lesson.contentUrl).searchParams.get("v");
      return (
        <div className="w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    if (lesson.contentUrl.includes("vimeo.com")) {
      const vimeoId = lesson.contentUrl.split("/").pop();
      return (
        <div className="w-full aspect-video bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <div className="w-full aspect-video bg-black">
        <video ref={videoRef} controls className="w-full h-full" src={lesson.contentUrl} preload="metadata">
          Your browser does not support the video element.
        </video>
      </div>
    );
  }

  if (isEmbed && lesson.contentUrl) {
    return (
      <div className="w-full aspect-video bg-black">
        <iframe src={lesson.contentUrl} className="w-full h-full" allowFullScreen />
      </div>
    );
  }

  if (isPDF && lesson.contentUrl) {
    return (
      <div className="w-full" style={{ height: "560px" }}>
        <iframe src={lesson.contentUrl} className="w-full h-full border-0" />
      </div>
    );
  }

  if (isArticle && lesson.bodyText) {
    return (
      <div className="w-full bg-white p-8 max-h-[560px] overflow-y-auto">
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{lesson.bodyText}</div>
      </div>
    );
  }

  // Placeholder for missing content
  return (
    <div className={`w-full aspect-video bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-4 text-white`}>
      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
        <Play className="w-8 h-8 opacity-80 ml-1" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-lg opacity-90">{lesson.title}</p>
        <p className="text-sm opacity-50 mt-1 capitalize">{lesson.contentType} content</p>
      </div>
      {lesson.contentUrl && (
        <a href={lesson.contentUrl} target="_blank" rel="noopener noreferrer"
          className="mt-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors">
          Open in new tab
        </a>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "CVO" || effectiveRole === "Admin";

  const { data: course, isLoading } = useLmsCourse(courseId);
  const { data: progress } = useCourseProgress(courseId);
  const markProgress = useMarkLessonProgress();
  const selfEnroll = useSelfEnroll();
  const bulkEnroll = useBulkEnroll();
  const updateModule = useUpdateLmsModule(courseId);
  const deleteModule = useDeleteLmsModule(courseId);
  const updateLesson = useUpdateLmsLesson(courseId);
  const deleteLesson = useDeleteLmsLesson(courseId);

  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollScope, setEnrollScope] = useState<'org' | 'sbu' | 'dept' | 'individual'>('individual');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedSbuId, setSelectedSbuId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [activeTab, setActiveTab] = useState<"overview" | "resources">("overview");

  // Inline edit state for curriculum sidebar (admin only)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ title: string; contentType: string; contentUrl: string; durationMins: string }>({ title: "", contentType: "Video", contentUrl: "", durationMins: "" });

  // Data for assign modal
  const { data: sbus } = useSbus();
  const { data: departments } = useDepartments();
  const { data: employeesResult } = useEmployees({ search: employeeSearch || undefined, limit: 500 });
  const employees = (employeesResult as any)?.data ?? [];

  const openAssignModal = useCallback(() => {
    setEnrollScope('individual');
    setSelectedDeptId('');
    setSelectedSbuId('');
    setSelectedEmployeeIds([]);
    setEmployeeSearch('');
    setEnrollModalOpen(true);
  }, []);

  const handleAssign = () => {
    const payload: any = { courseId, scope: enrollScope };
    if (enrollScope === 'sbu') payload.sbuId = selectedSbuId;
    if (enrollScope === 'dept') payload.departmentId = selectedDeptId;
    if (enrollScope === 'individual') payload.employeeIds = selectedEmployeeIds;
    bulkEnroll.mutate(payload, { onSuccess: () => setEnrollModalOpen(false) });
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const isAssignValid =
    enrollScope === 'org' ||
    (enrollScope === 'sbu' && !!selectedSbuId) ||
    (enrollScope === 'dept' && !!selectedDeptId) ||
    (enrollScope === 'individual' && selectedEmployeeIds.length > 0);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-6">
            <Skeleton className="flex-1 aspect-video" />
            <Skeleton className="w-80 h-[500px]" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-gray-400">Course not found.</p>
          <Link href="/lms/courses"><Button variant="outline" className="mt-4">Back to Library</Button></Link>
        </div>
      </AppLayout>
    );
  }

  const c = course as any;
  const p = progress as any;
  const completedLessonIds = new Set(
    (p?.lessonProgress ?? []).filter((lp: any) => lp.isCompleted).map((lp: any) => lp.lessonId)
  );

  const allLessons: any[] = (c.modules ?? []).flatMap((m: any) => m.lessons ?? []);
  const currentIndex = selectedLesson ? allLessons.findIndex((l) => l.id === selectedLesson.id) : -1;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleLessonClick = (lesson: any) => {
    setSelectedLesson(lesson);
    if (c.modules) {
      const parentModule = c.modules.find((m: any) => m.lessons?.some((l: any) => l.id === lesson.id));
      if (parentModule) setExpandedModules((prev) => new Set([...prev, parentModule.id]));
    }
  };

  const handleMarkDone = () => {
    if (selectedLesson) {
      markProgress.mutate({ lessonId: selectedLesson.id, data: { isCompleted: true } });
    }
  };

  const totalLessons = allLessons.length;
  const completedCount = completedLessonIds.size;
  const progressPct = p?.progressPct ?? (totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0);

  return (
    <AppLayout fullWidth>
      <div className="flex flex-col h-full">
        {/* Top nav bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-white sticky top-0 z-10">
          <Link href="/lms/courses">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Course Library
            </button>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{c.title}</span>
          <div className="ml-auto flex items-center gap-3">
            {isAdmin && (
              <>
                <Link href={`/lms/courses/${courseId}/edit`}>
                  <Button size="sm" variant="outline" className="text-xs h-8">Edit Course</Button>
                </Link>
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={openAssignModal}>
                  Assign
                </Button>
              </>
            )}
            {!p && !isAdmin && (
              <Button size="sm" className="h-8 text-xs" onClick={() => selfEnroll.mutate(courseId)} disabled={selfEnroll.isPending}>
                {selfEnroll.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Enroll Now
              </Button>
            )}
            {p?.certificate && (
              <Link href="/lms/certificates">
                <Button size="sm" variant="outline" className="h-8 text-xs flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Certificate
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Main content — video + sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: video + info */}
          <div className="flex-1 overflow-y-auto">
            {/* Video player */}
            <div className="bg-black">
              <VideoPlayer lesson={selectedLesson} categoryColor={c.category?.color} />
            </div>

            {/* Lesson controls */}
            {selectedLesson && (
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <button
                  onClick={() => prevLesson && handleLessonClick(prevLesson)}
                  disabled={!prevLesson}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <div className="flex items-center gap-3">
                  {p && !completedLessonIds.has(selectedLesson.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={handleMarkDone}
                      disabled={markProgress.isPending}
                    >
                      {markProgress.isPending
                        ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        : <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />}
                      Mark Complete
                    </Button>
                  )}
                  {completedLessonIds.has(selectedLesson.id) && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                    </span>
                  )}
                </div>
                <button
                  onClick={() => nextLesson && handleLessonClick(nextLesson)}
                  disabled={!nextLesson}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <Next className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Course info */}
            <div className="p-6 max-w-4xl">
              {selectedLesson ? (
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-gray-900">{selectedLesson.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="capitalize">{selectedLesson.contentType}</span>
                    {selectedLesson.durationMins && <span>· {selectedLesson.durationMins} min</span>}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Course header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.category && (
                      <span className="text-xs font-medium bg-primary-100 text-primary-600 px-2.5 py-1 rounded-full">
                        {c.category.name}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[c.difficulty] ?? "bg-gray-100 text-gray-600"}`}>
                      {c.difficulty}
                    </span>
                    {c.isMandatory && (
                      <span className="text-xs font-medium bg-red-100 text-red-600 px-2.5 py-1 rounded-full">Mandatory</span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{c.title}</h1>
                  <div className="flex items-center gap-5 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{c.estimatedMins} min</span>
                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{c._count?.enrollments ?? 0} enrolled</span>
                    <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{totalLessons} lessons</span>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-6 border-b mt-6 mb-4">
                {(["overview", "resources"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <div className="space-y-4">
                  {c.description && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">About this course</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{c.description}</p>
                    </div>
                  )}
                  {(c.tags ?? []).length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {c.tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {c.quiz && p && (
                    <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary-900">Course Assessment</p>
                        <p className="text-xs text-primary mt-0.5">Pass score: {c.quiz.passScore}% · {c.quiz.maxAttempts} attempts allowed</p>
                      </div>
                      <Link href={`/lms/assessments?quizId=${c.quiz.id}`}>
                        <Button size="sm">Take Quiz</Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "resources" && (
                <div className="text-sm text-gray-400">
                  <p>No additional resources attached to this course.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Course curriculum sidebar */}
          <div className="w-80 xl:w-96 border-l bg-white flex flex-col overflow-hidden shrink-0">
            {/* Sidebar header */}
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm font-semibold text-gray-800">Course Content</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">{completedCount}/{totalLessons} lessons completed</p>
                <span className="text-xs font-semibold text-primary">{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${progressPct === 100 ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Module accordion */}
            <div className="overflow-y-auto flex-1">
              {(!c.modules || c.modules.length === 0) ? (
                <div className="p-8 text-center text-gray-400 text-sm">No content added yet.</div>
              ) : (
                c.modules.map((mod: any, modIdx: number) => {
                  const isOpen = expandedModules.has(mod.id);
                  const completedInModule = (mod.lessons ?? []).filter((l: any) => completedLessonIds.has(l.id)).length;
                  return (
                    <div key={mod.id} className="border-b last:border-b-0">
                      {/* Module header */}
                      <div className="flex items-start gap-1 px-3 py-3 hover:bg-gray-50 transition-colors group/mod">
                        <button
                          className="flex-1 text-left flex items-start gap-2"
                          onClick={() => toggleModule(mod.id)}
                        >
                          {editingModuleId === mod.id ? (
                            <input
                              autoFocus
                              className="flex-1 text-sm font-medium border border-primary rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary"
                              value={editingModuleTitle}
                              onChange={(e) => setEditingModuleTitle(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Enter") {
                                  updateModule.mutate({ id: mod.id, data: { title: editingModuleTitle } });
                                  setEditingModuleId(null);
                                }
                                if (e.key === "Escape") setEditingModuleId(null);
                              }}
                              onBlur={() => {
                                updateModule.mutate({ id: mod.id, data: { title: editingModuleTitle } });
                                setEditingModuleId(null);
                              }}
                            />
                          ) : (
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 leading-snug">
                                Module {modIdx + 1}: {mod.title}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {completedInModule}/{mod.lessons?.length ?? 0} · {mod.lessons?.reduce((s: number, l: any) => s + (l.durationMins ?? 0), 0) ?? 0} min
                              </p>
                            </div>
                          )}
                          {editingModuleId !== mod.id && (
                            isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          )}
                        </button>
                        {isAdmin && editingModuleId !== mod.id && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/mod:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingModuleTitle(mod.title); setEditingModuleId(mod.id); }}
                              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700"
                              title="Rename module"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteModule.mutate(mod.id); }}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                              title="Delete module"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Lessons */}
                      {isOpen && (mod.lessons ?? []).map((lesson: any) => {
                        const Icon = CONTENT_ICONS[lesson.contentType] ?? FileText;
                        const isDone = completedLessonIds.has(lesson.id);
                        const isActive = selectedLesson?.id === lesson.id;
                        const isLocked = !p && !isAdmin && !lesson.isFreePreview;
                        const isEditingThis = editingLessonId === lesson.id;

                        return (
                          <div
                            key={lesson.id}
                            className={`relative border-t border-gray-50 group/lesson ${isActive ? "bg-primary-50" : "hover:bg-gray-50"}`}
                          >
                            {isEditingThis ? (
                              /* Inline lesson edit form */
                              <div className="px-4 py-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  placeholder="Lesson title"
                                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                  value={editingLesson.title}
                                  onChange={(e) => setEditingLesson(prev => ({ ...prev, title: e.target.value }))}
                                />
                                <div className="grid grid-cols-2 gap-1.5">
                                  <select
                                    className="text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-primary"
                                    value={editingLesson.contentType}
                                    onChange={(e) => setEditingLesson(prev => ({ ...prev, contentType: e.target.value }))}
                                  >
                                    {["Video", "PDF", "Article", "Audio", "LiveSession", "Embed"].map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                  <input
                                    placeholder="Duration (min)"
                                    type="number"
                                    className="text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-primary"
                                    value={editingLesson.durationMins}
                                    onChange={(e) => setEditingLesson(prev => ({ ...prev, durationMins: e.target.value }))}
                                  />
                                </div>
                                <input
                                  placeholder="Content URL (optional)"
                                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                  value={editingLesson.contentUrl}
                                  onChange={(e) => setEditingLesson(prev => ({ ...prev, contentUrl: e.target.value }))}
                                />
                                <div className="flex gap-1.5 justify-end pt-1">
                                  <button
                                    onClick={() => setEditingLessonId(null)}
                                    className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      updateLesson.mutate({
                                        id: lesson.id,
                                        data: {
                                          title: editingLesson.title,
                                          contentType: editingLesson.contentType,
                                          contentUrl: editingLesson.contentUrl || undefined,
                                          durationMins: editingLesson.durationMins ? parseInt(editingLesson.durationMins) : undefined,
                                        },
                                      });
                                      setEditingLessonId(null);
                                    }}
                                    className="text-xs px-2.5 py-1 rounded bg-primary text-white hover:bg-primary-600"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => !isLocked && handleLessonClick(lesson)}
                                className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : isLocked ? (
                                    <Lock className="w-4 h-4 text-gray-300" />
                                  ) : (
                                    <Icon className={`w-4 h-4 ${isActive ? "text-primary-400" : "text-gray-400"}`} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs leading-snug ${isActive ? "text-primary-600 font-medium" : "text-gray-700"}`}>
                                    {lesson.title}
                                  </p>
                                  <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                                    {lesson.contentType}{lesson.durationMins ? ` · ${lesson.durationMins} min` : ""}
                                  </p>
                                </div>
                                {isAdmin && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/lesson:opacity-100 transition-opacity shrink-0 -mr-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingLesson({
                                          title: lesson.title,
                                          contentType: lesson.contentType,
                                          contentUrl: lesson.contentUrl ?? "",
                                          durationMins: lesson.durationMins ? String(lesson.durationMins) : "",
                                        });
                                        setEditingLessonId(lesson.id);
                                      }}
                                      className="p-1 rounded hover:bg-white text-gray-300 hover:text-gray-600"
                                      title="Edit lesson"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteLesson.mutate(lesson.id); }}
                                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                                      title="Delete lesson"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </button>
                            )}
                            {isActive && !isEditingThis && <div className="w-1 h-full absolute left-0 top-0 bg-primary rounded-r" />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Start / progress CTA at bottom of sidebar */}
            <div className="p-4 border-t bg-gray-50">
              {!p && !isAdmin ? (
                <Button className="w-full" onClick={() => selfEnroll.mutate(courseId)} disabled={selfEnroll.isPending}>
                  {selfEnroll.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Enroll to Start Learning
                </Button>
              ) : allLessons.length > 0 && !selectedLesson ? (
                <Button className="w-full" onClick={() => handleLessonClick(allLessons[0])}>
                  <Play className="w-4 h-4 mr-2" /> Start First Lesson
                </Button>
              ) : nextLesson ? (
                <Button className="w-full" variant="outline" onClick={() => handleLessonClick(nextLesson)}>
                  Next: {nextLesson.title.slice(0, 25)}{nextLesson.title.length > 25 ? "…" : ""}
                </Button>
              ) : progressPct === 100 ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-green-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Course Complete!
                  </p>
                  {p?.certificate && (
                    <Link href="/lms/certificates" className="mt-2 block">
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        <Award className="w-3.5 h-3.5 mr-1" /> View Certificate
                      </Button>
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      <Modal isOpen={enrollModalOpen} onClose={() => setEnrollModalOpen(false)} title="Assign Course">
        <div className="space-y-5">
          {/* Scope tiles */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Assign to</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'individual', label: 'Individual',   icon: User,      desc: 'Select specific people' },
                { value: 'dept',       label: 'Department',   icon: Building2, desc: 'All in a department' },
                { value: 'sbu',        label: 'SBU',          icon: Layers,    desc: 'All in a business unit' },
                { value: 'org',        label: 'Organisation', icon: Globe2,    desc: 'Everyone in the company' },
              ] as const).map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setEnrollScope(value);
                    setSelectedDeptId('');
                    setSelectedSbuId('');
                    setSelectedEmployeeIds([]);
                  }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                    enrollScope === value
                      ? 'border-primary bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg ${enrollScope === value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold leading-none ${enrollScope === value ? 'text-primary-700' : 'text-gray-800'}`}>{label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SBU picker */}
          {enrollScope === 'sbu' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Select SBU</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                value={selectedSbuId}
                onChange={(e) => setSelectedSbuId(e.target.value)}
              >
                <option value="">— Choose a business unit —</option>
                {((sbus as any[]) ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          )}

          {/* Department picker */}
          {enrollScope === 'dept' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Select Department</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
              >
                <option value="">— Choose a department —</option>
                {((departments as any[]) ?? []).map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.sbu ? ` · ${d.sbu.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Individual picker */}
          {enrollScope === 'individual' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Select Employees</label>
                {selectedEmployeeIds.length > 0 && (
                  <span className="text-xs font-semibold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                    {selectedEmployeeIds.length} selected
                  </span>
                )}
              </div>

              {/* Selected pills */}
              {selectedEmployeeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100">
                  {employees
                    .filter((e: any) => selectedEmployeeIds.includes(e.id))
                    .map((e: any) => (
                      <span key={e.id} className="flex items-center gap-1 px-2 py-1 bg-white border border-primary-200 text-primary-700 rounded-full text-xs font-medium">
                        {e.fullName}
                        <button type="button" onClick={() => toggleEmployee(e.id)} className="hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Search by name or email…"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>

              {/* Employee list */}
              <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                {employees.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    {employeeSearch ? 'No employees found.' : 'Loading employees…'}
                  </p>
                ) : (
                  employees.map((emp: any) => {
                    const selected = selectedEmployeeIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployee(emp.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${selected ? 'bg-primary-50' : ''}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {selected ? <CheckCircle2 className="w-3.5 h-3.5" /> : emp.fullName?.charAt(0) ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{emp.fullName}</p>
                          <p className="text-[11px] text-gray-400 truncate">{emp.department?.name ?? emp.jobTitle ?? emp.email}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Organisation confirm message */}
          {enrollScope === 'org' && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <Globe2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                This will enroll <strong>all active employees</strong> in the organisation into this course.
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleAssign}
            disabled={bulkEnroll.isPending || !isAssignValid}
          >
            {bulkEnroll.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Assign Course
            {enrollScope === 'individual' && selectedEmployeeIds.length > 0 && ` (${selectedEmployeeIds.length})`}
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
