import React from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Maps common HRIS entity statuses to visual badge variants.
 *
 * Handles employee, leave, and lifecycle statuses:
 * - Active, Approved          -> success  (green)
 * - Suspended, Pending        -> warning  (amber)
 * - Terminated, Rejected      -> danger   (red)
 * - Resigned, Cancelled       -> neutral  (gray)
 * - On Leave                  -> info     (blue)
 * - Unknown statuses          -> neutral  (gray)
 */

const statusVariantMap: Record<string, BadgeVariant> = {
  // Employee statuses
  active: "success",
  suspended: "warning",
  terminated: "danger",
  resigned: "neutral",
  probation: "info",
  "on leave": "info",

  // Leave / lifecycle request statuses
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",

  // Additional statuses
  completed: "success",
  confirmed: "success",
  draft: "neutral",
  expired: "danger",
  overdue: "danger",
  processing: "info",
};

function getVariantForStatus(status: string): BadgeVariant {
  const normalised = status.toLowerCase().trim();
  return statusVariantMap[normalised] ?? "neutral";
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = getVariantForStatus(status);

  // Capitalise the first letter for display
  const displayText =
    status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <Badge variant={variant} className={className}>
      {displayText}
    </Badge>
  );
}

export { StatusBadge };
export type { StatusBadgeProps };
