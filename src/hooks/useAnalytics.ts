"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  LeaveForecast,
  LeaveCostReport,
  CapacityReport,
  HeadcountTrend,
  AttritionReport,
} from "@/types/analytics";

function buildParams(obj: Record<string, unknown>): Record<string, string>;
function buildParams<T extends object>(obj: T): Record<string, string>;
function buildParams(obj: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = String(value);
    }
  }
  return params;
}

// ─── Leave forecasting ───────────────────────────────

export interface LeaveForecastFilters {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export function useLeaveForecast(filters: LeaveForecastFilters = {}) {
  return useQuery({
    queryKey: ["leave-forecast", filters],
    queryFn: async () => {
      const res = await api.get<LeaveForecast>("/leave-forecast", {
        params: buildParams(filters),
      });
      return res.data;
    },
  });
}

// ─── Cost of leave ───────────────────────────────────

export interface LeaveCostFilters {
  year?: number;
  departmentId?: string;
}

export function useLeaveCost(filters: LeaveCostFilters = {}) {
  return useQuery({
    queryKey: ["leave-cost", filters],
    queryFn: async () => {
      const res = await api.get<LeaveCostReport>("/leave-cost", {
        params: buildParams(filters),
      });
      return res.data;
    },
  });
}

// ─── Workforce planning ──────────────────────────────

export function useCapacity() {
  return useQuery({
    queryKey: ["workforce-capacity"],
    queryFn: async () => {
      const res = await api.get<CapacityReport>("/workforce/capacity");
      return res.data;
    },
  });
}

export function useHeadcountTrend(months = 12) {
  return useQuery({
    queryKey: ["workforce-headcount-trend", months],
    queryFn: async () => {
      const res = await api.get<HeadcountTrend>("/workforce/headcount-trend", {
        params: { months: String(months) },
      });
      return res.data;
    },
  });
}

export function useAttrition(year?: number) {
  return useQuery({
    queryKey: ["workforce-attrition", year],
    queryFn: async () => {
      const res = await api.get<AttritionReport>("/workforce/attrition", {
        params: buildParams({ year }),
      });
      return res.data;
    },
  });
}
