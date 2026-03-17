"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) setServerError("Invalid or missing reset token. Please request a new reset link.");
  }, [token]);

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setServerError(null);
    try {
      await api.post("/auth/reset-password", { token, password: data.password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#000000" }}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: "#C8622A" }}
        >
          <span className="text-base font-bold text-white">T</span>
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">
          Thelix Holdings HRIS
        </span>
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white px-8 py-10 shadow-2xl">
          {success ? (
            <div className="text-center">
              <div
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: "#ecfdf5" }}
              >
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="font-display text-2xl font-bold text-gray-900">
                Password updated!
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Your password has been reset successfully.
                <br />
                Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  Set a new password
                </h1>
                <p className="mt-1.5 text-sm text-gray-500">
                  Must be at least 8 characters.
                </p>
              </div>

              {serverError && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {serverError}
                </div>
              )}

              {!token ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Please{" "}
                    <Link
                      href="/forgot-password"
                      className="font-medium underline"
                      style={{ color: "#C8622A" }}
                    >
                      request a new reset link
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* New password */}
                  <div>
                    <div className="relative">
                      <input
                        {...register("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="New password"
                        autoComplete="new-password"
                        className={cn(
                          "block w-full rounded-lg border bg-white px-4 py-3 pr-11 text-sm text-gray-900",
                          "placeholder:text-gray-400 transition-colors duration-150",
                          "focus:outline-none focus:ring-2 focus:ring-offset-0",
                          errors.password
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-300"
                        )}
                        onFocus={(e) => {
                          if (!errors.password) e.currentTarget.style.borderColor = "#C8622A";
                        }}
                        onBlur={(e) => {
                          if (!errors.password) e.currentTarget.style.borderColor = "";
                        }}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs text-red-600" role="alert">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <div className="relative">
                      <input
                        {...register("confirm")}
                        type={showConfirm ? "text" : "password"}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        className={cn(
                          "block w-full rounded-lg border bg-white px-4 py-3 pr-11 text-sm text-gray-900",
                          "placeholder:text-gray-400 transition-colors duration-150",
                          "focus:outline-none focus:ring-2 focus:ring-offset-0",
                          errors.confirm
                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-300"
                        )}
                        onFocus={(e) => {
                          if (!errors.confirm) e.currentTarget.style.borderColor = "#C8622A";
                        }}
                        onBlur={(e) => {
                          if (!errors.confirm) e.currentTarget.style.borderColor = "";
                        }}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirm && (
                      <p className="mt-1.5 text-xs text-red-600" role="alert">
                        {errors.confirm.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-all duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
                    style={{ backgroundColor: "#000000" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a1a1a")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#000000")}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      "Reset password"
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
