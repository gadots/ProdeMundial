"use client";

import { useState, useMemo } from "react";
import { Share2 } from "lucide-react";
import { TopBar } from "@/components/nav";
import { useApp } from "@/components/app-context";
import { PHASE_LABELS, Phase, Member } from "@/lib/types";

const PHASE_ORDER: Phase[] = [
  "GROUP", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"
];

const PHASE_SHORT: Record<Phase, string> = {
  GROUP: "Grupos", ROUND_OF_32: "Ronda 32", ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos", SEMI_FINAL: "Semis", THIRD_PLACE: "3er puesto", FINAL: "Final",
};

const RANK_EMOJI = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

type ViewMode = "total" | Phase | "stats";

function buildShareText(
  members: { displayName: string; totalPoints: number; pointsPerPhase: Record<string, number> }[],
  view: "total" | Phase,
  prodeName: string
): string {
  const viewLabel = view === "total" ? "General" : PHASE_LABELS[view];
  const lines: string[] = [
    `🏆 *ProdeMundial · ${prodeName}*`,
    `📊 Tabla ${viewLabel}`,
    "",
  ];

  const sorted = [...members].sort((a, b) => {
    const sa = view === "total" ? a.totalPoints : (a.pointsPerPhase[view] ?? 0);
    const sb = view === "total" ? b.totalPoints : (b.pointsPerPhase[view] ?? 0);
    return sb - sa;
  });

  sorted.forEach((m, i) => {
    const pts = view === "total" ? m.totalPoints : (m.pointsPerPhase[view] ?? 0);
    const medal = i < RANK_EMOJI.length ? RANK_EMOJI[i] : `#${i + 1}`;
    lines.push(`${medal} ${m.displayName} · ${pts} pts`);
  });

  lines.push("", "⚽ Mundial 2026 · elprode.vercel.app");
  return lines.join("\n");
}

function bestPhaseOf(member: Member): { phase: Phase; pts: number } | null {
  const entry = Object.entries(member.pointsPerPhase)
    .filter(([, pts]) => pts > 0)
    .sort(([, a], [, b]) => b - a)[0];
  return entry ? { phase: entry[0] as Phase, pts: entry[1] } : null;
}

