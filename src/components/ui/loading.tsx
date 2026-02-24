import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Spinner                                                             */
/* ------------------------------------------------------------------ */

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const spinnerSizes: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", spinnerSizes[size], className)}
      aria-label="Loading"
    />
  );
}

/* ------------------------------------------------------------------ */
/* LoadingOverlay                                                      */
/* ------------------------------------------------------------------ */

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

function LoadingOverlay({
  message = "Loading...",
  className,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

interface SkeletonProps {
  className?: string;
  /** Pre-defined shapes for common patterns */
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

function Skeleton({
  className,
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  const variantStyles: Record<string, string> = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200",
        variantStyles[variant],
        className
      )}
      style={{
        width: width
          ? typeof width === "number"
            ? `${width}px`
            : width
          : undefined,
        height: height
          ? typeof height === "number"
            ? `${height}px`
            : height
          : undefined,
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

export { Spinner, LoadingOverlay, Skeleton };
export type { SpinnerProps, SpinnerSize, LoadingOverlayProps, SkeletonProps };
