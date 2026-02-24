// ─── Type unions ────────────────────────────────────────────

export type UserRole = 'Admin' | 'SBUHead' | 'Finance' | 'Employee';
export type Gender = 'Male' | 'Female' | 'NonBinary' | 'PreferNotToSay';
export type EmploymentType = 'FullTime' | 'Contract' | 'Intern';
export type WorkArrangement = 'Remote' | 'Hybrid' | 'Onsite';
export type EmploymentStatus = 'Active' | 'Suspended' | 'Terminated' | 'Resigned';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type LifecycleEventType = 'Promotion' | 'Demotion' | 'RoleTransfer' | 'InternalTransfer' | 'SalaryChange' | 'Suspension' | 'WrittenWarning' | 'Commendation' | 'Termination' | 'Resignation';
export type RosterDayType = 'Onsite' | 'Remote' | 'Leave';
export type NotificationChannel = 'Email' | 'Slack' | 'InApp';
export type ViolationType = 'LateComing' | 'Absenteeism' | 'Insubordination' | 'PolicyViolation' | 'Misconduct' | 'Other';
export type DisciplinarySeverity = 'Warning' | 'Strike' | 'Suspension' | 'Termination';
export type PayrollStatus = 'Draft' | 'Approved' | 'Sent';

// ─── Entity interfaces ────────────────────────────────────

export interface Sbu {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  sbuId: string;
  minOnsite: number;
  createdAt: string;
  sbu?: Sbu;
}

export interface Employee {
  id: string;
  employeeId: string;

  // Personal information
  fullName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  nationality: string | null;
  address: string | null;
  phone: string | null;
  personalEmail: string | null;
  workEmail: string;
  maritalStatus: string | null;
  nextOfKinName: string | null;
  nextOfKinRelationship: string | null;
  nextOfKinPhone: string | null;
  emergencyContact: string | null;
  governmentId: string | null;
  tin: string | null;
  pensionNumber: string | null;
  hmoId: string | null;

  // Employment details
  dateOfHire: string;
  employmentType: EmploymentType;
  sbuId: string;
  departmentId: string;
  jobTitle: string;
  supervisorId: string | null;
  workArrangement: WorkArrangement;
  probationEndDate: string | null;
  employmentStatus: EmploymentStatus;

  // Compensation (restricted — only visible to Admin/Finance)
  monthlySalary: number | null;
  salaryBand: string | null;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  currency: string | null;
  salaryEffectiveDate: string | null;
  lastSalaryReview: string | null;

  // Offer Letter
  offerLetterFileName: string | null;
  offerLetterFileKey: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  sbu?: Sbu;
  department?: Department;
  supervisor?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle'>;
  subordinates?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle'>[];
  userAccount?: UserAccount;
}

export interface UserAccount {
  id: string;
  employeeId: string;
  email: string;
  role: UserRole;
  sbuScopeId: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface LifecycleEvent {
  id: string;
  employeeId: string;
  eventType: LifecycleEventType;
  eventDate: string;
  description: string;
  initiatedById: string;
  approvedById: string | null;
  createdAt: string;

  // Relations
  employee?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle'>;
  initiatedBy?: Pick<Employee, 'id' | 'employeeId' | 'fullName'>;
  approvedBy?: Pick<Employee, 'id' | 'employeeId' | 'fullName'> | null;
  attachments?: LifecycleAttachment[];
}

export interface LifecycleAttachment {
  id: string;
  lifecycleEventId: string;
  fileName: string;
  fileKey: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  defaultDays: number;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;

  // Computed / relations
  remainingDays?: number;
  leaveType?: LeaveType;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: LeaveStatus;

  // Supervisor action
  supervisorAction: LeaveStatus | null;
  supervisorActionById: string | null;
  supervisorActionAt: string | null;

  // HR action
  hrAction: LeaveStatus | null;
  hrActionById: string | null;
  hrActionAt: string | null;

  createdAt: string;

  // Relations
  employee?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle' | 'sbuId'> & {
    sbu?: Sbu;
  };
  leaveType?: LeaveType;
  supervisorActionBy?: Pick<Employee, 'id' | 'fullName'> | null;
  hrActionBy?: Pick<Employee, 'id' | 'fullName'> | null;
}

export interface RosterEntry {
  id: string;
  employeeId: string;
  date: string;
  dayType: RosterDayType;
  isOverride: boolean;
  createdById: string;
  createdAt: string;

  // Relations
  employee?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle' | 'departmentId' | 'sbuId'> & {
    department?: Department;
  };
  createdBy?: Pick<Employee, 'id' | 'fullName'>;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;

  // Relations
  actor?: Pick<Employee, 'id' | 'employeeId' | 'fullName'>;
}

