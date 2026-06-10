"use client";

import { useMemo } from "react";
import { TopBar } from "@/components/nav";
import { Flag } from "@/components/flag";
import { useApp } from "@/components/app-context";
import type { Match, Phase, Prediction } from "@/lib/types";

// ─── Constants ──────────────────────────────────────────────────────

const MAIN_PHASES: Phase[] = ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];

const PHASE_LABELS: Partial<Record<Phase, string>> = {
  ROUND_OF_32: "32avos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semis",
  FINAL: "Final",
};

const PHASE_MATCH_COUNT: Partial<Record<Phase, number>> = {
  ROUND_OF_32: 16,
  ROUND_OF_16: 8,
  QUARTER_FINAL: 4,
  SEMI_FINAL: 2,
  FINAL: 1,
};

// R32 base slot height — doubles each round so all columns share the same total height (640px)
const BASE_SLOT = 40;

function slotHeight(phase: Phase): number {
  const idx = MAIN_PHASES.indexOf(phase);
  return idx === -1 ? BASE_SLOT : BASE_SLOT * Math.pow(2, idx);
}

// ─── Team row (inside a card) ────────────────────────────────────────

function TeamRow({
  tla,
  name,
  score,
  live,
  small = false,
}: {
  tla: string;
  name: string;
  score?: number;
  live?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Flag tla={tla} size={20} className={small ? "w-3.5 h-auto" : ""} />
      <span className={`${small ? "text-[10px]" : "text-[11px]"} text-white/80 truncate flex-1 min-w-0`}>{name}</span>
      {score !== undefined && (
        <span
          className={`${small ? "text-[10px]" : "text-[12px]"} font-bold tabular-nums shrink-0 ${
            live ? "text-amber-400" : "text-white"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

// ─── Bracket match card ──────────────────────────────────────────────

function BracketCard({
  match,
  prediction,
  isFinal = false,
  isSmall = false,
}: {
  match: Match | null;
  prediction?: Prediction;
  isFinal?: boolean;
  isSmall?: boolean;
}) {
  const cardW = isFinal ? "w-[144px]" : isSmall ? "w-[112px]" : "w-[132px]";
  const px = isSmall ? "px-2 py-1" : "px-2.5 py-2";

  if (!match) {
    return (
      <div
        className={`${cardW} shrink-0 rounded-xl border border-white/8 bg-white/3 ${px}`}
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-1 ${i > 0 ? (isSmall ? "mt-1" : "mt-1.5") : ""}`}
          >
            <div className={`${isSmall ? "h-2.5 w-3.5" : "h-3 w-4"} rounded-sm bg-white/10 shrink-0`} />
            <span className={`${isSmall ? "text-[10px]" : "text-[11px]"} text-white/20`}>TBD</span>
          </div>
        ))}
      </div>
    );
  }

  const live = match.status === "LIVE";
  const fin = match.status === "FINISHED";
  const showScore = live || fin;
  const homeScore = showScore ? (match.homeScore ?? 0) : undefined;
  const awayScore = showScore ? (match.awayScore ?? 0) : undefined;

  const multEmoji =
    prediction?.multiplier === 2
      ? "⚡"
      : prediction?.multiplier === 3
      ? "🔥"
      : prediction?.multiplier === 5
      ? "💥"
      : null;

  return (
    <div
      className={`${cardW} shrink-0 rounded-xl border ${px} ${
        live
          ? "border-amber-500/50 bg-amber-500/8 shadow-[0_0_8px_rgba(251,191,36,0.12)]"
          : isFinal
          ? "border-amber-400/30 bg-gradient-to-b from-amber-500/8 to-transparent"
          : fin
          ? "border-white/15 bg-white/5"
          : "border-white/8 bg-white/3"
      }`}
    >
      <TeamRow
        tla={match.homeTeam.flag}
        name={match.homeTeam.shortName}
        score={homeScore}
        live={live}
        small={isSmall}
      />
      {!isSmall && <div className="my-0.5 h-px bg-white/8" />}
      {isSmall && <div className="my-0.5" />}
      <TeamRow
        tla={match.awayTeam.flag}
        name={match.awayTeam.shortName}
        score={awayScore}
        live={live}
        small={isSmall}
      />

      {!isSmall && !showScore && (
        <p className="mt-0.5 text-[9px] text-white/25 text-center">
          {new Date(match.date).toLocaleDateString("es", {
            day: "2-digit",
            month: "2-digit",
          })}
        </p>
      )}

      {!isSmall && prediction && (
        <div className="mt-1 flex items-center gap-0.5 rounded-md bg-white/5 px-1.5 py-0.5">
          {multEmoji && <span className="text-[9px]">{multEmoji}</span>}
          <span className="text-[9px] text-white/40 truncate">
            {prediction.homeGoals}–{prediction.awayGoals}
          </span>
          {prediction.pointsEarned !== undefined && prediction.pointsEarned > 0 && (
            <span className="text-[9px] font-bold text-amber-400 ml-auto shrink-0">
              {prediction.pointsEarned}pt
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CSS connector between two child slots → one parent slot ─────────

function Connector({ pairHeight }: { pairHeight: number }) {
  return (
    <div className="relative shrink-0" style={{ width: 16, height: pairHeight }}>
      <div
        className="absolute left-0 right-0 border-t border-white/15"
        style={{ top: "25%" }}
      />
      <div
        className="absolute left-0 right-0 border-t border-white/15"
        style={{ top: "50%" }}
      />
      <div
        className="absolute left-0 right-0 border-t border-white/15"
        style={{ top: "75%" }}
      />
      <div
        className="absolute right-0 border-r border-white/15"
        style={{ top: "25%", bottom: "25%" }}
      />
    </div>
  );
}

// ─── One bracket column (cards + optional right connector) ───────────

function BracketColumn({
  phase,
  slots,
  showConnector,
  predictions,
}: {
  phase: Phase;
  slots: (Match | null)[];
  showConnector: boolean;
  predictions: Record<string, Prediction>;
}) {
  const h = slotHeight(phase);
  const isFinal = phase === "FINAL";
  const isSmall = phase === "ROUND_OF_32";
  const pairCount = Math.floor(slots.length / 2);

  return (
    <div className="flex shrink-0">
      {/* Cards */}
      <div className="flex flex-col">
        {slots.map((match, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ height: h }}
          >
            <BracketCard
              match={match}
              prediction={match ? predictions[match.id] : undefined}
              isFinal={isFinal}
              isSmall={isSmall}
            />
          </div>
        ))}
      </div>

      {/* Right connector */}
      {showConnector && pairCount > 0 && (
        <div className="flex flex-col">
          {Array.from({ length: pairCount }, (_, i) => (
            <Connector key={i} pairHeight={h * 2} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function LlavesPage() {
  const { matches, predictions } = useApp();

  const phaseSlots = useMemo(() => {
    const all: Phase[] = [...MAIN_PHASES, "THIRD_PLACE"];
    const result: Partial<Record<Phase, (Match | null)[]>> = {};

    for (const phase of all) {
      const sorted = matches
        .filter((m) => m.phase === phase)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      const count = phase === "THIRD_PLACE" ? 1 : (PHASE_MATCH_COUNT[phase] ?? 1);
      result[phase] = Array.from(
        { length: count },
        (_, i) => sorted[i] ?? null
      );
    }

    return result;
  }, [matches]);

  const thirdPlaceMatch = phaseSlots["THIRD_PLACE"]?.[0] ?? null;
  const hasSFMatches = (phaseSlots["SEMI_FINAL"] ?? []).some((m) => m !== null);
  const hasMainMatches = MAIN_PHASES.some((p) =>
    (phaseSlots[p] ?? []).some((m) => m !== null)
  );

  return (
    <div className="pb-24">
      <TopBar title="Llaves" showNotification showProfile />

      <div className="pt-4 space-y-5">

        {/* ── Nota cuando aún no hay partidos de eliminatoria ── */}
        {!hasMainMatches && (
          <div className="mx-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-2.5">
            <span className="text-base">🏆</span>
            <p className="text-xs text-white/40">
              Las llaves se completan a medida que avanza el torneo
            </p>
          </div>
        )}

        {/* ── Bracket completo (R32 → Final) ── */}
        <div className="overflow-x-auto pb-4">
          <div className="px-4 min-w-max">
            {/* Column headers */}
            <div className="flex items-center gap-0 mb-2">
              {MAIN_PHASES.map((phase, i) => {
                const isLast = i === MAIN_PHASES.length - 1;
                const cardW = phase === "FINAL" ? 144 : phase === "ROUND_OF_32" ? 112 : 132;
                const connW = isLast ? 0 : 16;
                return (
                  <div
                    key={phase}
                    style={{ width: cardW + connW }}
                    className="shrink-0 text-center text-[10px] font-semibold text-white/35 uppercase tracking-wider"
                  >
                    {PHASE_LABELS[phase]}
                  </div>
                );
              })}
            </div>

            {/* Bracket columns */}
            <div className="flex items-start">
              {MAIN_PHASES.map((phase, i) => {
                const isLast = i === MAIN_PHASES.length - 1;
                return (
                  <BracketColumn
                    key={phase}
                    phase={phase}
                    slots={phaseSlots[phase] ?? []}
                    showConnector={!isLast}
                    predictions={predictions}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Tercer puesto ── */}
        {(thirdPlaceMatch !== null || hasSFMatches) && (
          <div className="px-4">
            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-2">
              Tercer puesto
            </p>
            <BracketCard
              match={thirdPlaceMatch}
              prediction={
                thirdPlaceMatch ? predictions[thirdPlaceMatch.id] : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
