"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Search, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBanks } from "@/hooks";
import api from "@/lib/api";

interface BankAccountFieldsProps {
  accountNumber: string;
  accountName: string;
  bankName: string;
  onAccountNumberChange: (v: string) => void;
  onAccountNameChange: (v: string) => void;
  onBankNameChange: (v: string) => void;
  errors?: {
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
  };
}

export function BankAccountFields({
  accountNumber,
  accountName,
  bankName,
  onAccountNumberChange,
  onAccountNameChange,
  onBankNameChange,
  errors,
}: BankAccountFieldsProps) {
  const { data: banks = [] } = useBanks();

  // local state for the combobox
  const [bankOpen, setBankOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const bankRef = useRef<HTMLDivElement>(null);

  // selected bank code (needed for account-name resolution)
  const [selectedBankCode, setSelectedBankCode] = useState("");

  // resolution state
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [resolveError, setResolveError] = useState("");

  // When bankName is pre-populated from saved data, find the matching code
  useEffect(() => {
    if (bankName && banks.length > 0 && !selectedBankCode) {
      const match = banks.find(
        (b) => b.name.toLowerCase() === bankName.toLowerCase()
      );
      if (match) setSelectedBankCode(match.code);
    }
  }, [bankName, banks, selectedBankCode]);

  // Auto-resolve when account number reaches 10 digits and a bank is selected.
  // Skip the API call if accountName is already populated (pre-existing verified data).
  useEffect(() => {
    if (accountNumber.length !== 10 || !selectedBankCode) {
      setResolved(false);
      setResolveError("");
      return;
    }
    // Account name already populated — mark as verified without hitting the API
    if (accountName) {
      setResolved(true);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setResolving(true);
      setResolveError("");
      try {
        const res = await api.get<{ accountName: string; accountNumber: string }>(
          "/payroll/resolve-account",
          { params: { accountNumber, bankCode: selectedBankCode } }
        );
        if (!cancelled) {
          onAccountNameChange(res.data.accountName);
          setResolved(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          setResolveError(
            err?.response?.data?.message || "Could not verify account. Check the number and bank."
          );
          onAccountNameChange("");
          setResolved(false);
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accountNumber, selectedBankCode, accountName]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bankRef.current && !bankRef.current.contains(e.target as Node)) {
        setBankOpen(false);
        setBankSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  function selectBank(bank: { name: string; code: string }) {
    onBankNameChange(bank.name);
    setSelectedBankCode(bank.code);
    setBankOpen(false);
    setBankSearch("");
    // reset resolution when bank changes
    setResolved(false);
    onAccountNameChange("");
  }

  function clearBank() {
    onBankNameChange("");
    setSelectedBankCode("");
    setResolved(false);
    setResolveError("");
    onAccountNameChange("");
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Bank selector combobox */}
      <div className="flex flex-col gap-1" ref={bankRef}>
        <label className="text-sm font-medium text-gray-700">
          Bank Name
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => { setBankOpen((o) => !o); setBankSearch(""); }}
            className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-left transition-colors hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <span className={bankName ? "text-gray-900" : "text-gray-400"}>
              {bankName || "Select bank"}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {bankName && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); clearBank(); }}
                  className="rounded p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${bankOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {bankOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search bank..."
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                </div>
              </div>
              <ul className="max-h-52 overflow-y-auto py-1">
                {filteredBanks.map((b) => (
                  <li
                    key={b.code}
                    onClick={() => selectBank(b)}
                    className={`cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-primary-50 hover:text-primary-900 ${
                      bankName === b.name ? "bg-primary-50 text-primary-900 font-medium" : "text-gray-700"
                    }`}
                  >
                    {b.name}
                  </li>
                ))}
                {filteredBanks.length === 0 && (
                  <li className="px-3 py-4 text-center text-sm text-gray-400">No banks found</li>
                )}
              </ul>
            </div>
          )}
        </div>
        {errors?.bankName && <p className="text-xs text-red-600">{errors.bankName}</p>}
      </div>

      {/* Account Number */}
      <div className="flex flex-col gap-1">
        <Input
          label="Account Number"
          placeholder="10-digit NUBAN"
          value={accountNumber}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
            onAccountNumberChange(val);
            setResolved(false);
            setResolveError("");
            onAccountNameChange("");
          }}
          error={errors?.accountNumber || resolveError}
          maxLength={10}
        />
        {resolving && (
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verifying account…
          </p>
        )}
      </div>

      {/* Account Name — auto-populated */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Account Name</label>
        <div className="relative">
          <input
            type="text"
            value={accountName}
            readOnly
            placeholder={
              !selectedBankCode
                ? "Select a bank first"
                : accountNumber.length < 10
                ? "Enter 10-digit account number"
                : resolving
                ? "Verifying…"
                : "Auto-populated from bank"
            }
            className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              resolved
                ? "border-green-300 bg-green-50 text-green-900"
                : "border-gray-200 bg-gray-50 text-gray-500"
            } cursor-default select-none`}
          />
          {resolved && (
            <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
          )}
        </div>
        {resolved && (
          <p className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Account verified
          </p>
        )}
        {errors?.accountName && <p className="text-xs text-red-600">{errors.accountName}</p>}
      </div>
    </div>
  );
}
