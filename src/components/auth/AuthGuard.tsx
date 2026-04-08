"use client";

import { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

/**
 * AuthGuard — silently picks up an existing Auth0 SSO session.
 *
 * Behaviour:
 * - If the user arrives from the SSO dashboard they already have an active
 *   Auth0 session. getAccessTokenSilently() will succeed silently and we
 *   store the token + redirect to the dashboard.
 * - If there is NO Auth0 session (direct visit, local login user) we do
 *   nothing and let the normal local login flow run. We never force-redirect
 *   to SSO — HRIS supports both local and SSO login.
 *
 * The component renders children immediately (no blocking / loading gate)
 * so local users never experience a delay.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated: isSsoAuthenticated,
    isLoading: isSsoLoading,
    getAccessTokenSilently,
  } = useAuth0();
  const { isAuthenticated: isLocalAuthenticated, ssoLogin } = useAuth();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    // Only run once per mount and only when Auth0 SDK has finished loading
    if (isSsoLoading || ran.current) return;
    // Already authenticated (local or previous SSO pick-up) — nothing to do
    if (isLocalAuthenticated) return;
    // No Auth0 session — let the local login page handle it
    if (!isSsoAuthenticated) return;

    ran.current = true;

    getAccessTokenSilently()
      .then(async (token) => {
        await ssoLogin(token);
        // Redirect to dashboard after successful SSO pick-up
        router.push("/dashboard");
      })
      .catch(() => {
        // Silent fail — no active Auth0 session or consent issue.
        // Do nothing; local auth flow will take over.
      });
  }, [isSsoLoading, isSsoAuthenticated, isLocalAuthenticated, getAccessTokenSilently, ssoLogin, router]);

  // Never block rendering — children always mount immediately
  return <>{children}</>;
}
