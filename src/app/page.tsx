"use client";

// Root page — redirect to /employee-dashboard UNLESS Auth0 is processing
// a callback (?code=, ?error=, ?state=). If those params are present, the
// Auth0 SDK needs to run on this page to exchange the code; onRedirectCallback
// will then navigate to the right destination.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("code") || params.get("error") || params.get("state")) {
      // Auth0 callback — do NOT redirect. Let Auth0Provider process the code.
      return;
    }
    router.replace("/employee-dashboard");
  }, [router]);
  return null;
}
