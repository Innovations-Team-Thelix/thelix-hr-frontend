import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";

// ─── Helpers ─────────────────────────────────────────

function lmsKeys() {
  return {
    categories: ["lms", "categories"] as const,
    courses: (filters?: object) => ["lms", "courses", filters] as const,
    course: (id: string) => ["lms", "course", id] as const,
    myEnrollments: ["lms", "enrollments", "me"] as const,
    courseEnrollments: (courseId: string) => ["lms", "enrollments", "course", courseId] as const,
    courseProgress: (courseId: string) => ["lms", "progress", courseId] as const,
    myAttempts: (quizId: string) => ["lms", "quiz", quizId, "attempts"] as const,
    surveyCourse: (courseId: string) => ["lms", "survey", courseId] as const,
    myCertificates: ["lms", "certificates", "me"] as const,
    paths: ["lms", "paths"] as const,
    path: (id: string) => ["lms", "path", id] as const,
    pathProgress: (id: string) => ["lms", "path", id, "progress"] as const,
    leaderboard: (period: string) => ["lms", "leaderboard", period] as const,
    myBadges: ["lms", "badges", "me"] as const,
    myPoints: ["lms", "points", "me"] as const,
    teamProgress: ["lms", "team", "progress"] as const,
    teamAtRisk: ["lms", "team", "at-risk"] as const,
    myDashboard: ["lms", "dashboard", "me"] as const,
    adminDashboard: ["lms", "dashboard", "admin"] as const,
    employeeReport: (filters?: object) => ["lms", "reports", "employee", filters] as const,
    departmentReport: (filters?: object) => ["lms", "reports", "department", filters] as const,
    courseReport: (courseId?: string) => ["lms", "reports", "course", courseId] as const,
  };
}

// ─── Dashboard ───────────────────────────────────────

export function useMyLmsDashboard() {
  return useQuery({ queryKey: lmsKeys().myDashboard, queryFn: () => api.get("/lms/dashboard/me").then((r) => r.data) });
}

export function useAdminLmsDashboard() {
  return useQuery({ queryKey: lmsKeys().adminDashboard, queryFn: () => api.get("/lms/dashboard/admin").then((r) => r.data) });
}

// ─── Categories ──────────────────────────────────────

export function useLmsCategories() {
  return useQuery({ queryKey: lmsKeys().categories, queryFn: () => api.get("/lms/categories").then((r) => r.data) });
}

export function useCreateLmsCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/lms/categories", data).then((r) => r.data),
    onSuccess: () => { toast.success("Category created."); qc.invalidateQueries({ queryKey: lmsKeys().categories }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create category."),
  });
}

export function useDeleteLmsCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lms/categories/${id}`),
    onSuccess: () => { toast.success("Category deleted."); qc.invalidateQueries({ queryKey: lmsKeys().categories }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete category."),
  });
}

// ─── Courses ─────────────────────────────────────────

export function useLmsCourses(filters?: object) {
  return useQuery({
    queryKey: lmsKeys().courses(filters),
    queryFn: () => api.get("/lms/courses", { params: filters }).then((r) => r.data),
  });
}

export function useLmsCourse(id: string) {
  return useQuery({
    queryKey: lmsKeys().course(id),
    queryFn: () => api.get(`/lms/courses/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateLmsCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/lms/courses", data).then((r) => r.data),
    onSuccess: () => { toast.success("Course created."); qc.invalidateQueries({ queryKey: lmsKeys().courses() }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create course."),
  });
}

export function useUpdateLmsCourse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.put(`/lms/courses/${id}`, data).then((r) => r.data),
    onSuccess: () => { toast.success("Course updated."); qc.invalidateQueries({ queryKey: lmsKeys().course(id) }); qc.invalidateQueries({ queryKey: lmsKeys().courses() }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update course."),
  });
}

