"use client";

import React, { useState, useEffect } from "react";
import { useController, Control, FieldValues, Path } from "react-hook-form";
import { Input } from "./input";
import { currencySymbol } from "@/lib/utils";

function formatNumber(value: string): string {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return value;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function stripFormatting(value: string): string {
  return value.replace(/,/g, "");
}

interface CurrencyInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  currencyCode?: string;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CurrencyInput<T extends FieldValues>({
  control,
  name,
  currencyCode = "NGN",
  label,
  error,
  placeholder = "0.00",
  disabled,
}: CurrencyInputProps<T>) {
  const { field } = useController({ control, name });
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!focused) {
      const raw = field.value ?? "";
      setDisplay(raw ? formatNumber(String(raw)) : "");
    }
  }, [field.value, focused]);

  return (
    <Input
      label={label}
      type="text"
      inputMode="decimal"
      prefix={currencySymbol(currencyCode)}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
      value={focused ? field.value ?? "" : display}
      onChange={(e) => {
        const raw = stripFormatting(e.target.value);
        // Allow empty, digits, and one decimal point
        if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
          field.onChange(raw);
        }
      }}
      onFocus={() => {
        setFocused(true);
        setDisplay(field.value ?? "");
      }}
      onBlur={() => {
        setFocused(false);
        field.onBlur();
      }}
      ref={field.ref}
    />
  );
}
