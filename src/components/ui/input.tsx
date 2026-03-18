"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputType = "text" | "email" | "password" | "number" | "date" | "tel";

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "prefix"> {
  type?: InputType;
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, id, prefix, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {label}
            {props.required && (
              <span className="ml-0.5 text-danger">*</span>
            )}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              "block w-full rounded-lg border bg-white py-2 text-sm text-gray-900",
              prefix ? "pl-8 pr-3" : "px-3",
              "placeholder:text-gray-400",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              error
                ? "border-danger focus:border-danger focus:ring-danger/30"
                : "border-gray-300 focus:border-primary focus:ring-primary/30",
              "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
              className
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-xs text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-xs text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps, InputType };
