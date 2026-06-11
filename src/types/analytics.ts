// Response types for the HR planning analytics endpoints
// (leave forecasting, cost of leave, workforce planning).

// ─── Leave forecasting / understaffing ───────────────

export interface ForecastMonth {
  key: string; // 'YYYY-MM'
  label: string; // 'Jan 2026'
}

export interface ForecastMonthTotal {
  month: string;
  monthLabel: string;
  leaveDays: number;
}

export interface ForecastDepartment {
  departmentId: string;
  department: string;
  sbu: string;
  activeHeadcount: number;
  minOnsite: number;
  byMonth: number[]; // aligned to `months`
  totalLeaveDays: number;
}

export interface CoverageGap {
  date: string;
  sbu: string;
  department: string;
  activeHeadcount: number;
  onLeave: number;
  available: number;
  minRequired: number;
  shortfall: number;
}

export interface LeaveForecast {
  window: { startDate: string; endDate: string };
  months: ForecastMonth[];
  monthTotals: ForecastMonthTotal[];
  byDepartment: ForecastDepartment[];
  coverageGaps: CoverageGap[];
  summary: {
    totalLeaveDays: number;
    peakMonth: string | null;
    peakMonthDays: number;
    gapDays: number;
    maxShortfall: number;
    departmentsAtRisk: number;
    truncated: boolean;
  };
}

// ─── Cost of leave ───────────────────────────────────

export interface LeaveCostDepartment {
  department: string;
  sbu: string;
  usedCost: number;
  liabilityCost: number;
}

export interface LeaveCostByType {
  leaveType: string;
  usedDays: number;
  usedCost: number;
  liabilityCost: number;
}

export interface LeaveCostEmployee {
  employeeId: string;
  employee: string;
  sbu: string;
  department: string;
  monthlySalary: number;
  dailyRate: number;
  currency: string;
  usedDays: number;
  usedCost: number;
  remainingDays: number;
  liabilityCost: number;
}

export interface LeaveCostReport {
  year: number;
  assumptions: { workingDaysPerMonth: number; basis: string; note: string };
  summary: {
    totalUsedCost: number;
    totalLiabilityCost: number;
    totalCost: number;
    currency: string;
    employeesCounted: number;
  };
  byDepartment: LeaveCostDepartment[];
  byLeaveType: LeaveCostByType[];
  byEmployee: LeaveCostEmployee[];
}

// ─── Workforce planning ──────────────────────────────

export interface CapacityDepartment {
  departmentId: string;
  department: string;
  sbu: string;
  activeHeadcount: number;
  onLeaveToday: number;
  availableNow: number;
  upcomingLeave30d: number;
  minOnsite: number;
  shortfall: number;
  needsHands: boolean;
}

export interface CapacityReport {
  asOf: string;
  departments: CapacityDepartment[];
  summary: { totalActive: number; departmentsNeedingHands: number; totalShortfall: number };
}

export interface HeadcountTrendMonth {
  month: string;
  label: string;
  headcount: number;
  joiners: number;
  leavers: number;
}

export interface HeadcountTrend {
  months: HeadcountTrendMonth[];
  summary: { currentHeadcount: number; totalJoiners: number; totalLeavers: number };
}

export interface AttritionDepartment {
  department: string;
  sbu: string;
  startHeadcount: number;
  endHeadcount: number;
  avgHeadcount: number;
  leavers: number;
  attritionRate: number;
}

export interface AttritionReport {
  year: number;
  departments: AttritionDepartment[];
  summary: { leavers: number; avgHeadcount: number; attritionRate: number };
}
