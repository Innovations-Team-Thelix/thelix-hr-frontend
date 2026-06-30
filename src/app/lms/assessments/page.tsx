"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useLmsCourses, useLmsCourse, useEffectiveRole,
  useQuizByCourse, useCreateQuiz, useUpdateQuiz,
  useAddQuestion, useUpdateQuestion, useDeleteQuestion,
} from "@/hooks";
import api from "@/lib/api";
import {
  ClipboardList, Plus, Search, CheckCircle2,
  Trash2, Pencil, Loader2, X, Check,
  HelpCircle, AlignLeft, ToggleLeft, CheckSquare, Circle,
  Zap, Settings2, BookOpen, Timer, Shuffle, Eye, RotateCcw,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type QType = "MultipleChoice" | "MultiSelect" | "TrueFalse" | "ShortAnswer" | "FillInBlank";

type OptionDraft = { text: string; isCorrect: boolean };
type QuestionDraft = {
  questionText: string;
  type: QType;
  points: number;
  explanation: string;
  options: OptionDraft[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const Q_TYPES: { value: QType; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { value: "MultipleChoice", label: "Multiple Choice", icon: Circle,      color: "text-blue",        bg: "bg-blue-100",     border: "border-blue-300"    },
  { value: "MultiSelect",    label: "Multi-Select",    icon: CheckSquare, color: "text-purple-700",  bg: "bg-purple-100",   border: "border-purple-300"  },
  { value: "TrueFalse",      label: "True / False",    icon: ToggleLeft,  color: "text-green-700",   bg: "bg-green-100",    border: "border-green-300"   },
  { value: "ShortAnswer",    label: "Short Answer",    icon: AlignLeft,   color: "text-amber-700",   bg: "bg-amber-100",    border: "border-amber-300"   },
  { value: "FillInBlank",    label: "Fill in Blank",   icon: HelpCircle,  color: "text-primary-700", bg: "bg-primary-100",  border: "border-primary-300" },
];

const Q_TYPE_MAP = Object.fromEntries(Q_TYPES.map(t => [t.value, t]));

const defaultDraft = (): QuestionDraft => ({
  questionText: "",
  type: "MultipleChoice",
  points: 1,
  explanation: "",
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
});

// ─── Auto-generate ───────────────────────────────────────────────────────────

function generateQuestions(course: any): QuestionDraft[] {
  const mods: any[] = course.modules ?? [];
  const qs: QuestionDraft[] = [];

  if (mods.length >= 2) {
    qs.push({
      questionText: `Which of the following is a module in the "${course.title}" course?`,
      type: "MultipleChoice",
      points: 1,
      explanation: `"${mods[0].title}" is a module in this course.`,
      options: [
        { text: mods[0].title, isCorrect: true },
        { text: `Advanced ${course.category?.name ?? "Studies"} Part II`, isCorrect: false },
        { text: "Introduction to Project Management", isCorrect: false },
        { text: "Business Communication Essentials", isCorrect: false },
      ],
    });
  }

  if (mods.length > 0) {
    qs.push({
      questionText: `How many modules does the "${course.title}" course contain?`,
      type: "MultipleChoice",
      points: 1,
      explanation: `The course contains exactly ${mods.length} module${mods.length !== 1 ? "s" : ""}.`,
      options: [
        { text: String(mods.length), isCorrect: true },
        { text: String(Math.max(1, mods.length - 1)), isCorrect: false },
        { text: String(mods.length + 1), isCorrect: false },
        { text: String(mods.length + 2), isCorrect: false },
      ],
    });
  }

  mods.slice(0, 5).forEach((mod: any, mi: number) => {
    const lessons: any[] = mod.lessons ?? [];
    if (lessons.length === 0) return;

    const correctLesson = lessons[0];
    const wrongPool = mods
      .filter((_: any, i: number) => i !== mi)
      .flatMap((m: any) => m.lessons ?? []);

    const opts: OptionDraft[] = [
      { text: correctLesson.title, isCorrect: true },
      ...wrongPool.slice(0, 3).map((l: any) => ({ text: l.title, isCorrect: false })),
    ];
    while (opts.length < 4) {
      opts.push({ text: `Sample Lesson Topic ${opts.length}`, isCorrect: false });
    }

    qs.push({
      questionText: `Which lesson is included in Module ${mi + 1}: "${mod.title}"?`,
      type: "MultipleChoice",
      points: 1,
      explanation: `"${correctLesson.title}" belongs to the "${mod.title}" module.`,
      options: opts.slice(0, 4),
    });

    lessons.slice(0, 2).forEach((lesson: any) => {
      qs.push({
        questionText: `"${lesson.title}" is a topic covered in the "${course.title}" course.`,
        type: "TrueFalse",
        points: 1,
        explanation: `This lesson is part of Module: ${mod.title}.`,
        options: [
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false },
        ],
      });
    });
  });

  return qs.slice(0, 15);
}

// ─── Question Form ───────────────────────────────────────────────────────────

function QuestionForm({
  draft, onChange, onSave, onCancel, saving,
}: {
  draft: QuestionDraft;
  onChange: (d: QuestionDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const isMulti = draft.type === "MultiSelect";
  const isTF    = draft.type === "TrueFalse";
  const hasOpts = ["MultipleChoice", "MultiSelect", "TrueFalse"].includes(draft.type);

  const setType = (t: QType) => {
    const next: QuestionDraft = { ...draft, type: t };
    if (t === "TrueFalse") {
      next.options = [{ text: "True", isCorrect: true }, { text: "False", isCorrect: false }];
    } else if (t === "ShortAnswer" || t === "FillInBlank") {
      next.options = [];
    } else if (draft.type === "TrueFalse" || !draft.options.length) {
      next.options = [{ text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }, { text: "", isCorrect: false }];
    }
    onChange(next);
  };

  const toggleCorrect = (i: number) => {
    const opts = draft.options.map((o, j) =>
      isMulti ? (j === i ? { ...o, isCorrect: !o.isCorrect } : o)
              : { ...o, isCorrect: j === i }
    );
    onChange({ ...draft, options: opts });
  };

  const isValid =
    draft.questionText.trim().length > 0 &&
    (!hasOpts || draft.options.filter(o => o.text.trim()).length >= 2) &&
    (!hasOpts || draft.options.some(o => o.isCorrect));

  return (
    <div className="border border-primary-200 rounded-xl bg-primary-50/30 p-4 space-y-4">
      {/* Type pills */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Question Type</p>
        <div className="flex flex-wrap gap-1.5">
          {Q_TYPES.map(qt => (
            <button
              key={qt.value}
              type="button"
              onClick={() => setType(qt.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                draft.type === qt.value
                  ? `${qt.bg} ${qt.color} ${qt.border}`
                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"
              }`}
            >
              <qt.icon className="w-3 h-3" />
              {qt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">
          Question <span className="text-red-400">*</span>
        </label>
        <textarea
          autoFocus
          rows={2}
          value={draft.questionText}
          onChange={e => onChange({ ...draft, questionText: e.target.value })}
          placeholder="Type your question here…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white resize-none"
        />
      </div>

      {/* Options */}
      {hasOpts && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            {isTF ? "Correct Answer" : isMulti ? "Options — check all correct" : "Options — check the correct one"}
          </p>
          <div className="space-y-2">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => toggleCorrect(i)}
                  title={opt.isCorrect ? "Correct answer" : "Mark as correct"}
                  className={`shrink-0 w-5 h-5 flex items-center justify-center transition-all ${
                    isMulti ? "rounded" : "rounded-full"
                  } border-2 ${opt.isCorrect ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"}`}
                >
                  {opt.isCorrect && <Check className="w-3 h-3 text-white" />}
                </button>
                {isTF ? (
                  <span className={`text-sm font-medium ${opt.isCorrect ? "text-green-700" : "text-gray-500"}`}>{opt.text}</span>
                ) : (
                  <input
                    value={opt.text}
                    onChange={e => {
                      const opts = draft.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o);
                      onChange({ ...draft, options: opts });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary bg-white"
                  />
                )}
                {!isTF && draft.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...draft, options: draft.options.filter((_, j) => j !== i) })}
                    className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isTF && draft.options.length < 8 && (
            <button
              type="button"
              onClick={() => onChange({ ...draft, options: [...draft.options, { text: "", isCorrect: false }] })}
              className="mt-2.5 text-xs text-primary hover:text-primary-600 flex items-center gap-1 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add option
            </button>
          )}
        </div>
      )}

      {/* Points + Explanation */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Points</label>
          <input
            type="number"
            min={1}
            max={10}
            value={draft.points}
            onChange={e => onChange({ ...draft, points: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary bg-white"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Explanation (optional)</label>
          <input
            value={draft.explanation}
            onChange={e => onChange({ ...draft, explanation: e.target.value })}
            placeholder="Explain the correct answer…"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary bg-white"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1 border-t border-primary-100">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={!isValid || saving}>
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          {saving ? "Saving…" : "Save Question"}
        </Button>
      </div>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────────

function SettingsPanel({
  quiz, courseId, onClose,
}: {
  quiz: any;
  courseId: string;
  onClose: () => void;
}) {
  const updateQuiz = useUpdateQuiz(courseId);
  const [form, setForm] = useState({
    title: quiz.title,
    passScore: quiz.passScore,
    maxAttempts: quiz.maxAttempts,
    timeLimitMins: quiz.timeLimitMins ? String(quiz.timeLimitMins) : "",
    shuffleQ: quiz.shuffleQ,
    shuffleOptions: quiz.shuffleOptions,
    showResults: quiz.showResults,
  });

  const handleSave = async () => {
    await updateQuiz.mutateAsync({
      id: quiz.id,
      data: {
        ...form,
        timeLimitMins: form.timeLimitMins ? parseInt(form.timeLimitMins) : undefined,
      },
    });
    onClose();
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" /> Assessment Settings
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 block mb-1">Assessment Title</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Pass Score (%)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.passScore}
            onChange={e => setForm(f => ({ ...f, passScore: parseInt(e.target.value) || 70 }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Max Attempts</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.maxAttempts}
            onChange={e => setForm(f => ({ ...f, maxAttempts: parseInt(e.target.value) || 3 }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Time Limit (mins, optional)</label>
          <input
            type="number"
            min={1}
            value={form.timeLimitMins}
            onChange={e => setForm(f => ({ ...f, timeLimitMins: e.target.value }))}
            placeholder="No limit"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary bg-white"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        {[
          { key: "shuffleQ",       label: "Shuffle question order",   icon: Shuffle },
          { key: "shuffleOptions", label: "Shuffle answer options",    icon: Shuffle },
          { key: "showResults",    label: "Show results after submit", icon: Eye     },
        ].map(({ key, label, icon: Icon }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={(form as any)[key]}
              onClick={() => setForm(f => ({ ...f, [key]: !(f as any)[key] }))}
              className={`relative w-9 h-5 rounded-full transition-colors ${(form as any)[key] ? "bg-primary" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(form as any)[key] ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <Icon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-600">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-gray-200">
        <Button variant="outline" size="sm" onClick={onClose} disabled={updateQuiz.isPending}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={updateQuiz.isPending}>
          {updateQuiz.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AssessmentsPage() {
  const qc = useQueryClient();
  const effectiveRole = useEffectiveRole();
  const isAdmin = effectiveRole === "CVO" || effectiveRole === "Admin";

  // Course list
  const [courseSearch, setCourseSearch] = useState("");
  const { data: coursesData, isLoading: coursesLoading } = useLmsCourses({});
  const courses = (coursesData as any[]) ?? [];
  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  // Selected course
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: courseDetail, isLoading: courseDetailLoading } = useLmsCourse(selectedId ?? "");
  const { data: quiz, isLoading: quizLoading } = useQuizByCourse(selectedId ?? "");

  // Mutations
  const createQuiz    = useCreateQuiz(selectedId ?? "");
  const addQuestion   = useAddQuestion(selectedId ?? "");
  const updateQuestion = useUpdateQuestion(selectedId ?? "");
  const deleteQuestion = useDeleteQuestion(selectedId ?? "");

  // UI state
  const [addingQ, setAddingQ]             = useState(false);
  const [editingQId, setEditingQId]       = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(defaultDraft());
  const [showSettings, setShowSettings]   = useState(false);
  const [generating, setGenerating]       = useState(false);
  const [deleting, setDeleting]           = useState<string | null>(null);

  // Reset editor state when course changes
  useEffect(() => {
    setAddingQ(false);
    setEditingQId(null);
    setShowSettings(false);
    setGenerating(false);
  }, [selectedId]);

  // Question actions
  const handleStartAdd = () => {
    setEditingQId(null);
    setQuestionDraft(defaultDraft());
    setAddingQ(true);
  };

  const handleStartEdit = (q: any) => {
    setAddingQ(false);
    setQuestionDraft({
      questionText: q.questionText,
      type: q.type as QType,
      points: q.points,
      explanation: q.explanation ?? "",
      options: (q.options ?? []).map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })),
    });
    setEditingQId(q.id);
  };

  const handleSaveQ = async () => {
    if (!quiz) return;
    const payload: any = {
      questionText: questionDraft.questionText,
      type: questionDraft.type,
      points: questionDraft.points,
      explanation: questionDraft.explanation || undefined,
    };
    if (["MultipleChoice", "MultiSelect", "TrueFalse"].includes(questionDraft.type)) {
      payload.options = questionDraft.options.filter(o => o.text.trim());
    }

    if (editingQId) {
      await updateQuestion.mutateAsync({ id: editingQId, data: payload });
      setEditingQId(null);
    } else {
      await addQuestion.mutateAsync({ quizId: (quiz as any).id, data: payload });
      setAddingQ(false);
    }
  };

  const handleDeleteQ = async (id: string) => {
    setDeleting(id);
    try {
      await deleteQuestion.mutateAsync(id);
    } finally {
      setDeleting(null);
    }
  };

  const handleAutoGenerate = async () => {
    if (!courseDetail || !selectedId) return;
    setGenerating(true);
    try {
      let quizId = (quiz as any)?.id as string | undefined;

      if (!quizId) {
        const newQuiz = await api.post(`/lms/courses/${selectedId}/quiz`, {
          title: `${(courseDetail as any).title} Assessment`,
          passScore: 70,
          maxAttempts: 3,
          shuffleQ: true,
          shuffleOptions: true,
          showResults: true,
        }).then(r => r.data);
        quizId = (newQuiz as any).id;
      }

      const questions = generateQuestions(courseDetail as any);
      for (const q of questions) {
        await api.post(`/lms/quizzes/${quizId}/questions`, q);
      }

      await qc.invalidateQueries({ queryKey: ["lms", "quiz", "course", selectedId] });
      await qc.invalidateQueries({ queryKey: ["lms", "courses"] });
      toast.success(`Auto-generated ${questions.length} questions!`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Auto-generate failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateBlank = async () => {
    if (!selectedId || !courseDetail) return;
    await createQuiz.mutateAsync({
      title: `${(courseDetail as any).title} Assessment`,
      passScore: 70,
      maxAttempts: 3,
      showResults: true,
    });
  };

  const withQuiz    = courses.filter(c => (c._count?.quiz ?? 0) > 0).length;
  const withoutQuiz = courses.length - withQuiz;

  const quizData   = quiz as any;
  const questions  = quizData?.questions ?? [];
  const totalPts   = questions.reduce((s: number, q: any) => s + (q.points ?? 1), 0);

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-0 -m-6">
        {/* Top header */}
        <div className="px-6 pt-6 pb-4 border-b bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Assessment Manager</h1>
              <p className="text-xs text-gray-400">Build and manage course assessments</p>
            </div>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{withQuiz}</p>
              <p className="text-[11px] text-gray-400">With Assessment</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-xl font-bold text-amber-500">{withoutQuiz}</p>
              <p className="text-[11px] text-gray-400">Needs Assessment</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{courses.length}</p>
              <p className="text-[11px] text-gray-400">Total Courses</p>
            </div>
          </div>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Course list */}
          <div className="w-72 xl:w-80 border-r bg-white flex flex-col min-h-0 shrink-0">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  placeholder="Search courses…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {coursesLoading ? (
                <div className="p-3 space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No courses found</div>
              ) : (
                filtered.map(c => {
                  const hasQ = (c._count?.quiz ?? 0) > 0;
                  const active = selectedId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors flex items-start gap-3 ${
                        active ? "bg-primary-50 border-l-2 border-l-primary" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${active ? "text-primary-700" : "text-gray-800"}`}>
                          {c.title}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                          {c.difficulty ?? "—"} · {c._count?.modules ?? 0} modules
                        </p>
                      </div>
                      <span className={`shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        hasQ ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {hasQ ? "Has Quiz" : "No Quiz"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Editor */}
          <div className="flex-1 min-w-0 bg-gray-50 flex flex-col overflow-hidden">
            {!selectedId ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                  <ClipboardList className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="font-semibold text-gray-700 mb-1">Select a course</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Choose a course from the left to view or create its assessment.
                </p>
              </div>
            ) : (quizLoading || courseDetailLoading) ? (
              /* Loading */
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="h-8 w-1/3" />
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : !quizData ? (
              /* No quiz yet */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-5">
                  <ClipboardList className="w-9 h-9 text-primary-300" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">No assessment yet</h3>
                <p className="text-sm text-gray-400 mb-6 max-w-sm">
                  {(courseDetail as any)?.modules?.length > 0
                    ? "This course has content. Auto-generate an assessment based on its modules and lessons, or start from scratch."
                    : "Create a blank assessment and add questions manually."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {(courseDetail as any)?.modules?.length > 0 && (
                    <Button
                      onClick={handleAutoGenerate}
                      disabled={generating}
                      className="flex items-center gap-2"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {generating ? "Generating…" : "Auto-Generate from Course"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleCreateBlank}
                    disabled={createQuiz.isPending}
                    className="flex items-center gap-2"
                  >
                    {createQuiz.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Blank Assessment
                  </Button>
                </div>
              </div>
            ) : (
              /* Quiz editor */
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Quiz header */}
                <div className="px-6 py-4 bg-white border-b shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-gray-900 text-base">{quizData.title}</h2>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Pass: {quizData.passScore}%
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <RotateCcw className="w-3 h-3" />
                          {quizData.maxAttempts} attempt{quizData.maxAttempts !== 1 ? "s" : ""}
                        </span>
                        {quizData.timeLimitMins && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Timer className="w-3 h-3" />
                            {quizData.timeLimitMins} min
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <BookOpen className="w-3 h-3" />
                          {questions.length} question{questions.length !== 1 ? "s" : ""} · {totalPts} pt{totalPts !== 1 ? "s" : ""}
                        </span>
                        {quizData.shuffleQ && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Shuffle className="w-3 h-3" />
                            Shuffled
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(courseDetail as any)?.modules?.length > 0 && questions.length === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAutoGenerate}
                          disabled={generating}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          Auto-Generate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowSettings(s => !s)}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Settings
                        <ChevronDown className={`w-3 h-3 transition-transform ${showSettings ? "rotate-180" : ""}`} />
                      </Button>
                      {!addingQ && !editingQId && (
                        <Button size="sm" onClick={handleStartAdd} className="flex items-center gap-1.5 text-xs">
                          <Plus className="w-3.5 h-3.5" /> Add Question
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Settings panel (collapsible) */}
                  {showSettings && (
                    <SettingsPanel
                      quiz={quizData}
                      courseId={selectedId}
                      onClose={() => setShowSettings(false)}
                    />
                  )}

                  {/* Questions list */}
                  {questions.length === 0 && !addingQ ? (
                    <Card>
                      <CardContent className="p-10 text-center">
                        <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 font-medium">No questions yet</p>
                        <p className="text-xs text-gray-300 mt-1">
                          Click "Add Question" above or use Auto-Generate to populate this assessment.
                        </p>
                      </CardContent>
                    </Card>
                  ) : questions.length === 0 && addingQ ? (
                    <QuestionForm
                      draft={questionDraft}
                      onChange={setQuestionDraft}
                      onSave={handleSaveQ}
                      onCancel={() => setAddingQ(false)}
                      saving={addQuestion.isPending}
                    />
                  ) : (
                    <div className="space-y-3">
                      {questions.map((q: any, qi: number) => {
                        const qt = Q_TYPE_MAP[q.type as QType];
                        const isEditing = editingQId === q.id;

                        return (
                          <div key={q.id}>
                            {isEditing ? (
                              <QuestionForm
                                draft={questionDraft}
                                onChange={setQuestionDraft}
                                onSave={handleSaveQ}
                                onCancel={() => setEditingQId(null)}
                                saving={updateQuestion.isPending}
                              />
                            ) : (
                              <Card className={`transition-all ${editingQId && editingQId !== q.id ? "opacity-50" : ""}`}>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    {/* Number */}
                                    <div className="shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                      {qi + 1}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        {qt && (
                                          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${qt.bg} ${qt.color}`}>
                                            <qt.icon className="w-2.5 h-2.5" />
                                            {qt.label}
                                          </span>
                                        )}
                                        <span className="text-[10px] text-gray-400 font-medium">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                                      </div>
                                      <p className="text-sm text-gray-800 font-medium leading-snug">{q.questionText}</p>

                                      {/* Options preview */}
                                      {q.options?.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {q.options.map((opt: any) => (
                                            <div key={opt.id} className={`flex items-center gap-2 text-xs ${opt.isCorrect ? "text-green-700 font-medium" : "text-gray-500"}`}>
                                              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                opt.isCorrect ? "border-green-500 bg-green-500" : "border-gray-300"
                                              }`}>
                                                {opt.isCorrect && <Check className="w-2 h-2 text-white" />}
                                              </div>
                                              {opt.text}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Explanation */}
                                      {q.explanation && (
                                        <p className="text-[11px] text-gray-400 mt-1.5 italic">
                                          Explanation: {q.explanation}
                                        </p>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    {isAdmin && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          onClick={() => handleStartEdit(q)}
                                          disabled={!!editingQId || addingQ}
                                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
                                          title="Edit question"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteQ(q.id)}
                                          disabled={deleting === q.id}
                                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                                          title="Delete question"
                                        >
                                          {deleting === q.id
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Trash2 className="w-3.5 h-3.5" />
                                          }
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        );
                      })}

                      {/* Add question form (when appending at bottom) */}
                      {addingQ && editingQId === null && questions.length > 0 && (
                        <QuestionForm
                          draft={questionDraft}
                          onChange={setQuestionDraft}
                          onSave={handleSaveQ}
                          onCancel={() => setAddingQ(false)}
                          saving={addQuestion.isPending}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
