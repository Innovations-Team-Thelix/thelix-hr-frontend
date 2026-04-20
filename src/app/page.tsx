"use client";

// Root page — decides where the landing user goes:
//  - If Auth0 is processing a callback (?code=, ?error=, ?state=), do nothing
//    and let Auth0Provider exchange the code.
//  - If authenticated, route by role (Admin/Finance/SBUHead → /dashboard,
//    Employee → /employee-dashboard).
//  - If unauthenticated by the time Auth0Guard resolves, fall back to
//    /employee-dashboard; AppLayout will bounce to /login.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

function getRoleDashboard(role: string | undefined): string {
  switch (role) {
    case "Admin":
    case "Finance":
    case "SBUHead":
      return "/dashboard";
    case "Employee":
    default:
      return "/employee-dashboard";
  }
}

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("code") || params.get("error") || params.get("state")) {
      return;
    }
    if (isAuthenticated) {
      router.replace(getRoleDashboard(user?.role));
    } else {
      router.replace("/employee-dashboard");
    }
  }, [router, isAuthenticated, user]);

  return null;
}