export function usePublishLmsCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/lms/courses/${id}/publish`).then((r) => r.data),
    onSuccess: (data: any) => { toast.success(`Course ${data.isPublished ? "published" : "unpublished"}.`); qc.invalidateQueries({ queryKey: lmsKeys().courses() }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update publish status."),
  });
}

export function useDeleteLmsCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lms/courses/${id}`),
    onSuccess: () => { toast.success("Course deleted."); qc.invalidateQueries({ queryKey: lmsKeys().courses() }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete course."),
  });
}

// ─── Modules ─────────────────────────────────────────

export function useCreateLmsModule(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post(`/lms/courses/${courseId}/modules`, data).then((r) => r.data),
    onSuccess: () => { toast.success("Module added."); qc.invalidateQueries({ queryKey: lmsKeys().course(courseId) }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to add module."),
  });
}

export function useUpdateLmsModule(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/lms/modules/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: lmsKeys().course(courseId) }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update module."),
  });
}

export function useDeleteLmsModule(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lms/modules/${id}`),
    onSuccess: () => { toast.success("Module removed."); qc.invalidateQueries({ queryKey: lmsKeys().course(courseId) }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete module."),
  });
}

// ─── Lessons ─────────────────────────────────────────

export function useCreateLmsLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: string; data: object }) => api.post(`/lms/modules/${moduleId}/lessons`, data).then((r) => r.data),
    onSuccess: () => { toast.success("Lesson added."); qc.invalidateQueries({ queryKey: lmsKeys().course(courseId) }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to add lesson."),
  });
}

export function useUpdateLmsLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/lms/lessons/${id}`, data).then((r) => r.data),
    onSuccess: () => { toast.success("Lesson updated."); qc.invalidateQueries({ queryKey: lmsKeys().course(courseId) }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update lesson."),
  });
}

export function useDeleteLmsLesson(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lms/lessons/${id}`),
    onSuccess: () => { toast.success("Lesson removed."); qc.invalidateQueries({ queryKey: lmsKeys().course(courseId) }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete lesson."),
  });
}

// ─── Enrollment ──────────────────────────────────────

export function useMyEnrollments() {
  return useQuery({ queryKey: lmsKeys().myEnrollments, queryFn: () => api.get("/lms/enrollments/me").then((r) => r.data) });
}

export function useBulkEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/lms/enrollments", data).then((r) => r.data),
    onSuccess: (res: any) => { toast.success(res.message ?? "Enrolled successfully."); qc.invalidateQueries({ queryKey: lmsKeys().myEnrollments }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Enrollment failed."),
  });
}

export function useSelfEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => api.post(`/lms/enrollments/self/${courseId}`).then((r) => r.data),
    onSuccess: () => { toast.success("Enrolled successfully!"); qc.invalidateQueries({ queryKey: lmsKeys().myEnrollments }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Enrollment failed."),
  });
}

export function useCourseEnrollments(courseId: string) {
  return useQuery({
    queryKey: lmsKeys().courseEnrollments(courseId),
    queryFn: () => api.get(`/lms/enrollments/course/${courseId}`).then((r) => r.data),
    enabled: !!courseId,
  });
}

// ─── Progress ────────────────────────────────────────

export function useMarkLessonProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: { isCompleted?: boolean; watchedSecs?: number } }) =>
      api.post(`/lms/progress/lesson/${lessonId}`, data),
    onSuccess: (_res, { lessonId }) => {
      qc.invalidateQueries({ queryKey: lmsKeys().myEnrollments });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update progress."),
  });
}

export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: lmsKeys().courseProgress(courseId),
    queryFn: () => api.get(`/lms/progress/course/${courseId}/me`).then((r) => r.data),
    enabled: !!courseId,
  });
}

// ─── Quiz CRUD (admin) ───────────────────────────────

export function useQuizByCourse(courseId: string) {
  return useQuery({
    queryKey: ["lms", "quiz", "course", courseId],
    queryFn: async () => {
      try {
        return await api.get(`/lms/courses/${courseId}/quiz`).then((r) => r.data);
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
    enabled: !!courseId,
    retry: false,
  });
}

export function useCreateQuiz(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post(`/lms/courses/${courseId}/quiz`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Assessment created.");
      qc.invalidateQueries({ queryKey: ["lms", "quiz", "course", courseId] });
      qc.invalidateQueries({ queryKey: ["lms", "courses"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create assessment."),
  });
}

export function useUpdateQuiz(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/lms/quizzes/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Settings saved.");
      qc.invalidateQueries({ queryKey: ["lms", "quiz", "course", courseId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to save settings."),
  });
}

export function useAddQuestion(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, data }: { quizId: string; data: object }) =>
      api.post(`/lms/quizzes/${quizId}/questions`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Question added.");
      qc.invalidateQueries({ queryKey: ["lms", "quiz", "course", courseId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to add question."),
  });
}

export function useUpdateQuestion(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/lms/quiz-questions/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Question updated.");
      qc.invalidateQueries({ queryKey: ["lms", "quiz", "course", courseId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update question."),
  });
}

export function useDeleteQuestion(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lms/quiz-questions/${id}`),
    onSuccess: () => {
      toast.success("Question removed.");
      qc.invalidateQueries({ queryKey: ["lms", "quiz", "course", courseId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to remove question."),
  });
}

// ─── Quiz (take) ─────────────────────────────────────

export function useStartQuizAttempt() {
  return useMutation({
    mutationFn: (quizId: string) => api.post(`/lms/quizzes/${quizId}/attempt/start`).then((r) => r.data),
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to start quiz."),
  });
}

export function useSubmitQuizAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, attemptId, data }: { quizId: string; attemptId: string; data: object }) =>
      api.post(`/lms/quizzes/${quizId}/attempt/${attemptId}/submit`, data).then((r) => r.data),
    onSuccess: (_res, { quizId }) => {
      toast.success("Quiz submitted!");
      qc.invalidateQueries({ queryKey: lmsKeys().myAttempts(quizId) });
      qc.invalidateQueries({ queryKey: lmsKeys().myEnrollments });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to submit quiz."),
  });
}

