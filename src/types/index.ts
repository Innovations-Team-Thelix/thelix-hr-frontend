// ─── Type unions ────────────────────────────────────────────

export type UserRole = 'Admin' | 'SBUHead' | 'Director' | 'Manager' | 'Finance' | 'Employee';
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
export type DisciplinaryStatus = 'Pending' | 'Approved' | 'Rejected';
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

export interface SalaryComponent {
  name: string;
  amount: number;
}

export interface SalaryRecord {
  id: string;
  baseSalary: number;
  grossPay: number;
  netPay: number;
  pension: number;
  tax: number;
  allowances: SalaryComponent[];
  deductions: SalaryComponent[];
  effectiveDate: string;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  createdBy?: {
    id: string;
    fullName: string;
    employeeId: string;
  };
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
  probationPeriod: number | null; // In months
  probationEndDate: string | null;
  employmentStatus: EmploymentStatus;
  tags?: string[];

  // Compensation (restricted — only visible to Admin/Finance)
  monthlySalary: number | null;
  netPay?: number | null;
  salaryBand: string | null;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  currency: string | null;
  salaryEffectiveDate: string | null;
  lastSalaryReview: string | null;
  salaryBreakdown?: SalaryRecord;

  // Offer Letter
  offerLetterFileName: string | null;
  offerLetterFileKey: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  sbu?: Sbu;
  sbuMemberships?: EmployeeSbuMembership[];
  department?: Department;
  supervisor?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle'>;
  subordinates?: (Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle' | 'workEmail' | 'phone'> & {
    department?: { name: string }
  })[];
  userAccount?: UserAccount;
}

export interface EmployeeSbuMembership {
  id: string;
  employeeId: string;
  sbuId: string;
  isPrimary: boolean;
  assignedAt: string;
  sbu: Sbu;
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
  signedUrl?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  defaultDays: number;
  noticePeriod: number;
  requiresDoc: boolean;
}

export interface LeaveAttachment {
  id: string;
  leaveRequestId: string;
  fileName: string;
  fileKey: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: string;
  signedUrl?: string;
}

export interface LeaveBlackoutDate {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  reason: string | null;
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

  // Return to work
  actualReturnDate: string | null;
  returnNote: string | null;
  returnedAt: string | null;

  // Supervisor action
  supervisorAction: LeaveStatus | null;
  supervisorActionById: string | null;
  supervisorActionAt: string | null;
  supervisorNote: string | null;

  // HR action
  hrAction: LeaveStatus | null;
  hrActionById: string | null;
  hrActionAt: string | null;
  hrNote: string | null;

  createdAt: string;

  // Relations
  employee?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle' | 'sbuId'> & {
    sbu?: Sbu;
  };
  leaveType?: LeaveType;
  supervisorActionBy?: Pick<Employee, 'id' | 'fullName'> | null;
  hrActionBy?: Pick<Employee, 'id' | 'fullName'> | null;
  attachments?: LeaveAttachment[];
}

export interface ReturnToWorkData {
  actualReturnDate: string;
  returnNote?: string;
  attachments?: File[];
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
  nextPayDay: string;
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
  date: string;
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
  mustChangePassword?: boolean;
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
  scope?: 'all';
  search?: string;
  joined?: 'this_month' | 'last_month' | 'this_year';
  sortBy?: 'fullName' | 'employeeId' | 'dateOfHire' | 'jobTitle' | 'employmentStatus' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface LeaveRequestFilters {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: LeaveStatus;
  stage?: 'supervisor' | 'hr';
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
  sbuId?: string;
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
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  employee: {
    id: string;
    fullName: string;
    jobTitle: string;
    department?: {
      name: string;
    };
  };
  leaveType: {
    name: string;
  };
}

// ─── Discipline types ────────────────────────────────────────

export interface DisciplinaryAction {
  id: string;
  employeeId: string;
  issuedById: string;
  violationType: ViolationType;
  severity: DisciplinarySeverity;
  status: DisciplinaryStatus;
  description: string;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;

  employee?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle' | 'workEmail'>;
  issuedBy?: Pick<Employee, 'id' | 'employeeId' | 'fullName'>;
  reviewedBy?: Pick<Employee, 'id' | 'employeeId' | 'fullName'> | null;
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

