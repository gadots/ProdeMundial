import { Phase, PHASE_POINTS, TokenMultiplier } from "./types";

interface ScoreResult {
  points: number;
  reason: string;
}

/**
 * Calculates points for a prediction.
 * multiplier = 1 (no token), 2, 3 or 5.
 * Streak bonus is added to base BEFORE multiplying: (base + streakBonus) * multiplier.
 *
 * For knockout phases (non-GROUP), predictedPenaltyWinner and actualPenaltyWinner are
 * used when a draw occurs in regular time.
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  phase: Phase,
  multiplier: TokenMultiplier = 1,
  streakBonus: number = 0,
  predictedPenaltyWinner?: "home" | "away",
  actualPenaltyWinner?: "home" | "away",
): ScoreResult {
  const pts = PHASE_POINTS[phase];
  const isKnockout = phase !== "GROUP";
  const isExact = predictedHome === actualHome && predictedAway === actualAway;
  const predictedWinner = Math.sign(predictedHome - predictedAway);
  const actualWinner = Math.sign(actualHome - actualAway);
  const actualDraw = actualWinner === 0;
  const predictedDraw = predictedWinner === 0;

  let base = 0;
  let reason = "";

  if (isKnockout) {
    const penaltyCorrect = actualDraw && predictedDraw &&
      predictedPenaltyWinner !== undefined &&
      predictedPenaltyWinner === actualPenaltyWinner;

    if (isExact && !actualDraw) {
      // Exacto en tiempo regular sin empate → puntos completos
      base = pts.exact;
      reason = "Resultado exacto";
    } else if (isExact && actualDraw && penaltyCorrect) {
      // Exacto en tiempo regular + empate + penales correctos
      base = pts.exact;
      reason = "Exacto + penales";
    } else if (!isExact && actualDraw && predictedDraw && penaltyCorrect) {
      // Empate correcto (no exacto) + penales correctos
      base = pts.penales!;
      reason = "Empate + penales correcto";
    } else if (!actualDraw && !predictedDraw && predictedWinner === actualWinner) {
      // Ganador correcto en tiempo regular (sin empate)
      base = pts.winner;
      reason = "Ganador correcto";
    } else {
      return { points: 0, reason: "Sin puntos" };
    }
  } else {
    // GROUP
    if (isExact) {
      base = pts.exact;
      reason = "Resultado exacto";
    } else if (predictedWinner === actualWinner) {
      if (actualWinner === 0) {
        base = pts.draw;
        reason = "Empate correcto";
      } else {
        base = pts.winner;
        reason = "Ganador correcto";
      }
    } else {
      return { points: 0, reason: "Sin puntos" };
    }
  }

  if (base === 0) return { points: 0, reason };

  // Orden: (base + racha) × multiplicador
  const points = (base + streakBonus) * multiplier;
  if (multiplier > 1) reason += ` (Potenciador ${multiplier}x)`;
  if (streakBonus > 0) reason += ` +${streakBonus} racha`;

  return { points, reason };
}

/**
 * Returns max possible points for a match in a given phase with a given token and streak.
 */
export function maxPointsForMatch(
  phase: Phase,
  multiplier: TokenMultiplier = 1,
  streakBonus: number = 0,
): number {
  return (PHASE_POINTS[phase].exact + streakBonus) * multiplier;
}

/**
 * Streak bonus: 3 in a row → +3 on next; 5+ in a row → +8 on next.
 */
export function streakBonusPoints(streak: number): number {
  if (streak >= 5) return 8;
  if (streak >= 3) return 3;
  return 0;
}

/**
 * Potenciadores (tokens) can only be applied to GROUP phase matches.
 * They decay (become 1x) if Octavos de final ends without being used.
 */
export const GROUP_STAGE_END_DATE = new Date("2026-06-26T23:59:00Z");
export const TOKENS_EXPIRY_DATE = new Date("2026-07-05T23:59:00Z");

export function isGroupStageOver(): boolean {
  return new Date() > GROUP_STAGE_END_DATE;
}

export function areTokensExpired(): boolean {
  return new Date() > TOKENS_EXPIRY_DATE;
}
