"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { useLmsCourse, useUpdateLmsCourse } from "@/hooks";
import { PenSquare, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;

export default function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { data, isLoading } = useLmsCourse(courseId);
  const update = useUpdateLmsCourse(courseId);

  const course: any = data;

  const [form, setForm] = useState({
    title: "",
    description: "",
    difficulty: "Beginner",
    estimatedMins: "",
    isMandatory: false,
    tags: "",
  });

  useEffect(() => {
    if (course) {
      setForm({
        title: course.title ?? "",
        description: course.description ?? "",
        difficulty: course.difficulty ?? "Beginner",
        estimatedMins: course.estimatedMins?.toString() ?? "",
        isMandatory: course.isMandatory ?? false,
        tags: (course.tags ?? []).join(", "),
      });
    }
  }, [course]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      {
        ...form,
        estimatedMins: form.estimatedMins ? parseInt(form.estimatedMins) : undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      },
      { onSuccess: () => router.push(`/lms/courses/${courseId}`) }
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
        <div className="flex items-center gap-3">
          <Link href={`/lms/courses/${courseId}`}>
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <PenSquare className="w-6 h-6 text-primary" />
              Edit Course
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Update course details. Modules and lessons are managed on the course page.</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="title" className="text-sm font-medium text-gray-700">Course Title *</label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="e.g. Introduction to Safety Protocols"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="description" className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="What will learners gain from this course?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
                  >
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="estimatedMins" className="text-sm font-medium text-gray-700">Estimated Duration (mins)</label>
                  <Input
                    id="estimatedMins"
                    type="number"
                    min={1}
                    value={form.estimatedMins}
                    onChange={(e) => setForm((f) => ({ ...f, estimatedMins: e.target.value }))}
                    placeholder="e.g. 60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="tags" className="text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="compliance, onboarding, safety"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={form.isMandatory}
                  onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                <label htmlFor="isMandatory" className="text-sm font-medium text-gray-700 cursor-pointer">Mark as mandatory course</label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={update.isPending} className="flex items-center gap-2">
                  {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </Button>
                <Link href={`/lms/courses/${courseId}`}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