function ProdeStats({
  members,
  userId,
  pointsToday,
}: {
  members: Member[];
  userId: string | undefined;
  pointsToday: Record<string, number>;
}) {
  const highlights = useMemo(() => {
    const byBestStreak = [...members].sort((a, b) => b.streak.best - a.streak.best);
    const byToday = [...members]
      .filter((m) => (pointsToday[m.id] ?? 0) > 0)
      .sort((a, b) => (pointsToday[b.id] ?? 0) - (pointsToday[a.id] ?? 0));

    return {
      streakKing: byBestStreak[0] ?? null,
      todayKing: byToday[0] ?? null,
    };
  }, [members, pointsToday]);

  return (
    <div>
      {/* Highlights */}
      {(highlights.streakKing || highlights.todayKing) && (
        <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto">
          {highlights.streakKing && highlights.streakKing.streak.best > 0 && (
            <div className="shrink-0 flex items-center gap-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 px-4 py-2.5">
              <span className="text-lg">🔥</span>
              <div>
                <p className="text-xs text-orange-400 font-semibold">Mayor racha</p>
                <p className="text-sm font-bold text-white">{highlights.streakKing.displayName}</p>
                <p className="text-xs text-white/40">{highlights.streakKing.streak.best} seguidos</p>
              </div>
            </div>
          )}
          {highlights.todayKing && (
            <div className="shrink-0 flex items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5">
              <span className="text-lg">⭐</span>
              <div>
                <p className="text-xs text-amber-400 font-semibold">Más activo hoy</p>
                <p className="text-sm font-bold text-white">{highlights.todayKing.displayName}</p>
                <p className="text-xs text-white/40">+{pointsToday[highlights.todayKing.id]} pts</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header de la tabla stats */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/8 text-xs text-white/30 font-semibold uppercase tracking-wider">
        <div className="w-7 shrink-0" />
        <div className="w-8 shrink-0" />
        <div className="flex-1">Jugador</div>
        <div className="w-16 text-center shrink-0">Racha</div>
        <div className="flex-1 text-right">Fase estrella</div>
      </div>

      {/* Filas por miembro */}
      {members.map((member, idx) => {
        const isMe = member.id === userId;
        const bp = bestPhaseOf(member);
        const todayPts = pointsToday[member.id] ?? 0;
        const usedTokens = member.tokens.filter((t) => t.usedOnMatchId && !t.decayed);
        const hasTokenActivity = member.tokens.some((t) => t.usedOnMatchId || t.decayed);

        return (
          <div
            key={member.id}
            className={`flex items-center gap-2 px-4 py-3 border-b border-white/5 ${isMe ? "bg-amber-500/5" : ""}`}
          >
            {/* Medalla */}
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
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-[#0a1628]" />
              )}
            </div>

            {/* Nombre + tokens */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isMe ? "text-amber-300" : "text-white"}`}>
                {member.displayName}
                {isMe && <span className="ml-1 text-[10px] text-amber-500/50">(vos)</span>}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {todayPts > 0 && (
                  <span className="text-[10px] font-bold text-amber-400">+{todayPts} hoy</span>
                )}
                {hasTokenActivity && (
                  <span className="flex items-center gap-0.5">
                    {member.tokens.map((t) => (
                      <span
                        key={t.multiplier}
                        className={`text-[10px] ${
                          t.decayed ? "opacity-20 line-through" :
                          t.usedOnMatchId ? "opacity-70" : "opacity-25"
                        }`}
                        title={t.decayed ? "Caducó" : t.usedOnMatchId ? "Usado" : "Sin usar"}
                      >
                        {t.emoji}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>

            {/* Racha: máx / actual */}
            <div className="w-16 text-center shrink-0">
              <div className="flex flex-col items-center">
                <span className={`text-sm font-black ${member.streak.best >= 5 ? "text-orange-400" : member.streak.best >= 3 ? "text-orange-300" : "text-white/50"}`}>
                  {member.streak.best > 0 ? `🔥 ${member.streak.best}` : "—"}
                </span>
                {member.streak.current > 0 && member.streak.current < member.streak.best && (
                  <span className="text-[10px] text-white/30">act. {member.streak.current}</span>
                )}
                {member.streak.current > 0 && member.streak.current === member.streak.best && (
                  <span className="text-[10px] text-orange-400/60">activa</span>
                )}
              </div>
            </div>

            {/* Fase estrella */}
            <div className="flex-1 text-right shrink-0 min-w-0">
              {bp ? (
                <div>
                  <p className="text-xs font-semibold text-white truncate">{PHASE_SHORT[bp.phase]}</p>
                  <p className="text-[10px] text-amber-400">{bp.pts} pts</p>
                </div>
              ) : (
                <span className="text-xs text-white/20">—</span>
              )}
            </div>
          </div>
        );
      })}

      {members.length === 0 && (
        <div className="py-12 text-center text-white/30 text-sm">Sin participantes aún</div>
      )}
    </div>
  );
}

export default function TablaPage() {
  const { user, prode, pointsToday } = useApp();
  const [view, setView] = useState<ViewMode>("total");
  const [shared, setShared] = useState(false);

  const members = [...(prode?.members ?? [])].sort((a, b) => b.totalPoints - a.totalPoints);

  const getMemberScore = (member: typeof members[0]) => {
    if (view === "total" || view === "stats") return member.totalPoints;
    return member.pointsPerPhase[view as Phase] ?? 0;
  };

  const sortedByView = view === "stats"
    ? members
    : [...members].sort((a, b) => getMemberScore(b) - getMemberScore(a));

  const handleShare = async () => {
    const shareView = view === "stats" ? "total" : view;
    const text = buildShareText(members, shareView as "total" | Phase, prode?.name ?? "Mi Prode");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch {
        // user cancelled or API not supported — fall through to WA
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div>
      <TopBar title="Posiciones" subtitle={prode?.name ?? "…"} showProfile />

      {/* Selector de vista + share */}
      <div className="sticky top-[57px] z-30 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
        <div className="flex items-center gap-2 pr-3">
          <div className="overflow-x-auto flex-1">
          <div className="flex gap-1.5 p-3 min-w-max items-center">
            {/* General */}
            <button
              onClick={() => setView("total")}
              className={`rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                view === "total"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-900/30"
                  : "bg-white/8 text-white/60 hover:bg-white/12 hover:text-white/80"
              }`}
            >
              General
            </button>

            <span className="h-5 w-px bg-white/10 mx-0.5" />

            {PHASE_ORDER.map((phase) => {
              const hasPoints = members.some((m) => (m.pointsPerPhase[phase] ?? 0) > 0);
              if (!hasPoints) return null;
              return (
                <button
                  key={phase}
                  onClick={() => setView(phase)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    view === phase
                      ? "bg-white/15 text-white border border-white/20"
                      : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/60"
                  }`}
                >
                  {phase === "GROUP" ? "Grupos" : PHASE_LABELS[phase].split(" ")[0]}
                </button>
              );
            })}

            <span className="h-5 w-px bg-white/10 mx-0.5" />

            {/* Stats */}
            <button
              onClick={() => setView("stats")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                view === "stats"
                  ? "bg-white/15 text-white border border-white/20"
                  : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/60"
              }`}
            >
              📊 Stats
            </button>
          </div>
          </div>

          {/* Botón compartir */}
          <button
            onClick={handleShare}
            className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              shared
                ? "bg-amber-500/20 text-amber-400"
                : "bg-white/8 text-white/60 hover:bg-white/12 hover:text-white/80"
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            {shared ? "¡Enviado!" : "Compartir"}
          </button>
        </div>
      </div>

      {/* Premio */}
      {prode?.prizeDescription && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-3">
            <span className="text-xl">🏆</span>
            <div>
              <p className="text-xs text-yellow-400 font-semibold">Premio al ganador</p>
              <p className="text-sm text-white/80">{prode.prizeDescription}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats view */}
      {view === "stats" ? (
        <ProdeStats members={sortedByView} userId={user?.id} pointsToday={pointsToday} />
      ) : (
        /* Tabla */
        <div className="pb-6">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-white/8 text-xs text-white/30 font-semibold uppercase tracking-wider">
            <div className="w-7 shrink-0" />
            <div className="w-8 shrink-0" />
            <div className="flex-1">Jugador</div>
            {view === "total" && (
              <div className="w-14 text-right shrink-0">Hoy</div>
            )}
            <div className="w-10 text-right shrink-0">Cambio</div>
            <div className="w-16 text-right shrink-0">Puntos</div>
          </div>

          {sortedByView.map((member, idx) => {
            const score = getMemberScore(member);
            const rankChange = member.previousRank ? member.previousRank - member.rank : 0;
            const isMe = member.id === user?.id;
            const todayPts = pointsToday[member.id] ?? 0;

            return (
              <div
                key={member.id}
                className={`flex items-center gap-2 px-4 py-3 border-b border-white/5 transition-colors ${
                  isMe ? "bg-amber-500/5" : ""
                }`}
              >
                <div className="w-7 shrink-0 text-center">
                  {idx === 0 ? <span className="text-base">🥇</span>
                  : idx === 1 ? <span className="text-base">🥈</span>
                  : idx === 2 ? <span className="text-base">🥉</span>
                  : <span className="text-xs font-bold text-white/30">#{idx + 1}</span>}
                </div>

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
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 border-2 border-[#0a1628]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? "text-amber-300" : "text-white"}`}>
                    {member.displayName}
                    {isMe && <span className="ml-1 text-[10px] text-amber-500/50">(vos)</span>}
                  </p>
                </div>

                {view === "total" && (
                  <div className="w-14 text-right shrink-0">
                    {todayPts > 0 ? (
                      <span className="text-xs font-bold text-amber-400">+{todayPts}</span>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </div>
                )}

                <div className="w-10 text-right shrink-0">
                  {view === "total" && rankChange !== 0 && (
                    <span className={`text-xs font-bold ${rankChange > 0 ? "text-amber-400" : "text-red-400"}`}>
                      {rankChange > 0 ? "↑" : "↓"}{Math.abs(rankChange)}
                    </span>
                  )}
                </div>

                <div className="w-16 text-right shrink-0">
                  <p className={`text-sm font-black ${isMe ? "text-amber-300" : "text-white"}`}>{score}</p>
                  <p className="text-[10px] text-white/30">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
