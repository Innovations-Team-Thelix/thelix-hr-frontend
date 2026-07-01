"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useLmsLeaderboard, useSbuLeaderboard, useDepartmentLeaderboard,
  useMyLmsBadges, useMyLmsPoints,
} from "@/hooks";
import { Trophy, Medal, Star, Zap, Lock, Users, Building2, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";

// ─── Badge descriptions ───────────────────────────────────────────────────────

const BADGE_DESCRIPTIONS: Record<string, string> = {
  CourseCompletion: "Complete a course to earn this badge.",
  LearningPath:     "Finish an entire learning path.",
  StreakWeekly:     "Learn every day for a full week without breaking your streak.",
  StreakMonthly:    "Maintain a consistent learning habit throughout the month.",
  TopLearner:       "Rank at the top of the leaderboard among your peers.",
  FirstCourse:      "Awarded for completing your very first course on Thelix.",
  Assessment:       "Pass a course assessment with a score above the pass threshold.",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: "weekly",  label: "Weekly"   },
  { value: "monthly", label: "Monthly"  },
  { value: "all",     label: "All Time" },
] as const;

type LeaderboardMode = "individual" | "sbu" | "department";

const LB_MODES: { value: LeaderboardMode; label: string; icon: any; sublabel: string }[] = [
  { value: "individual", label: "Individual",  icon: Users,     sublabel: "Top earners"        },
  { value: "sbu",        label: "SBU",         icon: Layers,    sublabel: "By business unit"   },
  { value: "department", label: "Department",  icon: Building2, sublabel: "By team"            },
];

const RANK_COLORS = ["text-amber-500", "text-gray-400", "text-amber-700"];

