"use client";

import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

// ─── Inner guard — must be inside Auth0Provider ───────────────

function Auth0Guard({ children }: { children: React.ReactNode }) {
  // This runs synchronously on every render — if it's null after redirect,
  // Auth0Guard never mounted at all.
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('auth0guard_mounted', new Date().toISOString());
  }

  const {
    isLoading,
    isAuthenticated: isSsoAuthenticated,
    loginWithRedirect,
    getAccessTokenSilently,
    logout: auth0Logout,
    user: auth0User,
    error,
  } = useAuth0();

  const { isAuthenticated: isLocalAuthenticated, ssoLogin, logout } = useAuth();
  // Start ready if already locally authenticated (e.g. page refresh with valid localStorage token)
  const [tokenReady, setTokenReady] = useState(isLocalAuthenticated);
  const [noAccount, setNoAccount] = useState<string | null>(null);
  const consentRedirectDone = useRef(false);

  useEffect(() => {
    if (!isSsoAuthenticated) setTokenReady(false);
  }, [isSsoAuthenticated]);

  useEffect(() => {
    const init = async () => {
      sessionStorage.setItem('auth0guard_state', JSON.stringify({
        isLoading, isSsoAuthenticated, isLocalAuthenticated,
        url: window.location.href, t: new Date().toISOString()
      }));

      if (isLoading) return;

      if (isLocalAuthenticated) {
        setTokenReady(true);
        return;
      }

      if (isSsoAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          await ssoLogin(token);
          setTokenReady(true);
        } catch (err: unknown) {
          const e = err as { error?: string };
          sessionStorage.setItem('auth0guard_ssologin_err', JSON.stringify(e));
          if (e?.error === "consent_required") {
            loginWithRedirect();
            return;
          }
          setNoAccount(auth0User?.email ?? "unknown");
          setTokenReady(true);
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("code");
      const urlError = params.get("error");

      sessionStorage.setItem('auth0guard_url_params', JSON.stringify({ urlCode: !!urlCode, urlError }));

      if (urlCode) return; // SDK is processing callback

      if (urlError === "consent_required") {
        if (!consentRedirectDone.current) {
          consentRedirectDone.current = true;
          loginWithRedirect();
        }
        return;
      }

      if (urlError) {
        sessionStorage.setItem('auth0guard_url_error', urlError);
        setTokenReady(true);
        return;
      }

      // Silent SSO attempt
      sessionStorage.setItem('auth0guard_silent_attempt', new Date().toISOString());
      try {
        await loginWithRedirect({
          authorizationParams: { prompt: "none" },
          appState: { returnTo: window.location.pathname },
        });
      } catch (e) {
        sessionStorage.setItem('auth0guard_silent_err', String(e));
        setTokenReady(true);
      }
    };

    init();
  }, [isLoading, isSsoAuthenticated, isLocalAuthenticated, auth0User, getAccessTokenSilently, loginWithRedirect, ssoLogin]);

  const urlParams = new URLSearchParams(window.location.search);
  const urlError = urlParams.get("error");
  const urlErrorDesc = urlParams.get("error_description");

  if (error || urlError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="mb-4 font-semibold">Authentication failed</h2>
        <p className="mb-2 text-sm text-gray-500">{urlErrorDesc || error?.message || "Unknown error"}</p>
        <button type="button" onClick={() => loginWithRedirect()} className="px-6 py-2 bg-[#C8622A] text-white rounded hover:opacity-90 transition">
          Log In to HRIS
        </button>
      </div>
    );
  }

  // Block rendering until we know the auth state.
  // tokenReady=true means: either ssoLogin succeeded (isAuthenticated=true in Zustand),
  // or ssoLogin failed (noAccount is set), or there's no SSO session at all.
  // We must NOT render children with tokenReady=false — that would fire all API
  // requests before the token is in localStorage, causing blanket 401s.
  if (isLoading || !tokenReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
      </div>
    );
  }

  if (noAccount !== null) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-xl text-center">
          <h1 className="text-xl font-bold text-gray-900">No HRIS Account Found</h1>
          <p className="mt-2 text-sm text-gray-500">
            {noAccount
              ? <><span className="font-medium text-gray-700">{noAccount}</span> does not have an account in the Thelix HRIS system.</>
              : "Your account does not have access to the Thelix HRIS system."
            }
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <a href="mailto:hr@thelixholdings.com" className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-[#C8622A]">
              Contact HR Support
            </a>
            <button type="button" onClick={() => { logout(); auth0Logout({ logoutParams: { returnTo: window.location.origin + "/login" } }); }}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Outer provider — loaded client-only via next/dynamic ─────

interface Props {
  domain: string;
  clientId: string;
  audience: string | undefined;
  children: React.ReactNode;
}

export function Auth0ProviderClient({ domain, clientId, audience, children }: Props) {
  const router = useRouter();
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
        scope: "openid profile email offline_access",
      }}
      useRefreshTokens={true}
      useRefreshTokensFallback={false}
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => {
        // Use client-side navigation — avoids a full page reload which would
        // wipe Zustand state and race checkAuth() against Auth0 re-initialising.
        router.replace(appState?.returnTo ?? "/employee-dashboard");
      }}
    >
      <Auth0Guard>{children}</Auth0Guard>
    </Auth0Provider>
  );
}
