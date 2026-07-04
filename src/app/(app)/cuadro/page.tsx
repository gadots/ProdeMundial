"use client";

import { useMemo, useState, Suspense } from "react";
import { TopBar } from "@/components/nav";
import { Flag } from "@/components/flag";
import { useApp } from "@/components/app-context";
import { GruposContent } from "@/components/grupos-content";
import { cn } from "@/lib/utils";
import type { Match, Phase, Prediction } from "@/lib/types";

// ─── Bracket constants ───────────────────────────────────────────────

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

// R32=80 · R16=160 · QF=320 · SF=640 · Final=1280 (total 1280px per column)
const BASE_SLOT = 80;

function slotHeight(phase: Phase): number {
  const idx = MAIN_PHASES.indexOf(phase);
  return idx === -1 ? BASE_SLOT : BASE_SLOT * Math.pow(2, idx);
}

const R32_BRACKET: { home: string; away: string }[] = [
  { home: "2° Grupo A", away: "2° Grupo B" },  // Jun 28
  { home: "1° Grupo E", away: "Mejor 3°"    },  // Jun 28
  { home: "1° Grupo F", away: "2° Grupo C"  },  // Jun 29
  { home: "1° Grupo C", away: "2° Grupo F"  },  // Jun 29
  { home: "2° Grupo E", away: "2° Grupo I"  },  // Jun 30
  { home: "1° Grupo I", away: "Mejor 3°"    },  // Jun 30
  { home: "1° Grupo A", away: "Mejor 3°"    },  // Jun 30
  { home: "1° Grupo L", away: "Mejor 3°"    },  // Jul 1
  { home: "1° Grupo G", away: "Mejor 3°"    },  // Jul 1
  { home: "1° Grupo D", away: "Mejor 3°"    },  // Jul 1
  { home: "1° Grupo H", away: "2° Grupo J"  },  // Jul 2
  { home: "2° Grupo K", away: "2° Grupo L"  },  // Jul 2
  { home: "1° Grupo B", away: "Mejor 3°"    },  // Jul 2
  { home: "2° Grupo D", away: "2° Grupo G"  },  // Jul 3
  { home: "1° Grupo J", away: "2° Grupo H"  },  // Jul 3
  { home: "1° Grupo K", away: "Mejor 3°"    },  // Jul 3
];

// ─── Team row ────────────────────────────────────────────────────────

function TeamRow({ tla, name, score, live }: {
  tla: string; name: string; score?: number; live?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Flag tla={tla} size={20} />
      <span className="text-[11px] text-white/80 truncate flex-1 min-w-0">{name}</span>
      {score !== undefined && (
        <span className={`text-[12px] font-bold tabular-nums shrink-0 ${live ? "text-amber-400" : "text-white"}`}>
          {score}
        </span>
      )}
    </div>
  );
}

// ─── Bracket match card ──────────────────────────────────────────────

