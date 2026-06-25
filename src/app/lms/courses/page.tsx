"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useLmsCourses, useLmsCategories, usePublishLmsCourse, useDeleteLmsCourse, useEffectiveRole, useSelfEnroll } from "@/hooks";
import { Library, Plus, Search, Eye, EyeOff, Trash2, Play, Clock, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/loading";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import Link from "next/link";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     "bg-green-100 text-green-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced:     "bg-purple-100 text-purple-700",
  Expert:       "bg-red-100 text-red-700",
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  "#EF4444": "from-red-400 to-red-600",
  "#F97316": "from-orange-400 to-orange-600",
  "#8B5CF6": "from-violet-400 to-violet-600",
  "#EC4899": "from-pink-400 to-pink-600",
  "#3B82F6": "from-blue-400 to-blue-600",
  "#10B981": "from-emerald-400 to-emerald-600",
  "#F59E0B": "from-amber-400 to-amber-600",
  "#6366F1": "from-indigo-400 to-indigo-600",
  "#14B8A6": "from-teal-400 to-teal-600",
  "#84CC16": "from-lime-400 to-lime-600",
};

function thumbnailGradient(color?: string) {
  return color ? (CATEGORY_GRADIENTS[color] ?? "from-blue-400 to-blue-700") : "from-slate-500 to-slate-700";
}

function CourseCard({
  course, isAdmin, onPublish, onDelete, onEnroll, enrollPending,
}: {
  course: any;
  isAdmin: boolean;
  onPublish: () => void;
  onDelete: () => void;
  onEnroll: () => void;
  enrollPending: boolean;
}) {
  const gradient = thumbnailGradient(course.category?.color);

  return (
    <div className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
      {/* Thumbnail */}
      <div className={`relative aspect-video bg-gradient-to-br ${gradient} overflow-hidden`}>
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-5xl font-black text-white/80 select-none tracking-tighter leading-none">
              {course.title.slice(0, 2).toUpperCase()}
            </span>
            <BookOpen className="w-5 h-5 text-white/40" />
          </div>
        )}

        {/* Hover play button */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg scale-90 group-hover:scale-100 transition-transform duration-150">
            <Play className="w-5 h-5 text-gray-900 fill-gray-900 ml-0.5" />
          </div>
        </div>

        {/* Top-left badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {course.isMandatory && (
            <span className="text-[10px] font-semibold bg-red-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wide">
              Mandatory
            </span>
          )}
          {isAdmin && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${course.isPublished ? "bg-emerald-500 text-white" : "bg-gray-800/80 text-gray-200"}`}>
              {course.isPublished ? "Live" : "Draft"}
            </span>
          )}
        </div>

        {/* Bottom-right duration */}
        {course.estimatedMins && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white text-[11px] font-medium px-2 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            {course.estimatedMins} min
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <Link href={`/lms/courses/${course.id}`}>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-blue-600 transition-colors">
            {course.title}
          </h3>
        </Link>

        {course.category && (
          <p className="text-xs text-gray-400 font-medium">{course.category.name}</p>
        )}

        {course.description && (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{course.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-auto pt-2">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[course.difficulty] ?? "bg-gray-100 text-gray-500"}`}>
            {course.difficulty}
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {course._count?.modules ?? 0} module{course._count?.modules !== 1 ? "s" : ""}
          </span>
          {(course._count?.enrollments ?? 0) > 0 && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {course._count.enrollments}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-gray-100 mt-1">
          {!isAdmin ? (
            <Button
              size="sm"
              className="w-full h-8 text-xs font-semibold"
              onClick={onEnroll}
              disabled={enrollPending}
            >
              Enroll Now
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Link href={`/lms/courses/${course.id}`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full h-8 text-xs">Open</Button>
              </Link>
              <Link href={`/lms/courses/${course.id}/edit`}>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-gray-500">Edit</Button>
              </Link>
              <Button
                size="sm" variant="ghost"
                className="h-8 px-2 text-gray-400 hover:text-gray-700"
                onClick={onPublish}
                title={course.isPublished ? "Unpublish" : "Publish"}
              >
                {course.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button
                size="sm" variant="ghost"
                className="h-8 px-2 text-red-400 hover:text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourseLibraryPage() {
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "CVO" || effectiveRole === "Admin";

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filters: any = {
    search: search || undefined,
    categoryId: categoryId || undefined,
    difficulty: difficulty || undefined,
  };
  if (isAdmin) filters.published = undefined;

  const { data, isLoading } = useLmsCourses(filters);
  const { data: categories } = useLmsCategories();
  const publishMutation = usePublishLmsCourse();
  const deleteMutation = useDeleteLmsCourse();
  const selfEnroll = useSelfEnroll();

  const courses = (data as any[]) ?? [];
  const cats = (categories as any[]) ?? [];

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Library</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {isLoading ? "Loading courses…" : `${courses.length} course${courses.length !== 1 ? "s" : ""} available`}
            </p>
          </div>
          {isAdmin && (
            <Link href="/lms/courses/create">
              <Button size="sm" className="flex items-center gap-2 shrink-0">
                <Plus className="w-4 h-4" /> Create Course
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            className="pl-11 h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-sm"
            placeholder="Search for anything…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category pills */}
        {cats.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setCategoryId("")}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${!categoryId ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
            >
              All Topics
            </button>
            {cats.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(categoryId === c.id ? "" : c.id)}
                className={`shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${categoryId === c.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}
              >
                {c.color && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                )}
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Difficulty filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium mr-1">Level:</span>
          {["", "Beginner", "Intermediate", "Advanced", "Expert"].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${difficulty === d ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"}`}
            >
              {d || "All"}
            </button>
          ))}
        </div>

        {/* Course grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100 bg-white">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-2.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-8 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Library className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">No courses found</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              {search || categoryId || difficulty
                ? "Try adjusting your search or filters."
                : isAdmin
                ? "Create your first course to get started."
                : "Check back soon — courses are being added."}
            </p>
            {isAdmin && !search && !categoryId && !difficulty && (
              <Link href="/lms/courses/create" className="mt-5">
                <Button size="sm">Create First Course</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                isAdmin={isAdmin}
                onPublish={() => publishMutation.mutate(course.id)}
                onDelete={() => setDeleteTarget(course.id)}
                onEnroll={() => selfEnroll.mutate(course.id)}
                enrollPending={selfEnroll.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Course"
        message="Are you sure you want to delete this course? This will remove all enrollments and progress data."
        onConfirm={() => { if (deleteTarget) { deleteMutation.mutate(deleteTarget); setDeleteTarget(null); } }}
        onClose={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        variant="danger"
      />
    </AppLayout>
  );
}
