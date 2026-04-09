"use client";

import { Auth0Provider } from "@auth0/auth0-react";

interface Props {
  domain: string;
  clientId: string;
  audience: string | undefined;
  children: React.ReactNode;
}

export function Auth0ProviderClient({ domain, clientId, audience, children }: Props) {
  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/employee-dashboard`
    : "https://hirs.thelixholdings.com/employee-dashboard";

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience,
        scope: "openid profile email offline_access",
      }}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
