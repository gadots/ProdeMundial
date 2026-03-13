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

const PHASE_SHORT: Record<Phase, string> = {
  GROUP: "Grupos", ROUND_OF_32: "Ronda 32", ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos", SEMI_FINAL: "Semis", FINAL: "Final",
};

const MY_STREAK = 4;
const STREAK_BONUS = streakBonusPoints(MY_STREAK);

type FilterView = "all" | "pending" | "urgent";

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
  tokens, activeMultiplier, onSelect, disabled,
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
  match, tokens, onTokenChange,
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

  const potential = maxPointsForMatch(match.phase, multiplier) + (MY_STREAK >= 3 && !locked ? STREAK_BONUS : 0);

  return (
    <Card className={`overflow-hidden transition-all ${locked ? "opacity-70" : "hover:border-green-500/20"}`}>
      <CardContent className="p-4">
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
            <TokenPicker tokens={localTokens} activeMultiplier={multiplier} onSelect={handleTokenSelect} disabled={locked} />
            {MY_STREAK >= 3 && (
              <span className="flex items-center gap-1 text-[10px] text-orange-400">
                <Flame className="h-3 w-3" />+{STREAK_BONUS} racha
              </span>
            )}
            <Button
              onClick={() => { if (canSave) setSaved(true); }}
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

function RulesModal({ onClose }: { onClose: () => void }) {
  const phases = PHASE_ORDER.filter((p) => MOCK_MATCHES.some((m) => m.phase === p));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#0d1f3c] border border-white/15 shadow-2xl overflow-y-auto max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0d1f3c]/95 backdrop-blur-sm">
          <p className="text-sm font-bold text-white">Reglas de puntuación</p>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tabla por fase */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Puntos por fase</p>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-white/5 text-white/40">
                    <th className="text-left px-3 py-2 font-semibold">Fase</th>
                    <th className="text-center px-3 py-2 font-semibold">Exacto</th>
                    <th className="text-center px-3 py-2 font-semibold">Ganador</th>
                    <th className="text-center px-3 py-2 font-semibold">Empate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {phases.map((phase) => {
                    const pts = PHASE_POINTS[phase];
                    return (
                      <tr key={phase} className="text-white/80">
                        <td className="px-3 py-2 font-medium">{PHASE_SHORT[phase]}</td>
                        <td className="px-3 py-2 text-center font-black text-green-400">{pts.exact}</td>
                        <td className="px-3 py-2 text-center font-bold">{pts.winner}</td>
                        <td className="px-3 py-2 text-center">{pts.draw > 0 ? pts.draw : <span className="text-white/20">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tokens */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Tokens multiplicadores</p>
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
              <p className="text-[10px] text-white/30 px-1">Cada token se usa una sola vez. Los no usados caducan al final de la fase de grupos.</p>
            </div>
          </div>

          {/* Racha */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Bonus de racha</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 rounded-xl bg-orange-500/10 border border-orange-500/15 px-3 py-2">
                <span className="text-sm">🔥🔥🔥</span>
                <p className="text-xs text-orange-300">3 aciertos seguidos → <strong>+2 pts</strong> en el próximo</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-orange-500/15 border border-orange-500/20 px-3 py-2">
                <span className="text-sm">🔥🔥🔥🔥🔥</span>
                <p className="text-xs text-orange-300">5 aciertos seguidos → <strong>+5 pts</strong> en el próximo</p>
              </div>
              <p className="text-[10px] text-white/30 px-1">La racha se corta con cualquier predicción incorrecta.</p>
            </div>
          </div>

          {/* Predicciones especiales */}
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
                  <span className="text-xs font-bold text-green-400">{s.pts} pts</span>
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
  const [activePhase, setActivePhase] = useState<Phase>("GROUP");
  const [filterView, setFilterView] = useState<FilterView>("all");
  const [showRules, setShowRules] = useState(false);
  const [tokens, setTokens] = useState<MultiplierToken[]>(MOCK_MY_TOKENS);

  const handleTokenChange = useCallback((matchId: string, prev: TokenMultiplier, next: TokenMultiplier) => {
    setTokens((current) =>
      current.map((t) => {
        if (t.multiplier === prev && t.usedOnMatchId === matchId) return { ...t, usedOnMatchId: undefined };
        if (t.multiplier === next && next !== 1) return { ...t, usedOnMatchId: matchId };
        return t;
      })
    );
  }, []);

  const availablePhases = PHASE_ORDER.filter((p) => MOCK_MATCHES.some((m) => m.phase === p));

  // Pendientes: SCHEDULED sin predicción
  const allPending = MOCK_MATCHES.filter((m) => m.status === "SCHEDULED" && !MOCK_MY_PREDICTIONS[m.id]);
  // Urgentes: pendientes que vencen en < 24h
  const allUrgent = allPending.filter((m) => {
    const diff = new Date(m.date).getTime() - Date.now();
    return diff > 0 && diff < 86400000;
  });

  // Partidos a mostrar según el filtro activo
  const matchesToShow =
    filterView === "pending" ? allPending :
    filterView === "urgent"  ? allUrgent :
    MOCK_MATCHES.filter((m) => m.phase === activePhase);

  const tokensLeft = tokens.filter((t) => !t.usedOnMatchId && !t.decayed);

  return (
    <div>
      <TopBar
        title="Predicciones"
        subtitle={allPending.length > 0 ? `${allPending.length} sin predecir` : "Todo cargado ✓"}
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
        </div>

        {/* Fila 2: tabs de fase (solo en vista "todas") */}
        {filterView === "all" && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1 overflow-x-auto flex-1 min-w-0">
              {availablePhases.map((phase) => {
                const isActive = activePhase === phase;
                const matchCount = MOCK_MATCHES.filter((m) => m.phase === phase).length;
                const pendingCount = MOCK_MATCHES.filter((m) => m.phase === phase && m.status === "SCHEDULED" && !MOCK_MY_PREDICTIONS[m.id]).length;
                return (
                  <button
                    key={phase}
                    onClick={() => setActivePhase(phase)}
                    className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs transition-all whitespace-nowrap shrink-0 ${
                      isActive ? "bg-green-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
                    }`}
                  >
                    <span className="font-semibold text-[11px]">{PHASE_SHORT[phase]}</span>
                    <span className={`text-[10px] ${isActive ? "text-green-200" : "text-white/30"}`}>
                      {matchCount}P · {PHASE_POINTS[phase].exact}pts
                    </span>
                    {pendingCount > 0 && (
                      <span className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full text-[8px] font-bold flex items-center justify-center ${
                        isActive ? "bg-white text-green-700" : "bg-orange-500 text-white"
                      }`}>{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
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

      {/* Token status — compact */}
      <div className="px-4 pt-3">
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
              onTokenChange={handleTokenChange}
            />
          ))
        )}
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
