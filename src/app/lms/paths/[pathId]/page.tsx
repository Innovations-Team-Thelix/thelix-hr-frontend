"use client";

import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { useLmsPath, useSelfEnrollPath, useLmsPathProgress } from "@/hooks";
import { MapPin, ChevronRight, CheckCircle2, Circle, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const { data, isLoading } = useLmsPath(pathId);
  const { data: progressData } = useLmsPathProgress(pathId);
  const selfEnroll = useSelfEnrollPath();

  const path: any = data;
  const progress: any = progressData;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!path) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-gray-400">Learning path not found.</p>
          <Link href="/lms/paths">
            <Button variant="outline" className="mt-4">Back to Paths</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const completedCourseIds: Set<string> = new Set(
    (progress?.courseProgress ?? []).filter((cp: any) => cp.isCompleted).map((cp: any) => cp.courseId)
  );

  const overallPct = progress?.progressPct ?? 0;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <Link href="/lms/paths">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> All Paths
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            {path.title}
          </h1>
          {path.description && <p className="text-gray-500 text-sm">{path.description}</p>}
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Overall Progress</p>
              <span className="text-sm font-bold text-primary">{overallPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${overallPct === 100 ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{completedCourseIds.size} / {path.courses?.length ?? 0} courses completed</span>
              {overallPct === 100 && (
                <span className="text-green-600 font-medium">Path Completed!</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Course sequence */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Course Sequence</h2>
          <div className="space-y-2">
            {(path.courses ?? []).map((pc: any, i: number) => {
              const done = completedCourseIds.has(pc.courseId);
              const prevDone = i === 0 || completedCourseIds.has(path.courses[i - 1]?.courseId);
              const isUnlocked = prevDone;

              return (
                <div key={pc.id} className="flex items-start gap-3">
                  {/* Connector */}
                  <div className="flex flex-col items-center pt-1">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className={`w-5 h-5 flex-shrink-0 ${isUnlocked ? "text-primary-300" : "text-gray-200"}`} />
                    )}
                    {i < (path.courses?.length ?? 0) - 1 && (
                      <div className="w-px h-6 bg-gray-200 mt-1" />
                    )}
                  </div>

                  <Card className={`flex-1 transition-all ${!isUnlocked ? "opacity-50" : "hover:shadow-sm"}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{pc.course.title}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">
                          {pc.course.difficulty}
                          {pc.course.estimatedMins ? ` · ${pc.course.estimatedMins} min` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {done && (
                          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">Done</span>
                        )}
                        {isUnlocked && !done && (
                          <Link href={`/lms/courses/${pc.courseId}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              Start <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                        {!isUnlocked && (
                          <span className="text-xs text-gray-400">Locked</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enroll CTA if not enrolled */}
        {!progress && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => selfEnroll.mutate(path.id)}
              disabled={selfEnroll.isPending}
              className="flex items-center gap-2"
            >
              {selfEnroll.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Enroll in This Path
            </Button>
          </div>
        )}

        {/* Badge reward info */}
        {path.badge && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Complete to earn: {path.badge.name}</p>
                {path.badge.description && (
                  <p className="text-xs text-amber-600 mt-0.5">{path.badge.description}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
