import { Phase, PHASE_POINTS } from "./types";

interface ScoreResult {
  points: number;
  reason: string;
}

/**
 * Calculates points for a prediction given the actual result.
 * Applies joker multiplier (x2) if used.
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  phase: Phase,
  jokerUsed: boolean
): ScoreResult {
  const phasePoints = PHASE_POINTS[phase];
  let points = 0;
  let reason = "";

  const predictedWinner = Math.sign(predictedHome - predictedAway);
  const actualWinner = Math.sign(actualHome - actualAway);

  if (predictedHome === actualHome && predictedAway === actualAway) {
    points = phasePoints.exact;
    reason = "Resultado exacto";
  } else if (predictedWinner === actualWinner) {
    if (actualWinner === 0) {
      points = phasePoints.draw;
      reason = "Empate correcto";
    } else {
      points = phasePoints.winner;
      reason = "Ganador correcto";
    }
  } else {
    return { points: 0, reason: "Sin puntos" };
  }

  if (jokerUsed) {
    points *= 2;
    reason += " (Comodín x2)";
  }

  return { points, reason };
}

/**
 * Returns the maximum possible points for a match in a given phase.
 */
export function maxPointsForMatch(phase: Phase, jokerUsed: boolean): number {
  const base = PHASE_POINTS[phase].exact;
  return jokerUsed ? base * 2 : base;
}

/**
 * Phases where joker can be used (only knockout rounds).
 */
export const JOKER_PHASES: Phase[] = [
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
];

export function canUseJoker(phase: Phase): boolean {
  return JOKER_PHASES.includes(phase);
}
