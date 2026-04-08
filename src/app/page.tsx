"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// Root page: redirect to the appropriate dashboard based on auth state.
// Auth0 callback now lands directly at /employee-dashboard (see redirect_uri in providers.tsx).
// This page only serves users who navigate to / directly.
export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = ["Admin", "Finance", "SBUHead"].includes(user.role)
        ? "/dashboard"
        : "/employee-dashboard";
      router.replace(dest);
    } else {
      router.replace("/employee-dashboard");
    }
  }, [isAuthenticated, user, router]);

  return null;
}
