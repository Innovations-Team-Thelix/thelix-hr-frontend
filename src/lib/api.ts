import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import toast from 'react-hot-toast';
// Access Zustand store state outside React components
import { useAuth } from '@/hooks/useAuth';

/**
 * Returns true if the current session is an Auth0 SSO session.
 * Checks Zustand state first; falls back to inspecting the token header
 * so this is reliable even before ssoLogin() completes (race condition guard).
 * Auth0 tokens are RS256; local HRIS tokens are HS256.
 */
function getIsSsoSession(): boolean {
  if (useAuth.getState().isSsoSession) return true;
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return false;
    const headerB64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const header = JSON.parse(atob(headerB64)) as { alg?: string };
    return header.alg === 'RS256';
  } catch {
    return false;
  }
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Axios instance pre-configured with the HRIS API base URL,
 * JWT auth interceptor, and automatic token refresh on 401.
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token helpers ─────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

function setAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
}

function clearTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

// ─── Request interceptor: attach JWT ───────────────────────

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ─── Response interceptor: handle 401 + token refresh ──────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: AxiosResponse) => void;
  reject: (error: AxiosError) => void;
  config: AxiosRequestConfig;
}> = [];

function processQueue(error: AxiosError | null): void {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      axiosInstance(config).then(resolve).catch(reject);
    }
  });
  failedQueue = [];
}

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── Global 422 Validation Error Handler ──────────────────
    if (error.response?.status === 422) {
      const data = error.response.data as { message?: string; details?: { path: string; message: string }[] };
      const details = data?.details;
      if (details && details.length > 0) {
        const msgs = details.slice(0, 4).map((d) => `• ${d.path}: ${d.message}`).join('\n');
        toast.error(`Validation errors:\n${msgs}`, { duration: 6000, id: 'validation-error' });
      } else if (data?.message) {
        toast.error(data.message, { id: 'validation-error' });
      }
      return Promise.reject(error);
    }

    // ── Session timeout detection ─────────────────────────────
    const responseMessage = (error.response?.data as { message?: string })?.message;
    if (
      error.response?.status === 401 &&
      responseMessage?.includes('Session timed out')
    ) {
      clearTokens();
      if (typeof window !== 'undefined') {
        toast.error('Session timed out due to inactivity. Please log in again.', {
          id: 'session-timeout',
          duration: 5000,
        });
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Only attempt refresh for 401 errors, and not on auth endpoints
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/')
    ) {
      // Redirect to login on 401 if no refresh available
      if (
        error.response?.status === 401 &&
        typeof window !== 'undefined' &&
        !originalRequest?.url?.includes('/auth/')
      ) {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          // SSO sessions have no local refresh token — don't redirect to /login,
          // the Auth0Guard will handle re-auth via Auth0.
          if (getIsSsoSession()) {
            return Promise.reject(error);
          }
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('sso_redirect_reason', `interceptor outer-if: url=${originalRequest?.url} isSso=${getIsSsoSession()} at ${new Date().toISOString()}`);
          }
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }
      return Promise.reject(error);
    }

    // If already refreshing, queue the request
    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      isRefreshing = false;
      // SSO sessions have no local refresh token — don't redirect.
      if (getIsSsoSession()) {
        return Promise.reject(error);
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('sso_redirect_reason', `interceptor no-refresh: url=${originalRequest?.url} isSso=${getIsSsoSession()} at ${new Date().toISOString()}`);
      }
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      const newAccessToken: string = data.data.accessToken;
      setAccessToken(newAccessToken);

      // Retry the original request with the new token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      processQueue(null);
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError);
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Typed API helper functions ────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

async function get<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const response = await axiosInstance.get<ApiResponse<T>>(url, config);
  return response.data;
}

async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
  return response.data;
}

async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const response = await axiosInstance.put<ApiResponse<T>>(url, data, config);
  return response.data;
}

async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const response = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
  return response.data;
}

async function del<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const response = await axiosInstance.delete<ApiResponse<T>>(url, config);
  return response.data;
}

export const api = {
  get,
  post,
  put,
  patch,
  delete: del,
  instance: axiosInstance,
};

export default api;
