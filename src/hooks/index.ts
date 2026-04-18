"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  Employee,
  EmployeeFilters,
  EmployeeSbuMembership,
  LeaveRequest,
  LeaveRequestFilters,
  LeaveBalance,
  RosterEntry,
  RosterQuery,
  GenerateRosterInput,
  OverrideRosterInput,
  WorkforceStats,
  LeaveStats,
  SalaryStats,
  Sbu,
  Department,
  LeaveType,
  LifecycleEvent,
  PaginationMeta,
  LeaveCalendarEntry,
  DisciplinaryAction,
  DisciplinaryActionFilters,
  CompanyPolicy,
  PayrollRun,
  PayrollRunFilters,
  Payslip,
  PayslipWithYTD,
} from "@/types";

export { useAuth, useAuth as useAuthStore } from "./useAuth";
export { useSalaryHistory } from "./useEmployees";
export { useEffectiveRole } from "./useEffectiveRole";

// ─── Helpers ─────────────────────────────────────────

function buildParams(obj: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = String(value);
    }
  }
  return params;
}

// ─── SBU & Department hooks ──────────────────────────

export function useSbus() {
  return useQuery<Sbu[]>({
    queryKey: ["sbus"],
    queryFn: async () => {
      const res = await api.get<Sbu[]>("/sbus");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSbu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code: string }) => {
      const res = await api.post<Sbu>("/sbus", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
    },
  });
}

export function useUpdateSbu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; code: string } }) => {
      const res = await api.put<Sbu>(`/sbus/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
    },
  });
}

export function useDeleteSbu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sbus/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
    },
  });
}

// ─── Multi-SBU Assignment hooks ─────────────────────

export function useEmployeeSbuMemberships(employeeId?: string) {
  return useQuery<EmployeeSbuMembership[]>({
    queryKey: ["employee-sbus", employeeId],
    queryFn: async () => {
      const res = await api.get<EmployeeSbuMembership[]>(`/sbus/employees/${employeeId}/memberships`);
      return res.data;
    },
    enabled: !!employeeId,
  });
}

export function useAssignSbu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { employeeId: string; sbuId: string; isPrimary?: boolean }) => {
      const res = await api.post<EmployeeSbuMembership>("/sbus/assign", data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employee-sbus", variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", variables.employeeId] });
    },
  });
}

export function useRemoveSbu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { employeeId: string; sbuId: string }) => {
      await api.post("/sbus/remove", data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employee-sbus", variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", variables.employeeId] });
    },
  });
}

export function useTransferPrimarySbu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { employeeId: string; newPrimarySbuId: string }) => {
      const res = await api.post<Employee>("/sbus/transfer-primary", data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employee-sbus", variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", variables.employeeId] });
    },
  });
}

export function useDepartments(sbuId?: string) {
  return useQuery<Department[]>({
    queryKey: ["departments", sbuId],
    queryFn: async () => {
      const params = sbuId ? { sbuId, limit: 1000 } : { limit: 1000 };
      const res = await api.get<Department[]>("/departments", { params });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePaginatedDepartments(params: { sbuId?: string; page?: number; limit?: number } = {}) {
  return useQuery<{
    data: Department[];
    pagination: PaginationMeta;
  }>({
    queryKey: ["departments", params],
    queryFn: async () => {
      const queryParams = buildParams(params as Record<string, unknown>);
      const res = await api.get<Department[]>("/departments", {
        params: queryParams,
      });
      return {
        data: res.data,
        pagination: res.pagination!,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; sbuId: string; minOnsite: number }) => {
      const res = await api.post<Department>("/departments", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; sbuId: string; minOnsite: number } }) => {
      const res = await api.put<Department>(`/departments/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["sbus"] });
    },
  });
}