  signedUrl?: string;
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

// ─── Document types ───────────────────────────────────────────

export type DocumentType =
  | 'Resume'
  | 'OfferLetter'
  | 'EmploymentContract'
  | 'PromotionLetter'
  | 'WarningLetter'
  | 'NDA'
  | 'ConfidentialityAgreement'
  | 'TaxForm'
  | 'Identification'
  | 'PolicyAcknowledgment'
  | 'Certification'
  | 'Other';

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: DocumentType;
  fileName: string;
  fileKey: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  signedUrl?: string;
}

// ─── Asset types ─────────────────────────────────────

export type AssetCondition = 'BrandNew' | 'Good' | 'Fair' | 'Poor';

export interface Asset {
  id: string;
  employeeId: string;
  issuedById: string;
  equipmentType: string;
  assetTag?: string | null;
  brand?: string | null;
  model?: string | null;
  condition: AssetCondition;
  dateIssued: string;
  dateReturned?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  employee?: Pick<Employee, 'id' | 'employeeId' | 'fullName' | 'jobTitle'> & { department?: { name: string } };
  issuedBy?: Pick<Employee, 'id' | 'employeeId' | 'fullName'>;
}

export interface AssetFilters {
  employeeId?: string;
  equipmentType?: string;
  condition?: AssetCondition;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateAssetInput {
  employeeId: string;
  equipmentType: string;
  assetTag?: string;
  brand?: string;
  model?: string;
  condition: AssetCondition;
  dateIssued: string;
  notes?: string;
}

export interface UpdateAssetInput {
  equipmentType?: string;
  assetTag?: string;
  brand?: string;
  model?: string;
  condition?: AssetCondition;
  dateIssued?: string;
  dateReturned?: string | null;
  notes?: string;
  isActive?: boolean;
}

// ─── KPI types ───────────────────────────────────────

export type KpiCategory = 'Strategic' | 'Operational' | 'Financial' | 'Customer' | 'Compliance' | 'People' | 'Innovation';
export type KpiLevel = 'Company' | 'SBU' | 'Department' | 'Team' | 'Individual';
export type KpiTimeHorizon = 'Annual' | 'Quarterly' | 'Monthly';
export type KpiTargetType = 'Numeric' | 'Percentage' | 'Milestone' | 'Binary' | 'Composite';
export type KpiStatus = 'NotStarted' | 'InProgress' | 'OnTrack' | 'AtRisk' | 'OffTrack' | 'Completed' | 'Overdue' | 'OnHold' | 'Cancelled';
export type KpiUpdateFrequency = 'Weekly' | 'Biweekly' | 'Monthly' | 'Manual';
export type KpiRollupMethod = 'WeightedAverage' | 'Sum' | 'Manual';
export type ReviewCycleType = 'Monthly' | 'Quarterly' | 'Annual';
export type ReviewSignoffStatus = 'Pending' | 'SignedOff' | 'Rejected';

export interface Kpi {
  id: string;
  title: string;
  description?: string;
  category: KpiCategory;
  kpiLevel: KpiLevel;
  timeHorizon: KpiTimeHorizon;
  parentKpiId?: string;
  sbuId?: string;
  departmentId?: string;
  startDate: string;
  endDate: string;
  targetType: KpiTargetType;
  targetValue?: number;
  unit?: string;
  weight?: number;
  rollupMethod: KpiRollupMethod;
  updateFrequency: KpiUpdateFrequency;
  status: KpiStatus;
  computedProgress?: number | null;
  progressOverride?: number | null;
  evidenceRequired: boolean;
  // §21 — Reviewer
  reviewerId?: string;
  // §25 — KPI Definition Template
  businessObjective?: string;
  calculationFormula?: string;
  dataSource?: string;
  createdById: string;
  approvedById?: string;
  createdAt: string;
  updatedAt: string;
  sbu?: { id: string; name: string; code: string };
  department?: { id: string; name: string; sbuId?: string };
  createdBy?: { id: string; fullName: string };
  reviewer?: { id: string; fullName: string; jobTitle: string };
  parent?: { id: string; title: string; kpiLevel: KpiLevel };
  assignments?: KpiAssignment[];
  updates?: KpiUpdate[];
  _count?: { children: number; assignments: number; updates: number };
}

export interface KpiAssignment {
  id: string;
  kpiId: string;
  employeeId: string;
  assignedById: string;
  contributionWeight?: number;
  isActive: boolean;
  assignedAt: string;
  employee?: { id: string; fullName: string; jobTitle: string; department?: { name: string } };
  assignedBy?: { id: string; fullName: string };
}

export interface KpiUpdate {
  id: string;
  kpiId: string;
  employeeId: string;
  updatePeriod: string;
  actualValue?: number;
  percentComplete?: number;
  narrative?: string;
  blockerFlag: boolean;
  blockerDetail?: string;
  confidenceLevel?: number;
  nextSteps?: string;
  submittedAt: string;
  reviewedById?: string;
  reviewNote?: string;
  employee?: { id: string; fullName: string };
  kpi?: { id: string; title: string; status: KpiStatus };
}

export interface KpiReviewCycle {
  id: string;
  name: string;
  cycleType: ReviewCycleType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isLocked: boolean;
  lockedAt?: string;
  calibrationRequired: boolean;
  signoffRequired: boolean;
  kpiWeight: number;
  behavioralWeight: number;
  createdById: string;
  createdAt: string;
  createdBy?: { id: string; fullName: string };
  lockedBy?: { id: string; fullName: string };
  _count?: { reviews: number };
}

export interface KpiReview {
  id: string;
  reviewCycleId: string;
  kpiId: string;
  employeeId: string;
  managerId?: string;
  selfRating?: number;
  managerRating?: number;
  behavioralScore?: number;
  finalRating?: number;
  reviewComment?: string;
  strengths?: string;
  improvementAreas?: string;
  developmentActions?: string;
  calibrationNote?: string | null;
  approvalStatus?: string;
  signoffStatus: ReviewSignoffStatus;
  signedOffAt?: string;
  updatedAt?: string;
  createdAt: string;
  kpi?: { id: string; title: string; status: KpiStatus; kpiLevel?: KpiLevel; category?: KpiCategory; endDate?: string };
  employee?: { id: string; fullName: string; jobTitle: string; department?: { name: string } };
  manager?: { id: string; fullName: string };
  reviewCycle?: { id: string; name: string; cycleType: ReviewCycleType };
}

export interface KpiDashboard {
  totalKpis: number;
  byStatus: Array<{ status: KpiStatus; count: number }>;
  byLevel: Array<{ level: KpiLevel; count: number }>;
  byCategory: Array<{ category: KpiCategory; count: number }>;
  recentUpdates: KpiUpdate[];
  myAssignments: Array<{ kpi: Kpi }>;
}

export interface KpiFilters {
  sbuId?: string;
  departmentId?: string;
  kpiLevel?: KpiLevel;
  timeHorizon?: KpiTimeHorizon;
  category?: KpiCategory;
  status?: KpiStatus;
  assignedToMe?: string;
  parentKpiId?: string;
  page?: number;
  limit?: number;
}

// ─── OKR types ───────────────────────────────────────

export type OkrCycleStatus = 'Upcoming' | 'Active' | 'Closed';
export type KeyResultType = 'Percentage' | 'Currency' | 'Number' | 'Boolean';
export type OkrHealthStatus = 'OnTrack' | 'AtRisk' | 'Behind' | 'Completed';
export type OkrApprovalStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected';

export interface OkrCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: OkrCycleStatus;
  isLocked: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; fullName: string };
  _count?: { objectives: number };
}

