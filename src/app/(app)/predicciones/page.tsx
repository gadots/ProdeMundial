"use client";

import { useState } from "react";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_MATCHES, MOCK_MY_PREDICTIONS } from "@/lib/mock-data";
import { PHASE_LABELS, PHASE_POINTS, Phase, Match } from "@/lib/types";
import { canUseJoker } from "@/lib/scoring";
import { Save, Zap, Lock, Check } from "lucide-react";

const PHASE_ORDER: Phase[] = [
  "GROUP", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"
];

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min="0"
      max="20"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-12 w-12 rounded-xl border border-white/15 bg-white/5 text-center text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-40"
    />
  );
}

function MatchPredictionCard({ match }: { match: Match }) {
  const existing = MOCK_MY_PREDICTIONS[match.id];
  const [home, setHome] = useState(existing?.homeGoals?.toString() ?? "");
  const [away, setAway] = useState(existing?.awayGoals?.toString() ?? "");
  const [joker, setJoker] = useState(existing?.jokerUsed ?? false);
  const [saved, setSaved] = useState(!!existing);

  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const locked = isFinished || isLive;
  const pts = PHASE_POINTS[match.phase];
  const jokerEligible = canUseJoker(match.phase);
  const canSave = home !== "" && away !== "" && !locked;

  const handleSave = async () => {
    if (!canSave) return;
    // In production: call Supabase to upsert prediction
    setSaved(true);
  };

  const potentialPts = joker ? pts.exact * 2 : pts.exact;

  return (
    <Card className={`overflow-hidden transition-all ${locked ? "opacity-70" : "hover:border-green-500/20"}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="phase" className="text-[10px]">
              {match.group ? `Grupo ${match.group}` : PHASE_LABELS[match.phase]}
            </Badge>
            {locked && (
              <span className="flex items-center gap-1 text-[10px] text-white/30">
                <Lock className="h-3 w-3" />
                {isLive ? "En vivo" : "Finalizado"}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-green-400">
            hasta {potentialPts} pts
          </span>
        </div>

        {/* Teams */}
        <div className="flex items-center gap-3 mb-4">
          {/* Home team */}
          <div className="flex flex-1 items-center gap-2">
            <span className="text-2xl">{match.homeTeam.flag}</span>
            <p className="text-sm font-bold text-white leading-tight">{match.homeTeam.name}</p>
          </div>

          {/* Score inputs */}
          <div className="flex items-center gap-2 shrink-0">
            <ScoreInput value={home} onChange={setHome} disabled={locked} />
            <span className="text-white/30 font-bold text-lg">-</span>
            <ScoreInput value={away} onChange={setAway} disabled={locked} />
          </div>

          {/* Away team */}
          <div className="flex flex-1 items-center gap-2 justify-end">
            <p className="text-sm font-bold text-white leading-tight text-right">{match.awayTeam.name}</p>
            <span className="text-2xl">{match.awayTeam.flag}</span>
          </div>
        </div>

        {/* Actual result if finished */}
        {locked && (
          <div className="mb-3 flex items-center justify-center gap-3 rounded-xl bg-white/5 py-2">
            <span className="text-xs text-white/40">Resultado:</span>
            <span className="text-sm font-black text-white">
              {match.homeScore} - {match.awayScore}
            </span>
            {existing?.pointsEarned !== undefined && (
              <Badge variant={existing.pointsEarned > 0 ? "default" : "secondary"}>
                {existing.pointsEarned > 0 ? `+${existing.pointsEarned} pts` : "0 pts"}
              </Badge>
            )}
          </div>
        )}

        {/* Joker + Save row */}
        {!locked && (
          <div className="flex items-center gap-2">
            {jokerEligible && (
              <button
                onClick={() => setJoker(!joker)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
                  joker
                    ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                    : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                }`}
              >
                <Zap className="h-3 w-3" />
                Comodín {joker ? "activo" : ""}
              </button>
            )}
            <Button
              onClick={handleSave}
              disabled={!canSave}
              size="sm"
              className="ml-auto"
              variant={saved && !joker ? "secondary" : "default"}
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Guardado
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" /> Guardar
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PrediccionesPage() {
  const [activePhase, setActivePhase] = useState<Phase>("GROUP");

  const matchesByPhase = MOCK_MATCHES.filter((m) => m.phase === activePhase);
  const availablePhases = PHASE_ORDER.filter((p) =>
    MOCK_MATCHES.some((m) => m.phase === p)
  );

  const pendingCount = MOCK_MATCHES.filter(
    (m) => m.status === "SCHEDULED" && !MOCK_MY_PREDICTIONS[m.id]
  ).length;

  return (
    <div>
      <TopBar
        title="Predicciones"
        subtitle={pendingCount > 0 ? `${pendingCount} partidos pendientes` : "Todo cargado ✓"}
      />

      {/* Phase tabs */}
      <div className="sticky top-[57px] z-30 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
        <div className="mx-auto max-w-lg overflow-x-auto">
          <div className="flex gap-1 p-3 min-w-max">
            {availablePhases.map((phase) => {
              const phasePts = PHASE_POINTS[phase];
              const isActive = activePhase === phase;
              const matchCount = MOCK_MATCHES.filter((m) => m.phase === phase).length;
              return (
                <button
                  key={phase}
                  onClick={() => setActivePhase(phase)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-green-600 text-white"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                  }`}
                >
                  <span className="font-semibold text-[11px]">
                    {phase === "GROUP" ? "Grupos" : PHASE_LABELS[phase].replace(" de ", "\nde ")}
                  </span>
                  <span className={`text-[10px] ${isActive ? "text-green-200" : "text-white/30"}`}>
                    {matchCount}P · {phasePts.exact}pts
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Point explanation banner */}
      <div className="mx-auto max-w-lg px-4 py-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3">
          <div className="shrink-0 text-center">
            <p className="text-lg font-black text-white">{PHASE_POINTS[activePhase].exact}</p>
            <p className="text-[9px] text-white/40 leading-tight">pts exacto</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="shrink-0 text-center">
            <p className="text-lg font-black text-white">{PHASE_POINTS[activePhase].winner}</p>
            <p className="text-[9px] text-white/40 leading-tight">pts ganador</p>
          </div>
          {PHASE_POINTS[activePhase].draw > 0 && (
            <>
              <div className="h-8 w-px bg-white/10" />
              <div className="shrink-0 text-center">
                <p className="text-lg font-black text-white">{PHASE_POINTS[activePhase].draw}</p>
                <p className="text-[9px] text-white/40 leading-tight">pts empate</p>
              </div>
            </>
          )}
          {canUseJoker(activePhase) && (
            <>
              <div className="h-8 w-px bg-white/10" />
              <div className="flex items-center gap-1 text-yellow-400">
                <Zap className="h-3.5 w-3.5" />
                <div>
                  <p className="text-xs font-bold leading-tight">Comodín disponible</p>
                  <p className="text-[9px] text-white/40">duplica tus pts</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Match list */}
      <div className="mx-auto max-w-lg space-y-3 px-4 pb-6">
        {matchesByPhase.length === 0 ? (
          <div className="py-12 text-center text-white/30">
            <p className="text-4xl mb-2">📅</p>
            <p>Los partidos de esta fase aún no están definidos</p>
          </div>
        ) : (
          matchesByPhase.map((match) => (
            <MatchPredictionCard key={match.id} match={match} />
          ))
        )}
      </div>
    </div>
  );
}
