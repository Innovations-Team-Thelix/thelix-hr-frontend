"use client";

// This page exists solely to receive the Auth0 redirect callback at the app origin (/).
// It renders nothing — the AuthGuard spinner shows while Auth0 SDK processes the ?code=
// in the URL, then onRedirectCallback (in providers.tsx) navigates to /employee-dashboard.
export default function RootPage() {
  return null;
}
