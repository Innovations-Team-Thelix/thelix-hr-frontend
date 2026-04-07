'use client';

import { create } from 'zustand';
import api from '@/lib/api';
import type { AuthPayload, LoginResponse, Employee } from '@/types';

// ─── JWT decode helper (lightweight, no external dep) ─────

interface DecodedJwt {
  userId: string;
  employeeId: string;
  role: string;
  sbuScopeId?: string;
  exp: number;
  iat: number;
}

/**
 * Minimal JWT payload decoder. Does NOT verify the signature
 * (that is the server's responsibility).
 */
function decodeJwt(token: string): DecodedJwt | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return true;
  // Consider expired 30 seconds before actual expiry to avoid race conditions
  return decoded.exp * 1000 < Date.now() + 30_000;
}

// ─── Auth store types ─────────────────────────────────────

interface AuthState {
  user: AuthPayload | null;
  profile: Employee | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  viewAs: 'Employee' | null;
  mustChangePassword: boolean;

  // Actions
  login: (email: string, password: string) => Promise<LoginResponse>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkAuth: () => void;
  setProfile: (profile: Employee) => void;
  setViewAs: (role: 'Employee' | null) => void;
  clearMustChangePassword: () => void;
  /** Called by AuthGuard after a successful Auth0 silent login. */
  ssoLogin: (accessToken: string) => Promise<void>;
}

// ─── Store ─────────────────────────────────────────────────

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  viewAs: null,
  mustChangePassword: false,

  setViewAs: (role) => set({ viewAs: role }),

  clearMustChangePassword: () => {
    localStorage.removeItem('mustChangePassword');
    set({ mustChangePassword: false });
  },

  /**
   * Authenticate with email and password.
   * If MFA is required, returns the login response with mfaToken
   * and the caller must then call verifyMfa.
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    const result = response.data;

    if (result.requiresMfa) {
      // MFA required; caller must handle the mfaToken
      return result;
    }

    // Store tokens
    if (result.accessToken && result.refreshToken) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      if (result.mustChangePassword) {
        localStorage.setItem('mustChangePassword', 'true');
      } else {
        localStorage.removeItem('mustChangePassword');
      }

      if (result.mustChangePassword) {
        localStorage.setItem('mustChangePassword', 'true');
      }

      const decoded = decodeJwt(result.accessToken);
      if (decoded) {
        const authPayload: AuthPayload = {
          userId: decoded.userId,
          employeeId: decoded.employeeId,
          role: decoded.role as AuthPayload['role'],
          sbuScopeId: decoded.sbuScopeId,
        };

        set({
          user: authPayload,
          token: result.accessToken,
          isAuthenticated: true,
          isLoading: false,
          mustChangePassword: !!result.mustChangePassword,
        });
      }
    }

    return result;
  },

  /**
   * Complete MFA verification. On success, stores access/refresh tokens.
   */
  verifyMfa: async (mfaToken: string, code: string): Promise<void> => {
    const response = await api.post<{
      accessToken: string;
      refreshToken: string;
      mustChangePassword?: boolean;
    }>('/auth/mfa/verify', { token: mfaToken, code });

    const { accessToken, refreshToken, mustChangePassword } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    if (mustChangePassword) {
      localStorage.setItem('mustChangePassword', 'true');
    }

    const decoded = decodeJwt(accessToken);
    if (decoded) {
      const authPayload: AuthPayload = {
        userId: decoded.userId,
        employeeId: decoded.employeeId,
        role: decoded.role as AuthPayload['role'],
        sbuScopeId: decoded.sbuScopeId,
      };

      set({
        user: authPayload,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        mustChangePassword: !!mustChangePassword,
      });
    }
  },

  /**
   * Clear all auth state and localStorage. Redirect to login.
   */
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('mustChangePassword');

    set({
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      viewAs: null,
      mustChangePassword: false,
    });

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  /**
   * Attempt to refresh the access token using the stored refresh token.
   */
  refreshToken: async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      get().logout();
      return;
    }

    try {
      const response = await api.post<{ accessToken: string }>(
        '/auth/refresh',
        { refreshToken: storedRefreshToken },
      );

      const { accessToken } = response.data;
      localStorage.setItem('accessToken', accessToken);

      const decoded = decodeJwt(accessToken);
      if (decoded) {
        const authPayload: AuthPayload = {
          userId: decoded.userId,
          employeeId: decoded.employeeId,
          role: decoded.role as AuthPayload['role'],
          sbuScopeId: decoded.sbuScopeId,
        };

        set({
          user: authPayload,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch {
      get().logout();
    }
  },

  /**
   * Check if the user has a valid token in localStorage.
   * Called on app mount to restore auth state.
   */
  checkAuth: () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (!accessToken) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // If the access token is expired, attempt a refresh (local tokens only)
    if (isTokenExpired(accessToken) && storedRefreshToken) {
      get()
        .refreshToken()
        .catch(() => set({ isLoading: false }));
      return;
    }

    const decoded = decodeJwt(accessToken);

    // SSO token: has `sub` but no `userId` — fetch identity from backend
    if (decoded && !decoded.userId && (decoded as unknown as { sub?: string }).sub) {
      api
        .get<AuthPayload>('/auth/me')
        .then((response) => {
          set({
            user: response.data,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        });
      return;
    }

    // Local HS256 token — restore state directly from decoded payload
    if (decoded && decoded.userId) {
      const authPayload: AuthPayload = {
        userId: decoded.userId,
        employeeId: decoded.employeeId,
        role: decoded.role as AuthPayload['role'],
        sbuScopeId: decoded.sbuScopeId,
      };
      set({
        user: authPayload,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
        mustChangePassword: localStorage.getItem('mustChangePassword') === 'true',
      });
    } else {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  /**
   * Store the full employee profile fetched from /employees/me.
   */
  setProfile: (profile: Employee) => {
    set({ profile });
  },

  /**
   * Called by AuthGuard after a successful Auth0 silent login.
   * Stores the Auth0 access token and fetches the user identity from /auth/me.
   */
  ssoLogin: async (accessToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    // Fetch user identity from the backend (works for both local and SSO tokens)
    const response = await api.get<AuthPayload>('/auth/me');
    const userData = response.data;
    set({
      user: userData,
      token: accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },
}));
