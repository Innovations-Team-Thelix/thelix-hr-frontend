"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  onBlur?: (e: { target: { name?: string; value: string } }) => void;
  searchable?: boolean;
}

const Select = React.forwardRef<HTMLInputElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      placeholder,
      options,
      id,
      required,
      disabled,
      name,
      value: controlledValue,
      onChange,
      onBlur,
      searchable = true,
      ...rest
    },
    ref
  ) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [internalValue, setInternalValue] = useState(controlledValue ?? "");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sync internal value with controlled value
    useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue);
      }
    }, [controlledValue]);

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue;
    const selectedOption = options.find((o) => o.value === currentValue);

    const filteredOptions = searchable && search
      ? options.filter((o) =>
          o.label.toLowerCase().includes(search.toLowerCase())
        )
      : options;

    // Close on outside click
    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
          setSearch("");
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (open && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [open, searchable]);

    const selectOption = useCallback(
      (optionValue: string) => {
        setInternalValue(optionValue);
        setOpen(false);
        setSearch("");

        // Fire onChange with a synthetic event shape compatible with react-hook-form
        if (onChange) {
          onChange({ target: { name, value: optionValue } });
        }
      },
      [onChange, name]
    );

    const handleBlur = useCallback(() => {
      if (onBlur) {
        onBlur({ target: { name, value: currentValue } });
      }
    }, [onBlur, name, currentValue]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false);
          setSearch("");
        } else if (e.key === "Enter" && open) {
          e.preventDefault();
          if (filteredOptions.length === 1 && !filteredOptions[0].disabled) {
            selectOption(filteredOptions[0].value);
          }
        }
      },
      [open, filteredOptions, selectOption]
    );

    return (
      <div className="w-full" ref={containerRef}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}

        {/* Hidden input for form compatibility */}
        <input
          ref={ref}
          type="hidden"
          name={name}
          value={currentValue}
          id={selectId}
        />

        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setOpen((o) => !o);
                setSearch("");
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm text-left",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              error
                ? "border-danger focus:border-danger focus:ring-danger/30"
                : "border-gray-300 hover:border-gray-400 focus:border-primary focus:ring-primary/30",
              disabled && "cursor-not-allowed bg-gray-50 text-gray-500",
              className
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${selectId}-error` : undefined}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span
              className={cn(
                "truncate",
                selectedOption ? "text-gray-900" : "text-gray-400"
              )}
            >
              {selectedOption?.label || placeholder || "Select..."}
            </span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {currentValue && !disabled && !required && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectOption("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      selectOption("");
                    }
                  }}
                  className="rounded p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-gray-400 transition-transform",
                  open && "rotate-180"
                )}
              />
            </div>
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
              {/* Search input */}
              {searchable && (
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
                    />
                  </div>
                </div>
              )}

              {/* Options list */}
              <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
                {filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={currentValue === option.value}
                    onClick={() => {
                      if (!option.disabled) {
                        selectOption(option.value);
                      }
                    }}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-sm transition-colors",
                      "hover:bg-primary-50 hover:text-primary-900",
                      currentValue === option.value &&
                        "bg-primary-50 text-primary-900 font-medium",
                      option.disabled &&
                        "cursor-not-allowed text-gray-300 hover:bg-transparent hover:text-gray-300",
                      currentValue !== option.value &&
                        !option.disabled &&
                        "text-gray-700"
                    )}
                  >
                    {option.label}
                  </li>
                ))}
                {filteredOptions.length === 0 && (
                  <li className="px-3 py-4 text-center text-sm text-gray-400">
                    No results found
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-1.5 text-xs text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
export type { SelectProps, SelectOption };