export function useLeaveTypes() {
  return useQuery<LeaveType[]>({
    queryKey: ["leave-types"],
    queryFn: async () => {
      const res = await api.get<LeaveType[]>("/leave-types");
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Employee hooks ──────────────────────────────────

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery<{
    data: Employee[];
    pagination: PaginationMeta;
  }>({
    queryKey: ["employees", filters],
    queryFn: async () => {
      const res = await api.get<Employee[]>("/employees", {
        params: buildParams(filters as Record<string, unknown>),
      });
      return {
        data: res.data,
        pagination: res.pagination!,
      };
    },
  });
}

export function useEmployee(id: string) {
  return useQuery<Employee>({
    queryKey: ["employee", id],
    queryFn: async () => {
      const res = await api.get<Employee>(`/employees/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useMyProfile() {
  return useQuery<Employee>({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const res = await api.get<Employee>("/employees/me");
      return res.data;
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const res = await api.post<Employee>("/employees", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const res = await api.put<Employee>(`/employees/${id}`, data);
      return res.data;
    },
    onSuccess: (updatedEmployee, variables) => {
      // Set the full employee data (including salaryBreakdown) immediately in cache
      if (updatedEmployee) {
        queryClient.setQueryData(["employee", variables.id], updatedEmployee);
      }
      // Invalidate salary history so it refetches in the background
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const res = await api.patch<Employee>("/employees/me", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/employees/${id}`, { timeout: 120_000 });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useBulkDeleteEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/employees/bulk-delete", { ids });
      return res.data as { deleted: number; errors: Array<{ id: string; message: string }> };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useSearchEmployees(search: string) {
  return useQuery<Employee[]>({
    queryKey: ["employees-search", search],
    queryFn: async () => {
      const res = await api.get<Employee[]>("/employees", {
        params: { search, limit: "20" },
      });
      return res.data;
    },
    enabled: search.length >= 2,
  });
}

export function useAllEmployees() {
  return useQuery<Employee[]>({
    queryKey: ["all-employees-list"],
    queryFn: async () => {
      const res = await api.get<Employee[]>("/employees", {
        params: { limit: "1000" },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Leave hooks ─────────────────────────────────────

export function useLeaveRequests(filters: LeaveRequestFilters = {}) {
  return useQuery<{
    data: LeaveRequest[];
    pagination: PaginationMeta;
  }>({
    queryKey: ["leave-requests", filters],
    queryFn: async () => {
      const res = await api.get<LeaveRequest[]>("/leave-requests", {
        params: buildParams(filters as Record<string, unknown>),
      });
      return {
        data: res.data,
        pagination: res.pagination!,
      };
    },
  });
}

export function useMyLeaveBalances(year?: number) {
  return useQuery<LeaveBalance[]>({
    queryKey: ["my-leave-balances", year],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (year) params.year = String(year);
      const res = await api.get<LeaveBalance[]>("/leave-balances/me", { params });
      return res.data;
    },
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason?: string;
    }) => {
      const res = await api.post<LeaveRequest>("/leave-requests", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-balances"] });
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete<LeaveRequest>(`/leave-requests/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-balances"] });
    },
  });
}

export function useSupervisorAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "Approved" | "Rejected";
    }) => {
      const res = await api.post<LeaveRequest>(
        `/leave-requests/${id}/supervisor-action`,
        { action }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useHrAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "Approved" | "Rejected";
    }) => {
      const res = await api.post<LeaveRequest>(
        `/leave-requests/${id}/hr-action`,
        { action }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useLeaveCalendar(params: {
  startDate: string;
  endDate: string;
  sbuId?: string;
}) {
  return useQuery<LeaveCalendarEntry[]>({
    queryKey: ["leave-calendar", params],
    queryFn: async () => {
      const res = await api.get<LeaveCalendarEntry[]>("/leave-calendar", {
        params: buildParams(params as Record<string, unknown>),
      });
      return res.data;
    },
    enabled: !!params.startDate && !!params.endDate,
  });
}

// ─── Dashboard hooks ─────────────────────────────────

export function useWorkforceStats(sbuId?: string) {
  return useQuery<WorkforceStats>({
    queryKey: ["workforce-stats", sbuId],
    queryFn: async () => {
      const params = sbuId ? { sbuId } : {};
      const res = await api.get<WorkforceStats>("/dashboard/workforce", { params });
      return res.data;
    },
  });
}

export function useLeaveStats(sbuId?: string) {
  return useQuery<LeaveStats>({
    queryKey: ["leave-stats", sbuId],
    queryFn: async () => {
      const params = sbuId ? { sbuId } : {};
      const res = await api.get<LeaveStats>("/dashboard/leave", { params });
      return res.data;
    },
  });
}

export function useSalaryStats(sbuId?: string) {
  return useQuery<SalaryStats>({
    queryKey: ["salary-stats", sbuId],
    queryFn: async () => {
      const params = sbuId ? { sbuId } : {};
      const res = await api.get<SalaryStats>("/dashboard/salary", { params });
      return res.data;
    },
  });
}

export function useCelebrations() {
  return useQuery<{
    todayBirthdays: Array<{ employeeName: string; department: string; sbu: string; date: string }>;
    upcomingBirthdays: Array<{ employeeName: string; department: string; sbu: string; date: string }>;
    todayAnniversaries: Array<{
      employeeName: string;
      department: string;
      sbu: string;
      date: string;
      yearsOfService: number;
    }>;
    upcomingAnniversaries: Array<{
      employeeName: string;
      department: string;
      sbu: string;
      date: string;
      yearsOfService: number;
    }>;
    milestoneAnniversaries: Array<{
      employeeName: string;
      department: string;
      sbu: string;
      date: string;
      yearsOfService: number;
    }>;
  }>({
    queryKey: ["celebrations"],
    queryFn: async () => {
      const res = await api.get<{
        todayBirthdays: Array<{ employeeName: string; department: string; sbu: string; date: string }>;
        upcomingBirthdays: Array<{ employeeName: string; department: string; sbu: string; date: string }>;
        todayAnniversaries: Array<{
          employeeName: string;
          department: string;
          sbu: string;
          date: string;
          yearsOfService: number;
        }>;
        upcomingAnniversaries: Array<{
          employeeName: string;
          department: string;
          sbu: string;
          date: string;
          yearsOfService: number;
        }>;
        milestoneAnniversaries: Array<{
          employeeName: string;
          department: string;
          sbu: string;
          date: string;
          yearsOfService: number;
        }>;
      }>("/dashboard/celebrations");
      return res.data;
    },
  });
}

// ─── Roster hooks ────────────────────────────────────

export function useRoster(query: RosterQuery) {
  return useQuery<RosterEntry[]>({
    queryKey: ["roster", query],
    queryFn: async () => {
      const res = await api.get<RosterEntry[]>("/roster", {
        params: buildParams(query as unknown as Record<string, unknown>),
      });
      return res.data;
    },
    enabled: !!query.startDate && !!query.endDate,
  });
}

export function useGenerateRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateRosterInput) => {
      const res = await api.post<RosterEntry[]>("/roster/generate", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
  });
}

export function useOverrideRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: OverrideRosterInput) => {
      const res = await api.put<RosterEntry>("/roster/entries", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roster"] });
    },
  });
}

// ─── Lifecycle hooks ─────────────────────────────────

export function useLifecycleEvents(employeeId: string) {
  return useQuery<LifecycleEvent[]>({
    queryKey: ["lifecycle-events", employeeId],
    queryFn: async () => {
      const res = await api.get<LifecycleEvent[]>(
        `/employees/${employeeId}/lifecycle-events`
      );
      return res.data;
    },
    enabled: !!employeeId,
  });
}

export function useCreateLifecycleEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: FormData;
    }) => {
      const res = await api.post<LifecycleEvent>(
        `/employees/${employeeId}/lifecycle-events`,
        data,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lifecycle-events", variables.employeeId],
      });
    },
  });
}

// ─── Audit hooks ─────────────────────────────────────

export { useAuditLogs } from './useAudit';

// ─── Discipline hooks ────────────────────────────────

export function useDisciplinaryActions(filters: DisciplinaryActionFilters = {}) {
  return useQuery<{
    data: DisciplinaryAction[];
    pagination: PaginationMeta;
  }>({
    queryKey: ["disciplinary-actions", filters],
    queryFn: async () => {
      const res = await api.get<DisciplinaryAction[]>("/discipline", {
        params: buildParams(filters as Record<string, unknown>),
      });
      return {
        data: res.data,
        pagination: res.pagination!,
      };
    },
  });
}

export function useEmployeeDisciplinaryActions(employeeId: string) {
  return useQuery<DisciplinaryAction[]>({
    queryKey: ["disciplinary-actions", "employee", employeeId],
    queryFn: async () => {
      const res = await api.get<DisciplinaryAction[]>(`/discipline/${employeeId}`);
      return res.data;
    },
    enabled: !!employeeId,
  });
}

export function useCreateDisciplinaryAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      employeeId: string;
      violationType: string;
      severity: string;
      description: string;
      date?: string;
    }) => {
      const res = await api.post<DisciplinaryAction>("/discipline", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disciplinary-actions"] });
    },
  });
}

export function useReviewDisciplinaryAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      status: 'Approved' | 'Rejected';
      reviewNote?: string;
    }) => {
      const res = await api.put<DisciplinaryAction>(`/discipline/${id}/review`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disciplinary-actions"] });
    },
  });
}

export * from "./usePolicies";

export * from "./useOfferLetters";
export * from "./useDocuments";

// ─── Payroll hooks ───────────────────────────────────

export function usePayrollRuns(filters: PayrollRunFilters = {}) {
  return useQuery<{
    data: PayrollRun[];
    pagination: PaginationMeta;
  }>({
    queryKey: ["payroll-runs", filters],
    queryFn: async () => {
      const res = await api.get<PayrollRun[]>("/payroll", {
        params: buildParams(filters as Record<string, unknown>),
      });
      return {
        data: res.data,
        pagination: res.pagination!,
      };
    },
  });
}

export function usePayrollRun(id: string) {
  return useQuery<PayrollRun>({
    queryKey: ["payroll-run", id],
    queryFn: async () => {
      const res = await api.get<PayrollRun>(`/payroll/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreatePayrollRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { month: number; year: number }) => {
      const res = await api.post<PayrollRun>("/payroll", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
  });
}

export function useUploadPayslips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payrollRunId, data }: { payrollRunId: string; data: FormData }) => {
      const res = await api.post(`/payroll/${payrollRunId}/upload`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-run", variables.payrollRunId] });
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
  });
}

export function useCreatePayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      payrollRunId,
      data,
    }: {
      payrollRunId: string;
      data: { employeeId: string; basicSalary: number; allowances: number; deductions: number };
    }) => {
      const res = await api.post<Payslip>(`/payroll/${payrollRunId}/payslips`, data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-run", variables.payrollRunId] });
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
  });
}

export function useApprovePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put<PayrollRun>(`/payroll/${id}/approve`);
      return res.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-run", id] });
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
  });
}

export function useSendPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<PayrollRun>(`/payroll/${id}/send`);
      return res.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["payroll-run", id] });
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
  });
}

