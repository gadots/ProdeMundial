"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { TopBar } from "@/components/nav";
import { Flag } from "@/components/flag";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app-context";
import { PHASE_LABELS, PHASE_POINTS, Phase, Match, MultiplierToken, TokenMultiplier, Prediction } from "@/lib/types";
import { maxPointsForMatch, streakBonusPoints } from "@/lib/scoring";
import { Save, Lock, Check, Flame, HelpCircle, X } from "lucide-react";

const MODULE_LOAD_TIME = Date.now();

const PHASE_ORDER: Phase[] = [
  "GROUP", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"
];

const PHASE_SHORT: Record<Phase, string> = {
  GROUP: "Grupos", ROUND_OF_32: "Ronda 32", ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos", SEMI_FINAL: "Semis", THIRD_PLACE: "3er Puesto", FINAL: "Final",
};

type FilterView = "all" | "pending" | "urgent" | "history";

const PHASE_ORDER_DISPLAY: Phase[] = [
  "GROUP", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "THIRD_PLACE", "FINAL"
];

interface HistorialStats {
  totalPts: number;
  exactos: number;
  ganadores: number;
  fallos: number;
  sinPred: number;
}

function HistorialView({
  matches,
  predictions,
  stats,
}: {
  matches: Match[];
  predictions: Record<string, Prediction>;
  stats: HistorialStats;
}) {
  const byPhase: Partial<Record<Phase, Match[]>> = {};
  for (const m of matches) {
    if (!byPhase[m.phase]) byPhase[m.phase] = [];
    byPhase[m.phase]!.push(m);
  }

  if (matches.length === 0) {
    return (
      <div className="py-16 text-center text-white/30">
        <p className="text-4xl mb-2">📋</p>
        <p>Todavía no hay partidos finalizados</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Resumen */}
      <div className="mx-4 mt-3 grid grid-cols-5 gap-1.5 rounded-xl bg-white/5 p-3 border border-white/8">
        <div className="text-center">
          <p className="text-sm font-black text-amber-400">{stats.totalPts}</p>
          <p className="text-[10px] text-white/40 mt-0.5">pts</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-green-400">{stats.exactos}</p>
          <p className="text-[10px] text-white/40 mt-0.5">exactos</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-white">{stats.ganadores}</p>
          <p className="text-[10px] text-white/40 mt-0.5">ganador</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-white/50">{stats.fallos}</p>
          <p className="text-[10px] text-white/40 mt-0.5">fallos</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-white/30">{stats.sinPred}</p>
          <p className="text-[10px] text-white/40 mt-0.5">sin pred</p>
        </div>
      </div>

      {/* Lista por fase */}
      {PHASE_ORDER_DISPLAY.filter((p) => byPhase[p]?.length).map((phase) => (
        <div key={phase}>
          <p className="px-4 pt-4 pb-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            {PHASE_LABELS[phase]}
          </p>
          <div className="border border-white/8 mx-4 rounded-xl overflow-hidden">
            {byPhase[phase]!.map((match, idx) => {
              const pred = predictions[match.id];
              const pts = pred?.pointsEarned ?? 0;
              const exacto =
                pred !== undefined &&
                pred.homeGoals === match.homeScore &&
                pred.awayGoals === match.awayScore;
              const ganador =
                pred !== undefined &&
                !exacto &&
                Math.sign(pred.homeGoals - pred.awayGoals) ===
                  Math.sign((match.homeScore ?? 0) - (match.awayScore ?? 0));
              const resultIcon = !pred ? "—" : exacto ? "🎯" : ganador ? "✓" : "✗";
              const tokenLabel =
                pred?.multiplier === 5 ? " 💥" :
                pred?.multiplier === 3 ? " 🔥" :
                pred?.multiplier === 2 ? " ⚡" : "";

              return (
                <div
                  key={match.id}
                  className={`flex items-center gap-2 px-3 py-2.5 ${
                    idx < byPhase[phase]!.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  {/* Resultado real */}
                  <div className="flex items-center gap-1 w-28 shrink-0">
                    <Flag tla={match.homeTeam.id} size={20} className="w-4 h-auto shrink-0" />
                    <span className="text-xs font-black text-white tabular-nums">
                      {match.homeScore}–{match.awayScore}
                    </span>
                    <Flag tla={match.awayTeam.id} size={20} className="w-4 h-auto shrink-0" />
                  </div>
                  {/* Equipos */}
                  <span className="flex-1 text-xs text-white/40 truncate min-w-0">
                    {match.homeTeam.shortName} vs {match.awayTeam.shortName}
                  </span>
                  {/* Mi predicción */}
                  <span className="text-xs text-white/50 shrink-0 tabular-nums">
                    {pred ? `${pred.homeGoals}–${pred.awayGoals}${tokenLabel}` : "sin pred."}
                  </span>
                  {/* Icono resultado */}
                  <span className={`w-5 text-center text-xs shrink-0 ${
                    exacto ? "text-green-400" : ganador ? "text-white/60" : "text-white/25"
                  }`}>
                    {resultIcon}
                  </span>
                  {/* Puntos */}
                  <span className={`w-10 text-right text-xs font-bold shrink-0 ${
                    pts > 0 ? "text-amber-400" : "text-white/25"
                  }`}>
                    {!pred ? "—" : pts > 0 ? `+${pts}` : "0"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      type="number" min="0" max="20" value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-12 w-12 rounded-xl border border-white/15 bg-white/5 text-center text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-40"
    />
  );
}

function TokenPicker({
  tokens, activeMultiplier, onSelect, disabled,
}: {
  tokens: MultiplierToken[];
  activeMultiplier: TokenMultiplier;
  onSelect: (m: TokenMultiplier) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-white/30 mr-0.5">Potenciador:</span>
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
  existing,
  myStreak,
  onTokenChange,
  onSave,
}: {
  match: Match;
  tokens: MultiplierToken[];
  existing?: Prediction;
  myStreak: number;
  onTokenChange: (matchId: string, prev: TokenMultiplier, next: TokenMultiplier) => void;
  onSave: (matchId: string, home: number, away: number, multiplier: TokenMultiplier, penaltyWinner?: "home" | "away") => Promise<{ error: string | null }>;
}) {
  const [home, setHome] = useState(existing?.homeGoals?.toString() ?? "");
  const [away, setAway] = useState(existing?.awayGoals?.toString() ?? "");
  const [multiplier, setMultiplier] = useState<TokenMultiplier>(existing?.multiplier ?? 1);
  const [penaltyWinner, setPenaltyWinner] = useState<"home" | "away" | undefined>(existing?.penaltyWinner);
  const [saved, setSaved] = useState(!!existing);
  const [saving, setSaving] = useState(false);

  const teamsKnown = !!match.homeTeam.id && !!match.awayTeam.id;
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "LIVE";
  const locked = isFinished || isLive || !teamsKnown;
  const pts = PHASE_POINTS[match.phase];
  const isGroupPhase = match.phase === "GROUP";
  const isKnockout = !isGroupPhase;
  const streakBonus = streakBonusPoints(myStreak);

  const predictedDraw = home !== "" && away !== "" && Number(home) === Number(away);
  const showPenaltySelector = isKnockout && !locked && predictedDraw;
  const canSave = home !== "" && away !== "" && !locked &&
    (!showPenaltySelector || penaltyWinner !== undefined);

  const homeName = match.homeTeam.id ? match.homeTeam.name : "Por definir";
  const homeFlag = match.homeTeam.id ? match.homeTeam.flag : "❓";
  const awayName = match.awayTeam.id ? match.awayTeam.name : "Por definir";
  const awayFlag = match.awayTeam.id ? match.awayTeam.flag : "❓";

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

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const result = await onSave(match.id, Number(home), Number(away), multiplier, showPenaltySelector ? penaltyWinner : undefined);
    setSaving(false);
    if (!result.error) setSaved(true);
  };

  const activeMultiplier = isGroupPhase ? multiplier : 1;
  const potential = isGroupPhase
    ? maxPointsForMatch(match.phase, multiplier, myStreak >= 3 && !locked ? streakBonus : 0)
    : maxPointsForMatch(match.phase);

  return (
    <Card className={`overflow-hidden transition-all ${locked ? "opacity-70" : "hover:border-amber-500/20"}`}>
      <CardContent className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {match.group ? (
              <Link href={`/grupos?g=${match.group}`}>
                <Badge variant="phase" className="text-xs cursor-pointer hover:opacity-80 transition-opacity">
                  Grupo {match.group}
                </Badge>
              </Link>
            ) : (
              <Badge variant="phase" className="text-xs">
                {PHASE_LABELS[match.phase]}
              </Badge>
            )}
            {!teamsKnown && (
              <span className="flex items-center gap-1 text-[10px] text-white/30">
                <Lock className="h-3 w-3" />
                Rival por definir
              </span>
            )}
            {teamsKnown && locked && (
              <span className="flex items-center gap-1 text-[10px] text-white/30">
                <Lock className="h-3 w-3" />
                {isLive ? "En vivo" : "Finalizado"}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-amber-400">hasta {potential} pts</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/30 mb-3">
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

        {isKnockout && !locked && (
          <p className="text-[10px] text-white/30 text-center mb-2">
            Resultado en tiempo regular (90 min + alargue)
          </p>
        )}

        <div className="flex items-center gap-3 mb-3">
          <div className="flex flex-1 items-center gap-2">
            {match.homeTeam.id ? <Flag tla={match.homeTeam.id} size={40} className="w-7 h-auto" /> : <span className="text-2xl">❓</span>}
            <p className="text-sm font-bold text-white leading-tight">{homeName}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreInput value={home} onChange={(v) => { setHome(v); setSaved(false); if (Number(v) !== Number(away)) setPenaltyWinner(undefined); }} disabled={locked} />
            <span className="text-white/30 font-bold text-lg">-</span>
            <ScoreInput value={away} onChange={(v) => { setAway(v); setSaved(false); if (Number(home) !== Number(v)) setPenaltyWinner(undefined); }} disabled={locked} />
          </div>
          <div className="flex flex-1 items-center gap-2 justify-end">
            <p className="text-sm font-bold text-white leading-tight text-right">{awayName}</p>
            {match.awayTeam.id ? <Flag tla={match.awayTeam.id} size={40} className="w-7 h-auto" /> : <span className="text-2xl">❓</span>}
          </div>
        </div>

        {showPenaltySelector && (
          <div className="mb-3 rounded-xl bg-white/5 border border-white/10 p-3">
            <p className="text-[10px] text-white/40 mb-2 text-center">¿Quién gana en penales?</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setPenaltyWinner("home"); setSaved(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  penaltyWinner === "home"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                }`}
              >
                <Flag tla={match.homeTeam.id} size={20} className="w-5 h-auto rounded-[1px]" />
                <span className="truncate">{match.homeTeam.shortName || homeName}</span>
              </button>
              <button
                onClick={() => { setPenaltyWinner("away"); setSaved(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  penaltyWinner === "away"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                }`}
              >
                <Flag tla={match.awayTeam.id} size={20} className="w-5 h-auto rounded-[1px]" />
                <span className="truncate">{match.awayTeam.shortName || awayName}</span>
              </button>
            </div>
          </div>
        )}

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

        {!locked && (
          <div className="flex flex-wrap items-center gap-2">
            {isGroupPhase && (
              <TokenPicker tokens={localTokens} activeMultiplier={activeMultiplier} onSelect={handleTokenSelect} disabled={locked} />
            )}
            {myStreak >= 3 && (
              <span className="flex items-center gap-1 text-[10px] text-orange-400">
                <Flame className="h-3 w-3" />+{streakBonus} racha
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={!canSave || saving}
              size="sm"
              className="ml-auto"
              variant={saved ? "secondary" : "default"}
            >
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : saved ? (
                <><Check className="h-3.5 w-3.5" /> Guardado</>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Guardar</>
              )}
            </Button>
          </div>
        )}

        {/* Resumen de puntos posibles */}
        {!locked && pts && (
          <div className="mt-1 text-[10px] text-white/20">
            {isGroupPhase
              ? `Exacto: ${pts.exact} pts · Ganador: ${pts.winner} pts${pts.draw > 0 ? ` · Empate: ${pts.draw} pts` : ""}`
              : `Exacto: ${pts.exact} pts · Penales: ${pts.penales} pts · Ganador: ${pts.winner} pts`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RulesModal({ onClose }: { onClose: () => void }) {
  const phases = PHASE_ORDER;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg flex flex-col rounded-2xl bg-[#0d1f3c] border border-white/15 shadow-2xl"
        style={{ maxHeight: "min(calc(100svh - 2rem), calc(100dvh - 2rem))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0d1f3c] rounded-t-2xl">
          <p className="text-sm font-bold text-white">Reglas de puntuación</p>
          <button onClick={onClose} aria-label="Cerrar" className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Puntos por fase</p>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 text-white/40">
                    <th className="text-left px-3 py-2 font-semibold">Fase</th>
                    <th className="text-center px-2 py-2 font-semibold">Exacto</th>
                    <th className="text-center px-2 py-2 font-semibold">Penales</th>
                    <th className="text-center px-2 py-2 font-semibold">Ganador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {phases.map((phase) => {
                    const pts = PHASE_POINTS[phase];
                    const isGroup = phase === "GROUP";
                    return (
                      <tr key={phase} className="text-white/80">
                        <td className="px-3 py-2 font-medium">{PHASE_SHORT[phase]}</td>
                        <td className="px-2 py-2 text-center font-black text-amber-400">{pts.exact}</td>
                        <td className="px-2 py-2 text-center">
                          {isGroup
                            ? <span className="text-white/20">—</span>
                            : <span className="font-bold text-blue-300">{pts.penales}</span>}
                        </td>
                        <td className="px-2 py-2 text-center font-bold">
                          {isGroup
                            ? <>{pts.winner} <span className="text-white/30 font-normal text-[10px]">/ {pts.draw} emp</span></>
                            : pts.winner}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-white/30 px-1 mt-1.5">
              Penales: acertaste el empate en tiempo regular + quién gana en penales.
              Fórmula: (pts base + bonus racha) × multiplicador.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Potenciadores</p>
            <div className="space-y-2">
              {[
                { emoji: "⚡", label: "2x", color: "text-blue-400", desc: "Multiplicá por 2 los puntos de un partido" },
                { emoji: "🔥", label: "3x", color: "text-orange-400", desc: "Multiplicá por 3 los puntos de un partido" },
                { emoji: "💥", label: "5x", color: "text-purple-400", desc: "Multiplicá por 5 los puntos de un partido" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                  <span className={`text-sm font-black ${t.color} w-6`}>{t.emoji}{t.label}</span>
                  <p className="text-xs text-white/60">{t.desc}</p>
                </div>
              ))}
              <p className="text-[10px] text-white/30 px-1">Solo aplican en la fase de grupos. Cada uno se usa una sola vez. Caducan al final de Octavos de Final.</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Bonus de racha</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 rounded-xl bg-orange-500/10 border border-orange-500/15 px-3 py-2">
                <span className="text-sm">🔥🔥🔥</span>
                <p className="text-xs text-orange-300">3 aciertos seguidos → <strong>+3 pts</strong> en el próximo</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-orange-500/15 border border-orange-500/20 px-3 py-2">
                <span className="text-sm">🔥🔥🔥🔥🔥</span>
                <p className="text-xs text-orange-300">5 aciertos seguidos → <strong>+8 pts</strong> en el próximo</p>
              </div>
              <p className="text-[10px] text-white/30 px-1">La racha se corta con cualquier predicción incorrecta.</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Predicciones especiales</p>
            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              {[
                { label: "Campeón", pts: 60, emoji: "🏆" },
                { label: "Goleador", pts: 40, emoji: "⚽" },
                { label: "Finalista", pts: 35, emoji: "🥈" },
                { label: "Tercer puesto", pts: 25, emoji: "🥉" },
                { label: "Más goles", pts: 20, emoji: "🎯" },
              ].map((s, i, arr) => (
                <div key={s.label} className={`flex items-center justify-between px-3 py-2.5 ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}>
                  <span className="text-xs text-white/70">{s.emoji} {s.label}</span>
                  <span className="text-xs font-bold text-amber-400">{s.pts} pts</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/30 px-1 mt-1.5">Se cierran al inicio del torneo (11 jun 2026).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrediccionesPage() {
  const { matches, predictions, tokens, setTokens, updateTokenUsage, streak, savePrediction } = useApp();

  const [activePhase, setActivePhase] = useState<Phase>("GROUP");
  const [filterView, setFilterView] = useState<FilterView>("all");
  const [showRules, setShowRules] = useState(false);

  const handleTokenChange = useCallback((matchId: string, prev: TokenMultiplier, next: TokenMultiplier) => {
    setTokens(
      tokens.map((t) => {
        if (t.multiplier === prev && t.usedOnMatchId === matchId) return { ...t, usedOnMatchId: undefined };
        if (t.multiplier === next && next !== 1) return { ...t, usedOnMatchId: matchId };
        return t;
      })
    );
    // Persist to DB: clear previous token, set new
    if (prev !== 1) updateTokenUsage(prev, null);
    if (next !== 1) updateTokenUsage(next, matchId);
  }, [tokens, setTokens, updateTokenUsage]);

  const handleSave = useCallback(async (
    matchId: string, home: number, away: number, multiplier: TokenMultiplier, penaltyWinner?: "home" | "away"
  ) => {
    return savePrediction({ matchId, homeGoals: home, awayGoals: away, multiplier, penaltyWinner });
  }, [savePrediction]);

  const availablePhases = PHASE_ORDER.filter((p) =>
    matches.some((m) => m.phase === p && !!m.homeTeam.id && !!m.awayTeam.id)
  );

  const allPending = matches.filter((m) => m.status === "SCHEDULED" && !predictions[m.id]);
  const allUrgent = allPending.filter((m) => {
    const diff = new Date(m.date).getTime() - MODULE_LOAD_TIME;
    return diff > 0 && diff < 86400000;
  });

  const finishedMatches = [...matches]
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const historialCount = finishedMatches.filter((m) => predictions[m.id]).length;

  const historialStats = finishedMatches.reduce<HistorialStats>(
    (acc, m) => {
      const pred = predictions[m.id];
      if (!pred) return { ...acc, sinPred: acc.sinPred + 1 };
      const pts = pred.pointsEarned ?? 0;
      const exacto = pred.homeGoals === m.homeScore && pred.awayGoals === m.awayScore;
      const ganador =
        !exacto &&
        Math.sign(pred.homeGoals - pred.awayGoals) ===
          Math.sign((m.homeScore ?? 0) - (m.awayScore ?? 0));
      return {
        totalPts: acc.totalPts + pts,
        exactos: acc.exactos + (exacto ? 1 : 0),
        ganadores: acc.ganadores + (ganador ? 1 : 0),
        fallos: acc.fallos + (!exacto && !ganador ? 1 : 0),
        sinPred: acc.sinPred,
      };
    },
    { totalPts: 0, exactos: 0, ganadores: 0, fallos: 0, sinPred: 0 }
  );

  const matchesToShow =
    filterView === "pending" ? allPending :
    filterView === "urgent"  ? allUrgent :
    matches.filter((m) => m.phase === activePhase);

  const tokensLeft = tokens.filter((t) => !t.usedOnMatchId && !t.decayed);

  return (
    <div>
      <TopBar
        title="Predicciones"
        subtitle={allPending.length > 0 ? `${allPending.length} sin predecir` : "Todo cargado ✓"}
        showProfile
      />

      {/* Filtros rápidos + tabs de fase */}
      <div className="sticky top-[57px] z-30 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">

        {/* Fila 1: filtros de estado */}
        <div className="flex gap-1.5 px-3 pt-2.5">
          <button
            onClick={() => setFilterView("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filterView === "all" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterView("pending")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filterView === "pending"
                ? "bg-orange-600 text-white"
                : allPending.length > 0 ? "text-orange-400/80 hover:text-orange-300" : "text-white/30"
            }`}
          >
            Pendientes
            {allPending.length > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${filterView === "pending" ? "bg-white/20" : "bg-orange-500/20"}`}>
                {allPending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterView("urgent")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filterView === "urgent"
                ? "bg-red-600 text-white"
                : allUrgent.length > 0 ? "text-red-400/80 hover:text-red-300" : "text-white/30"
            }`}
          >
            Urgentes
            {allUrgent.length > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${filterView === "urgent" ? "bg-white/20" : "bg-red-500/20"}`}>
                {allUrgent.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterView("history")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              filterView === "history" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            Historial
            {historialCount > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] font-bold ${
                filterView === "history" ? "bg-white/20" : "bg-white/10"
              }`}>
                {historialCount}
              </span>
            )}
          </button>
        </div>

        {/* Fila 2: tabs de fase (solo en vista "todas") */}
        {filterView === "all" && (
          <div className="flex items-center gap-2 px-3 pb-2.5 pt-0">
            <div className="flex gap-1 overflow-x-auto flex-1 min-w-0 pt-2 pb-1">
              {availablePhases.map((phase) => {
                const isActive = activePhase === phase;
                const pendingCount = matches.filter((m) => m.phase === phase && m.status === "SCHEDULED" && !predictions[m.id]).length;
                return (
                  <button
                    key={phase}
                    onClick={() => setActivePhase(phase)}
                    className={`relative rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      isActive ? "bg-amber-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                    }`}
                  >
                    {PHASE_SHORT[phase]}
                    {pendingCount > 0 && (
                      <span className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full text-[8px] font-bold flex items-center justify-center ${
                        isActive ? "bg-white text-amber-700" : "bg-orange-500 text-white"
                      }`}>{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <Link
              href="/grupos"
              className="shrink-0 flex items-center justify-center h-8 px-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all text-[10px] font-semibold gap-1"
              title="Posiciones por grupo"
            >
              📊 Grupos
            </Link>
            <button
              onClick={() => setShowRules(true)}
              className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
              title="Ver reglas completas"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Potenciadores + Racha — ocultos en historial */}
      {filterView === "history" && (
        <HistorialView
          matches={finishedMatches}
          predictions={predictions}
          stats={historialStats}
        />
      )}

      {filterView !== "history" && (
      <>
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-white/40 shrink-0">Mis potenciadores:</span>
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
            <span className="text-[10px] text-orange-400/80 shrink-0">Solo en grupos · Caducan al fin de Octavos</span>
          )}
        </div>
      </div>

      {/* Racha counter — siempre visible */}
      <div className={`mx-4 mt-3 flex items-center justify-between rounded-xl px-4 py-2.5 border ${
        streak.current >= 5 ? "bg-orange-500/15 border-orange-500/25" :
        streak.current >= 3 ? "bg-orange-500/10 border-orange-500/15" :
        "bg-white/5 border-white/8"
      }`}>
        <div className="flex items-center gap-2">
          <span>🔥</span>
          <span className="text-sm font-semibold text-white">
            {streak.current === 0 ? "Sin racha" : `Racha de ${streak.current}`}
          </span>
        </div>
        {streakBonusPoints(streak.current) > 0 ? (
          <span className="text-xs font-bold text-orange-400">+{streakBonusPoints(streak.current)} en próximo acierto</span>
        ) : (
          <span className="text-xs text-white/25">3 seguidos = +3 pts</span>
        )}
      </div>

      {/* Lista de partidos */}
      <div className="space-y-3 px-4 py-3 pb-6">
        {matchesToShow.length === 0 ? (
          <div className="py-12 text-center text-white/30">
            <p className="text-4xl mb-2">
              {filterView === "pending" ? "✅" : filterView === "urgent" ? "⏰" : "📅"}
            </p>
            <p>
              {filterView === "pending"
                ? "¡Todo cargado! No te falta ninguna predicción"
                : filterView === "urgent"
                ? "No hay partidos que venzan en las próximas 24hs"
                : "Los partidos de esta fase aún no están definidos"}
            </p>
          </div>
        ) : (
          matchesToShow.map((match) => (
            <MatchPredictionCard
              key={match.id}
              match={match}
              tokens={tokens}
              existing={predictions[match.id]}
              myStreak={streak.current}
              onTokenChange={handleTokenChange}
              onSave={handleSave}
            />
          ))
        )}
      </div>
      </>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
