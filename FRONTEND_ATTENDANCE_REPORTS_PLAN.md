# Frontend Implementation Plan: Attendance Reports & Analytics

This document outlines the implementation plan for the missing **Attendance Reporting** module in the frontend. This module will allow HR, Admins, and SBU Heads to visualize attendance trends and identify patterns (e.g., frequent lateness, remote work adherence).

## 1. Page Location & Routing

*   **New Route**: `src/app/reports/attendance/page.tsx`
*   **Parent Layout**: `AppLayout` (Standard Dashboard Layout)
*   **Permissions**: Protected route, accessible only to:
    *   `Admin` (Global view)
    *   `SBUHead` (Scoped to their SBU)
    *   `Finance` (Read-only for payroll verification)

## 2. Data Integration

We will utilize the existing `useAttendanceStats` hook which connects to `GET /attendance/stats`.

### Required Data Structure (Frontend Interface)
Ensure the `AttendanceStats` interface in `src/types/attendance.ts` supports the following aggregations:

```typescript
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
  
  // Top Offenders (Optional/Advanced)
  mostLateEmployees: {
    employeeId: string;
    name: string;
    count: number;
  }[];
}
```

## 3. UI Layout & Components

### A. Filters (Top Bar)
*   **Date Range Picker**: "This Month", "Last Month", "Custom Range".
*   **SBU Selector**: Filter by SBU (for Admins).
*   **Department Selector**: Filter by Department.
*   **Export Button**: "Export CSV" (reuses existing export logic).

### B. Key Metric Cards (Row 1)
Display high-level KPIs:
1.  **Attendance Rate**: `(Present / Total Work Days) * 100` (Green/Red indicator).
2.  **Late Arrivals**: Total count & percentage (Orange).
3.  **Remote Usage**: Percentage of days worked remotely (Blue).
4.  **Absenteeism**: Unexcused absences count (Red).

### C. Visualizations (Row 2 & 3)
Using `recharts` library (already installed):

1.  **Attendance Status Trend (Stacked Bar Chart)**
    *   X-Axis: Date (Day 1 to 30/31).
    *   Y-Axis: Employee Count.
    *   Stacks: Present (Green), Late (Orange), Absent (Red), Leave (Gray).
    *   *Goal*: Spot specific days with high absenteeism (e.g., Mondays or Fridays).

2.  **Work Location Split (Pie Chart)**
    *   Segments: Onsite vs. Remote.
    *   *Goal*: Monitor compliance with hybrid work policies (e.g., "3 days onsite").

3.  **Department Leaderboard (Bar Chart)**
    *   X-Axis: Department Name.
    *   Y-Axis: Late % or Absent %.
    *   *Goal*: Identify departments struggling with punctuality.

### D. Detailed Table (Row 4)
A sortable table for individual employee stats within the selected period:
*   **Columns**:
    *   Employee Name (Avatar + Name)
    *   Department
    *   Days Present
    *   Days Late
    *   Total Late Minutes (if available)
    *   Unexcused Absences
    *   Status (e.g., "Good Standing", "Warning")

## 4. Implementation Steps

1.  **Update Types**:
    *   Verify `AttendanceStats` in `src/types/attendance.ts` matches the API response structure.
    *   If the API only returns raw numbers, add helper functions in `src/lib/utils.ts` to calculate percentages.

2.  **Create Page Component**:
    *   Scaffold `src/app/reports/attendance/page.tsx`.
    *   Add `useAttendanceStats` hook with state for `filters` (startDate, endDate, sbuId).

3.  **Build Components**:
    *   **Filters**: Reuse `Select` and `DateRangePicker` (if available, otherwise standard HTML date inputs).
    *   **Charts**: Create reusable chart wrappers (e.g., `AttendanceTrendChart.tsx`) in `src/components/reports/`.

4.  **Navigation Update**:
    *   Modify `src/components/layout/sidebar.tsx`:
        *   Add "Attendance Reports" under the "Reports" section.
        *   Ensure it's visible to `Admin`, `SBUHead`, and `Finance`.

## 5. Mockups / Visual Guide

```
[ Page Title: Attendance Reports ]  [ Filters: Oct 2023 v | All SBUs v ] [ Export ]

-----------------------------------------------------------------------
|  Attendance Rate  |  Late Arrivals    |  Remote Usage     |  Absent |
|      92% (+2%)    |    15 (5%)        |      45%          |    3    |
-----------------------------------------------------------------------

---------------------------------------   -----------------------------
|  Daily Attendance Trend (Bar Chart) |   |  Location Split (Pie)     |
|  [|||||||||||||||||||||||||]        |   |      ( Onsite )           |
|                                     |   |      ( Remote )           |
---------------------------------------   -----------------------------

-----------------------------------------------------------------------
| Employee Breakdown (Table)                                          |
| Name          | Dept      | Present | Late | Absent | Avg Clock-In  |
| John Doe      | Eng       | 20      | 2    | 0      | 09:15 AM      |
| Jane Smith    | HR        | 22      | 0    | 0      | 08:55 AM      |
-----------------------------------------------------------------------
```