export function useMyPayslips() {
  return useQuery<PayslipWithYTD>({
    queryKey: ["my-payslips"],
    queryFn: async () => {
      const res = await api.get<PayslipWithYTD>("/payslips/me");
      return res.data;
    },
  });
}

export * from './useAssets';
export * from './useExitEmployee';

// ─── KPI hooks ───────────────────────────────────────

import type { Kpi, KpiUpdate, KpiReviewCycle, KpiReview, KpiDashboard, KpiFilters } from "@/types";

export function useKpiDashboard() {
  return useQuery<KpiDashboard>({
    queryKey: ["kpi-dashboard"],
    queryFn: async () => {
      const res = await api.get<KpiDashboard>("/kpi/dashboard");
      return res.data;
    },
  });
}

export function useKpis(filters: KpiFilters = {}) {
  return useQuery<{ data: Kpi[]; pagination: PaginationMeta }>({
    queryKey: ["kpis", filters],
    queryFn: async () => {
      const res = await api.get<Kpi[]>("/kpi", { params: buildParams(filters as Record<string, unknown>) });
      return { data: res.data, pagination: res.pagination! };
    },
  });
}

export function useKpi(id: string) {
  return useQuery<Kpi>({
    queryKey: ["kpi", id],
    queryFn: async () => {
      const res = await api.get<Kpi>(`/kpi/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Kpi> & { assigneeIds?: string[]; assignees?: KpiAssignee[] }) => {
      const res = await api.post<Kpi>("/kpi", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-dashboard"] });
    },
  });
}

export function useUpdateKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Kpi> }) => {
      const res = await api.put<Kpi>(`/kpi/${id}`, data);
      return res.data;
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["kpi", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["kpi-dashboard"] });
    },
  });
}

export function useDeleteKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/kpi/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-dashboard"] });
    },
  });
}

export interface KpiAssignee {
  employeeId: string;
  taskDescription?: string;
  contributionWeight?: number;
}

export function useAssignKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assignees }: { id: string; assignees: KpiAssignee[] }) => {
      const res = await api.post<Kpi>(`/kpi/${id}/assign`, { assignees });
      return res.data;
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kpi", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
  });
}

export function useSubmitKpiUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      kpiId: string;
      updatePeriod: string;
      actualValue?: number;
      percentComplete?: number;
      narrative?: string;
      blockerFlag?: boolean;
      blockerDetail?: string;
      confidenceLevel?: number;
      nextSteps?: string;
    }) => {
      const res = await api.post<KpiUpdate>("/kpi-updates", data);
      return res.data;
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kpi", variables.kpiId] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-dashboard"] });
    },
  });
}

export function useKpiUpdates(kpiId: string) {
  return useQuery<KpiUpdate[]>({
    queryKey: ["kpi-updates", kpiId],
    queryFn: async () => {
      const res = await api.get<KpiUpdate[]>(`/kpi/${kpiId}/updates`);
      return res.data;
    },
    enabled: !!kpiId,
  });
}

export function useMyKpiUpdates() {
  return useQuery<KpiUpdate[]>({
    queryKey: ["my-kpi-updates"],
    queryFn: async () => {
      const res = await api.get<KpiUpdate[]>("/kpi-updates/me");
      return res.data;
    },
  });
}

export function useKpiReviewCycles() {
  return useQuery<KpiReviewCycle[]>({
    queryKey: ["kpi-review-cycles"],
    queryFn: async () => {
      const res = await api.get<KpiReviewCycle[]>("/kpi-review-cycles");
      return res.data;
    },
  });
}

export function useCreateReviewCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<KpiReviewCycle>) => {
      const res = await api.post<KpiReviewCycle>("/kpi-review-cycles", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-review-cycles"] });
    },
  });
}

export function useKpiReviews(reviewCycleId?: string, employeeId?: string) {
  return useQuery<KpiReview[]>({
    queryKey: ["kpi-reviews", reviewCycleId, employeeId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (reviewCycleId) params.reviewCycleId = reviewCycleId;
      if (employeeId) params.employeeId = employeeId;
      const res = await api.get<KpiReview[]>("/kpi-reviews", { params });
      return res.data;
    },
  });
}

export function useSubmitKpiReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<KpiReview>) => {
      const res = await api.post<KpiReview>("/kpi-reviews", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-reviews"] });
    },
  });
}

// ─── OKR hooks ───────────────────────────────────────

import type { OkrCycle, Objective, KeyResult, OkrComment, OkrDashboard } from "@/types";

export function useApprovers() {
  return useQuery<Array<{ id: string; fullName: string; jobTitle: string | null; employeeId: string; role: string }>>({
    queryKey: ["approvers"],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; fullName: string; jobTitle: string | null; employeeId: string; role: string }>>("/employees/approvers");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useOkrDashboard() {
  return useQuery<OkrDashboard>({
    queryKey: ["okr-dashboard"],
    queryFn: async () => {
      const res = await api.get<OkrDashboard>("/okr/dashboard");
      return res.data;
    },
  });
}

export function useOkrCycles() {
  return useQuery<OkrCycle[]>({
    queryKey: ["okr-cycles"],
    queryFn: async () => {
      const res = await api.get<OkrCycle[]>("/okr/cycles");
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateOkrCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<OkrCycle>) => {
      const res = await api.post<OkrCycle>("/okr/cycles", data);
      return res.data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["okr-cycles"] }); },
  });
}

export function useUpdateOkrCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OkrCycle> }) => {
      const res = await api.put<OkrCycle>(`/okr/cycles/${id}`, data);
      return res.data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["okr-cycles"] }); },
  });
}

export function useDeleteOkrCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/okr/cycles/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["okr-cycles"] }); },
  });
}

export function useObjectives(params: { cycleId?: string; ownerId?: string; teamView?: string; page?: number; limit?: number } = {}) {
  return useQuery<{ data: Objective[]; pagination: PaginationMeta }>({
    queryKey: ["objectives", params],
    queryFn: async () => {
      const res = await api.get<Objective[]>("/okr/objectives", { params: buildParams(params as Record<string, unknown>) });
      return { data: res.data, pagination: res.pagination! };
    },
  });
}

export function useObjective(id: string) {
  return useQuery<Objective>({
    queryKey: ["objective", id],
    queryFn: async () => {
      const res = await api.get<Objective>(`/okr/objectives/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { cycleId: string; title: string; description?: string; parentObjectiveId?: string; approverId?: string; keyResults: Array<{ title: string; metricType: string; targetValue: number; startValue?: number }> }) => {
      const res = await api.post<Objective>("/okr/objectives", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });
}

export function useUpdateObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; description?: string; parentObjectiveId?: string | null } }) => {
      const res = await api.put<Objective>(`/okr/objectives/${id}`, data);
      return res.data;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objective", v.id] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });
}

