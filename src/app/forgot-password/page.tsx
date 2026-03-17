"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await api.post("/auth/forgot-password", { email: data.email });
      setSubmittedEmail(data.email);
      setSent(true);
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
          {!sent ? (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  Forgot your password?
                </h1>
                <p className="mt-1.5 text-sm text-gray-500">
                  Enter your work email and we&apos;ll send you a reset link.
                </p>
              </div>

              {serverError && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="Email Address"
                    className={cn(
                      "block w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-900",
                      "placeholder:text-gray-400 transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-offset-0",
                      errors.email
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-300"
                    )}
                    onFocus={(e) => {
                      if (!errors.email) e.currentTarget.style.borderColor = "#C8622A";
                    }}
                    onBlur={(e) => {
                      if (!errors.email) e.currentTarget.style.borderColor = "";
                    }}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-600" role="alert">
                      {errors.email.message}
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
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div
                className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: "#fdf4ee" }}
              >
                <MailCheck className="h-7 w-7" style={{ color: "#C8622A" }} />
              </div>
              <h1 className="font-display text-2xl font-bold text-gray-900">
                Check your inbox
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                We sent a password reset link to{" "}
                <span className="font-medium text-gray-900">{submittedEmail}</span>.
                <br />
                It expires in 1 hour.
              </p>
              <p className="mt-4 text-xs text-gray-400">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="font-medium underline"
                  style={{ color: "#C8622A" }}
                >
                  try again
                </button>
                .
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
