"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  Employee,
  EmployeeFilters,
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

export function useDepartments(sbuId?: string) {
  return useQuery<Department[]>({
    queryKey: ["departments", sbuId],
    queryFn: async () => {
      const params = sbuId ? { sbuId } : {};
      const res = await api.get<Department[]>("/departments", { params });
      return res.data;
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", variables.id] });
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
      const res = await api.delete(`/employees/${id}`);
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
    todayBirthdays: Array<{ employeeName: string; department: string; sbu: string }>;
    upcomingBirthdays: Array<{ employeeName: string; department: string; sbu: string }>;
    todayAnniversaries: Array<{
      employeeName: string;
      department: string;
      sbu: string;
      yearsOfService: number;
    }>;
    upcomingAnniversaries: Array<{
      employeeName: string;
      department: string;
      sbu: string;
      yearsOfService: number;
    }>;
    milestoneAnniversaries: Array<{
      employeeName: string;
      department: string;
      sbu: string;
      yearsOfService: number;
    }>;
  }>({
    queryKey: ["celebrations"],
    queryFn: async () => {
      const res = await api.get<{
        todayBirthdays: Array<{ employeeName: string; department: string; sbu: string }>;
        upcomingBirthdays: Array<{ employeeName: string; department: string; sbu: string }>;
        todayAnniversaries: Array<{
          employeeName: string;
          department: string;
          sbu: string;
          yearsOfService: number;
        }>;
        upcomingAnniversaries: Array<{
          employeeName: string;
          department: string;
          sbu: string;
          yearsOfService: number;
        }>;
        milestoneAnniversaries: Array<{
          employeeName: string;
          department: string;
          sbu: string;
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
