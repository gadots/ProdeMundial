"use client";

import { useState } from "react";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_PRODE } from "@/lib/mock-data";
import { PHASE_LABELS, Phase } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const PHASE_ORDER: Phase[] = [
  "GROUP", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"
];

const RANK_COLORS = [
  "from-yellow-400/30 to-yellow-600/10 border-yellow-500/30",
  "from-slate-300/20 to-slate-500/10 border-slate-400/20",
  "from-orange-400/20 to-orange-600/10 border-orange-500/20",
];

export default function TablaPage() {
  const [view, setView] = useState<"total" | Phase>("total");
  const members = [...MOCK_PRODE.members].sort((a, b) => b.totalPoints - a.totalPoints);

  const getMemberScore = (member: typeof members[0]) => {
    if (view === "total") return member.totalPoints;
    return member.pointsPerPhase[view as Phase] ?? 0;
  };

  const sortedByView = [...members].sort((a, b) => getMemberScore(b) - getMemberScore(a));
  const maxPoints = getMemberScore(sortedByView[0]) || 1;

  return (
    <div>
      <TopBar title="Tabla de Posiciones" subtitle={MOCK_PRODE.name} />

      {/* View selector */}
      <div className="sticky top-[57px] z-30 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
        <div className="mx-auto max-w-lg overflow-x-auto">
          <div className="flex gap-1 p-3 min-w-max">
            <button
              onClick={() => setView("total")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                view === "total"
                  ? "bg-green-600 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              General
            </button>
            {PHASE_ORDER.map((phase) => {
              const hasPoints = members.some((m) => (m.pointsPerPhase[phase] ?? 0) > 0);
              if (!hasPoints) return null;
              return (
                <button
                  key={phase}
                  onClick={() => setView(phase)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    view === phase
                      ? "bg-green-600 text-white"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                  }`}
                >
                  {phase === "GROUP" ? "Grupos" : PHASE_LABELS[phase].split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prize banner */}
      {MOCK_PRODE.prizeDescription && (
        <div className="mx-auto max-w-lg px-4 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs text-yellow-400 font-semibold">Premio al ganador</p>
              <p className="text-sm text-white/80">{MOCK_PRODE.prizeDescription}</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="mx-auto max-w-lg space-y-2 px-4 py-4">
        {sortedByView.map((member, idx) => {
          const score = getMemberScore(member);
          const rankChange = member.previousRank ? member.previousRank - member.rank : 0;
          const isMe = member.id === "u1";
          const barWidth = (score / maxPoints) * 100;

          return (
            <Card
              key={member.id}
              className={`overflow-hidden transition-all ${
                idx < 3
                  ? `bg-gradient-to-r ${RANK_COLORS[idx]}`
                  : isMe
                  ? "border-green-500/30 bg-green-500/5"
                  : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {idx === 0 ? (
                      <span className="text-xl">🥇</span>
                    ) : idx === 1 ? (
                      <span className="text-xl">🥈</span>
                    ) : idx === 2 ? (
                      <span className="text-xl">🥉</span>
                    ) : (
                      <span className="text-base font-black text-white/50">#{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                      {member.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg">{member.displayName[0]}</span>
                      )}
                    </div>
                    {isMe && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-[#0a1628]" />
                    )}
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-bold leading-tight truncate ${isMe ? "text-green-300" : "text-white"}`}>
                        {member.displayName}
                        {isMe && <span className="ml-1 text-[10px] text-green-500">(vos)</span>}
                      </p>
                      {rankChange !== 0 && view === "total" && (
                        <span className={`flex items-center gap-0.5 text-[10px] shrink-0 ${rankChange > 0 ? "text-green-400" : "text-red-400"}`}>
                          {rankChange > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(rankChange)}
                        </span>
                      )}
                      {rankChange === 0 && view === "total" && (
                        <Minus className="h-3 w-3 text-white/20 shrink-0" />
                      )}
                    </div>
                    {/* Points bar */}
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${
                          idx === 0 ? "bg-yellow-400" : isMe ? "bg-green-400" : "bg-white/40"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black text-white">{score}</p>
                    <p className="text-[10px] text-white/30">pts</p>
                  </div>
                </div>

                {/* Phase breakdown (only in total view) */}
                {view === "total" && (
                  <div className="mt-3 flex gap-3 border-t border-white/5 pt-2.5">
                    {PHASE_ORDER.filter((p) => (member.pointsPerPhase[p] ?? 0) > 0).map((p) => (
                      <div key={p} className="text-center">
                        <p className="text-[10px] text-white/30 leading-none">
                          {p === "GROUP" ? "Grupos" : p === "ROUND_OF_16" ? "Octavos" : p === "QUARTER_FINAL" ? "Cuartos" : p === "SEMI_FINAL" ? "Semis" : "Final"}
                        </p>
                        <p className="text-xs font-bold text-white/60">{member.pointsPerPhase[p]}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
