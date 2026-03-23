"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import toast from "react-hot-toast";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:4000";

/**
 * Connects to the backend WebSocket, joins the user's room,
 * and listens for real-time notification events.
 * Invalidates React Query caches so the UI updates automatically.
 */
export function useSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.employeeId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Join the user-specific room so the server can target us
      socket.emit("room:join", `user:${user.employeeId}`);
    });

    socket.on(
      "notification:created",
      (data: { title?: string; message?: string }) => {
        // Refresh notification queries
        queryClient.invalidateQueries({ queryKey: ["notifications"] });

        // Show a toast for the incoming notification
        if (data.title || data.message) {
          toast(data.message || data.title || "New notification", {
            icon: "🔔",
          });
        }
      }
    );

    return () => {
      socket.emit("room:leave", `user:${user.employeeId}`);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.employeeId, queryClient]);

  return socketRef;
}