function BracketCard({
  match, prediction, isFinal = false, slotLabel,
}: {
  match: Match | null;
  prediction?: Prediction;
  isFinal?: boolean;
  slotLabel?: { home: string; away: string };
}) {
  const cardW = isFinal ? "w-[144px]" : "w-[132px]";

  if (!match) {
    return (
      <div className={`${cardW} shrink-0 rounded-xl border border-white/8 bg-white/3 px-2.5 py-2`}>
        {[slotLabel?.home, slotLabel?.away].map((label, i) => (
          <div key={i} className={`flex items-center gap-1.5 ${i > 0 ? "mt-1.5" : ""}`}>
            <div className="h-3 w-4 rounded-sm bg-white/10 shrink-0" />
            <span className="text-[10px] text-white/30 truncate">{label ?? "TBD"}</span>
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
    prediction?.multiplier === 2 ? "⚡" :
    prediction?.multiplier === 3 ? "🔥" :
    prediction?.multiplier === 5 ? "💥" : null;

  return (
    <div className={`${cardW} shrink-0 rounded-xl border px-2.5 py-2 ${
      live ? "border-amber-500/50 bg-amber-500/8 shadow-[0_0_8px_rgba(251,191,36,0.12)]"
      : isFinal ? "border-amber-400/30 bg-gradient-to-b from-amber-500/8 to-transparent"
      : fin ? "border-white/15 bg-white/5"
      : "border-white/8 bg-white/3"
    }`}>
      <TeamRow tla={match.homeTeam.flag} name={match.homeTeam.shortName} score={homeScore} live={live} />
      <div className="my-0.5 h-px bg-white/8" />
      <TeamRow tla={match.awayTeam.flag} name={match.awayTeam.shortName} score={awayScore} live={live} />

      {match.penaltyHome != null && match.penaltyAway != null && (
        <p className="mt-0.5 text-[9px] text-amber-400/90 text-center">
          pen {Math.max(match.penaltyHome, match.penaltyAway)}-{Math.min(match.penaltyHome, match.penaltyAway)} {" "}
          {match.penaltyHome > match.penaltyAway ? match.homeTeam.shortName : match.awayTeam.shortName}
        </p>
      )}

      {!showScore && (
        <p className="mt-0.5 text-[9px] text-white/25 text-center">
          {new Date(match.date).toLocaleDateString("es", { day: "2-digit", month: "2-digit" })}
        </p>
      )}

      {prediction && (
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

// ─── CSS connector ───────────────────────────────────────────────────

function Connector({ pairHeight }: { pairHeight: number }) {
  return (
    <div className="relative shrink-0" style={{ width: 16, height: pairHeight }}>
      <div className="absolute left-0 right-0 border-t border-white/15" style={{ top: "25%" }} />
      <div className="absolute left-0 right-0 border-t border-white/15" style={{ top: "50%" }} />
      <div className="absolute left-0 right-0 border-t border-white/15" style={{ top: "75%" }} />
      <div className="absolute right-0 border-r border-white/15" style={{ top: "25%", bottom: "25%" }} />
    </div>
  );
}

// ─── Bracket column ──────────────────────────────────────────────────

function BracketColumn({
  phase, slots, showConnector, predictions,
}: {
  phase: Phase;
  slots: (Match | null)[];
  showConnector: boolean;
  predictions: Record<string, Prediction>;
}) {
  const h = slotHeight(phase);
  const isFinal = phase === "FINAL";
  const pairCount = Math.floor(slots.length / 2);

  return (
    <div className="flex shrink-0">
      <div className="flex flex-col">
        {slots.map((match, i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: h }}>
            <BracketCard
              match={match}
              prediction={match ? predictions[match.id] : undefined}
              isFinal={isFinal}
              slotLabel={!match && phase === "ROUND_OF_32" ? R32_BRACKET[i] : undefined}
            />
          </div>
        ))}
      </div>

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

// ─── Llaves tab content ──────────────────────────────────────────────

function LlavesContent() {
  const { matches, predictions } = useApp();

  const phaseSlots = useMemo(() => {
    const all: Phase[] = [...MAIN_PHASES, "THIRD_PLACE"];
    const result: Partial<Record<Phase, (Match | null)[]>> = {};

    for (const phase of all) {
      const sorted = matches
        .filter((m) => m.phase === phase)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const count = phase === "THIRD_PLACE" ? 1 : (PHASE_MATCH_COUNT[phase] ?? 1);
      result[phase] = Array.from({ length: count }, (_, i) => sorted[i] ?? null);
    }

    return result;
  }, [matches]);

  const thirdPlaceMatch = phaseSlots["THIRD_PLACE"]?.[0] ?? null;
  const hasMainMatches = MAIN_PHASES.some((p) => (phaseSlots[p] ?? []).some((m) => m !== null));

  return (
    <div className="pt-4 space-y-5">
      {!hasMainMatches && (
        <div className="mx-4 flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-2.5">
          <span className="text-base">🏆</span>
          <p className="text-xs text-white/40">
            Las llaves se completan a medida que avanza el torneo
          </p>
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="px-4 min-w-max">
          {/* Column headers */}
          <div className="flex items-center gap-0 mb-2">
            {MAIN_PHASES.map((phase, i) => {
              const isLast = i === MAIN_PHASES.length - 1;
              const cardW = phase === "FINAL" ? 144 : 132;
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
            {MAIN_PHASES.map((phase, i) => (
              <BracketColumn
                key={phase}
                phase={phase}
                slots={phaseSlots[phase] ?? []}
                showConnector={i < MAIN_PHASES.length - 1}
                predictions={predictions}
              />
            ))}
          </div>

          {/* Tercer puesto — alineado bajo Final */}
          <div className="flex mt-8">
            {MAIN_PHASES.slice(0, -1).map((phase) => (
              <div key={phase} style={{ width: 132 + 16 }} className="shrink-0" />
            ))}
            <div>
              <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-2">
                Tercer puesto
              </p>
              <BracketCard
                match={thirdPlaceMatch}
                prediction={thirdPlaceMatch ? predictions[thirdPlaceMatch.id] : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

type Tab = "grupos" | "llaves";

export default function CuadroPage() {
  const { matches } = useApp();
  const hasKnockoutMatches = matches.some((m) => m.phase !== "GROUP");
  const [tab, setTab] = useState<Tab>(hasKnockoutMatches ? "llaves" : "grupos");

  return (
    <div className="pb-24">
      <TopBar title="Cuadro" showNotification showProfile />

      {/* Tab switcher */}
      <div className="sticky top-[40px] z-30 flex px-4 pt-3 pb-2 gap-2 bg-[#0a1628]/95 backdrop-blur-sm border-b border-white/10">
        {(["grupos", "llaves"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
              tab === t
                ? "bg-amber-500/20 text-amber-400"
                : "text-white/40 hover:text-white/70"
            )}
          >
            {t === "grupos" ? "Grupos" : "Llaves"}
          </button>
        ))}
      </div>

      {tab === "grupos" ? (
        <Suspense fallback={<div className="p-8 text-white/30 text-sm text-center">Cargando grupos…</div>}>
          <GruposContent />
        </Suspense>
      ) : (
        <LlavesContent />
      )}
    </div>
  );
}
