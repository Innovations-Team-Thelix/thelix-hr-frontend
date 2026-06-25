"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useLmsPaths, useSelfEnrollPath, useEffectiveRole, useDeleteLmsPath } from "@/hooks";
import { MapPin, Plus, ChevronRight, BookOpen, Users, Award, Play, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import Link from "next/link";

const PATH_GRADIENTS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-violet-700",
  "from-emerald-500 to-emerald-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
  "from-teal-500 to-teal-700",
];

export default function LearningPathsPage() {
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "CVO" || effectiveRole === "Admin";
  const { data: paths, isLoading } = useLmsPaths();
  const selfEnroll = useSelfEnrollPath();
  const deletePath = useDeleteLmsPath();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const pathList = (paths as any[]) ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Learning Paths</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {isLoading ? "Loading…" : `${pathList.length} structured learning path${pathList.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {isAdmin && (
            <Link href="/lms/paths/create">
              <Button size="sm" className="flex items-center gap-2 shrink-0">
                <Plus className="w-4 h-4" /> Create Path
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100 bg-white">
                <Skeleton className="h-36 w-full" />
                <div className="p-4 space-y-2.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-8 w-full mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : pathList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">No learning paths yet</h3>
            <p className="text-sm text-gray-400 mb-5">Create a structured sequence of courses to guide your team.</p>
            {isAdmin && (
              <Link href="/lms/paths/create">
                <Button size="sm">Create First Path</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {pathList.map((path: any, idx: number) => {
              const gradient = PATH_GRADIENTS[idx % PATH_GRADIENTS.length];
              const initials = path.title.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
              const courseCount = path.courses?.length ?? path._count?.courses ?? 0;
              const enrollCount = path._count?.enrollments ?? 0;

              return (
                <div key={path.id} className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                  {/* Thumbnail */}
                  <div className={`relative h-36 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-2 overflow-hidden`}>
                    <span className="text-5xl font-black text-white/80 select-none tracking-tighter leading-none">{initials}</span>
                    <MapPin className="w-5 h-5 text-white/40" />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
                        <Play className="w-4 h-4 text-gray-900 fill-gray-900 ml-0.5" />
                      </div>
                    </div>

                    {/* Badge chip */}
                    {path.badge && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        <Award className="w-3 h-3" /> Badge
                      </div>
                    )}

                    {/* Course count chip */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 text-white text-[11px] font-medium px-2 py-0.5 rounded">
                      <BookOpen className="w-3 h-3" /> {courseCount} course{courseCount !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col flex-1 p-4 gap-2">
                    <Link href={`/lms/paths/${path.id}`}>
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug hover:text-blue-600 transition-colors line-clamp-2">
                        {path.title}
                      </h3>
                    </Link>

                    {path.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{path.description}</p>
                    )}

                    {/* Course flow preview */}
                    {(path.courses ?? []).length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {path.courses.slice(0, 3).map((pc: any, i: number) => (
                          <span key={pc.id ?? i} className="flex items-center gap-1 text-[11px]">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                              {pc.course?.title ?? pc.title}
                            </span>
                            {i < Math.min(2, path.courses.length - 1) && (
                              <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                            )}
                          </span>
                        ))}
                        {path.courses.length > 3 && (
                          <span className="text-[11px] text-gray-400">+{path.courses.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-auto pt-2 text-[11px] text-gray-400">
                      {enrollCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {enrollCount} enrolled
                        </span>
                      )}
                      {path.badge && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Award className="w-3 h-3" /> Earn: {path.badge.name}
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="pt-2 border-t border-gray-100">
                      {isAdmin ? (
                        <div className="flex items-center gap-1">
                          <Link href={`/lms/paths/${path.id}`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs">View</Button>
                          </Link>
                          <Link href={`/lms/paths/${path.id}/edit`}>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-gray-500 hover:text-blue-600">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 px-2 text-red-400 hover:text-red-600"
                            onClick={() => setDeleteTarget(path.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" className="h-8 text-xs px-3"
                            onClick={() => selfEnroll.mutate(path.id)} disabled={selfEnroll.isPending}>
                            Enroll
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Link href={`/lms/paths/${path.id}`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full h-8 text-xs">View Path</Button>
                          </Link>
                          <Button size="sm" className="h-8 text-xs px-4"
                            onClick={() => selfEnroll.mutate(path.id)} disabled={selfEnroll.isPending}>
                            Enroll
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Learning Path"
        message="Are you sure you want to delete this path? Enrollments and progress will be removed."
        onConfirm={() => { if (deleteTarget) { deletePath.mutate(deleteTarget); setDeleteTarget(null); } }}
        onClose={() => setDeleteTarget(null)}
        loading={deletePath.isPending}
        variant="danger"
      />
    </AppLayout>
  );
}
