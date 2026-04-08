"use client";

import { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

/**
 * AuthGuard — silently picks up an existing Auth0 SSO session.
 *
 * When a user arrives from the SSO dashboard they have an active Auth0
 * tenant session but isSsoAuthenticated is still false (the HRIS client
 * hasn't exchanged a token yet). We always attempt getAccessTokenSilently()
 * once the SDK has loaded — if an SSO session exists it succeeds silently
 * and we log the user in. If there is no session it throws and we do nothing,
 * letting the normal local login flow run.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading: isSsoLoading, getAccessTokenSilently } = useAuth0();
  const { isAuthenticated: isLocalAuthenticated, ssoLogin } = useAuth();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    // Wait for Auth0 SDK to finish its initial check
    if (isSsoLoading) return;
    // Already authenticated (local token or previous SSO pick-up) — nothing to do
    if (isLocalAuthenticated) return;
    // Only attempt once per mount
    if (ran.current) return;

    ran.current = true;

    getAccessTokenSilently()
      .then(async (token) => {
        // Active SSO session found — store token and redirect to dashboard
        await ssoLogin(token);
        router.push("/dashboard");
      })
      .catch(() => {
        // No active SSO session — do nothing, local login page handles it
      });
  }, [isSsoLoading, isLocalAuthenticated, getAccessTokenSilently, ssoLogin, router]);

  // Never block rendering
  return <>{children}</>;
}
