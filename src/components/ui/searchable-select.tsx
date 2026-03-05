"use client";

import React, { useState, useEffect, useRef, forwardRef } from "react";
import { ChevronDown, Check, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  label: string;
  value: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  error?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  selectedOption?: SearchableSelectOption | null;
}

export const SearchableSelect = forwardRef<HTMLDivElement, SearchableSelectProps>(
  ({ 
    options, 
    value, 
    onChange, 
    onSearch, 
    onClear,
    label, 
    placeholder = "Select...", 
    error, 
    loading, 
    disabled, 
    className, 
    required,
    selectedOption: propSelectedOption
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Determine the selected option object
    const selectedOption = propSelectedOption || options.find((opt) => opt.value === value);

    // Handle click outside to close
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter options locally if no onSearch provided
    const displayedOptions = onSearch 
      ? options 
      : options.filter(opt => 
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (opt.subLabel && opt.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
        );

    const handleSelect = (option: SearchableSelectOption) => {
      onChange(option.value);
      setIsOpen(false);
      setSearchQuery("");
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClear) {
        onClear();
      } else {
        onChange("");
      }
      setSearchQuery("");
    };

    return (
      <div className={cn("w-full", className)} ref={containerRef}>
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          <div
            className={cn(
              "flex min-h-[42px] w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm transition-colors",
              error ? "border-red-500 focus-within:ring-red-500" : "border-gray-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
              disabled && "cursor-not-allowed bg-gray-50 text-gray-500",
              !disabled && "cursor-pointer hover:border-gray-400"
            )}
            onClick={() => !disabled && setIsOpen(!isOpen)}
          >
            {selectedOption ? (
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">{selectedOption.label}</span>
                {selectedOption.subLabel && (
                  <span className="text-xs text-gray-500">{selectedOption.subLabel}</span>
                )}
              </div>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
            
            <div className="flex items-center gap-2">
              {selectedOption && !disabled && (
                <div 
                  className="rounded-full p-1 hover:bg-gray-100"
                  onClick={handleClear}
                >
                  <X className="h-3 w-3 text-gray-400" />
                </div>
              )}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {isOpen && !disabled && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      onSearch?.(e.target.value);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              
              <div className="max-h-60 overflow-y-auto px-2 pb-2">
                {loading ? (
                  <div className="flex items-center justify-center py-4 text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : displayedOptions.length === 0 ? (
                  <div className="py-4 text-center text-sm text-gray-500">
                    No results found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {displayedOptions.map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-100",
                          value === option.value && "bg-primary/5 text-primary"
                        )}
                        onClick={() => handleSelect(option)}
                      >
                        <div className="flex flex-col">
                          <span className={cn("font-medium", value === option.value ? "text-primary" : "text-gray-900")}>
                            {option.label}
                          </span>
                          {option.subLabel && (
                            <span className="text-xs text-gray-500">{option.subLabel}</span>
                          )}
                        </div>
                        {value === option.value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

SearchableSelect.displayName = "SearchableSelect";
