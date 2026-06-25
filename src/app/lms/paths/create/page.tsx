"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { useCreateLmsPath, useLmsCourses } from "@/hooks";
import { MapPin, Plus, X, GripVertical, ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function CreatePathPage() {
  const router = useRouter();
  const createPath = useCreateLmsPath();
  const { data: coursesData } = useLmsCourses({ published: undefined });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<{ id: string; title: string }[]>([]);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");

  const allCourses = (coursesData as any[]) ?? [];
  const filteredCourses = allCourses.filter(
    (c: any) =>
      c.title.toLowerCase().includes(courseSearch.toLowerCase()) &&
      !selectedCourses.find((s) => s.id === c.id)
  );

  const addCourse = (course: any) => {
    setSelectedCourses((prev) => [...prev, { id: course.id, title: course.title }]);
    setCourseSearch("");
  };

  const removeCourse = (id: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const moveCourse = (index: number, dir: -1 | 1) => {
    const next = [...selectedCourses];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setSelectedCourses(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCourses.length === 0) return;
    createPath.mutate(
      { title, description: description || undefined, courseIds: selectedCourses.map((c) => c.id) },
      { onSuccess: () => router.push("/lms/paths") }
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/lms/paths">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Paths
            </button>
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Create Learning Path
          </h1>
          <p className="text-gray-500 text-sm mt-1">Build a structured sequence of courses with a completion reward.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Path Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. New Employee Onboarding"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will employees achieve by completing this path?"
            />
          </div>

          {/* Course sequence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Course Sequence * <span className="text-gray-400 font-normal">({selectedCourses.length} added)</span>
              </label>
              <button
                type="button"
                onClick={() => setCoursePickerOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Course
              </button>
            </div>

            {/* Course picker dropdown */}
            {coursePickerOpen && (
              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-2 border-b bg-gray-50">
                  <input
                    autoFocus
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search courses…"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                  {filteredCourses.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">
                      {allCourses.length === 0 ? "No courses created yet." : "No matching courses."}
                    </p>
                  ) : (
                    filteredCourses.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { addCourse(c); setCoursePickerOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.title}</p>
                          <p className="text-xs text-gray-400 capitalize mt-0.5">{c.difficulty} · {c.estimatedMins ?? 0} min</p>
                        </div>
                        <Plus className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Selected courses — ordered list */}
            {selectedCourses.length > 0 ? (
              <div className="space-y-2">
                {selectedCourses.map((course, i) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{course.title}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveCourse(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                        <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button type="button" onClick={() => moveCourse(i, 1)} disabled={i === selectedCourses.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button type="button" onClick={() => removeCourse(course.id)} className="p-1 rounded hover:bg-red-50">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Add at least one course to define the path sequence.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button
              type="submit"
              disabled={createPath.isPending || !title || selectedCourses.length === 0}
              className="flex items-center gap-2"
            >
              {createPath.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Path
            </Button>
            <Link href="/lms/paths">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
