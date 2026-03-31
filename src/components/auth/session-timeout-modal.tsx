"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Clock, LogOut } from "lucide-react";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onLogout: () => void;
}

export function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onContinue,
  onLogout,
}: SessionTimeoutModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onContinue} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-4">
          <Clock className="h-7 w-7 text-amber-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Session Expiring
        </h3>

        <p className="text-sm text-gray-600 mb-1">
          Your session will expire due to inactivity in
        </p>

        <p className="text-3xl font-bold text-amber-600 tabular-nums mb-4">
          {remainingSeconds}s
        </p>

        <p className="text-xs text-gray-500 mb-6">
          Click &quot;Continue Session&quot; to stay logged in, or you will be
          automatically logged out.
        </p>

        <div className="flex w-full gap-3">
          <button
            onClick={onLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
          <button
            onClick={onContinue}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            Continue Session
          </button>
        </div>
      </div>
    </Modal>
  );
}