export function useDeleteObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/okr/objectives/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });
}

export function useApproveObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await api.post<Objective>(`/okr/objectives/${id}/approve`, { note });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-approvals"] });
    },
  });
}

export function useRejectObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const res = await api.post<Objective>(`/okr/objectives/${id}/reject`, { note });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-approvals"] });
    },
  });
}

export function useSubmitObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approverId }: { id: string; approverId: string }) => {
      const res = await api.post<Objective>(`/okr/objectives/${id}/submit`, { approverId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });
}

export function usePendingOkrApprovals() {
  return useQuery({
    queryKey: ["okr-approvals"],
    queryFn: async () => {
      const res = await api.get<Objective[]>("/okr/approvals/pending");
      return res.data;
    },
  });
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ krId, data }: { krId: string; objectiveId: string; data: { newValue: number; healthStatus: string; note?: string } }) => {
      const res = await api.put<KeyResult>(`/okr/key-results/${krId}`, data);
      return res.data;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["objective", v.objectiveId] });
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
    },
  });
}

export function useOkrComments(krId: string) {
  return useQuery<OkrComment[]>({
    queryKey: ["okr-comments", krId],
    queryFn: async () => {
      const res = await api.get<OkrComment[]>(`/okr/key-results/${krId}/comments`);
      return res.data;
    },
    enabled: !!krId,
  });
}

