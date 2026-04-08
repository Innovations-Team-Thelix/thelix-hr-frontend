"use client";

import { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * AuthGuard — handles SSO login for users arriving from the SSO dashboard.
 *
 * Two-stage flow:
 *
 * Stage 1 (?sso=1 in URL, not yet authenticated):
 *   Call loginWithRedirect(). Auth0 sees the existing tenant session and
 *   immediately redirects back with an auth code — no login screen shown.
 *
 * Stage 2 (Auth0 has redirected back, isSsoAuthenticated = true):
 *   Call getAccessTokenSilently() to get the token, run ssoLogin() to
 *   store it and set Zustand state, then push to /dashboard.
 *
 * These two stages use separate refs so Stage 1 completing does not
 * block Stage 2 from running.
 *
 * Local login users are never affected — if neither condition applies
 * we do nothing and let the normal login page handle it.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    isLoading: isSsoLoading,
    isAuthenticated: isSsoAuthenticated,
    loginWithRedirect,
    getAccessTokenSilently,
  } = useAuth0();
  const { isAuthenticated: isLocalAuthenticated, ssoLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prevents calling loginWithRedirect() more than once
  const didRedirect = useRef(false);
  // Prevents calling getAccessTokenSilently() + ssoLogin() more than once
  const didFetchToken = useRef(false);

  useEffect(() => {
    if (isSsoLoading) return;
    if (isLocalAuthenticated) return;

    // ── Stage 2: Auth0 has completed the redirect, exchange for token ──
    if (isSsoAuthenticated && !didFetchToken.current) {
      didFetchToken.current = true;

      getAccessTokenSilently()
        .then(async (token) => {
          await ssoLogin(token);
          router.push("/dashboard");
        })
        .catch(() => {
          // Token fetch failed after auth — send to login
          router.push("/login");
        });
      return;
    }

    // ── Stage 1: user arrived with ?sso=1 — trigger the Auth0 redirect ──
    const comingFromSSO = searchParams.get("sso") === "1";
    if (comingFromSSO && !isSsoAuthenticated && !didRedirect.current) {
      didRedirect.current = true;
      loginWithRedirect();
    }
  }, [
    isSsoLoading,
    isSsoAuthenticated,
    isLocalAuthenticated,
    searchParams,
    getAccessTokenSilently,
    loginWithRedirect,
    ssoLogin,
    router,
  ]);

  return <>{children}</>;
}
