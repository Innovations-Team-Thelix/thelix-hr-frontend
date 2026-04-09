"use client";

import { Auth0Provider } from "@auth0/auth0-react";

interface Props {
  domain: string;
  clientId: string;
  audience: string | undefined;
  children: React.ReactNode;
}

export function Auth0ProviderClient({ domain, clientId, audience, children }: Props) {
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
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => {
        // After Auth0 exchanges the code, navigate to the intended page.
        window.location.replace(appState?.returnTo ?? "/employee-dashboard");
      }}
    >
      {children}
    </Auth0Provider>
  );
}
