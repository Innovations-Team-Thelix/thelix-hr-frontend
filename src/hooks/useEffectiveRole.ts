'use client';

import { useAuth } from './useAuth';

/**
 * Returns the role that should be used for UI rendering.
 * When an Admin or SBUHead activates "Employee View", this returns 'Employee'.
 * Otherwise returns the user's actual role.
 */
export function useEffectiveRole() {
  const { user, viewAs } = useAuth();
  return (viewAs ?? user?.role) ?? null;
}
