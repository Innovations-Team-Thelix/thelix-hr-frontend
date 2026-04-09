"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";

// Load Auth0Provider only on the client — never during SSR.
// This matches how Orbit sets it up (Vite SPA = browser-only).
// Without this, Next.js SSR causes Auth0 isLoading to hang forever.
const Auth0ProviderClient = dynamic(
  () => import("@/components/auth/Auth0ProviderClient").then((m) => ({ default: m.Auth0ProviderClient })),
  { ssr: false }
);

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "auth.thelixholdings.com";
  const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "a7KNF7CvA4sbYw8Ckwn7gKFvc1WVNDp3";
  const auth0Audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "https://api.thelixholdings-apps.com";

  const content = (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#fff",
              color: "#1f2937",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              padding: "12px 16px",
              fontSize: "14px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#ecfdf5" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#fef2f2" } },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );

  if (typeof window !== 'undefined') {
    sessionStorage.setItem('providers_auth0_vars', JSON.stringify({
      hasDomain: !!auth0Domain, domain: auth0Domain,
      hasClientId: !!auth0ClientId, clientId: auth0ClientId,
    }));
  }

  if (!auth0Domain || !auth0ClientId) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('providers_auth0_skipped', 'true — missing domain or clientId');
    }
    return content;
  }

  // Auth0ProviderClient includes Auth0Guard inside it (loaded client-only via dynamic import).
  // Children are passed through Auth0Guard which handles SSO before rendering them.
  return (
    <Auth0ProviderClient domain={auth0Domain} clientId={auth0ClientId} audience={auth0Audience}>
      {content}
    </Auth0ProviderClient>
  );
}
