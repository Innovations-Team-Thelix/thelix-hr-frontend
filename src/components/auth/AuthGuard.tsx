"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * AuthGuard — wraps SSO-protected pages.
 *
 * Attempts a silent Auth0 login on mount. If the user already has an
 * active Auth0 session (arrived via the SSO dashboard), they are logged
 * in automatically without seeing a login prompt. If no session exists,
 * the user is redirected to Auth0 (which in turn redirects to the SSO
 * login page). The acquired token is stored under `accessToken` in
 * localStorage — the same key used by the Axios interceptor in lib/api.ts.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: isSsoAuthenticated, isLoading: isSsoLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const { isAuthenticated: isLocalAuthenticated, ssoLogin } = useAuth();
  const [ssoReady, setSsoReady] = useState(false);
  const consentRedirected = useRef(false);

  useEffect(() => {
    if (isSsoLoading) return;

    // Already authenticated locally (local token) — skip SSO check
    if (isLocalAuthenticated) {
      setSsoReady(true);
      return;
    }

    if (!isSsoAuthenticated) {
      // No session at all — redirect to Auth0 (SSO login page)
      loginWithRedirect();
      return;
    }

    // Auth0 session exists — get the access token and store it
    getAccessTokenSilently()
      .then((token) => {
        ssoLogin(token);
        setSsoReady(true);
      })
      .catch((err: Error) => {
        if (err.message?.includes("consent_required") && !consentRedirected.current) {
          consentRedirected.current = true;
          loginWithRedirect();
        } else {
          // Fallback to login page if token fetch fails
          window.location.href = "/login";
        }
      });
  }, [isSsoLoading, isSsoAuthenticated, isLocalAuthenticated, getAccessTokenSilently, loginWithRedirect, ssoLogin]);

  if (!ssoReady && !isLocalAuthenticated) {
    return null; // or a loading spinner
  }

  return <>{children}</>;
}
