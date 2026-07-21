import type { Employee, LeaveType } from "@/types";

/**
 * Whether an employee is eligible for a leave type, given the type's gender and
 * marital-status gates. Mirrors the checks enforced on the server at submit time
 * (see the backend `leave.service.ts` `create()` flow) so the UI never offers —
 * or shows a balance for — a leave type the employee could not actually take.
 *
 * Fail-closed: when the employee profile is not yet loaded (undefined/null),
 * gated types are treated as ineligible so they don't briefly flash into view
 * before the profile resolves. Ungated types ("All") are always eligible.
 */
export function isLeaveTypeEligible(
  leaveType:
    | Pick<LeaveType, "genderEligibility" | "maritalEligibility">
    | undefined
    | null,
  employee: Pick<Employee, "gender" | "maritalStatus"> | undefined | null,
): boolean {
  if (!leaveType) return true;

  const genderOk =
    !leaveType.genderEligibility ||
    leaveType.genderEligibility === "All" ||
    employee?.gender === leaveType.genderEligibility;

  const maritalOk =
    !leaveType.maritalEligibility ||
    leaveType.maritalEligibility === "All" ||
    employee?.maritalStatus === leaveType.maritalEligibility;

  return genderOk && maritalOk;
}
