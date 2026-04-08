"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/loading";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePraiseWall, usePostPraise, useReactToPraise, useEmployees, useAuth } from "@/hooks";
import { Star, Plus, Send, Slack } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

const VALUE_TAGS = ["Collaboration", "Innovation", "Customer Focus", "Integrity", "Leadership", "Ownership", "Excellence"];
const EMOJI_REACTIONS = ["👏", "🔥", "💪", "🎉", "❤️"];

export default function PraiseWallPage() {
  const { user } = useAuth();
  const { data: praiseRes, isLoading } = usePraiseWall({ page: 1, limit: 30 });
  const { data: employees } = useEmployees({ limit: 1000, status: "Active", scope: "all" });
  const postPraise = usePostPraise();
  const reactToPraise = useReactToPraise();

  const [showModal, setShowModal] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [valueTag, setValueTag] = useState("");

  const employeeOptions = (employees?.data ?? [])
    .filter((e) => e.id !== user?.employeeId)
    .map((e) => ({ value: e.id, label: e.fullName }));

  async function handleSubmit() {
    if (!recipientId || !message.trim()) return toast.error("Select a recipient and write a message.");
    try {
      await postPraise.mutateAsync({ recipientId, message, valueTag: valueTag || undefined });
      toast.success("Recognition posted!");
      setShowModal(false);
      setRecipientId(""); setMessage(""); setValueTag("");
    } catch {
      toast.error("Failed to post recognition.");
    }
  }

  const praises = praiseRes?.data ?? [];

  return (
    <AppLayout pageTitle="Praise Wall">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" /> Praise Wall
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Celebrate your colleagues publicly.</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Recognize Someone
          </Button>
        </div>

        {/* Praise Feed */}
        {isLoading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
        ) : praises.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No recognition yet. Be the first to celebrate a colleague!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {praises.map((p) => {
              const reactions = p.reactions as Record<string, string[]>;
              return (
                <Card key={p.id} className="border-yellow-100 bg-gradient-to-br from-yellow-50/40 to-white">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {p.giver.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-sm text-gray-600 flex-wrap">
                          <span className="font-semibold text-gray-900">{p.giver.fullName}</span>
                          <span>recognized</span>
                          <span className="font-semibold text-indigo-600">{p.recipient.fullName}</span>
                        </div>
                        <p className="mt-1 text-gray-800 leading-relaxed">{p.message}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {p.valueTag && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                              {p.valueTag}
                            </span>
                          )}
                          {p.slackPosted && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Slack className="w-3 h-3" /> Shared on Slack
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{formatDate(p.createdAt)}</span>
                        </div>

                        {/* Emoji reactions */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {EMOJI_REACTIONS.map((emoji) => {
                            const reactors = reactions[emoji] ?? [];
                            const iMine = user?.employeeId ? reactors.includes(user.employeeId) : false;
                            return (
                              <button
                                key={emoji}
                                onClick={() => reactToPraise.mutate({ praiseId: p.id, emoji })}
                                className={`text-sm px-2 py-0.5 rounded-full border transition-colors ${iMine ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50"}`}
                              >
                                {emoji} {reactors.length > 0 ? reactors.length : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Post Praise Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Recognize a Colleague">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colleague</label>
              <SearchableSelect
                options={employeeOptions}
                value={recipientId}
                onChange={setRecipientId}
                placeholder="Search by name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <Textarea
                placeholder="What did they do that deserves recognition?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Value (optional)</label>
              <div className="flex flex-wrap gap-2">
                {VALUE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setValueTag(valueTag === tag ? "" : tag)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${valueTag === tag ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600 hover:border-indigo-300"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={postPraise.isPending} className="flex-1">
                <Send className="w-4 h-4 mr-1" />
                {postPraise.isPending ? "Posting..." : "Post Recognition"}
              </Button>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