export function useAddOkrComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ krId, body, mentions }: { krId: string; body: string; mentions?: string[] }) => {
      const res = await api.post<OkrComment>(`/okr/key-results/${krId}/comments`, { body, mentions: mentions ?? [] });
      return res.data;
    },
    onSuccess: (_d, v) => { queryClient.invalidateQueries({ queryKey: ["okr-comments", v.krId] }); },
  });
}

// ─── HR KPI Review Approval Hooks ─────────────────────

export function usePendingKpiReviews() {
  return useQuery<KpiReview[]>({
    queryKey: ["kpi-reviews-pending"],
    queryFn: async () => {
      const res = await api.get<KpiReview[]>("/kpi-reviews/pending");
      return res.data;
    },
  });
}

export function useApproveKpiReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<KpiReview>(`/kpi-reviews/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-reviews-pending"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-reviews"] });
    },
  });
}

export function useRejectKpiReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<KpiReview>(`/kpi-reviews/${id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-reviews-pending"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-reviews"] });
    },
  });
}

export function useAllKpisForHR(filters: KpiFilters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""));
  return useQuery({
    queryKey: ["kpis-hr", params],
    queryFn: async () => {
      const res = await api.get<Kpi[]>("/kpi/hr/all", { params });
      return res;
    },
  });
}

