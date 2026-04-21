"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TopBar } from "@/components/nav";
import { Flag } from "@/components/flag";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/app-context";
import { PHASE_LABELS, PHASE_POINTS, Match } from "@/lib/types";
import { streakBonusPoints } from "@/lib/scoring";
import { ChevronRight, Zap, TrendingUp, Clock } from "lucide-react";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("En curso"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}d ${h}h`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else setTimeLeft(`${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

function MatchCard({ match }: { match: Match }) {
  const { predictions } = useApp();
  const countdown = useCountdown(match.date);
  const myPrediction = predictions[match.id];
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const pts = PHASE_POINTS[match.phase];

  return (
    <Link href={`/predicciones?match=${match.id}`}>
      <Card className="overflow-hidden transition-all hover:border-green-500/30 active:scale-[0.98]">
        <CardContent className="p-4">
          <div className="mb-1 flex items-center justify-between">
            {match.group ? (
              <Link href={`/grupos?g=${match.group}`} onClick={(e) => e.stopPropagation()}>
                <Badge variant="phase" className="text-[10px] cursor-pointer hover:opacity-80 transition-opacity">
                  Grupo {match.group}
                </Badge>
              </Link>
            ) : (
              <Badge variant="phase" className="text-[10px]">
                {PHASE_LABELS[match.phase]}
              </Badge>
            )}
            {isLive && <Badge variant="live">🔴 EN VIVO</Badge>}
            {isFinished && <span className="text-[10px] text-white/30">Finalizado</span>}
            {!isLive && !isFinished && (
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <Clock className="h-3 w-3" /> {countdown}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/30 mb-3">
            <span>
              {new Date(match.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} hs
            </span>
            {match.venue && (
              <>
                <span className="text-white/15">·</span>
                <span className="truncate">{match.venue}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2">
              <Flag tla={match.homeTeam.id} size={40} className="w-7 h-auto shrink-0" />
              <p className="text-sm font-bold text-white leading-tight truncate">{match.homeTeam.name}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isFinished || isLive ? (
                <>
                  <span className="text-xl font-black text-white w-5 text-center">{match.homeScore}</span>
                  <span className="text-white/30 font-bold">-</span>
                  <span className="text-xl font-black text-white w-5 text-center">{match.awayScore}</span>
                </>
              ) : (
                <span className="text-sm text-white/30 font-medium px-1">
                  {new Date(match.date).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="flex flex-1 items-center gap-2 justify-end">
              <p className="text-sm font-bold text-white leading-tight truncate text-right">{match.awayTeam.name}</p>
              <Flag tla={match.awayTeam.id} size={40} className="w-7 h-auto shrink-0" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
            {myPrediction ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40">Tu pred:</span>
                  <span className="text-xs font-bold text-white/80">
                    {myPrediction.homeGoals} - {myPrediction.awayGoals}
                  </span>
                  {myPrediction.multiplier > 1 && (
                    <span className={`text-xs font-bold ${
                      myPrediction.multiplier === 5 ? "text-purple-400" :
                      myPrediction.multiplier === 3 ? "text-orange-400" : "text-blue-400"
                    }`}>
                      {myPrediction.multiplier === 5 ? "💥5x" : myPrediction.multiplier === 3 ? "🔥3x" : "⚡2x"}
                    </span>
                  )}
                </div>
                {myPrediction.pointsEarned !== undefined && (
                  <span className={`text-xs font-bold ${myPrediction.pointsEarned > 0 ? "text-green-400" : "text-white/30"}`}>
                    {myPrediction.pointsEarned > 0 ? `+${myPrediction.pointsEarned} pts` : "0 pts"}
                  </span>
                )}
              </>
            ) : (
              <div className="flex w-full items-center justify-between">
                <span className="text-xs text-white/30">Sin predicción</span>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <Zap className="h-3 w-3" />
                  <span>Hasta {pts.exact} pts</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, prode, matches, tokens, streak } = useApp();

  const me = prode?.members.find((m) => m.id === user?.id) ?? prode?.members[0];
  const leader = prode?.members[0];
  const upcoming = matches.filter((m) => m.status === "SCHEDULED").slice(0, 4);
  const live = matches.filter((m) => m.status === "LIVE");
  const gap = leader && me ? leader.totalPoints - me.totalPoints : 0;

  const tokensAvailable = tokens.filter((t) => !t.usedOnMatchId && !t.decayed);
  const streakBonus = streakBonusPoints(streak.current);
  const remainingPotential = 50 + 30 * 2 + 18;

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={`Hola, ${user?.displayName ?? "…"} 👋`}
        showNotification
      />

      <PwaInstallBanner />

      <div className="px-4 py-5 lg:grid lg:grid-cols-[2fr_3fr] lg:gap-6 lg:items-start lg:max-w-5xl lg:mx-auto">

        {/* Columna izquierda */}
        <div className="space-y-3 mb-5 lg:mb-0">

          {/* Mi posición */}
          {me && (
            <Link href="/tabla" className="block">
              <Card className="overflow-hidden hover:border-green-500/30 transition-colors">
                <div className="bg-gradient-to-br from-green-600/20 to-blue-600/10 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-white/40 mb-0.5">Tu posición</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">#{me.rank}</span>
                        {me.previousRank && me.rank < me.previousRank && (
                          <span className="flex items-center gap-0.5 text-xs text-green-400">
                            <TrendingUp className="h-3 w-3" />
                            {me.previousRank - me.rank}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/30 mt-1">de {prode?.members.length ?? "…"} participantes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/40 mb-0.5">Puntos</p>
                      <p className="text-3xl font-black text-white">{me.totalPoints}</p>
                    </div>
                  </div>
                  {me.rank > 1 && leader && (
                    <div className="mt-4 rounded-xl bg-black/20 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/40">vs. líder</span>
                        <span className="text-xs font-bold text-orange-400">−{gap} pts</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400"
                          style={{ width: `${Math.max(5, (me.totalPoints / leader.totalPoints) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/30 mt-2">
                        La final sola vale hasta {remainingPotential} pts — cualquiera puede ganar
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          )}

          {/* Racha */}
          {streak.current >= 1 && (
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
              streak.current >= 5 ? "bg-orange-500/15 border-orange-500/25" :
              streak.current >= 3 ? "bg-orange-500/10 border-orange-500/15" :
              "bg-white/5 border-white/8"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <div>
                  <p className="text-sm font-semibold text-white">Racha de {streak.current}</p>
                  <p className="text-xs text-orange-400/70">{streakBonus > 0 ? "Bonus activo" : "Seguí acertando"}</p>
                </div>
              </div>
              {streakBonus > 0 && (
                <span className="text-sm font-bold text-orange-400">+{streakBonus} pts</span>
              )}
            </div>
          )}

          {/* Tokens */}
          {tokensAvailable.length > 0 && (
            <Link href="/predicciones" className="block">
              <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-yellow-500/10 border border-yellow-500/15 hover:border-yellow-500/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-base">{tokensAvailable.map((t) => t.emoji).join("")}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {tokensAvailable.length} potenciador{tokensAvailable.length > 1 ? "es" : ""} sin usar
                    </p>
                    <p className="text-xs text-yellow-400/70">Solo en grupos · Caducan al fin de Octavos</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-yellow-400/50" />
              </div>
            </Link>
          )}

          {/* Grupos — acceso rápido */}
          <Link href="/grupos" className="block">
            <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-blue-500/10 border border-blue-500/15 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <div>
                  <p className="text-sm font-semibold text-white">Posiciones por grupo</p>
                  <p className="text-xs text-blue-400/70">Seguí cómo va cada grupo</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-blue-400/50" />
            </div>
          </Link>

          {/* Accesos rápidos — solo desktop */}
          <div className="hidden lg:grid grid-cols-2 gap-3 pt-1">
            <Link href="/predicciones/especiales">
              <Card className="hover:border-yellow-500/30 transition-colors">
                <div className="flex items-center gap-3 p-4">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">Especiales</p>
                    <p className="text-xs text-white/40">Campeón, goleador…</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link href="/predicciones">
              <Card className="hover:border-green-500/30 transition-colors">
                <div className="flex items-center gap-3 p-4">
                  <span className="text-xl">⚽</span>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">Predicciones</p>
                    <p className="text-xs text-white/40">Predecí partidos</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Columna derecha: partidos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">
              {live.length > 0 ? "Partidos" : "Próximos partidos"}
            </h2>
            <Link href="/predicciones" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-0.5">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {live.map((m) => <MatchCard key={m.id} match={m} />)}
            {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>

      </div>
    </div>
  );
}
