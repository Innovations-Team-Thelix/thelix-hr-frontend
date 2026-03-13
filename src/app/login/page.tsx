"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
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
      const destination = user.role === "Employee" ? "/profile" : "/dashboard";
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
      const destination = authUser?.role === "Employee" ? "/profile" : "/dashboard";
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
      const destination = authUser?.role === "Employee" ? "/profile" : "/dashboard";
      router.push(destination);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message =
        axiosError?.response?.data?.message ||
        "Invalid MFA code. Please try again.";
      setLoginError(message);
    }
  };

  if (!mounted) return null;
  if (isAuthenticated && user) return null;

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Left brand panel ── */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-[#1a0a00] p-12">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#f48220 1px, transparent 1px), linear-gradient(90deg, #f48220 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/40">
            <span className="text-lg font-black text-white">T</span>
          </div>
          <span className="text-lg font-bold tracking-wide text-white">
            Thelix<span className="text-primary"> HRIS</span>
          </span>
        </div>

        {/* Center copy */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-16">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 mb-6">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Secure HR Platform</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            Manage your
            <br />
            <span className="text-primary">workforce</span>
            <br />
            with confidence.
          </h2>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-gray-400">
            Attendance, payroll, leave, and people — all in one place, built for the modern workplace.
          </p>

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { value: "100%", label: "Uptime SLA" },
              { value: "256-bit", label: "Encryption" },
              { value: "GDPR", label: "Compliant" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="mt-0.5 text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-gray-600">
          &copy; {new Date().getFullYear()} Thelix Holdings. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30">
            <span className="text-base font-black text-white">T</span>
          </div>
          <span className="text-base font-bold text-gray-900">
            Thelix<span className="text-primary"> HRIS</span>
          </span>
        </div>

        <div className="w-full max-w-sm animate-fade-in">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {mfaToken ? "Two-factor verification" : "Welcome back"}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {mfaToken
                ? "Enter the 6-digit code from your authenticator app."
                : "Sign in to your Thelix HRIS account."}
            </p>
          </div>

          {/* Error Alert */}
          {loginError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
              <p className="text-sm text-danger-700">{loginError}</p>
            </div>
          )}

          {/* ── Login form ── */}
          {!mfaToken ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  {...register("email")}
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@thelixholdings.com"
                  className={cn(
                    "block w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-900",
                    "placeholder:text-gray-400 transition-all duration-150",
                    "focus:bg-white focus:outline-none focus:ring-2 focus:ring-offset-0",
                    errors.email
                      ? "border-danger-300 focus:border-danger-400 focus:ring-danger-500/20"
                      : "border-gray-200 focus:border-primary-400 focus:ring-primary-500/20"
                  )}
                />
                {errors.email && (
                  <p className="text-xs text-danger-600" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                      "block w-full rounded-xl border bg-gray-50 px-4 py-3 pr-11 text-sm text-gray-900",
                      "placeholder:text-gray-400 transition-all duration-150",
                      "focus:bg-white focus:outline-none focus:ring-2 focus:ring-offset-0",
                      errors.password
                        ? "border-danger-300 focus:border-danger-400 focus:ring-danger-500/20"
                        : "border-gray-200 focus:border-primary-400 focus:ring-primary-500/20"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-danger-600" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3",
                  "bg-primary text-sm font-semibold text-white shadow-md shadow-primary/30",
                  "transition-all duration-200 hover:bg-primary-600 hover:shadow-lg hover:shadow-primary/40",
                  "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ── MFA form ── */
            <form onSubmit={handleSubmitMfa(onMfaSubmit)} className="space-y-5">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <ShieldCheck className="h-7 w-7 text-primary" />
                </div>
              </div>

              {/* Code input */}
              <div className="space-y-1.5">
                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700">
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
                    "block w-full rounded-xl border bg-gray-50 px-4 py-3 text-center text-xl font-semibold tracking-[0.5em] text-gray-900",
                    "placeholder:text-gray-300 placeholder:tracking-[0.5em] transition-all duration-150",
                    "focus:bg-white focus:outline-none focus:ring-2 focus:ring-offset-0",
                    mfaErrors.code
                      ? "border-danger-300 focus:border-danger-400 focus:ring-danger-500/20"
                      : "border-gray-200 focus:border-primary-400 focus:ring-primary-500/20"
                  )}
                />
                {mfaErrors.code && (
                  <p className="text-xs text-danger-600" role="alert">
                    {mfaErrors.code.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isMfaSubmitting}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3",
                  "bg-primary text-sm font-semibold text-white shadow-md shadow-primary/30",
                  "transition-all duration-200 hover:bg-primary-600 hover:shadow-lg hover:shadow-primary/40",
                  "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60"
                )}
              >
                {isMfaSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify code"
                )}
              </button>

              <button
                type="button"
                onClick={() => { setMfaToken(null); setLoginError(null); }}
                className="w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-800"
              >
                &larr; Back to sign in
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-gray-400">
            Thelix Holdings Internal HRIS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
