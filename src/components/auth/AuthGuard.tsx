"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth } from "@/hooks/useAuth";

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
  </div>
);

const NoAccountScreen = ({ email, onLogout }: { email?: string; onLogout: () => void }) => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-xl text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900">No HRIS Account Found</h1>
      <p className="mt-2 text-sm text-gray-500">
        {email ? (
          <>
            <span className="font-medium text-gray-700">{email}</span> does not have an account in the Thelix HRIS system.
          </>
        ) : (
          "Your account does not have access to the Thelix HRIS system."
        )}
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Please contact your HR administrator to get access.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <a
          href="mailto:hr@thelixholdings.com"
          className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors bg-[#C8622A]"
        >
          Contact HR Support
        </a>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </div>
  </div>
);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const {
    isLoading,
    isAuthenticated: isSsoAuthenticated,
    loginWithRedirect,
    getAccessTokenSilently,
    logout: auth0Logout,
    user: auth0User,
    error: auth0Error,
  } = useAuth0();

  if (auth0Error) {
    console.error("[AuthGuard] Auth0 SDK error:", auth0Error);
  }

  const { isAuthenticated: isLocalAuthenticated, ssoLogin, logout } = useAuth();
  const [tokenReady, setTokenReady] = useState(false);
  const [noAccount, setNoAccount] = useState<string | null>(null);
  const consentRedirectDone = useRef(false);

  // Reset tokenReady when SSO session ends
  useEffect(() => {
    if (!isSsoAuthenticated) setTokenReady(false);
  }, [isSsoAuthenticated]);

  // Log whenever isLoading changes
  useEffect(() => {
    console.log("[AuthGuard] isLoading changed →", isLoading, "| isSsoAuthenticated:", isSsoAuthenticated);
  }, [isLoading, isSsoAuthenticated]);

  // Safety timeout: if Auth0 is still loading after 5s, unblock for local login
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      console.warn("[AuthGuard] Auth0 isLoading timed out after 5s — unblocking for local login");
      setTokenReady(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    const init = async () => {
      console.log("[AuthGuard] init", { isLoading, isSsoAuthenticated, isLocalAuthenticated });
      if (isLoading) return;

      // Local token already valid — no SSO needed, unblock immediately
      if (isLocalAuthenticated) {
        setTokenReady(true);
        return;
      }

      if (isSsoAuthenticated) {
        try {
          console.log("[AuthGuard] SSO authenticated, getting token silently...");
          const token = await getAccessTokenSilently();
          console.log("[AuthGuard] got token, calling ssoLogin...");
          await ssoLogin(token);
          console.log("[AuthGuard] ssoLogin success");
          setTokenReady(true);
        } catch (err: unknown) {
          console.error("[AuthGuard] ssoLogin error:", err);
          const e = err as { error?: string };
          if (e?.error === "consent_required") {
            loginWithRedirect();
            return;
          }
          setNoAccount(auth0User?.email ?? null);
          setTokenReady(true);
        }
        return;
      }

      // Not yet authenticated — check URL state
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("code");
      const urlError = params.get("error");

      console.log("[AuthGuard] not SSO authenticated", { urlCode, urlError });

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

      // Any other URL error — unblock so the page can render
      if (urlError) {
        setTokenReady(true);
        return;
      }

      // Attempt silent login. If an SSO session exists Auth0 redirects back
      // to /employee-dashboard (our redirect_uri). If no session exists, it
      // throws login_required and we unblock for local email/password login.
      console.log("[AuthGuard] attempting silent loginWithRedirect...");
      try {
        await loginWithRedirect({
          authorizationParams: { prompt: "none" },
        });
        console.log("[AuthGuard] loginWithRedirect resolved (unexpected for redirect)");
      } catch (err) {
        console.error("[AuthGuard] loginWithRedirect threw:", err);
        setTokenReady(true);
      }
    };

    init();
  }, [
    isLoading,
    isSsoAuthenticated,
    isLocalAuthenticated,
    auth0User,
    getAccessTokenSilently,
    loginWithRedirect,
    ssoLogin,
  ]);

  if (isLoading || (!tokenReady && !isLocalAuthenticated)) {
    return <PageLoader />;
  }

  if (noAccount !== null) {
    return (
      <NoAccountScreen
        email={noAccount || undefined}
        onLogout={() => {
          logout();
          auth0Logout({ logoutParams: { returnTo: window.location.origin + "/login" } });
        }}
      />
    );
  }

  return <>{children}</>;
}
