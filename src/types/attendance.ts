export enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  Late = 'Late',
  OnLeave = 'OnLeave',
}

export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // ISO Date
  clockInTime?: string;
  clockOutTime?: string;
  status: AttendanceStatus;
  approvalStatus: ApprovalStatus;
  isLate: boolean;
  lateReason?: string;
  workLocation: 'Onsite' | 'Remote';
  rejectionReason?: string;
  source?: 'Clock' | 'Manual' | 'Import';
  importBatchId?: string | null;
  approvedBy?: { fullName: string };
  employee?: {
    id: string;
    fullName: string;
    employeeId: string;
    sbuId?: string;
    department?: {
      name: string;
    };
  };
}

export interface AttendanceImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  preview?: Array<Record<string, string>>;
  batchId?: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  sbuId: string | null;
  startHour: number;
  startMinute: number;
  graceMinutes: number;
  workDays: number[];
  isActive: boolean;
}

export interface AttendanceStats {
  // Summary Cards
  totalWorkDays: number;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  averageClockInTime: string; // e.g., "09:12 AM"
  
  // Charts
  dailyTrend: {
    date: string;
    present: number;
    late: number;
    absent: number;
  }[];
  
  locationDistribution: {
    onsite: number;
    remote: number;
  };
  
  // Top Offenders
  mostLateEmployees: {
    employeeId: string;
    name: string;
    count: number;
    department?: string;
  }[];
}

export interface AttendanceFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  departmentId?: string;
  sbuId?: string;
  status?: AttendanceStatus;
  approvalStatus?: ApprovalStatus;
  page?: number;
  limit?: number;
}
