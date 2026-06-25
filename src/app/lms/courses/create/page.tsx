"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useCreateLmsCourse,
  useLmsCategories,
  useCreateLmsCategory,
  useCreateLmsModule,
  useCreateLmsLesson,
} from "@/hooks";
import {
  PenSquare, Plus, ChevronRight, Check, X, Tag, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

const STEPS = ["Basic Info", "Modules & Lessons", "Review"];

const CATEGORY_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16",
  "#10B981", "#14B8A6", "#3B82F6", "#6366F1",
  "#8B5CF6", "#EC4899",
];

// ─── Inline "new category" popover ──────────────────────────────────────────

function NewCategoryPopover({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName]   = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const create = useCreateLmsCategory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const cat = await create.mutateAsync({ name: name.trim(), color }) as any;
    onCreated(cat.id);
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">New Category</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 font-medium">Name *</label>
          <Input
            autoFocus
            className="mt-1 h-8 text-sm"
            placeholder="e.g. Product Training"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Colour</label>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "#1e40af" : "transparent",
                  boxShadow: color === c ? "0 0 0 2px white, 0 0 0 3px #1e40af" : "none",
                }}
              />
            ))}
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          className="w-full h-8 text-xs"
          disabled={!name.trim() || create.isPending}
        >
          {create.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Create Category
        </Button>
      </form>
    </div>
  );
}

// ─── Category selector ───────────────────────────────────────────────────────

