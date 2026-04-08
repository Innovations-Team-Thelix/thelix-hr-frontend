"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
  </div>
);

/**
 * AuthGuard — mirrors thelix-orbit's AuthGuard exactly.
 *
 * Key behaviours:
 * 1. BLOCKS rendering until token is ready (prevents app-layout from
 *    seeing isAuthenticated=false and redirecting to /login).
 * 2. When Auth0 session exists → getAccessTokenSilently() → ssoLogin() → unblock.
 * 3. When not authenticated → loginWithRedirect({ prompt: "none" }) for silent login.
 *    If there is no SSO session, Auth0 returns login_required and we unblock
 *    (local login page handles it).
 * 4. Checks for ?code= in URL so we don't call loginWithRedirect while Auth0
 *    SDK is still exchanging the code.
 * 5. Local-login users: checkAuth() already set isAuthenticated=true before
 *    this component runs, so we skip all SSO logic immediately.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    isLoading,
    isAuthenticated: isSsoAuthenticated,
    loginWithRedirect,
    getAccessTokenSilently,
    error,
  } = useAuth0();

  const { isAuthenticated: isLocalAuthenticated, ssoLogin } = useAuth();
  const router = useRouter();
  const [tokenReady, setTokenReady] = useState(false);
  const consentRedirectDone = useRef(false);

  // Reset tokenReady when SSO session ends
  useEffect(() => {
    if (!isSsoAuthenticated) setTokenReady(false);
  }, [isSsoAuthenticated]);

  useEffect(() => {
    const init = async () => {
      if (isLoading) return;

      // Local token already valid — no SSO needed, unblock immediately
      if (isLocalAuthenticated) {
        setTokenReady(true);
        return;
      }

      if (isSsoAuthenticated) {
        // Auth0 session exists — get token, store in Zustand, then unblock
        try {
          const token = await getAccessTokenSilently();
          await ssoLogin(token);
          setTokenReady(true);
        } catch (err: unknown) {
          const e = err as { error?: string };
          if (e?.error === "consent_required") {
            loginWithRedirect();
          }
        }
        return;
      }

      // Not authenticated — check URL state
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("code");
      const urlError = params.get("error");

      // Auth0 just redirected back with a code — SDK is processing it, wait
      if (urlCode) return;

      // consent_required on return: redirect once, then stop
      if (urlError === "consent_required") {
        if (!consentRedirectDone.current) {
          consentRedirectDone.current = true;
          loginWithRedirect();
        }
        return;
      }

      // Any other URL error — unblock so the error can be shown
      if (urlError) {
        setTokenReady(true);
        return;
      }

      // Attempt silent login (prompt:none). If an SSO session exists Auth0
      // redirects back instantly. If not, Auth0 returns login_required which
      // we catch and unblock so the local login page can render.
      try {
        await loginWithRedirect({
          authorizationParams: { prompt: "none" },
        });
      } catch {
        // No SSO session — unblock and let local login page handle it
        setTokenReady(true);
      }
    };

    init();
  }, [
    isLoading,
    isSsoAuthenticated,
    isLocalAuthenticated,
    getAccessTokenSilently,
    loginWithRedirect,
    ssoLogin,
  ]);

  // Block rendering until we know auth state — prevents app-layout from
  // seeing isAuthenticated=false and bouncing the user to /login
  if (isLoading || (!tokenReady && !isLocalAuthenticated)) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
