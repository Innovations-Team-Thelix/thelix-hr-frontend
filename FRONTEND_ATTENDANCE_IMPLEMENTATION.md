# Frontend Implementation Guide: Roster & Attendance Enhancement

This document outlines the step-by-step implementation plan for integrating the new Attendance module into the existing HRIS frontend.

## 1. API Integration (`src/hooks/useAttendance.ts`)

Create a new hook file to manage all attendance-related API calls.

### Key Features
- **Fetch Attendance**: Get attendance records for calendar view.
- **Fetch Stats**: Get aggregated attendance statistics.
- **Clock In**: `POST /attendance/clock-in`
- **Clock Out**: `POST /attendance/clock-out`
- **Approve/Reject**: `PATCH /attendance/:id/approve`

### Interface Definitions
```typescript
// src/types/attendance.ts

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
}

export interface AttendanceStats {
  totalDaysWorked: number;
  daysOnsite: number;
  daysRemote: number;
  lateDays: number;
  absentDays: number;
}
```

### Hook Structure
```typescript
// src/hooks/useAttendance.ts

export const attendanceKeys = {
  all: ['attendance'] as const,
  list: (filters: any) => [...attendanceKeys.all, 'list', filters] as const,
  stats: (filters: any) => [...attendanceKeys.all, 'stats', filters] as const,
};

export function useAttendance(filters: AttendanceFilters) { ... }
export function useAttendanceStats(filters: AttendanceFilters) { ... }
export function useClockIn() { ... }
export function useClockOut() { ... }
export function useApproveAttendance() { ... }
```

## 2. Component Updates

### A. Roster Page (`src/app/roster/page.tsx`)
The existing Roster page needs to be enhanced to show actual attendance alongside the planned roster.

**Changes:**
1.  **Dual Data Fetching**: Fetch both `useRoster` (Plan) and `useAttendance` (Actual) for the selected period.
2.  **Cell Rendering**:
    -   **Planned**: Show background color (Green/Blue) as currently implemented.
    -   **Actual**: Overlay status indicators.
        -   ✅ **Checkmark**: Present & On Time.
        -   ⚠️ **Warning Icon**: Late (Orange).
        -   ❌ **X Icon**: Absent (Red).
        -   ⏳ **Clock Icon**: Pending Approval (Yellow).
3.  **Tooltip/Popover**: Clicking a cell should show detailed info:
    -   Planned: Onsite/Remote
    -   Actual: Clock In/Out times, Late Reason, Approval Status.
4.  **Legend Update**: Add new statuses to the legend.

### B. Dashboard (`src/app/dashboard/page.tsx`)
Add a **Clock-In/Out Widget** for the logged-in employee.

**Widget Features:**
-   **Current Status**: Show if currently clocked in or out.
-   **Timer**: Show elapsed time if clocked in.
-   **Actions**:
    -   **Clock In**: Opens modal to select Location (Onsite/Remote) and enter Late Reason (if applicable).
    -   **Clock Out**: Simple button action.
-   **Recent Activity**: List last 5 days' attendance status.

### C. Attendance Approval View
Create a new page or modal for SBU Heads to manage approvals.

-   **Location**: `src/app/attendance/approvals/page.tsx` (New Route) OR integrate into Roster page as "Approvals" tab.
-   **Table Columns**: Employee, Date, Time, Status (Late/On Time), Reason, Actions (Approve/Reject).
-   **Bulk Actions**: Select multiple -> Approve.

### D. HR Stats View
Enhance the existing `src/app/attendance/stats` (or add to Reports).

-   **Visuals**:
    -   Pie Chart: Onsite vs Remote vs Absent.
    -   Bar Chart: Late arrivals per department.
-   **Filters**: Date Range, Department, SBU.

## 3. Implementation Steps

1.  **Types & Hooks**:
    -   Create `src/types/attendance.ts`.
    -   Create `src/hooks/useAttendance.ts`.

2.  **Clock-In Widget**:
    -   Create `src/components/attendance/clock-in-widget.tsx`.
    -   Create `src/components/attendance/clock-in-modal.tsx` (for Location/Late Reason).
    -   Add to Dashboard.

3.  **Roster Page Enhancement**:
    -   Modify `RosterPage` to fetch attendance data.
    -   Update `renderCell` logic to merge Roster + Attendance data.
    -   Add detailed tooltip/popover for cells.

4.  **Approvals Interface**:
    -   Create `src/components/attendance/approval-list.tsx`.
    -   Add route `src/app/attendance/approvals/page.tsx`.

5.  **Navigation**:
    -   Update `src/components/layout/sidebar.tsx` to include "Attendance" links (if separate page).

## 4. UI/UX Considerations

-   **Color Coding**:
    -   **Green**: Present (On Time)
    -   **Blue**: Remote (On Time)
    -   **Orange**: Late
    -   **Red**: Absent
    -   **Gray**: Weekend/Holiday
-   **Feedback**: Use `react-hot-toast` for success/error messages (Clock In success, Approval success).
-   **Loading States**: Use `Skeleton` loaders for the widget and grid while fetching data.

## 5. Security & Permissions
-   **Clock In/Out**: Visible to all Employees.
-   **Approvals**: Visible only to `SBUHead` and `Admin`.
-   **Stats**: Visible to `SBUHead` (scoped) and `Admin` (global).

## 6. Example Code Snippets

### Clock In Modal
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>Clock In</DialogHeader>
    <Select value={location} onValueChange={setLocation}>
      <SelectItem value="Onsite">Onsite</SelectItem>
      <SelectItem value="Remote">Remote</SelectItem>
    </Select>
    {isLate && (
      <Textarea 
        placeholder="Reason for being late..." 
        value={reason} 
        onChange={e => setReason(e.target.value)} 
      />
    )}
    <Button onClick={handleClockIn}>Confirm</Button>
  </DialogContent>
</Dialog>
```