const PODIUM_COLORS = [
  "from-amber-400 to-amber-500",   // 1st
  "from-gray-300 to-gray-400",     // 2nd
  "from-amber-600 to-amber-700",   // 3rd
];

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({ rows, mode }: { rows: any[]; mode: LeaderboardMode }) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;

  const order = [1, 0, 2]; // show 2nd, 1st, 3rd on podium
  const heights = ["h-16", "h-24", "h-12"];

  const getName = (row: any) =>
    mode === "sbu"        ? row.sbu?.name :
    mode === "department" ? row.department?.name :
    row.employee?.fullName;

  const getSub = (row: any) =>
    mode === "individual"
      ? row.employee?.department?.name
      : `${row.memberCount} member${row.memberCount !== 1 ? "s" : ""}`;

  return (
    <div className="flex items-end justify-center gap-2 pt-4 pb-2">
      {order.map((idx) => {
        const row = top3[idx];
        if (!row) return <div key={idx} className="w-24" />;
        const name = getName(row);
        const initials = name?.slice(0, 2).toUpperCase() ?? "??";
        return (
          <div key={idx} className="flex flex-col items-center gap-1.5 w-24">
            {/* Crown for 1st */}
            {idx === 0 && <span className="text-xl">👑</span>}
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${PODIUM_COLORS[idx]} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
              {initials}
            </div>
            <p className="text-xs font-semibold text-gray-800 text-center leading-tight line-clamp-1">{name}</p>
            <p className="text-[10px] text-gray-400 text-center line-clamp-1">{getSub(row)}</p>
            <p className={`text-sm font-bold ${RANK_COLORS[idx]}`}>{row.points} pts</p>
            {/* Podium step */}
            <div className={`w-full ${heights[idx]} rounded-t-lg bg-gradient-to-b ${PODIUM_COLORS[idx]} flex items-start justify-center pt-1`}>
              <span className="text-white font-black text-sm">#{idx + 1}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Leaderboard rows ─────────────────────────────────────────────────────────

function LeaderboardRows({ rows, mode, startAt = 3 }: { rows: any[]; mode: LeaderboardMode; startAt?: number }) {
  const rest = rows.slice(startAt);
  if (rest.length === 0) return null;

  const getName = (row: any) =>
    mode === "sbu"        ? row.sbu?.name :
    mode === "department" ? row.department?.name :
    row.employee?.fullName;

  const getSub = (row: any) =>
    mode === "individual"
      ? row.employee?.department?.name ?? row.employee?.jobTitle
      : `${row.memberCount} member${row.memberCount !== 1 ? "s" : ""}`;

  return (
    <div className="space-y-1 mt-3">
      {rest.map((row: any, i: number) => {
        const rank = startAt + i + 1;
        const name = getName(row);
        const initials = name?.slice(0, 2).toUpperCase() ?? "??";
        return (
          <div key={rank} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-sm font-bold text-gray-400 w-6 text-center shrink-0">#{rank}</span>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
              <p className="text-[11px] text-gray-400 truncate">{getSub(row)}</p>
            </div>
            <span className="text-sm font-bold text-gray-600 shrink-0">{row.points} pts</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamificationPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("all");
  const [lbMode, setLbMode] = useState<LeaderboardMode>("individual");

  const { data: individualLb, isLoading: indLoading } = useLmsLeaderboard(period);
  const { data: sbuLb,        isLoading: sbuLoading  } = useSbuLeaderboard(period);
  const { data: deptLb,       isLoading: deptLoading } = useDepartmentLeaderboard(period);
  const { data: badges,       isLoading: badgesLoading } = useMyLmsBadges();
  const { data: points } = useMyLmsPoints();

  const activeRows: any[] =
    lbMode === "sbu"        ? (sbuLb        as any[]) ?? [] :
    lbMode === "department" ? (deptLb       as any[]) ?? [] :
                              (individualLb as any[]) ?? [];

  const isLoading =
    lbMode === "sbu"        ? sbuLoading  :
    lbMode === "department" ? deptLoading :
                              indLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Badges & Leaderboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">Earn badges, track points, and see where your team stands.</p>
        </div>

        {/* Points summary */}
        {!!points && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Points", value: (points as any).total,   icon: Star,  color: "bg-amber-500"   },
              { label: "This Week",    value: (points as any).weekly,  icon: Zap,   color: "bg-primary"     },
              { label: "This Month",   value: (points as any).monthly, icon: Medal, color: "bg-primary-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color} shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <Card>
            <CardContent className="p-5">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Leaderboard</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lbMode === "individual" ? "Top individual point earners" :
                     lbMode === "sbu"        ? "Aggregated points across each SBU" :
                                              "Aggregated points across each department"}
                  </p>
                </div>
                {/* Period pills */}
                <div className="flex gap-1 shrink-0">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPeriod(opt.value)}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        period === opt.value
                          ? "bg-primary text-white border-primary"
                          : "text-gray-500 border-gray-200 hover:border-primary-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode selector */}
              <div className="grid grid-cols-3 gap-1.5 mb-4 p-1 bg-gray-100 rounded-xl">
                {LB_MODES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setLbMode(value)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      lbMode === value
                        ? "bg-white text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : activeRows.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No data yet.{lbMode === "individual" ? " Start learning to earn points!" : " Points will appear once employees start learning."}
                </p>
              ) : (
                <>
                  <Podium rows={activeRows} mode={lbMode} />
                  <LeaderboardRows rows={activeRows} mode={lbMode} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-gray-900 mb-4">My Badges</h2>
              {badgesLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(badges as any[])?.map((badge: any) => {
                    const desc = badge.description || BADGE_DESCRIPTIONS[badge.type] || "Keep learning to unlock this badge.";
                    return (
                      <div
                        key={badge.id}
                        className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-center transition-all ${
                          badge.earned
                            ? "border-amber-200 bg-amber-50"
                            : "border-gray-100 bg-gray-50 opacity-60"
                        }`}
                      >
                        {badge.earned ? (
                          <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
                        ) : (
                          <Lock className="w-8 h-8 text-gray-300 shrink-0" />
                        )}
                        <p className={`text-xs font-semibold leading-tight ${badge.earned ? "text-amber-800" : "text-gray-600"}`}>
                          {badge.name}
                        </p>
                        <p className="text-[11px] text-gray-400 leading-snug">{desc}</p>
                        {badge.earnedAt && (
                          <p className="text-[10px] font-medium text-amber-600 mt-0.5">
                            Earned {new Date(badge.earnedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
