"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import { Select } from "@/components/ui/select";
import { CompetencyHeatmap } from "@/components/performance/CompetencyHeatmap";
import {
  useCompetencyHeatmap, useGoalAlignmentMetrics, useFeedbackVolumeMetrics,
  usePerformanceCycles, useKpiRatingMetrics,
} from "@/hooks";
import { BarChart3, Target, MessageSquare, TrendingUp, Award, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useState } from "react";

function RatingBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default function PerformanceAnalyticsPage() {
  const { data: cycles } = usePerformanceCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>();

  const { data: heatmapData, isLoading: loadingHeatmap } = useCompetencyHeatmap(selectedCycleId);
  const { data: goalData, isLoading: loadingGoals } = useGoalAlignmentMetrics();
  const { data: feedbackData, isLoading: loadingFeedback } = useFeedbackVolumeMetrics(3);
  const { data: kpiData, isLoading: loadingKpi } = useKpiRatingMetrics();

  const cycleOptions = [
    { value: "", label: "Latest closed cycle" },
    ...(cycles ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <AppLayout pageTitle="Performance Analytics">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" /> Performance Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Organizational performance insights for HR and leadership.</p>
        </div>

        {/* Row 1: KPI Rating + Goal Alignment + Feedback */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* KPI Rating */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Award className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Avg KPI Final Rating</p>
                  {loadingKpi ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-gray-900">
                      {kpiData?.avgFinalRating?.toFixed(1) ?? "—"}<span className="text-sm font-normal text-gray-400">/5</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{kpiData?.ratedCount ?? 0} employees rated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goal Alignment */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Target className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Goal Alignment</p>
                  {loadingGoals ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-gray-900">{goalData?.alignmentPct ?? 0}%</p>
                  )}
                  <p className="text-xs text-gray-400">{goalData?.linkedObjectives}/{goalData?.totalObjectives} objectives linked</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Volume */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <MessageSquare className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Praise · Feedback (3 mo)</p>
                  {loadingFeedback ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-gray-900">
                      {feedbackData?.praiseCount ?? 0}
                      <span className="text-sm font-normal text-gray-400 ml-1">· {feedbackData?.feedbackCount ?? 0}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-400">recognitions · feedback entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: KPI Health + KPI Completion */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* KPI Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" /> KPI Health Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGoals ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "On Track", value: goalData?.kpi?.onTrack ?? 0, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
                    { label: "At Risk",  value: goalData?.kpi?.atRisk ?? 0,  icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
                    { label: "Off Track",value: goalData?.kpi?.offTrack ?? 0,icon: XCircle, color: "text-red-500 bg-red-50" },
                    { label: "Completed",value: goalData?.kpi?.completed ?? 0,icon: CheckCircle, color: "text-blue-600 bg-blue-50" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 text-sm ${color.split(" ")[0]}`}>
                        <span className={`p-1 rounded ${color.split(" ")[1]}`}><Icon className="w-3.5 h-3.5" /></span>
                        <span className="text-gray-700">{label}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Avg Completion</span>
                      <span className="font-medium text-gray-800">{goalData?.kpi?.avgCompletion ?? 0}%</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${goalData?.kpi?.avgCompletion ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* KPI Ratings by Department */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-500" /> KPI Ratings by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingKpi ? (
                <Skeleton className="h-24 w-full" />
              ) : !kpiData || kpiData.byDepartment.length === 0 ? (
                <p className="text-sm text-gray-400">No KPI review ratings yet.</p>
              ) : (
                <div className="space-y-3">
                  {kpiData.byDepartment
                    .sort((a, b) => b.avgFinalRating - a.avgFinalRating)
                    .map((dept) => (
                      <div key={dept.departmentId}>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span className="font-medium truncate">{dept.departmentName}</span>
                          <span className="text-gray-400 ml-2 flex-shrink-0">{dept.ratedCount} rated</span>
                        </div>
                        <RatingBar value={dept.avgFinalRating} />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Competency Heatmap */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Organizational Competency Heatmap (360°)
              </CardTitle>
              <Select
                value={selectedCycleId ?? ""}
                onChange={(e) => setSelectedCycleId(e.target.value || undefined)}
                options={cycleOptions}
                className="text-sm w-56"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingHeatmap ? (
              <Skeleton className="h-48 w-full" />
            ) : heatmapData ? (
              <CompetencyHeatmap
                heatmap={heatmapData.heatmap}
                cycleName={heatmapData.cycle?.name}
              />
            ) : (
              <p className="text-sm text-gray-400">No competency data available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
