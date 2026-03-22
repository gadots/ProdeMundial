import { Phase, PHASE_POINTS, TokenMultiplier } from "./types";

interface ScoreResult {
  points: number;
  reason: string;
}

/**
 * Calculates points for a prediction.
 * multiplier = 1 (no token), 2, 3 or 5.
 * Also applies streak bonus if applicable.
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  phase: Phase,
  multiplier: TokenMultiplier = 1,
  streakBonus: number = 0
): ScoreResult {
  const phasePoints = PHASE_POINTS[phase];
  let base = 0;
  let reason = "";

  const predictedWinner = Math.sign(predictedHome - predictedAway);
  const actualWinner = Math.sign(actualHome - actualAway);

  if (predictedHome === actualHome && predictedAway === actualAway) {
    base = phasePoints.exact;
    reason = "Resultado exacto";
  } else if (predictedWinner === actualWinner) {
    if (actualWinner === 0) {
      base = phasePoints.draw;
      reason = "Empate correcto";
    } else {
      base = phasePoints.winner;
      reason = "Ganador correcto";
    }
  } else {
    return { points: 0, reason: "Sin puntos" };
  }

  let points = base * multiplier;
  if (multiplier > 1) reason += ` (Potenciador ${multiplier}x)`;

  if (streakBonus > 0 && base > 0) {
    points += streakBonus;
    reason += ` +${streakBonus} bonus racha`;
  }

  return { points, reason };
}

/**
 * Returns max possible points for a match in a given phase with a given token.
 */
export function maxPointsForMatch(phase: Phase, multiplier: TokenMultiplier = 1): number {
  return PHASE_POINTS[phase].exact * multiplier;
}

/**
 * Streak bonus: 3 in a row → +2 on next; 5 in a row → +5 on next.
 */
export function streakBonusPoints(streak: number): number {
  if (streak >= 5) return 5;
  if (streak >= 3) return 2;
  return 0;
}

/**
 * Tokens can be used on any match (no phase restriction).
 * They decay (become 1x) if group stage ends without being used.
 */
export const GROUP_STAGE_END_DATE = new Date("2026-06-26T23:59:00Z");

export function isGroupStageOver(): boolean {
  return new Date() > GROUP_STAGE_END_DATE;
}
