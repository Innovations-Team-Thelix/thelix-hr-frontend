"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { useLmsPath, useUpdateLmsPath, useLmsCourses } from "@/hooks";
import { MapPin, Plus, X, GripVertical, ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

export default function EditPathPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const router = useRouter();
  const { data, isLoading } = useLmsPath(pathId);
  const updatePath = useUpdateLmsPath(pathId);
  const { data: coursesData } = useLmsCourses({ published: undefined });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<{ id: string; title: string }[]>([]);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");

  // Pre-populate form when path loads
  useEffect(() => {
    if (!data) return;
    const p = data as any;
    setTitle(p.title ?? "");
    setDescription(p.description ?? "");
    setSelectedCourses(
      (p.courses ?? []).map((pc: any) => ({ id: pc.courseId ?? pc.course?.id, title: pc.course?.title ?? pc.title }))
    );
  }, [data]);

  const allCourses = (coursesData as any[]) ?? [];
  const filteredCourses = allCourses.filter(
    (c: any) =>
      c.title.toLowerCase().includes(courseSearch.toLowerCase()) &&
      !selectedCourses.find((s) => s.id === c.id)
  );

  const addCourse = (course: any) => {
    setSelectedCourses((prev) => [...prev, { id: course.id, title: course.title }]);
    setCourseSearch("");
    setCoursePickerOpen(false);
  };

  const removeCourse = (id: string) => setSelectedCourses((prev) => prev.filter((c) => c.id !== id));

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
    updatePath.mutate(
      { title, description: description || undefined, courseIds: selectedCourses.map((c) => c.id) },
      { onSuccess: () => router.push("/lms/paths") }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <Link href="/lms/paths">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Paths
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Edit Learning Path
          </h1>
          <p className="text-gray-500 text-sm mt-1">Update path details and course sequence.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Path Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. New Employee Onboarding" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What will employees achieve?" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Course Sequence * <span className="text-gray-400 font-normal">({selectedCourses.length} courses)</span>
              </label>
              <button type="button" onClick={() => setCoursePickerOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-700 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Course
              </button>
            </div>

            {coursePickerOpen && (
              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-2 border-b bg-gray-50">
                  <input autoFocus
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Search courses…" value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)} />
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                  {filteredCourses.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">No matching courses.</p>
                  ) : (
                    filteredCourses.map((c: any) => (
                      <button key={c.id} type="button" onClick={() => addCourse(c)}
                        className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors flex items-center justify-between group">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{c.title}</p>
                          <p className="text-xs text-gray-400 capitalize mt-0.5">{c.difficulty} · {c.estimatedMins ?? 0} min</p>
                        </div>
                        <Plus className="w-4 h-4 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedCourses.length > 0 ? (
              <div className="space-y-2">
                {selectedCourses.map((course, i) => (
                  <div key={course.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</div>
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
                <p className="text-sm text-gray-400">Add at least one course to the sequence.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Button type="submit" disabled={updatePath.isPending || !title || selectedCourses.length === 0} className="flex items-center gap-2">
              {updatePath.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
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
