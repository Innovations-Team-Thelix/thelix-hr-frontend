"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";
import { Auth0Provider } from "@auth0/auth0-react";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const auth0ClientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const auth0Audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;

  // Only wrap with Auth0Provider when SSO env vars are configured
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
              boxShadow:
                "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#ecfdf5",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fef2f2",
              },
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );

  if (!auth0Domain || !auth0ClientId) {
    return content;
  }

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={{
        redirect_uri: typeof window !== "undefined" ? window.location.origin : "",
        audience: auth0Audience,
        scope: "openid profile email offline_access",
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => {
        // After Auth0 redirects back, go to the intended destination
        if (typeof window !== "undefined") {
          window.location.replace(appState?.returnTo ?? "/dashboard");
        }
      }}
    >
      {content}
    </Auth0Provider>
  );
}
