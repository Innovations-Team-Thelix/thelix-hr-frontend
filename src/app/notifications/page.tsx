"use client";

import React from "react";
import { Bell, CheckCircle, Clock } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loading";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Notification {
  id: string;
  type: string;
  channel: string;
  payload: Record<string, unknown>;
  sentAt: string | null;
  readAt?: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{
    data: Notification[];
  }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<Notification[]>("/notifications?limit=50");
      return { data: res.data };
    },
  });

  const notifications = data?.data || [];

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationMessage = (n: Notification): string => {
    const p = n.payload;
    if (p.message && typeof p.message === "string") return p.message;
    if (p.subject && typeof p.subject === "string") return p.subject;
    return n.type.replace(/([A-Z])/g, " $1").trim();
  };

  return (
    <AppLayout pageTitle="Notifications">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-gray-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Notifications
            </h2>
            <p className="text-sm text-gray-500">
              Your recent notifications and alerts
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-16 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-3 text-gray-500">No notifications yet</p>
                <p className="text-sm text-gray-400">
                  You&apos;ll see notifications here when there are updates
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-4 ${
                      !n.readAt ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="mt-0.5">
                      {n.readAt ? (
                        <CheckCircle className="h-5 w-5 text-gray-300" />
                      ) : (
                        <Clock className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {getNotificationMessage(n)}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <span>{formatDate(n.createdAt)}</span>
                        <Badge
                          variant={n.channel === "InApp" ? "info" : "neutral"}
                        >
                          {n.channel}
                        </Badge>
                      </div>
                    </div>
                    {!n.readAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(n.id)}
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
