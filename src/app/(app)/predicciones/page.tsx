"use client";

import { useState, useCallback } from "react";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_MATCHES, MOCK_MY_PREDICTIONS, MOCK_MY_TOKENS } from "@/lib/mock-data";
import { PHASE_LABELS, PHASE_POINTS, Phase, Match, MultiplierToken, TokenMultiplier } from "@/lib/types";
import { maxPointsForMatch, streakBonusPoints } from "@/lib/scoring";
import { Save, Lock, Check, Flame, HelpCircle, X } from "lucide-react";

const PHASE_ORDER: Phase[] = [
  "GROUP", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"
];

const MY_STREAK = 4;
const STREAK_BONUS = streakBonusPoints(MY_STREAK);

interface TokenAssignment {
  matchId: string;
  multiplier: TokenMultiplier;
}

function ScoreInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      type="number" min="0" max="20" value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-12 w-12 rounded-xl border border-white/15 bg-white/5 text-center text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-40"
    />
  );
}

function TokenPicker({
  tokens,
  activeMultiplier,
  onSelect,
  disabled,
}: {
  tokens: MultiplierToken[];
  activeMultiplier: TokenMultiplier;
  onSelect: (m: TokenMultiplier) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-white/30 mr-0.5">Token:</span>
      <button
        onClick={() => onSelect(1)}
        disabled={disabled}
        className={`rounded-lg px-2 py-1.5 text-xs font-semibold border transition-all ${
          activeMultiplier === 1
            ? "bg-white/15 border-white/30 text-white"
            : "bg-white/5 border-white/10 text-white/30 hover:border-white/20 hover:text-white/60"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        —
      </button>
      {tokens.map((token) => {
        const isUsedElsewhere = !!token.usedOnMatchId;
        const isActive = activeMultiplier === token.multiplier;
        return (
          <button
            key={token.multiplier}
            onClick={() => !isUsedElsewhere && onSelect(token.multiplier)}
            disabled={disabled || (isUsedElsewhere && !isActive)}
            title={isUsedElsewhere && !isActive ? `Ya usado en otro partido` : token.label}
            className={`relative flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold border transition-all ${
              isActive
                ? `${token.color}`
                : isUsedElsewhere
                ? "opacity-25 cursor-not-allowed bg-white/5 border-white/10 text-white/30"
                : `hover:${token.color} bg-white/5 border-white/10 text-white/40 hover:opacity-80`
            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span>{token.emoji}</span>
            <span>{token.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MatchPredictionCard({
  match,
  tokens,
  onTokenChange,
}: {
  match: Match;
  tokens: MultiplierToken[];
  onTokenChange: (matchId: string, prev: TokenMultiplier, next: TokenMultiplier) => void;
}) {
  const existing = MOCK_MY_PREDICTIONS[match.id];
  const [home, setHome] = useState(existing?.homeGoals?.toString() ?? "");
  const [away, setAway] = useState(existing?.awayGoals?.toString() ?? "");
  const [multiplier, setMultiplier] = useState<TokenMultiplier>(existing?.multiplier ?? 1);
  const [saved, setSaved] = useState(!!existing);

  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const locked = isFinished || isLive;
  const pts = PHASE_POINTS[match.phase];
  const canSave = home !== "" && away !== "" && !locked;

  const localTokens: MultiplierToken[] = tokens.map((t) => ({
    ...t,
    usedOnMatchId: t.usedOnMatchId === match.id ? undefined : t.usedOnMatchId,
  }));

  const handleTokenSelect = (next: TokenMultiplier) => {
    const prev = multiplier;
    setMultiplier(next);
    setSaved(false);
    onTokenChange(match.id, prev, next);
  };

  const handleSave = () => {
    if (!canSave) return;
    setSaved(true);
  };

  const potential = maxPointsForMatch(match.phase, multiplier) + (MY_STREAK >= 3 && !locked ? STREAK_BONUS : 0);

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
          <span className="text-xs font-bold text-green-400">hasta {potential} pts</span>
        </div>

        {/* Teams + inputs */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex flex-1 items-center gap-2">
            <span className="text-2xl">{match.homeTeam.flag}</span>
            <p className="text-sm font-bold text-white leading-tight">{match.homeTeam.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreInput value={home} onChange={setHome} disabled={locked} />
            <span className="text-white/30 font-bold text-lg">-</span>
            <ScoreInput value={away} onChange={setAway} disabled={locked} />
          </div>
          <div className="flex flex-1 items-center gap-2 justify-end">
            <p className="text-sm font-bold text-white leading-tight text-right">{match.awayTeam.name}</p>
            <span className="text-2xl">{match.awayTeam.flag}</span>
          </div>
        </div>

        {/* Actual result */}
        {locked && (
          <div className="mb-3 flex items-center justify-center gap-3 rounded-xl bg-white/5 py-2">
            <span className="text-xs text-white/40">Resultado:</span>
            <span className="text-sm font-black text-white">{match.homeScore} - {match.awayScore}</span>
            {existing?.pointsEarned !== undefined && (
              <Badge variant={existing.pointsEarned > 0 ? "default" : "secondary"}>
                {existing.pointsEarned > 0 ? `+${existing.pointsEarned} pts` : "0 pts"}
              </Badge>
            )}
          </div>
        )}

        {/* Token picker + Save */}
        {!locked && (
          <div className="flex flex-wrap items-center gap-2">
            <TokenPicker
              tokens={localTokens}
              activeMultiplier={multiplier}
              onSelect={handleTokenSelect}
              disabled={locked}
            />
            {MY_STREAK >= 3 && (
              <span className="flex items-center gap-1 text-[10px] text-orange-400">
                <Flame className="h-3 w-3" />+{STREAK_BONUS} racha
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!canSave}
              size="sm"
              className="ml-auto"
              variant={saved ? "secondary" : "default"}
            >
              {saved ? <><Check className="h-3.5 w-3.5" /> Guardado</> : <><Save className="h-3.5 w-3.5" /> Guardar</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PointsLegendModal({ phase, onClose }: { phase: Phase; onClose: () => void }) {
  const pts = PHASE_POINTS[phase];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#0d1f3c] border border-white/15 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-white">Puntos · {phase === "GROUP" ? "Fase de Grupos" : PHASE_LABELS[phase]}</p>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 rounded-xl bg-white/5 p-3 text-center">
            <p className="text-2xl font-black text-white">{pts.exact}</p>
            <p className="text-xs text-white/40 mt-0.5">resultado exacto</p>
          </div>
          <div className="flex-1 rounded-xl bg-white/5 p-3 text-center">
            <p className="text-2xl font-black text-white">{pts.winner}</p>
            <p className="text-xs text-white/40 mt-0.5">ganador correcto</p>
          </div>
          {pts.draw > 0 && (
            <div className="flex-1 rounded-xl bg-white/5 p-3 text-center">
              <p className="text-2xl font-black text-white">{pts.draw}</p>
              <p className="text-xs text-white/40 mt-0.5">empate correcto</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
          <span className="text-xs text-white/40">Multiplicadores:</span>
          <span className="text-sm font-bold text-blue-400">⚡ ×2</span>
          <span className="text-sm font-bold text-orange-400">🔥 ×3</span>
          <span className="text-sm font-bold text-purple-400">💥 ×5</span>
          {MY_STREAK >= 3 && (
            <>
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-1 text-xs text-orange-400">
                <Flame className="h-3 w-3" /> +{STREAK_BONUS} racha
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrediccionesPage() {
  const [activePhase, setActivePhase] = useState<Phase>("GROUP");
  const [showLegend, setShowLegend] = useState(false);
  const [tokens, setTokens] = useState<MultiplierToken[]>(MOCK_MY_TOKENS);

  const handleTokenChange = useCallback((matchId: string, prev: TokenMultiplier, next: TokenMultiplier) => {
    setTokens((current) =>
      current.map((t) => {
        if (t.multiplier === prev && t.usedOnMatchId === matchId) {
          return { ...t, usedOnMatchId: undefined };
        }
        if (t.multiplier === next && next !== 1) {
          return { ...t, usedOnMatchId: matchId };
        }
        return t;
      })
    );
  }, []);

  const matchesByPhase = MOCK_MATCHES.filter((m) => m.phase === activePhase);
  const availablePhases = PHASE_ORDER.filter((p) => MOCK_MATCHES.some((m) => m.phase === p));
  const pendingCount = MOCK_MATCHES.filter((m) => m.status === "SCHEDULED" && !MOCK_MY_PREDICTIONS[m.id]).length;

  const tokensLeft = tokens.filter((t) => !t.usedOnMatchId && !t.decayed);

  return (
    <div>
      <TopBar
        title="Predicciones"
        subtitle={pendingCount > 0 ? `${pendingCount} pendientes` : "Todo cargado ✓"}
      />

      {/* Phase tabs + legend button */}
      <div className="sticky top-[57px] z-30 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
        <div className="mx-auto max-w-lg flex items-center gap-2 px-3 py-3">
          <div className="flex gap-1 overflow-x-auto flex-1 min-w-0">
            {availablePhases.map((phase) => {
              const isActive = activePhase === phase;
              const matchCount = MOCK_MATCHES.filter((m) => m.phase === phase).length;
              return (
                <button
                  key={phase}
                  onClick={() => setActivePhase(phase)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs transition-all whitespace-nowrap shrink-0 ${
                    isActive ? "bg-green-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                  }`}
                >
                  <span className="font-semibold text-[11px]">
                    {phase === "GROUP" ? "Grupos" : PHASE_LABELS[phase].split(" ")[0]}
                  </span>
                  <span className={`text-[10px] ${isActive ? "text-green-200" : "text-white/30"}`}>
                    {matchCount}P · {PHASE_POINTS[phase].exact}pts
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowLegend(true)}
            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
            title="Ver tabla de puntos"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Token status — compact inline bar */}
      <div className="mx-auto max-w-lg px-4 pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-white/40 shrink-0">Mis tokens:</span>
          {tokens.map((t) => (
            <span
              key={t.multiplier}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                t.decayed
                  ? "opacity-25 bg-white/5 border-white/10 text-white/40 line-through"
                  : t.usedOnMatchId
                  ? `opacity-50 ${t.color}`
                  : t.color
              }`}
            >
              {t.emoji} {t.label}
              {t.usedOnMatchId && !t.decayed && <span className="text-[9px] opacity-70">en uso</span>}
              {t.decayed && <span className="text-[9px]">caducó</span>}
              {!t.usedOnMatchId && !t.decayed && <span className="h-1 w-1 rounded-full bg-current animate-pulse" />}
            </span>
          ))}
          {tokensLeft.length > 0 && (
            <span className="text-[10px] text-orange-400/80 shrink-0">¡Caducan al final de Grupos!</span>
          )}
        </div>
      </div>

      {/* Match list */}
      <div className="mx-auto max-w-lg space-y-3 px-4 py-3 pb-6">
        {matchesByPhase.length === 0 ? (
          <div className="py-12 text-center text-white/30">
            <p className="text-4xl mb-2">📅</p>
            <p>Los partidos de esta fase aún no están definidos</p>
          </div>
        ) : (
          matchesByPhase.map((match) => (
            <MatchPredictionCard
              key={match.id}
              match={match}
              tokens={tokens}
              onTokenChange={handleTokenChange}
            />
          ))
        )}
      </div>

      {/* Points legend modal */}
      {showLegend && (
        <PointsLegendModal phase={activePhase} onClose={() => setShowLegend(false)} />
      )}
    </div>
  );
}