export function useMyQuizAttempts(quizId: string) {
  return useQuery({
    queryKey: lmsKeys().myAttempts(quizId),
    queryFn: () => api.get(`/lms/quizzes/${quizId}/my-attempts`).then((r) => r.data),
    enabled: !!quizId,
  });
}

// ─── Survey ──────────────────────────────────────────

export function useCourseSurvey(courseId: string) {
  return useQuery({
    queryKey: lmsKeys().surveyCourse(courseId),
    queryFn: () => api.get(`/lms/courses/${courseId}/survey`).then((r) => r.data),
    enabled: !!courseId,
  });
}

export function useSubmitSurvey() {
  return useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: string; data: object }) =>
      api.post(`/lms/surveys/${surveyId}/respond`, data).then((r) => r.data),
    onSuccess: () => toast.success("Survey submitted. Thank you!"),
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to submit survey."),
  });
}

// ─── Certificates ────────────────────────────────────

export function useMyCertificates() {
  return useQuery({ queryKey: lmsKeys().myCertificates, queryFn: () => api.get("/lms/certificates/me").then((r) => r.data) });
}

export function useDownloadCertificate() {
  return useMutation({
    mutationFn: (id: string) =>
      api.get<{ url: string }>(`/lms/certificates/${id}/download`).then((r) => r.data),
    onSuccess: (data: any) => {
      const url = data?.url;
      if (url) window.open(url, "_blank", "noopener");
      else toast.error("Certificate is not ready yet.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to download certificate."),
  });
}

// ─── Learning Paths ──────────────────────────────────

export function useLmsPaths() {
  return useQuery({ queryKey: lmsKeys().paths, queryFn: () => api.get("/lms/paths").then((r) => r.data) });
}

export function useLmsPath(id: string) {
  return useQuery({ queryKey: lmsKeys().path(id), queryFn: () => api.get(`/lms/paths/${id}`).then((r) => r.data), enabled: !!id });
}

export function useCreateLmsPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.post("/lms/paths", data).then((r) => r.data),
    onSuccess: () => { toast.success("Learning path created."); qc.invalidateQueries({ queryKey: lmsKeys().paths }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create path."),
  });
}