// ─── KPI Comments ────────────────────────────────────

export interface KpiComment {
  id: string; kpiId: string; authorId: string; body: string;
  createdAt: string; updatedAt: string;
  author?: { id: string; fullName: string; jobTitle: string };
}

export function useKpiComments(kpiId: string | null) {
  return useQuery<KpiComment[]>({
    queryKey: ["kpi-comments", kpiId],
    queryFn: async () => {
      const res = await api.get<KpiComment[]>(`/kpi/${kpiId}/comments`);
      return res.data;
    },
    enabled: !!kpiId,
  });
}

export function useAddKpiComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, body }: { kpiId: string; body: string }) => {
      const res = await api.post<KpiComment>(`/kpi/${kpiId}/comments`, { body });
      return res.data;
    },
    onSuccess: (_d, vars) => { queryClient.invalidateQueries({ queryKey: ["kpi-comments", vars.kpiId] }); },
  });
}

// ─── KPI Evidence ─────────────────────────────────────

export interface KpiEvidence {
  id: string; kpiId: string; updateId?: string; fileKey?: string; fileName?: string;
  fileType?: string; note?: string; uploadedById: string; uploadedAt: string;
  uploadedBy?: { id: string; fullName: string };
}

export function useKpiEvidence(kpiId: string | null) {
  return useQuery<KpiEvidence[]>({
    queryKey: ["kpi-evidence", kpiId],
    queryFn: async () => {
      const res = await api.get<KpiEvidence[]>(`/kpi/${kpiId}/evidence`);
      return res.data;
    },
    enabled: !!kpiId,
  });
}

export function useUploadKpiEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, file, note }: { kpiId: string; file: File; note?: string }) => {
      const form = new FormData();
      form.append("file", file);
      if (note) form.append("note", note);
      const res = await api.post<KpiEvidence>(`/kpi/${kpiId}/evidence`, form, {
        headers: { "Content-Type": undefined },
      });
      return res.data;
    },
    onSuccess: (_d, vars) => { queryClient.invalidateQueries({ queryKey: ["kpi-evidence", vars.kpiId] }); },
  });
}

// ─── KPI Cascade ──────────────────────────────────────

export function useKpiCascade() {
  return useQuery<Kpi[]>({
    queryKey: ["kpi-cascade"],
    queryFn: async () => {
      const res = await api.get<Kpi[]>("/kpi/cascade");
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Rollup Override ──────────────────────────────────

export function useSetProgressOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, override, reason }: { kpiId: string; override: number | null; reason?: string }) => {
      const res = await api.post<unknown>(`/kpi/${kpiId}/rollup-override`, { override, reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-cascade"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
  });
}

// ─── §16 Version History ──────────────────────────────

export interface KpiVersion {
  id: string;
  kpiId: string;
  changedById: string;
  snapshot: Record<string, unknown>;
  fieldChanges: Record<string, { before: unknown; after: unknown }> | null;
  changeNote: string | null;
  createdAt: string;
  changedBy?: { id: string; fullName: string };
}

export function useKpiVersionHistory(kpiId: string | null) {
  return useQuery<KpiVersion[]>({
    queryKey: ["kpi-versions", kpiId],
    queryFn: async () => {
      const res = await api.get<KpiVersion[]>(`/kpi/${kpiId}/versions`);
      return res.data;
    },
    enabled: !!kpiId,
    staleTime: 60 * 1000,
  });
}

// ─── Self-Assessment ──────────────────────────────────

export function useSubmitSelfAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { reviewCycleId: string; kpiId: string; selfRating?: number; reviewComment?: string; strengths?: string; improvementAreas?: string; developmentActions?: string }) => {
      const res = await api.post<KpiReview>("/kpi-reviews/self-assess", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
  });
}