function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { data: categories, isLoading } = useLmsCategories();
  const [showNew, setShowNew] = useState(false);
  const cats = (categories as any[]) ?? [];
  const selected = cats.find((c: any) => c.id === value);

  return (
    <div className="relative">
      <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm pr-8 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
          >
            <option value="">— No category —</option>
            {cats.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selected && (
            <span
              className="absolute right-7 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
              style={{ backgroundColor: selected.color }}
            />
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="flex-shrink-0 w-9 h-9 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          title="Add new category"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Category colour pills */}
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {cats.slice(0, 8).map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all"
              style={{
                backgroundColor: value === c.id ? c.color + "22" : "#f9fafb",
                borderColor:     value === c.id ? c.color : "#e5e7eb",
                color:           value === c.id ? c.color : "#6b7280",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
            </button>
          ))}
          {cats.length > 8 && (
            <span className="text-[11px] text-gray-400 self-center">+{cats.length - 8} more</span>
          )}
        </div>
      )}

      {showNew && (
        <NewCategoryPopover
          onClose={() => setShowNew(false)}
          onCreated={(id) => { onChange(id); setShowNew(false); }}
        />
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CourseBuilderPage() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [courseId, setCourseId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title:        "",
    description:  "",
    categoryId:   "",
    difficulty:   "Beginner",
    estimatedMins: 0,
    isMandatory:  false,
    tags:         [] as string[],
  });

  const [tagInput, setTagInput] = useState("");

  const createCourse = useCreateLmsCourse();

  const handleCreateCourse = async () => {
    if (!form.title.trim()) { toast.error("Course title is required."); return; }
    const course = await createCourse.mutateAsync(form);
    setCourseId((course as any).id);
    setStep(1);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  };

  const removeTag = (t: string) => setForm({ ...form, tags: form.tags.filter((x) => x !== t) });

  const handleFinish = () => {
    toast.success("Course created! You can now add a quiz and survey from the course page.");
    router.push(`/lms/courses/${courseId}`);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PenSquare className="w-6 h-6 text-blue-600" />
            Course Builder
          </h1>
          <p className="text-gray-500 text-sm mt-1">Build your course step by step.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "font-medium text-gray-900" : "text-gray-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* ── Step 0: Basic Info ── */}
        {step === 0 && (
          <Card>
            <CardContent className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-700">Course Title *</label>
                <Input
                  className="mt-1"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Cybersecurity Awareness"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  className="mt-1"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What will employees learn from this course?"
                  rows={3}
                />
              </div>

              {/* Category (with inline create) + Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <CategorySelect
                  value={form.categoryId}
                  onChange={(id) => setForm({ ...form, categoryId: id })}
                />
                <div>
                  <label className="text-sm font-medium text-gray-700">Difficulty</label>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  >
                    {["Beginner", "Intermediate", "Advanced", "Expert"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Duration + Mandatory */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Duration (minutes)</label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    value={form.estimatedMins || ""}
                    placeholder="e.g. 45"
                    onChange={(e) => setForm({ ...form, estimatedMins: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 mt-7">
                  <input
                    type="checkbox"
                    id="mandatory"
                    checked={form.isMandatory}
                    onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="mandatory" className="text-sm text-gray-700 cursor-pointer">Mandatory course</label>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-gray-400" /> Tags
                  <span className="text-xs text-gray-400 font-normal ml-1">(press Enter to add)</span>
                </label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="compliance, safety, onboarding…"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((t) => (
                      <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">
                        {t}
                        <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleCreateCourse}
                disabled={createCourse.isPending || !form.title.trim()}
                className="w-full"
              >
                {createCourse.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
                ) : (
                  "Create Course & Add Content →"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Modules ── */}
        {step === 1 && courseId && (
          <ModulesStep courseId={courseId} onFinish={() => setStep(2)} />
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="font-semibold text-gray-900 text-lg">Course Ready!</h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Your course has been created. Head to the course page to publish it, add a quiz, and set up a survey.
              </p>
              <Button onClick={handleFinish}>Go to Course Page →</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Modules step (unchanged) ────────────────────────────────────────────────

function ModulesStep({ courseId, onFinish }: { courseId: string; onFinish: () => void }) {
  const [modules, setModules] = useState<
    { title: string; lessons: { title: string; contentType: string; contentUrl: string }[] }[]
  >([]);
  const [newModTitle, setNewModTitle] = useState("");
  const createModule = useCreateLmsModule(courseId);
  const createLesson = useCreateLmsLesson(courseId);
  const [saving, setSaving] = useState(false);

  const addModule = () => {
    if (!newModTitle.trim()) return;
    setModules([...modules, { title: newModTitle, lessons: [] }]);
    setNewModTitle("");
  };

  const addLesson = (mi: number) => {
    const updated = [...modules];
    updated[mi].lessons.push({ title: "New Lesson", contentType: "Video", contentUrl: "" });
    setModules(updated);
  };

  const updateLesson = (mi: number, li: number, field: string, value: string) => {
    const updated = [...modules];
    (updated[mi].lessons[li] as any)[field] = value;
    setModules(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const mod of modules) {
        const createdMod = await createModule.mutateAsync({ title: mod.title });
        for (const lesson of mod.lessons) {
          await createLesson.mutateAsync({ moduleId: (createdMod as any).id, data: lesson });
        }
      }
      toast.success("Content saved!");
      onFinish();
    } catch {
      toast.error("Failed to save some content.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {modules.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-sm text-gray-500">Add your first module below to start structuring the course.</p>
          </CardContent>
        </Card>
      )}

      {modules.map((mod, mi) => (
        <Card key={mi}>
          <CardContent className="p-4 space-y-3">
            <p className="font-medium text-gray-800 text-sm">
              Module {mi + 1}: <span className="text-blue-700">{mod.title}</span>
            </p>
            {mod.lessons.map((lesson, li) => (
              <div key={li} className="grid grid-cols-3 gap-2 pl-4">
                <Input
                  placeholder="Lesson title"
                  value={lesson.title}
                  onChange={(e) => updateLesson(mi, li, "title", e.target.value)}
                  className="text-sm h-8"
                />
                <select
                  className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={lesson.contentType}
                  onChange={(e) => updateLesson(mi, li, "contentType", e.target.value)}
                >
                  {["Video", "PDF", "Article", "Audio", "LiveSession", "Embed"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <Input
                  placeholder="URL (optional)"
                  value={lesson.contentUrl}
                  onChange={(e) => updateLesson(mi, li, "contentUrl", e.target.value)}
                  className="text-sm h-8"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => addLesson(mi)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 pl-4 mt-1"
            >
              <Plus className="w-3 h-3" /> Add Lesson
            </button>
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        <Input
          placeholder="Module title e.g. Introduction"
          value={newModTitle}
          onChange={(e) => setNewModTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addModule(); }}
        />
        <Button variant="outline" onClick={addModule} disabled={!newModTitle.trim()}>
          Add Module
        </Button>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || modules.length === 0}
          className="flex-1"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Content & Continue →"}
        </Button>
        <Button variant="ghost" onClick={onFinish} className="text-gray-400 text-sm">
          Skip for now →
        </Button>
      </div>
    </div>
  );
}
