"use client";

import { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * AuthGuard — handles two SSO entry points:
 *
 * 1. User arrives from SSO dashboard with ?sso=1 in the URL.
 *    We call loginWithRedirect() which does a full Auth0 redirect.
 *    Auth0 sees the existing SSO session and immediately redirects back
 *    with an auth code — no login screen shown.
 *
 * 2. After Auth0 redirects back (isSsoAuthenticated = true), we call
 *    getAccessTokenSilently() to get the token, store it, and send
 *    the user to the dashboard.
 *
 * 3. If neither condition applies (direct visit, local login user),
 *    we do nothing and let the local login page handle it.
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
  const ran = useRef(false);

  useEffect(() => {
    if (isSsoLoading) return;
    if (isLocalAuthenticated) return;
    if (ran.current) return;

    ran.current = true;

    const comingFromSSO = searchParams.get("sso") === "1";

    if (isSsoAuthenticated) {
      // Auth0 has just completed the redirect back — exchange code for token
      getAccessTokenSilently()
        .then(async (token) => {
          await ssoLogin(token);
          router.push("/dashboard");
        })
        .catch(() => {
          // Token fetch failed after auth — fallback to login
          router.push("/login");
        });
      return;
    }

    if (comingFromSSO) {
      // User arrived from SSO dashboard — do a full Auth0 redirect.
      // Auth0 will see the existing tenant session and redirect back instantly.
      loginWithRedirect({
        appState: { returnTo: "/dashboard" },
      });
      return;
    }

    // No SSO param, not authenticated — local login flow takes over
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
