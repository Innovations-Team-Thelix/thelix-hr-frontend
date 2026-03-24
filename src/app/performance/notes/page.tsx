"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/loading";
import { useEmployeeNotes, useCreateEmployeeNote, useUpdateEmployeeNote, useDeleteEmployeeNote } from "@/hooks";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import type { EmployeeNote } from "@/hooks";

export default function NotesPage() {
  const { data: notes, isLoading } = useEmployeeNotes();
  const createNote = useCreateEmployeeNote();
  const updateNote = useUpdateEmployeeNote();
  const deleteNote = useDeleteEmployeeNote();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<EmployeeNote | null>(null);
  const [body, setBody] = useState("");
  const [shareWithManager, setShareWithManager] = useState(false);

  function openCreate() { setBody(""); setShareWithManager(false); setModal("create"); }
  function openEdit(note: EmployeeNote) { setEditing(note); setBody(note.body); setShareWithManager(!!note.sharedWithManagerAt); setModal("edit"); }
  function close() { setModal(null); setEditing(null); setBody(""); setShareWithManager(false); }

  async function handleSave() {
    if (!body.trim()) return toast.error("Note cannot be empty.");
    try {
      if (modal === "create") {
        await createNote.mutateAsync({ body, shareWithManager });
        toast.success("Note saved.");
      } else if (editing) {
        await updateNote.mutateAsync({ id: editing.id, body, shareWithManager });
        toast.success("Note updated.");
      }
      close();
    } catch { toast.error("Failed to save note."); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    try {
      await deleteNote.mutateAsync(id);
      toast.success("Note deleted.");
    } catch { toast.error("Failed to delete note."); }
  }

  return (
    <AppLayout pageTitle="My Notes">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-500" /> Private Notes
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Personal notes visible only to you (unless shared with manager).</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> New Note
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : (notes ?? []).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Start logging your accomplishments and reflections.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes!.map((note) => (
              <Card key={note.id} className={note.sharedWithManagerAt ? "border-purple-100" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{note.body}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                        {note.sharedWithManagerAt && (
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            Shared with manager
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(note)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={!!modal} onClose={close} title={modal === "create" ? "New Note" : "Edit Note"}>
          <div className="space-y-4">
            <Textarea
              placeholder="What would you like to capture?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shareWithManager}
                onChange={(e) => setShareWithManager(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Share with my manager</span>
            </label>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={createNote.isPending || updateNote.isPending} className="flex-1">
                {createNote.isPending || updateNote.isPending ? "Saving..." : "Save Note"}
              </Button>
              <Button variant="secondary" onClick={close}>Cancel</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
