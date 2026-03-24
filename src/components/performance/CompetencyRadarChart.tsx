"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { CompetencyScore } from "@/hooks";

interface Props {
  data: CompetencyScore[];
  /** Title shown above the chart */
  title?: string;
}

export function CompetencyRadarChart({ data, title }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No competency data available yet.
      </div>
    );
  }

  // Accessible text summary for screen readers
  const summary = data
    .map((d) => `${d.dimension}: ${d.score.toFixed(1)} out of 5`)
    .join(", ");

  return (
    <div>
      {title && <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>}
      {/* Accessible text alternative (WCAG 2.1 AA) */}
      <p className="sr-only">
        Competency radar chart. Scores: {summary}.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} aria-hidden="true">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 11, fill: "#6b7280" }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 5]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickCount={6}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#4f46e5"
            fill="#4f46e5"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(2)}`, "Score"]}
            contentStyle={{ fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