// ─── Weekly Summary ───────────────────────────────────

export interface KpiWeeklySummary {
  weekStart: string;
  weekEnd: string;
  updatesThisWeek: Array<{ id: string; kpi: { id: string; title: string; status: string }; employee: { id: string; fullName: string }; percentComplete: number | null; actualValue: number | null; blockerFlag: boolean; submittedAt: string }>;
  overdueCount: number;
  atRiskCount: number;
  recentlyCompleted: number;
  blockers: Array<{ id: string; kpi: { id: string; title: string }; employee: { id: string; fullName: string }; blockerDetail: string | null; submittedAt: string }>;
}

export function useKpiWeeklySummary() {
  return useQuery<KpiWeeklySummary>({
    queryKey: ["kpi-weekly-summary"],
    queryFn: async () => {
      const res = await api.get<KpiWeeklySummary>("/kpi/weekly-summary");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Report Downloads ─────────────────────────────────

export function useDownloadKpiReport() {
  return useMutation({
    mutationFn: async (params: { format: "csv" | "xlsx"; sbuId?: string; departmentId?: string; employeeId?: string; reviewCycleId?: string; status?: string; dateFrom?: string; dateTo?: string }) => {
      const query = new URLSearchParams({
        format: params.format,
        ...(params.sbuId ? { sbuId: params.sbuId } : {}),
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
        ...(params.employeeId ? { employeeId: params.employeeId } : {}),
        ...(params.reviewCycleId ? { reviewCycleId: params.reviewCycleId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
        ...(params.dateTo ? { dateTo: params.dateTo } : {}),
      });
      const BASE = (api as any).defaults?.baseURL ?? "/api/v1";
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch(`${BASE}/reports/kpi?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpi_report_${new Date().toISOString().split("T")[0]}.${params.format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

export function useDownloadOkrReport() {
  return useMutation({
    mutationFn: async (params: { format: "csv" | "xlsx"; dateFrom?: string; dateTo?: string }) => {
      const query = new URLSearchParams({ format: params.format, ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}), ...(params.dateTo ? { dateTo: params.dateTo } : {}) });
      const BASE = (api as any).defaults?.baseURL ?? "/api/v1";
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch(`${BASE}/reports/okr?${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `okr_report_${new Date().toISOString().split("T")[0]}.${params.format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

// ─── Section 9: KPI Approval Workflow ─────────────────

export function useSubmitKpiForApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kpiId: string) => {
      const res = await api.post<unknown>(`/kpi/${kpiId}/submit-approval`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-pending-approvals"] });
    },
  });
}

export function useApproveKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, note }: { kpiId: string; note?: string }) => {
      const res = await api.post<unknown>(`/kpi/${kpiId}/approve`, { note });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-pending-approvals"] });
    },
  });
}

export function useRejectKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ kpiId, note }: { kpiId: string; note?: string }) => {
      const res = await api.post<unknown>(`/kpi/${kpiId}/reject`, { note });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-pending-approvals"] });
    },
  });
}

export interface PendingKpiApproval {
  id: string;
  title: string;
  description: string | null;
  approvalStatus: string;
  approvalNote: string | null;
  createdAt: string;
  creator: { id: string; fullName: string } | null;
  sbu: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
}

export function usePendingKpiApprovals() {
  return useQuery<PendingKpiApproval[]>({
    queryKey: ["kpi-pending-approvals"],
    queryFn: async () => {
      const res = await api.get<PendingKpiApproval[]>("/kpi/pending-approvals");
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useAcknowledgeKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kpiId: string) => {
      const res = await api.post<unknown>(`/kpi/${kpiId}/acknowledge`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
  });
}

// ─── Section 9.2: Manager Update Review ───────────────

export function useReviewKpiUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ updateId, reviewNote }: { updateId: string; reviewNote?: string }) => {
      const res = await api.post<unknown>(`/kpi-updates/${updateId}/review`, { reviewNote });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-updates"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
  });
}

// ─── Section 9.3: Director Calibration ────────────────

export function useCalibrateKpiReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, finalRating, calibrationNote }: { reviewId: string; finalRating: number; calibrationNote?: string }) => {
      const res = await api.post<unknown>(`/kpi-reviews/${reviewId}/calibrate`, { finalRating, calibrationNote });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
  });
}

// ─── Section 9.4: Weekly Report ───────────────────────

export interface KpiWeeklyReport {
  weekStart: string;
  weekEnd: string;
  updates: Array<{
    id: string;
    kpi: { id: string; title: string; status: string };
    employee: { id: string; fullName: string };
    percentComplete: number | null;
    actualValue: number | null;
    blockerFlag: boolean;
    reviewNote: string | null;
    submittedAt: string;
  }>;
  overdueCount: number;
  atRiskCount: number;
  recentlyCompleted: number;
  blockers: Array<{ id: string; kpi: { id: string; title: string }; employee: { id: string; fullName: string }; blockerDetail: string | null; submittedAt: string }>;
  pendingAcknowledgments: number;
}

export function useWeeklyReport() {
  return useQuery<KpiWeeklyReport>({
    queryKey: ["kpi-weekly-report"],
    queryFn: async () => {
      const res = await api.get<KpiWeeklyReport>("/kpi/weekly-report");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLockReviewCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cycleId: string) => {
      const res = await api.post<KpiReviewCycle>(`/kpi-review-cycles/${cycleId}/lock`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-review-cycles"] });
    },
  });
}

export function useDownloadWeeklyReport() {
  return useMutation({
    mutationFn: async () => {
      const BASE = (api as any).defaults?.baseURL ?? "/api/v1";
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch(`${BASE}/kpi/weekly-report?download=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpi_weekly_report_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

// ─── §15 Notifications ────────────────────────────────

export interface InAppNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string | null;
  message: string | null;
  payload: Record<string, unknown>;
  sentAt: string | null;
  createdAt: string;
}

export function useNotifications(page = 1, limit = 20) {
  return useQuery<{ data: InAppNotification[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ["notifications", page, limit],
    queryFn: async () => {
      const res = await api.get<InAppNotification[]>("/notifications", { params: { page, limit } });
      return { data: res.data, pagination: res.pagination as any };
    },
    refetchInterval: 30 * 1000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery<number>({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const res = await api.get<InAppNotification[]>("/notifications", { params: { page: 1, limit: 50 } });
      return res.data.filter((n) => !n.sentAt).length;
    },
    refetchInterval: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await api.patch<unknown>(`/notifications/${notificationId}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

// ─── §14 Standard KPI Report Downloads ───────────────

type KpiReportFormat = "csv" | "xlsx" | "pdf";

interface KpiReportParams {
  format?: KpiReportFormat;
  sbuId?: string;
  departmentId?: string;
  employeeId?: string;
  reviewCycleId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildKpiReportUrl(endpoint: string, params: KpiReportParams): string {
  const BASE = (api as any).defaults?.baseURL ?? "/api/v1";
  const q = new URLSearchParams({ format: params.format ?? "xlsx" });
  if (params.sbuId) q.set("sbuId", params.sbuId);
  if (params.departmentId) q.set("departmentId", params.departmentId);
  if (params.employeeId) q.set("employeeId", params.employeeId);
  if (params.reviewCycleId) q.set("reviewCycleId", params.reviewCycleId);
  if (params.status) q.set("status", params.status);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  return `${BASE}${endpoint}?${q}`;
}

async function downloadKpiReport(endpoint: string, filename: string, params: KpiReportParams) {
  const url = buildKpiReportUrl(endpoint, params);
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  const ext = params.format ?? "xlsx";
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.${ext}`;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export function useDownloadKpiRegister() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/register", "kpi_register", p) });
}

export function useDownloadKpiProgressByDepartment() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/progress-by-department", "kpi_progress_dept", p) });
}

export function useDownloadIndividualKpiReport() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/individual", "kpi_individual", p) });
}

export function useDownloadMonthlyReviewSummary() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/monthly-review", "kpi_monthly_review", p) });
}

export function useDownloadQuarterlyReviewAnalysis() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/quarterly-review", "kpi_quarterly_review", p) });
}

export function useDownloadAnnualPerformanceSummary() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/annual-summary", "kpi_annual_summary", p) });
}

export function useDownloadOverdueAtRiskReport() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/overdue-at-risk", "kpi_overdue_atrisk", p) });
}

export function useDownloadSharedKpiContributions() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/shared-contributions", "kpi_shared", p) });
}

export function useDownloadWeeklyWrapReport() {
  return useMutation({ mutationFn: (p: KpiReportParams) => downloadKpiReport("/reports/kpi/weekly-wrap", "kpi_weekly_wrap", p) });
}

export * from "./usePerformance";