export interface KeyResultUpdate {
  id: string;
  keyResultId: string;
  updatedById: string;
  previousValue: number;
  newValue: number;
  healthStatus: OkrHealthStatus;
  note?: string;
  createdAt: string;
  updatedBy?: { id: string; fullName: string };
}

export interface OkrComment {
  id: string;
  keyResultId: string;
  authorId: string;
  body: string;
  mentions: string[];
  createdAt: string;
  author?: { id: string; fullName: string };
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  metricType: KeyResultType;
  targetValue: number;
  currentValue: number;
  startValue: number;
  healthStatus: OkrHealthStatus;
  lastUpdatedAt?: string;
  createdAt: string;
  updates?: KeyResultUpdate[];
  comments?: OkrComment[];
}

export interface Objective {
  id: string;
  cycleId: string;
  ownerId: string;
  title: string;
  description?: string;
  parentObjectiveId?: string;
  completionPct: number;
  approvalStatus: OkrApprovalStatus;
  approverId?: string;
  approvalNote?: string;
  approvedAt?: string;
  approver?: { id: string; fullName: string; jobTitle: string };
  createdAt: string;
  updatedAt: string;
  cycle?: { id: string; name: string; status: OkrCycleStatus; isLocked: boolean };
  owner?: { id: string; employeeId: string; fullName: string; jobTitle: string; department?: { name: string } };
  parentObjective?: { id: string; title: string };
  childObjectives?: Objective[];
  keyResults?: KeyResult[];
  _count?: { childObjectives: number; keyResults: number };
}

export interface OkrDashboard {
  activeCycle: OkrCycle | null;
  myObjectives: Objective[];
  teamObjectives: Objective[];
  directReports: Array<{ id: string; fullName: string; jobTitle: string }>;
  staleKrCount: number;
  orgStats?: {
    totalObjectives: number;
    approvedCount: number;
    pendingCount: number;
    avgCompletion: number;
  };
}
