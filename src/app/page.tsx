"use client";

// Root page — just redirect to /employee-dashboard.
// Auth0 callback lands at /employee-dashboard directly (see redirect_uri in providers.tsx).
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/employee-dashboard");
  }, [router]);
  return null;
}