export function useUpdateLmsPath(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: object) => api.put(`/lms/paths/${id}`, data).then((r) => r.data),
    onSuccess: () => { toast.success("Path updated."); qc.invalidateQueries({ queryKey: lmsKeys().paths }); qc.invalidateQueries({ queryKey: lmsKeys().path(id) }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update path."),
  });
}

export function useDeleteLmsPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lms/paths/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success("Path deleted."); qc.invalidateQueries({ queryKey: lmsKeys().paths }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to delete path."),
  });
}

export function useEnrollInPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pathId, data }: { pathId: string; data: object }) =>
      api.post(`/lms/paths/${pathId}/enroll`, data).then((r) => r.data),
    onSuccess: (res: any) => { toast.success(res.message ?? "Enrolled in path."); qc.invalidateQueries({ queryKey: lmsKeys().paths }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Enrollment failed."),
  });
}

export function useSelfEnrollPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pathId: string) => api.post(`/lms/paths/${pathId}/enroll/self`).then((r) => r.data),
    onSuccess: () => { toast.success("Enrolled in learning path!"); qc.invalidateQueries({ queryKey: lmsKeys().paths }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Enrollment failed."),
  });
}

export function useLmsPathProgress(pathId: string) {
  return useQuery({
    queryKey: lmsKeys().pathProgress(pathId),
    queryFn: () => api.get(`/lms/paths/${pathId}/progress/me`).then((r) => r.data),
    enabled: !!pathId,
  });
}

// ─── Gamification ────────────────────────────────────

export function useSbuLeaderboard(period: "weekly" | "monthly" | "all" = "all") {
  return useQuery({
    queryKey: ["lms", "leaderboard", "sbu", period],
    queryFn: () => api.get("/lms/leaderboard/sbu", { params: { period } }).then((r) => r.data),
  });
}

export function useDepartmentLeaderboard(period: "weekly" | "monthly" | "all" = "all") {
  return useQuery({
    queryKey: ["lms", "leaderboard", "department", period],
    queryFn: () => api.get("/lms/leaderboard/department", { params: { period } }).then((r) => r.data),
  });
}

export function useLmsLeaderboard(period: "weekly" | "monthly" | "all" = "all") {
  return useQuery({
    queryKey: lmsKeys().leaderboard(period),
    queryFn: () => api.get("/lms/leaderboard", { params: { period } }).then((r) => r.data),
  });
}

export function useMyLmsBadges() {
  return useQuery({ queryKey: lmsKeys().myBadges, queryFn: () => api.get("/lms/badges/me").then((r) => r.data) });
}

export function useMyLmsPoints() {
  return useQuery({ queryKey: lmsKeys().myPoints, queryFn: () => api.get("/lms/points/me").then((r) => r.data) });
}

// ─── Team ────────────────────────────────────────────

export function useLmsTeamProgress() {
  return useQuery({ queryKey: lmsKeys().teamProgress, queryFn: () => api.get("/lms/team/progress").then((r) => r.data) });
}

export function useLmsTeamAtRisk() {
  return useQuery({ queryKey: lmsKeys().teamAtRisk, queryFn: () => api.get("/lms/team/at-risk").then((r) => r.data) });
}

// ─── Reports ─────────────────────────────────────────

export function useLmsEmployeeReport(filters?: object) {
  return useQuery({
    queryKey: lmsKeys().employeeReport(filters),
    queryFn: () => api.get("/lms/reports/employee", { params: filters }).then((r) => r.data),
  });
}

export function useLmsDepartmentReport(filters?: object) {
  return useQuery({
    queryKey: lmsKeys().departmentReport(filters),
    queryFn: () => api.get("/lms/reports/department", { params: filters }).then((r) => r.data),
  });
}

export function useLmsCourseReport(courseId?: string) {
  return useQuery({
    queryKey: lmsKeys().courseReport(courseId),
    queryFn: () => api.get("/lms/reports/course", { params: courseId ? { courseId } : {} }).then((r) => r.data),
  });
}
