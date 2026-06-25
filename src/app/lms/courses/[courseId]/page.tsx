"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useLmsCourse, useCourseProgress, useMarkLessonProgress,
  useSelfEnroll, useEffectiveRole, useBulkEnroll,
} from "@/hooks";
import {
  PlayCircle, FileText, Headphones, Globe, CheckCircle2, Clock, Users,
  ChevronDown, ChevronRight, ChevronLeft, ChevronRight as Next,
  ArrowLeft, BookOpen, Play, Loader2, Award, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced:     "bg-purple-100 text-purple-700",
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

  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollScope, setEnrollScope] = useState("individual");
  const [activeTab, setActiveTab] = useState<"overview" | "resources">("overview");

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
                <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setEnrollModalOpen(true)}>
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
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
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
                    className={`pb-3 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
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
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-blue-900">Course Assessment</p>
                        <p className="text-xs text-blue-600 mt-0.5">Pass score: {c.quiz.passScore}% · {c.quiz.maxAttempts} attempts allowed</p>
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
                <span className="text-xs font-semibold text-blue-600">{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${progressPct === 100 ? "bg-green-500" : "bg-blue-500"}`}
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
                      <button
                        className="w-full text-left px-4 py-3.5 flex items-start gap-2 hover:bg-gray-50 transition-colors"
                        onClick={() => toggleModule(mod.id)}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 leading-snug">
                            Module {modIdx + 1}: {mod.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {completedInModule}/{mod.lessons?.length ?? 0} · {mod.lessons?.reduce((s: number, l: any) => s + (l.durationMins ?? 0), 0) ?? 0} min
                          </p>
                        </div>
                        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
                      </button>

                      {isOpen && (mod.lessons ?? []).map((lesson: any, lessonIdx: number) => {
                        const Icon = CONTENT_ICONS[lesson.contentType] ?? FileText;
                        const isDone = completedLessonIds.has(lesson.id);
                        const isActive = selectedLesson?.id === lesson.id;
                        const isLocked = !p && !isAdmin && !lesson.isFreePreview;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => !isLocked && handleLessonClick(lesson)}
                            className={`w-full text-left flex items-start gap-3 px-4 py-3 border-t border-gray-50 transition-colors ${isActive ? "bg-blue-50" : "hover:bg-gray-50"} ${isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : isLocked ? (
                                <Lock className="w-4 h-4 text-gray-300" />
                              ) : (
                                <Icon className={`w-4 h-4 ${isActive ? "text-blue-500" : "text-gray-400"}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug ${isActive ? "text-blue-700 font-medium" : "text-gray-700"}`}>
                                {lesson.title}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                                {lesson.contentType}{lesson.durationMins ? ` · ${lesson.durationMins} min` : ""}
                              </p>
                            </div>
                            {isActive && <div className="w-1 h-full absolute left-0 top-0 bg-blue-500 rounded-r" />}
                          </button>
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
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Assign to</label>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={enrollScope}
              onChange={(e) => setEnrollScope(e.target.value)}
            >
              <option value="org">Entire Organisation</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          <Button
            className="w-full"
            onClick={() => { bulkEnroll.mutate({ courseId, scope: enrollScope as any }); setEnrollModalOpen(false); }}
            disabled={bulkEnroll.isPending}
          >
            {bulkEnroll.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Assign Course
          </Button>
        </div>
      </Modal>
    </AppLayout>
  );
}
