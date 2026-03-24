"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface DimensionCell {
  dimensionId: string;
  dimensionName: string;
  averageScore: number;
  participantCount: number;
}

interface DeptRow {
  departmentId: string;
  departmentName: string;
  dimensions: DimensionCell[];
}

interface Props {
  heatmap: DeptRow[];
  cycleName?: string;
}

function scoreColor(score: number): string {
  if (score >= 4.5) return "bg-emerald-600 text-white";
  if (score >= 3.5) return "bg-emerald-400 text-white";
  if (score >= 2.5) return "bg-amber-300 text-gray-800";
  if (score >= 1.5) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
}

export function CompetencyHeatmap({ heatmap, cycleName }: Props) {
  const [drillDept, setDrillDept] = useState<string | null>(null);

  if (!heatmap || heatmap.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No heatmap data available.
      </div>
    );
  }

  // Collect all unique dimensions in order
  const allDimensions = Array.from(
    new Map(
      heatmap.flatMap((row) =>
        row.dimensions.map((d) => [d.dimensionId, d.dimensionName])
      )
    ).entries()
  );

  // Accessible summary
  const summary = heatmap
    .map((row) =>
      `${row.departmentName}: ` +
      row.dimensions.map((d) => `${d.dimensionName} ${d.averageScore.toFixed(1)}`).join(", ")
    )
    .join(". ");

  const displayRows = drillDept ? heatmap.filter((r) => r.departmentId === drillDept) : heatmap;

  return (
    <div>
      {cycleName && (
        <p className="text-xs text-gray-500 mb-2">
          Data from cycle: <span className="font-medium">{cycleName}</span>
        </p>
      )}
      <p className="sr-only">Competency heatmap. {summary}</p>

      {drillDept && (
        <button
          onClick={() => setDrillDept(null)}
          className="text-xs text-indigo-600 hover:underline mb-3"
        >
          ← Back to all departments
        </button>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse" aria-label="Competency heatmap">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-gray-600 font-medium bg-gray-50 border border-gray-200 min-w-[140px]">
                Department
              </th>
              {allDimensions.map(([id, name]) => (
                <th
                  key={id}
                  className="py-2 px-3 text-gray-600 font-medium bg-gray-50 border border-gray-200 text-center min-w-[100px]"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const dimMap = new Map(row.dimensions.map((d) => [d.dimensionId, d]));
              return (
                <tr key={row.departmentId}>
                  <td className="py-2 px-3 border border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                    {!drillDept ? (
                      <button
                        onClick={() => setDrillDept(row.departmentId)}
                        className="text-indigo-600 hover:underline"
                        title="Drill down"
                      >
                        {row.departmentName}
                      </button>
                    ) : (
                      row.departmentName
                    )}
                  </td>
                  {allDimensions.map(([dimId]) => {
                    const cell = dimMap.get(dimId);
                    return (
                      <td
                        key={dimId}
                        className={cn(
                          "py-2 px-3 border border-gray-200 text-center font-semibold tabular-nums",
                          cell ? scoreColor(cell.averageScore) : "bg-gray-100 text-gray-400"
                        )}
                        title={cell ? `${cell.averageScore.toFixed(2)} (${cell.participantCount} raters)` : "No data"}
                      >
                        {cell ? cell.averageScore.toFixed(1) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-gray-600">
        <span className="font-medium">Score key:</span>
        {[
          { label: "≥ 4.5", cls: "bg-emerald-600" },
          { label: "3.5–4.4", cls: "bg-emerald-400" },
          { label: "2.5–3.4", cls: "bg-amber-300" },
          { label: "1.5–2.4", cls: "bg-orange-400" },
          { label: "< 1.5", cls: "bg-red-500" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={cn("inline-block w-3 h-3 rounded-sm", l.cls)} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
