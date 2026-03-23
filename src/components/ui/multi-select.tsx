"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  label?: string;
  error?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  label,
  error,
  placeholder = "Select...",
  options,
  value,
  onChange,
  required,
  disabled,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = label?.toLowerCase().replace(/\s+/g, "-");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabels = options.filter((o) => value.includes(o.value));

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      <div className="relative">
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex min-h-[38px] w-full cursor-pointer flex-wrap items-center gap-1 rounded-lg border bg-white px-3 py-1.5 pr-10 text-sm",
            "transition-colors duration-150",
            error
              ? "border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger/30"
              : "border-gray-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30",
            disabled && "cursor-not-allowed bg-gray-50 text-gray-500",
            className,
          )}
        >
          {selectedLabels.length === 0 && (
            <span className="text-gray-400">{placeholder}</span>
          )}
          {selectedLabels.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {opt.label}
              <button
                type="button"
                onClick={(e) => removeOption(opt.value, e)}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

        {isOpen && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">No options</li>
            )}
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={value.includes(option.value)}
                onClick={() => !option.disabled && toggleOption(option.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50",
                  option.disabled && "cursor-not-allowed opacity-50",
                  value.includes(option.value) && "bg-primary/5 font-medium text-primary",
                )}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  readOnly
                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary"
                />
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
