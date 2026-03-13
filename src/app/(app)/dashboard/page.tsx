"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_MATCHES, MOCK_PRODE, MOCK_MY_PREDICTIONS, CURRENT_USER_NAME } from "@/lib/mock-data";
import { PHASE_LABELS, PHASE_POINTS } from "@/lib/types";
import { ChevronRight, Zap, TrendingUp, Clock, Flame } from "lucide-react";

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

function MatchCard({ match }: { match: (typeof MOCK_MATCHES)[0] }) {
  const countdown = useCountdown(match.date);
  const myPrediction = MOCK_MY_PREDICTIONS[match.id];
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const pts = PHASE_POINTS[match.phase];

  return (
    <Link href={`/predicciones?match=${match.id}`}>
      <Card className="overflow-hidden transition-all hover:border-green-500/30 hover:bg-white/8 active:scale-[0.98]">
        <CardContent className="p-4">
          {/* Phase & status */}
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="phase" className="text-[10px]">
              {PHASE_LABELS[match.phase]}
              {match.group ? ` · Grupo ${match.group}` : ""}
            </Badge>
            {isLive && <Badge variant="live">🔴 EN VIVO</Badge>}
            {isFinished && <span className="text-[10px] text-white/30">Finalizado</span>}
            {!isLive && !isFinished && (
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <Clock className="h-3 w-3" /> {countdown}
              </span>
            )}
          </div>

          {/* Teams + Score */}
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2">
              <span className="text-2xl">{match.homeTeam.flag}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">{match.homeTeam.name}</p>
              </div>
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
              <div className="min-w-0 text-right">
                <p className="text-sm font-bold text-white leading-tight truncate">{match.awayTeam.name}</p>
              </div>
              <span className="text-2xl">{match.awayTeam.flag}</span>
            </div>
          </div>

          {/* Prediction row */}
          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
            {myPrediction ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40">Tu pred:</span>
                  <span className="text-xs font-bold text-white/80">
                    {myPrediction.homeGoals} - {myPrediction.awayGoals}
                  </span>
                  {myPrediction.jokerUsed && (
                    <span className="text-yellow-400 text-sm">⚡</span>
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
                  <span>Hasta {pts.exact} pts disponibles</span>
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
  const me = MOCK_PRODE.members.find((m) => m.id === "u1")!;
  const leader = MOCK_PRODE.members[0];
  const upcoming = MOCK_MATCHES.filter((m) => m.status === "SCHEDULED").slice(0, 3);
  const live = MOCK_MATCHES.filter((m) => m.status === "LIVE");
  const recent = MOCK_MATCHES.filter((m) => m.status === "FINISHED").slice(-2);
  const gap = leader.totalPoints - me.totalPoints;

  // Potential points from knockout rounds if all are correct with joker
  const remainingPotential = 50 + 20 + 30 * 2 + 18; // final exact + sf joker + qf

  return (
    <div>
      <TopBar
        title={MOCK_PRODE.name}
        subtitle={`Hola, ${CURRENT_USER_NAME} 👋`}
        showNotification
      />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">

        {/* My position card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-green-600/20 to-blue-600/10 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-white/50 mb-0.5">Tu posición</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">#{me.rank}</span>
                  {me.previousRank && me.rank < me.previousRank && (
                    <span className="flex items-center gap-0.5 text-xs text-green-400">
                      <TrendingUp className="h-3 w-3" />
                      {me.previousRank - me.rank} posiciones
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-1">de {MOCK_PRODE.members.length} participantes</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50 mb-0.5">Puntos</p>
                <p className="text-3xl font-black text-white">{me.totalPoints}</p>
              </div>
            </div>

            {me.rank > 1 && (
              <div className="mt-3 rounded-xl bg-black/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/40">Diferencia con el líder</span>
                  <span className="text-xs font-bold text-orange-400">-{gap} pts</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400"
                    style={{ width: `${Math.max(5, ((me.totalPoints / leader.totalPoints) * 100))}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/30 mt-1.5">
                  💡 La final sola puede dar hasta {remainingPotential} pts más — cualquiera puede ganar
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Prize */}
        {MOCK_PRODE.prizeDescription && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-xs text-white/40 leading-none mb-0.5">Premio del prode</p>
                <p className="text-sm font-semibold text-white">{MOCK_PRODE.prizeDescription}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live matches */}
        {live.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-bold text-white">En vivo ahora</h2>
            </div>
            <div className="space-y-3">
              {live.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {/* Upcoming */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Próximos partidos</h2>
            <Link href="/predicciones" className="text-xs text-green-400 hover:text-green-300 flex items-center gap-0.5">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {upcoming.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>

        {/* Recent results */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Últimos resultados</h2>
          </div>
          <div className="space-y-3">
            {recent.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>

        {/* Quick access to specials */}
        <Card className="overflow-hidden">
          <Link href="/predicciones/especiales">
            <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20 shrink-0">
                <span className="text-xl">⭐</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Predicciones especiales</p>
                <p className="text-xs text-white/40">Campeón, goleador y más — hasta 60 pts por acierto</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
            </div>
          </Link>
        </Card>

      </div>
    </div>
  );
}
