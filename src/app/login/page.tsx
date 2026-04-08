"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAuth0 } from "@auth0/auth0-react";

function getRoleDashboard(role: string): string {
  switch (role) {
    case "Admin":
      return "/dashboard";
    case "Finance":
      return "/dashboard";
    case "SBUHead":
      return "/dashboard";
    case "Employee":
    default:
      return "/employee-dashboard";
  }
}

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

const mfaSchema = z.object({
  code: z
    .string()
    .min(6, "MFA code must be 6 digits")
    .max(6, "MFA code must be 6 digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type MfaFormData = z.infer<typeof mfaSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, user, login, verifyMfa, checkAuth } = useAuth();
  const { loginWithRedirect: ssoRedirect } = useAuth0();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    register: registerMfa,
    handleSubmit: handleSubmitMfa,
    formState: { errors: mfaErrors, isSubmitting: isMfaSubmitting },
  } = useForm<MfaFormData>({
    resolver: zodResolver(mfaSchema),
  });

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      const destination = getRoleDashboard(user.role);
      router.push(destination);
    }
  }, [mounted, isAuthenticated, user, router]);

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    try {
      const result = await login(data.email, data.password);
      if (result.requiresMfa && result.mfaToken) {
        setMfaToken(result.mfaToken);
        return;
      }
      const authUser = useAuth.getState().user;
      const destination = getRoleDashboard(authUser?.role ?? "Employee");
      router.push(destination);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ||
        "Invalid email or password. Please try again.";
      setLoginError(message);
    }
  };

  const onMfaSubmit = async (data: MfaFormData) => {
    setLoginError(null);
    if (!mfaToken) return;
    try {
      await verifyMfa(mfaToken, data.code);
      const authUser = useAuth.getState().user;
      const destination = getRoleDashboard(authUser?.role ?? "Employee");
      router.push(destination);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message || "Invalid MFA code. Please try again.";
      setLoginError(message);
    }
  };

  if (!mounted) return null;
  if (isAuthenticated && user) return null;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#000000" }}>
      {/* Top nav */}
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{ backgroundColor: "#000000" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative h-32 w-32 sm:h-32 sm:w-32">
            <Image
              src="/Thelix logo.png"
              alt="Thelix HRIS"
              fill
              className="object-contain"
            />
          </div>
          <span className=" -mt-4 -ml-[10px] text-sm font-semibold text-white tracking-tight">
            HRIS
          </span>
        </div>

        {/* Help link */}
        <div className="text-sm text-white/70">
          Having trouble?{" "}
          <a
            href="mailto:support@thelixholdings.com"
            className="font-medium transition-colors"
            style={{ color: "#C8622A" }}
          >
            Get help →
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Centered login card */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-white px-8 py-10 shadow-2xl">
              {!mfaToken ? (
                <>
                  <div className="mb-8">
                    <h1 className="font-display text-3xl font-bold text-gray-900">
                      Welcome back!
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Sign in to your Thelix account
                    </p>
                  </div>

                  {loginError && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                      <input
                        {...register("email")}
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Email Address"
                        className={cn(
                          "block w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-900",
                          "placeholder:text-gray-400 transition-colors duration-150",
                          "focus:outline-none focus:ring-2 focus:ring-offset-0",
                          errors.email
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-300 focus:ring-2"
                        )}
                        style={
                          !errors.email
                            ? ({ "--tw-ring-color": "#C8622A33" } as React.CSSProperties)
                            : undefined
                        }
                        onFocus={(e) => {
                          if (!errors.email) {
                            e.currentTarget.style.borderColor = "#C8622A";
                          }
                        }}
                        onBlur={(e) => {
                          if (!errors.email) {
                            e.currentTarget.style.borderColor = "";
                          }
                        }}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-xs text-red-600" role="alert">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="relative">
                        <input
                          {...register("password")}
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Password"
                          className={cn(
                            "block w-full rounded-lg border bg-white px-4 py-3 pr-11 text-sm text-gray-900",
                            "placeholder:text-gray-400 transition-colors duration-150",
                            "focus:outline-none focus:ring-2 focus:ring-offset-0",
                            errors.password
                              ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                              : "border-gray-300"
                          )}
                          onFocus={(e) => {
                            if (!errors.password) {
                              e.currentTarget.style.borderColor = "#C8622A";
                            }
                          }}
                          onBlur={(e) => {
                            if (!errors.password) {
                              e.currentTarget.style.borderColor = "";
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1.5 text-xs text-red-600" role="alert">
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <a
                        href="/forgot-password"
                        className="text-sm font-medium transition-colors"
                        style={{ color: "#C8622A" }}
                      >
                        Forgot password?
                      </a>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                      style={{ backgroundColor: "#000000" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#1a1a1a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#000000";
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Log in"
                      )}
                    </button>
                  </form>

                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  <button
                    type="button"
                    onClick={() => ssoRedirect()}
                    className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#C8622A"/>
                    </svg>
                    Sign in with Thelix SSO
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-8 text-center">
                    <h1 className="font-display text-2xl font-bold text-gray-900">
                      Two-factor authentication
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                      Enter the 6-digit code from your authenticator app.
                    </p>
                  </div>

                  {loginError && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleSubmitMfa(onMfaSubmit)} className="space-y-5">
                    <div>
                      <input
                        {...registerMfa("code")}
                        id="mfa-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="000000"
                        className={cn(
                          "block w-full rounded-lg border bg-white px-4 py-3 text-center text-lg tracking-widest text-gray-900",
                          "placeholder:text-gray-400 transition-colors duration-150",
                          "focus:outline-none focus:ring-2 focus:ring-offset-0",
                          mfaErrors.code
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-300"
                        )}
                        onFocus={(e) => {
                          if (!mfaErrors.code) {
                            e.currentTarget.style.borderColor = "#C8622A";
                          }
                        }}
                        onBlur={(e) => {
                          if (!mfaErrors.code) {
                            e.currentTarget.style.borderColor = "";
                          }
                        }}
                      />
                      {mfaErrors.code && (
                        <p className="mt-1.5 text-xs text-red-600" role="alert">
                          {mfaErrors.code.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isMfaSubmitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                      style={{ backgroundColor: "#000000" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#1a1a1a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#000000";
                      }}
                    >
                      {isMfaSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMfaToken(null);
                        setLoginError(null);
                      }}
                      className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      ← Back to sign in
                    </button>
                  </form>
                </>
              )}

              <p className="mt-8 text-center text-xs text-gray-400">
                Thelix Holdings Internal HRIS &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>

        {/* Diagonal orange accent — bottom right */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 lg:h-80 lg:w-80"
          aria-hidden
        >
          <svg
            viewBox="0 0 320 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
          >
            <polygon points="320,0 320,320 0,320" fill="#C8622A" />
          </svg>
        </div>
      </div>
    </div>
  );
}