export interface Notification {
  id: string;
  type: string;
  recipientId: string | null;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
  sentAt: string | null;
  error: string | null;
  createdAt: string;

  // Relations
  recipient?: Pick<Employee, 'id' | 'employeeId' | 'fullName'> | null;
}

// ─── Dashboard stats ──────────────────────────────────────

export interface WorkforceStats {
  totalHeadcount: number;
  activeCount: number;
  newHiresThisMonth: number;
  headcountBySbu: Array<{ sbuName: string; count: number }>;
  headcountByDepartment: Array<{ departmentName: string; sbuName: string; count: number }>;
  genderDistribution: Array<{ gender: string; count: number }>;
  employmentTypeDistribution: Array<{ type: string; count: number }>;
  workArrangementDistribution: Array<{ arrangement: string; count: number }>;
}

export interface LeaveStats {
  currentlyOnLeave: number;
  onLeaveDetails: Array<{
    employeeName: string;
    leaveType: string;
    endDate: string;
  }>;
  upcomingLeave: Array<{
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
  }>;
}

export interface SalaryStats {
  totalMonthlyPayout: number;
  payoutBySbu: Array<{ sbuName: string; total: number; averageSalary: number; headcount: number }>;
}

export interface CelebrationPerson {
  employeeName: string;
  department: string;
  sbu: string;
  yearsOfService?: number;
}

export interface CelebrationsData {
  todayBirthdays: CelebrationPerson[];
  upcomingBirthdays: CelebrationPerson[];
  todayAnniversaries: CelebrationPerson[];
  upcomingAnniversaries: CelebrationPerson[];
  milestoneAnniversaries: CelebrationPerson[];
}

// ─── API response types ───────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, unknown> | unknown[];
}

// ─── Auth types ───────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  employeeId: string;
  role: UserRole;
  sbuScopeId?: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  requiresMfa: boolean;
  mfaToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
}

// ─── Filter / query types ─────────────────────────────────

export interface EmployeeFilters {
  page?: number;
  limit?: number;
  sbuId?: string;
  departmentId?: string;
  status?: EmploymentStatus;
  search?: string;
  sortBy?: 'fullName' | 'employeeId' | 'dateOfHire' | 'jobTitle' | 'employmentStatus' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface LeaveRequestFilters {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
}

export interface RosterQuery {
  departmentId?: string;
  sbuId?: string;
  startDate: string;
  endDate: string;
}

export interface GenerateRosterInput {
  departmentId: string;
  startDate: string;
  endDate: string;
}

export interface OverrideRosterInput {
  employeeId: string;
  date: string;
  dayType: 'Onsite' | 'Remote';
}

export interface RosterGenerationResult {
  entries: RosterEntry[];
  warnings: string[];
}

export interface LeaveCalendarEntry {
  id: string;
  employeeId: string;
  fullName: string;
  startDate: string;
  endDate: string;
  leaveTypeName: string;
  status: LeaveStatus;
}

// ─── Discipline types ────────────────────────────────────────

export interface DisciplinaryAction {
  id: string;
  employeeId: string;
  issuedById: string;
  violationType: ViolationType;
  severity: DisciplinarySeverity;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;

  employee?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle' | 'workEmail'>;
  issuedBy?: Pick<Employee, 'id' | 'employeeId' | 'fullName'>;
}

export interface DisciplinaryActionFilters {
  employeeId?: string;
  violationType?: ViolationType;
  severity?: DisciplinarySeverity;
  page?: number;
  limit?: number;
}

// ─── Company Policy types ────────────────────────────────────

export interface CompanyPolicy {
  id: string;
  title: string;
  fileName: string;
  fileKey: string;
  uploadedById: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  uploadedBy?: Pick<Employee, 'id' | 'fullName'>;
}

// ─── Payroll types ───────────────────────────────────────────

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: PayrollStatus;
  createdById: string;
  approvedAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;

  createdBy?: Pick<Employee, 'id' | 'fullName'>;
  payslips?: Payslip[];
  _count?: { payslips: number };
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  createdAt: string;
  updatedAt: string;

  employee?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle' | 'workEmail'>;
  payrollRun?: Pick<PayrollRun, 'id' | 'month' | 'year' | 'status'>;
}

export interface PayslipWithYTD {
  payslips: Payslip[];
  ytd: {
    basicSalary: number;
    allowances: number;
    deductions: number;
    netPay: number;
  };
}

export interface PayrollRunFilters {
  page?: number;
  limit?: number;
  year?: number;
  status?: PayrollStatus;
}
