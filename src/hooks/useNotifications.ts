import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

interface UnreadCountResponse {
  unreadCount: number;
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await api.get<UnreadCountResponse>(
        "/notifications/unread-count"
      );
      return res.data.unreadCount;
    },
    refetchInterval: 30_000, // Poll every 30 seconds
    staleTime: 10_000,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.patch("/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
