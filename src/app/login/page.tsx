"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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
    defaultValues: {
      email: "",
      password: "",
    },
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

  // Redirect if already authenticated
  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      const destination =
        user.role === "Employee" ? "/profile" : "/dashboard";
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

      // Redirect based on role
      const authUser = useAuth.getState().user;
      const destination =
        authUser?.role === "Employee" ? "/profile" : "/dashboard";
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
      const destination =
        authUser?.role === "Employee" ? "/profile" : "/dashboard";
      router.push(destination);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ||
        "Invalid MFA code. Please try again.";
      setLoginError(message);
    }
  };

  // Show nothing while checking auth state on mount
  if (!mounted) {
    return null;
  }

  // If already authenticated, show nothing (redirect is happening)
  if (isAuthenticated && user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-xl">
          {/* Logo / Title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-900 text-white">
              <span className="text-2xl font-bold">T</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Thelix HRIS</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to your account
            </p>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="mb-6 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {loginError}
            </div>
          )}

          {/* Login Form or MFA Form */}
          {!mfaToken ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  {...register("email")}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@thelixholdings.com"
                  className={cn(
                    "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900",
                    "placeholder:text-gray-400 transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-offset-0",
                    errors.email
                      ? "border-danger-400 focus:border-danger-500 focus:ring-danger-500/20"
                      : "border-gray-300 focus:border-primary-500 focus:ring-primary-500/20"
                  )}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-danger-600" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={cn(
                      "block w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900",
                      "placeholder:text-gray-400 transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-offset-0",
                      errors.password
                        ? "border-danger-400 focus:border-danger-500 focus:ring-danger-500/20"
                        : "border-gray-300 focus:border-primary-500 focus:ring-primary-500/20"
                    )}
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
                  <p className="mt-1.5 text-xs text-danger-600" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white",
                  "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  "bg-primary-900 hover:bg-primary-800 active:scale-[0.98]"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitMfa(onMfaSubmit)} className="space-y-5">
              <p className="text-sm text-gray-600 text-center">
                Enter the 6-digit code from your authenticator app.
              </p>
              <div>
                <label
                  htmlFor="mfa-code"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Verification code
                </label>
                <input
                  {...registerMfa("code")}
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className={cn(
                    "block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 text-center tracking-widest",
                    "placeholder:text-gray-400 transition-colors duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-offset-0",
                    mfaErrors.code
                      ? "border-danger-400 focus:border-danger-500 focus:ring-danger-500/20"
                      : "border-gray-300 focus:border-primary-500 focus:ring-primary-500/20"
                  )}
                />
                {mfaErrors.code && (
                  <p className="mt-1.5 text-xs text-danger-600" role="alert">
                    {mfaErrors.code.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isMfaSubmitting}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white",
                  "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  "bg-primary-900 hover:bg-primary-800 active:scale-[0.98]"
                )}
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
                Back to sign in
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Thelix Holdings Internal HRIS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
