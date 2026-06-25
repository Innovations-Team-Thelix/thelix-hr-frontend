"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useLmsLeaderboard, useMyLmsBadges, useMyLmsPoints } from "@/hooks";
import { Trophy, Medal, Star, Zap, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";

const PERIOD_OPTIONS = [
  { value: "weekly",  label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all",     label: "All Time" },
] as const;

const RANK_COLORS = ["text-amber-500", "text-gray-400", "text-amber-700"];
const RANK_ICONS = ["🥇", "🥈", "🥉"];

export default function GamificationPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("all");

  const { data: leaderboard, isLoading: lbLoading } = useLmsLeaderboard(period);
  const { data: badges, isLoading: badgesLoading } = useMyLmsBadges();
  const { data: points } = useMyLmsPoints();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Badges & Leaderboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">Earn badges and compete with colleagues on the leaderboard.</p>
        </div>

        {/* Points summary */}
        {!!points && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Points", value: (points as any).total, icon: Star, color: "bg-amber-500" },
              { label: "This Week",    value: (points as any).weekly, icon: Zap, color: "bg-blue-500" },
              { label: "This Month",   value: (points as any).monthly, icon: Medal, color: "bg-purple-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color}`}><Icon className="w-4 h-4 text-white" /></div>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Leaderboard</h2>
                <div className="flex gap-1">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPeriod(opt.value)}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${period === opt.value ? "bg-blue-600 text-white border-blue-600" : "text-gray-500 border-gray-200 hover:border-blue-300"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {lbLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (leaderboard as any[])?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data yet. Start learning to earn points!</p>
              ) : (
                <div className="space-y-2">
                  {(leaderboard as any[])?.map((row: any, i: number) => (
                    <div key={row.employee.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <span className="text-lg w-8 text-center">{i < 3 ? RANK_ICONS[i] : <span className="text-gray-400 text-sm font-medium">#{row.rank}</span>}</span>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                        {row.employee.fullName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{row.employee.fullName}</p>
                        <p className="text-xs text-gray-400">{row.employee.department?.name}</p>
                      </div>
                      <span className={`font-bold text-sm ${i < 3 ? RANK_COLORS[i] : "text-gray-600"}`}>
                        {row.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold text-gray-900 mb-4">My Badges</h2>
              {badgesLoading ? (
                <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(badges as any[])?.map((badge: any) => (
                    <div
                      key={badge.id}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${badge.earned ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50 opacity-50"}`}
                    >
                      {badge.earned ? (
                        <Trophy className="w-8 h-8 text-amber-500" />
                      ) : (
                        <Lock className="w-8 h-8 text-gray-300" />
                      )}
                      <p className="text-xs font-medium text-gray-700 leading-tight">{badge.name}</p>
                      {badge.earnedAt && (
                        <p className="text-xs text-gray-400">{new Date(badge.earnedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
