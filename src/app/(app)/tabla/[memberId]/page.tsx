"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Flag } from "@/components/flag";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/components/app-context";
import { PHASE_LABELS, Phase, Match, Prediction } from "@/lib/types";
import { getMyPredictions } from "@/lib/supabase/queries";
import { MOCK_MATCH_PREDICTIONS } from "@/lib/mock-data";
import { ChevronLeft } from "lucide-react";

const IS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<your-project>") &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://")
);

const PHASE_ORDER: Phase[] = [
  "GROUP", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL",
];

export default function MemberProfilePage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const { prode, user, matches, isMockMode } = useApp();

  const member = prode?.members.find((m) => m.id === memberId);
  const isMe = member?.id === user?.id;

  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!prode || !member) return;
    const load = async () => {
      setLoading(true);
      if (!IS_SUPABASE || isMockMode) {
        const preds: Record<string, Prediction> = {};
        for (const [matchId, matchPreds] of Object.entries(MOCK_MATCH_PREDICTIONS)) {
          const p = (matchPreds as Record<string, Prediction>)[memberId];
          if (p) preds[matchId] = p;
        }
        setPredictions(preds);
      } else {
        const data = await getMyPredictions(memberId, prode.id);
        setPredictions(data);
      }
      setLoading(false);
    };
    load();
  }, [memberId, prode?.id, member, isMockMode]);

  if (!prode || !member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white/30">
        <p className="text-4xl mb-2">👤</p>
        <p>Miembro no encontrado</p>
        <Link href="/tabla" className="mt-4 text-amber-400 text-sm underline">Volver a posiciones</Link>
      </div>
    );
  }

  const finishedMatches = (matches as Match[])
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const phasesWithPoints = PHASE_ORDER.filter((p) => (member.pointsPerPhase[p] ?? 0) > 0);

  const predStats = finishedMatches.reduce(
    (acc, m) => {
      const pred = predictions[m.id];
      if (!pred) return { ...acc, sinPred: acc.sinPred + 1 };
      const exacto = pred.homeGoals === m.homeScore && pred.awayGoals === m.awayScore;
      const ganador =
        !exacto &&
        Math.sign((pred.homeGoals ?? 0) - (pred.awayGoals ?? 0)) ===
          Math.sign((m.homeScore ?? 0) - (m.awayScore ?? 0));
      return {
        ...acc,
        exactos: acc.exactos + (exacto ? 1 : 0),
        ganadores: acc.ganadores + (ganador ? 1 : 0),
        fallos: acc.fallos + (!exacto && !ganador ? 1 : 0),
      };
    },
    { exactos: 0, ganadores: 0, fallos: 0, sinPred: 0 }
  );

  const rankMedal =
    member.rank === 1 ? "🥇" : member.rank === 2 ? "🥈" : member.rank === 3 ? "🥉" : `#${member.rank}`;

  return (
    <div>
      {/* Header con botón volver */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/tabla" className="p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0">
            <ChevronLeft className="h-5 w-5 text-white/70" />
          </Link>
          <h1 className="text-base font-bold text-white truncate">{member.displayName}</h1>
          {isMe && <span className="text-[10px] text-amber-500/60 shrink-0">(vos)</span>}
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-3 pb-24">

        {/* Avatar + nombre + rank */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-white/50">{member.displayName[0]}</span>
                  )}
                </div>
                {isMe && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-500 border-2 border-[#0a1628]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`text-lg font-bold truncate ${isMe ? "text-amber-300" : "text-white"}`}>
                  {member.displayName}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="phase">{rankMedal} Posición</Badge>
                  <Badge variant="default">{member.totalPoints} pts</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-black text-orange-400">{member.streak.current}</p>
              <p className="text-[10px] text-white/40 mt-0.5">Racha actual</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-black text-white">{member.streak.best}</p>
              <p className="text-[10px] text-white/40 mt-0.5">Mejor racha</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-black text-amber-400">{member.totalPoints}</p>
              <p className="text-[10px] text-white/40 mt-0.5">Pts totales</p>
            </CardContent>
          </Card>
        </div>

        {/* Puntos por fase */}
        {phasesWithPoints.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-white/40 mb-3 font-semibold uppercase tracking-wider">Puntos por fase</p>
              <div className="space-y-2.5">
                {phasesWithPoints.map((phase) => (
                  <div key={phase} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-20 shrink-0">{PHASE_LABELS[phase]}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (member.pointsPerPhase[phase] / member.totalPoints) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-400 w-12 text-right shrink-0">
                      {member.pointsPerPhase[phase]} pts
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Potenciadores */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-3 font-semibold uppercase tracking-wider">Potenciadores</p>
            <div className="flex gap-3">
              {member.tokens.map((token) => {
                const emoji = token.multiplier === 2 ? "⚡" : token.multiplier === 3 ? "🔥" : "💥";
                const isUsed = !!token.usedOnMatchId;
                const isDecayed = !!token.decayed;
                return (
                  <div
                    key={token.multiplier}
                    className={`flex-1 rounded-xl border p-3 text-center transition-all ${
                      isDecayed
                        ? "border-white/5 bg-white/3 opacity-40"
                        : isUsed
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <p className="text-xl">{emoji}</p>
                    <p className={`text-xs font-bold mt-1 ${isUsed ? "text-amber-400" : isDecayed ? "text-white/30" : "text-white/60"}`}>
                      {token.multiplier}x
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {isDecayed ? "Vencido" : isUsed ? "Usado" : "Disponible"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Historial de predicciones */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-white/8">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Predicciones</p>
            </div>

            {loading ? (
              <div className="py-10 text-center text-white/30 text-sm">Cargando…</div>
            ) : finishedMatches.length === 0 ? (
              <div className="py-10 text-center text-white/30 text-sm">Todavía no hay partidos finalizados</div>
            ) : (
              <>
                {/* Resumen accuracy */}
                <div className="grid grid-cols-4 border-b border-white/8">
                  {[
                    { val: predStats.exactos, label: "exactos", color: "text-green-400" },
                    { val: predStats.ganadores, label: "ganador", color: "text-white" },
                    { val: predStats.fallos, label: "fallos", color: "text-white/40" },
                    { val: predStats.sinPred, label: "sin pred", color: "text-white/20" },
                  ].map((s) => (
                    <div key={s.label} className="text-center py-3">
                      <p className={`text-base font-black ${s.color}`}>{s.val}</p>
                      <p className="text-[10px] text-white/30">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Lista compacta */}
                {finishedMatches.map((match, idx) => {
                  const pred = predictions[match.id];
                  const pts = pred?.pointsEarned ?? 0;
                  const exacto =
                    pred && pred.homeGoals === match.homeScore && pred.awayGoals === match.awayScore;
                  const ganador =
                    !exacto &&
                    pred &&
                    Math.sign((pred.homeGoals ?? 0) - (pred.awayGoals ?? 0)) ===
                      Math.sign((match.homeScore ?? 0) - (match.awayScore ?? 0));
                  const multiplierLabel =
                    pred?.multiplier === 5 ? " 💥" :
                    pred?.multiplier === 3 ? " 🔥" :
                    pred?.multiplier === 2 ? " ⚡" : "";
                  const resultIcon = !pred ? "—" : exacto ? "🎯" : ganador ? "✓" : "✗";

                  return (
                    <div
                      key={match.id}
                      className={`flex items-center gap-2 px-4 py-2.5 ${
                        idx < finishedMatches.length - 1 ? "border-b border-white/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {match.homeTeam.id && (
                          <Flag tla={match.homeTeam.id} size={20} className="w-4 h-auto shrink-0" />
                        )}
                        <span className="text-xs font-black text-white tabular-nums">
                          {match.homeScore}–{match.awayScore}
                        </span>
                        {match.awayTeam.id && (
                          <Flag tla={match.awayTeam.id} size={20} className="w-4 h-auto shrink-0" />
                        )}
                        <span className="text-[10px] text-white/30 truncate ml-0.5">
                          {match.homeTeam.shortName} v {match.awayTeam.shortName}
                        </span>
                      </div>
                      <span className="text-xs text-white/40 shrink-0 tabular-nums">
                        {pred ? `${pred.homeGoals}–${pred.awayGoals}${multiplierLabel}` : "—"}
                      </span>
                      <span className="text-xs w-5 text-center shrink-0">{resultIcon}</span>
                      <span
                        className={`text-xs font-bold w-9 text-right shrink-0 ${
                          pts > 0 ? "text-amber-400" : "text-white/25"
                        }`}
                      >
                        {pred ? (pts > 0 ? `+${pts}` : "0") : "—"}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
