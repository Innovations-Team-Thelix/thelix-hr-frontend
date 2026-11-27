export type NewHireStatus = "pending" | "converted" | "dismissed";

/** A hired candidate from Thelix Talent, waiting to be completed as an employee. */
export interface NewHire {
  id: string;
  source: string;
  externalRef: string;
  companySlug: string | null;
  companyName: string | null;
  fullName: string;
  personalEmail: string;
  phone: string | null;
  jobTitle: string;
  department: string | null;
  location: string | null;
  proposedStartDate: string | null;
  offerSalary: number | null;
  currency: string | null;
  employmentType: "FullTime" | "Contract" | "Intern" | null;
  notes: string | null;
  talentUrl: string | null;
  status: NewHireStatus;
  employeeId: string | null;
  handledById: string | null;
  handledAt: string | null;
  convertStartedAt: string | null;
  dismissReason: string | null;
  createdAt: string;
  updatedAt: string;
  employee: { id: string; employeeId: string; fullName: string } | null;
  handledBy: { id: string; fullName: string } | null;
  /** Employee-form fields filled from Talent. */
  prefill: Record<string, unknown>;
}

export type NewHireCounts = Record<NewHireStatus, number>;
