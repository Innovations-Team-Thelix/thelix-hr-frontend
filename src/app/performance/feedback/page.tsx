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
import {
  useMyPrivateFeedback, useRequestFeedback, useSendPrivateFeedback,
  useRespondToFeedback, useEmployees, useAuth,
} from "@/hooks";
import { MessageSquare, Send, Plus, Inbox, ArrowUpRight } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

type Tab = "received" | "sent";
type ModalType = "request" | "send" | "respond";

export default function FeedbackPage() {
  const { user } = useAuth();
  const { data: feedbackData, isLoading } = useMyPrivateFeedback();
  const { data: employees } = useEmployees({});
  const requestFeedback = useRequestFeedback();
  const sendFeedback = useSendPrivateFeedback();
  const respondFeedback = useRespondToFeedback();

  const [tab, setTab] = useState<Tab>("received");
  const [modal, setModal] = useState<ModalType | null>(null);
  const [respondId, setRespondId] = useState<string | null>(null);

  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [requestNote, setRequestNote] = useState("");

  const employeeOptions = (employees?.data ?? [])
    .filter((e) => e.id !== user?.employeeId)
    .map((e) => ({ value: e.id, label: e.fullName }));

  function closeModal() {
    setModal(null); setRespondId(null);
    setRecipientId(""); setMessage(""); setContext(""); setRequestNote("");
  }

  async function handleRequest() {
    if (!recipientId) return toast.error("Select a colleague.");
    try {
      await requestFeedback.mutateAsync({ recipientId, requestNote: requestNote || undefined, context: context || undefined });
      toast.success("Feedback request sent.");
      closeModal();
    } catch { toast.error("Failed to send request."); }
  }

  async function handleSend() {
    if (!recipientId || !message.trim()) return toast.error("Fill in all required fields.");
    try {
      await sendFeedback.mutateAsync({ recipientId, message, context: context || undefined });
      toast.success("Feedback sent privately.");
      closeModal();
    } catch { toast.error("Failed to send feedback."); }
  }

  async function handleRespond() {
    if (!respondId || !message.trim()) return toast.error("Write your feedback before submitting.");
    try {
      await respondFeedback.mutateAsync({ feedbackId: respondId, message });
      toast.success("Response submitted.");
      closeModal();
    } catch { toast.error("Failed to submit response."); }
  }

  const received = feedbackData?.received ?? [];
  const sent = feedbackData?.sent ?? [];
  const list = tab === "received" ? received : sent;

  return (
    <AppLayout pageTitle="Private Feedback">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-500" /> Private Feedback
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Confidential, developmental feedback between you and colleagues.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setModal("request")}>
              <Inbox className="w-3.5 h-3.5 mr-1" /> Request
            </Button>
            <Button size="sm" onClick={() => setModal("send")}>
              <Send className="w-3.5 h-3.5 mr-1" /> Give Feedback
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {(["received", "sent"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t} {t === "received" ? `(${received.length})` : `(${sent.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No {tab} feedback yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item) => {
              const isRequest = item.type === "Request" && !item.message;
              const counterpart = tab === "received" ? item.sender : item.recipient;
              return (
                <Card key={item.id} className={isRequest ? "border-amber-200 bg-amber-50/30" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">
                          {tab === "received" ? "From" : "To"}: <span className="font-medium text-gray-700">{counterpart?.fullName}</span>
                          {item.context && <span className="ml-2 text-gray-400">· {item.context}</span>}
                        </p>
                        {isRequest && (
                          <p className="text-sm text-amber-700 italic">
                            {item.requestNote ? `"${item.requestNote}"` : "Awaiting your response..."}
                          </p>
                        )}
                        {item.message && (
                          <p className="text-sm text-gray-800 leading-relaxed">{item.message}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(item.createdAt)}</p>
                      </div>
                      {isRequest && tab === "received" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => { setRespondId(item.id); setModal("respond"); }}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Respond
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Request Feedback Modal */}
        <Modal isOpen={modal === "request"} onClose={closeModal} title="Request Feedback">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ask feedback from</label>
              <SearchableSelect options={employeeOptions} value={recipientId} onChange={setRecipientId} placeholder="Select colleague..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Context (optional)</label>
              <Input placeholder="e.g., Q2 product launch" value={context} onChange={(e) => setContext(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message to them (optional)</label>
              <Textarea placeholder="Provide any specific questions or guidance..." value={requestNote} onChange={(e) => setRequestNote(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleRequest} disabled={requestFeedback.isPending} className="flex-1">
                {requestFeedback.isPending ? "Sending..." : "Send Request"}
              </Button>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </Modal>

        {/* Send Feedback Modal */}
        <Modal isOpen={modal === "send"} onClose={closeModal} title="Give Private Feedback">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
              <SearchableSelect options={employeeOptions} value={recipientId} onChange={setRecipientId} placeholder="Select colleague..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Context (optional)</label>
              <Input placeholder="e.g., Presentation skills" value={context} onChange={(e) => setContext(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback <span className="text-red-500">*</span></label>
              <Textarea placeholder="Write your feedback..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSend} disabled={sendFeedback.isPending} className="flex-1">
                {sendFeedback.isPending ? "Sending..." : "Send Privately"}
              </Button>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </Modal>

        {/* Respond Modal */}
        <Modal isOpen={modal === "respond"} onClose={closeModal} title="Respond to Feedback Request">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Feedback <span className="text-red-500">*</span></label>
              <Textarea placeholder="Share your observations and suggestions..." value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleRespond} disabled={respondFeedback.isPending} className="flex-1">
                {respondFeedback.isPending ? "Submitting..." : "Submit Response"}
              </Button>
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
