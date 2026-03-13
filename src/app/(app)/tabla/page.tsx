"use client";

import { useState } from "react";
import { TopBar } from "@/components/nav";
import { MOCK_PRODE } from "@/lib/mock-data";
import { PHASE_LABELS, Phase } from "@/lib/types";

const PHASE_ORDER: Phase[] = [
  "GROUP", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"
];

export default function TablaPage() {
  const [view, setView] = useState<"total" | Phase>("total");
  const members = [...MOCK_PRODE.members].sort((a, b) => b.totalPoints - a.totalPoints);

  const getMemberScore = (member: typeof members[0]) => {
    if (view === "total") return member.totalPoints;
    return member.pointsPerPhase[view as Phase] ?? 0;
  };

  const sortedByView = [...members].sort((a, b) => getMemberScore(b) - getMemberScore(a));

  return (
    <div>
      <TopBar title="Tabla de Posiciones" subtitle={MOCK_PRODE.name} />

      {/* View selector */}
      <div className="sticky top-[57px] z-30 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
        <div className="overflow-x-auto">
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

      {/* Prize */}
      {MOCK_PRODE.prizeDescription && (
        <div className="px-4 pt-4 max-w-2xl">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-3">
            <span className="text-xl">🏆</span>
            <div>
              <p className="text-xs text-yellow-400 font-semibold">Premio al ganador</p>
              <p className="text-sm text-white/80">{MOCK_PRODE.prizeDescription}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="pb-6">
        {/* Header de columnas */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-white/8 text-[10px] text-white/30 font-semibold uppercase tracking-wider max-w-2xl">
          <div className="w-7 shrink-0" />
          <div className="w-8 shrink-0" />
          <div className="flex-1">Jugador</div>
          <div className="w-10 text-right shrink-0">Cambio</div>
          <div className="w-16 text-right shrink-0">Puntos</div>
        </div>

        {/* Filas */}
        {sortedByView.map((member, idx) => {
          const score = getMemberScore(member);
          const rankChange = member.previousRank ? member.previousRank - member.rank : 0;
          const isMe = member.id === "u1";

          return (
            <div
              key={member.id}
              className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-colors max-w-2xl ${
                isMe ? "bg-green-500/5" : ""
              }`}
            >
              {/* Medalla / número */}
              <div className="w-7 shrink-0 text-center">
                {idx === 0 ? <span className="text-base">🥇</span>
                : idx === 1 ? <span className="text-base">🥈</span>
                : idx === 2 ? <span className="text-base">🥉</span>
                : <span className="text-xs font-bold text-white/30">#{idx + 1}</span>}
              </div>

              {/* Avatar */}
              <div className="relative w-8 h-8 shrink-0">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white/60">{member.displayName[0]}</span>
                  )}
                </div>
                {isMe && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-[#0a1628]" />
                )}
              </div>

              {/* Nombre */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isMe ? "text-green-300" : "text-white"}`}>
                  {member.displayName}
                  {isMe && <span className="ml-1 text-[10px] text-green-500/50">(vos)</span>}
                </p>
              </div>

              {/* Cambio de posición */}
              <div className="w-10 text-right shrink-0">
                {view === "total" && rankChange !== 0 && (
                  <span className={`text-xs font-bold ${rankChange > 0 ? "text-green-400" : "text-red-400"}`}>
                    {rankChange > 0 ? "↑" : "↓"}{Math.abs(rankChange)}
                  </span>
                )}
              </div>

              {/* Puntos */}
              <div className="w-16 text-right shrink-0">
                <p className={`text-sm font-black ${isMe ? "text-green-300" : "text-white"}`}>{score}</p>
                <p className="text-[10px] text-white/30">pts</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
