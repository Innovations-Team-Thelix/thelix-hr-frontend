"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { useLmsCourses } from "@/hooks";
import { ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import Link from "next/link";

export default function AssessmentsPage() {
  const { data, isLoading } = useLmsCourses({ published: undefined });
  const courses = ((data as any[]) ?? []).filter((c: any) => c._count?.quiz > 0 || true);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Assessments
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage quizzes and assessments for your courses.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No courses yet. Create a course first, then add a quiz.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {courses.map((course: any) => (
              <Card key={course.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{course.title}</p>
                    <p className="text-xs text-gray-400 capitalize">{course.difficulty} · {course._count?.modules ?? 0} modules</p>
                  </div>
                  <Link href={`/lms/courses/${course.id}`}>
                    <button className="text-xs text-blue-600 hover:underline">Manage Quiz →</button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
