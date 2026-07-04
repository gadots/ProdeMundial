import { Phase, PHASE_POINTS, TokenMultiplier, Match } from "./types";

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
 * Un partido de llaves se definió por penales si tiene marcador de shootout.
 * En ese caso el resultado de tiempo regular/suplementario fue un empate.
 */
export function penaltyWinnerOf(
  m: { penaltyHome?: number; penaltyAway?: number },
): "home" | "away" | undefined {
  if (m.penaltyHome == null || m.penaltyAway == null) return undefined;
  return m.penaltyHome > m.penaltyAway ? "home" : "away";
}

export function isPenaltyShootout(m: { penaltyHome?: number; penaltyAway?: number }): boolean {
  return penaltyWinnerOf(m) !== undefined;
}

/**
 * Resultado de una predicción contra un partido FINALIZADO, para los íconos/labels
 * de la UI (✓ exacto, ganador, o fallo). Contempla penales en llaves: un empate→penales
 * NO es "ganador acertado" para quien puso que ganaba un equipo, y SÍ es acierto para
 * quien puso empate + el ganador de penales correcto.
 */
export function predictionResult(
  match: Match,
  pred: { homeGoals: number; awayGoals: number; penaltyWinner?: "home" | "away" },
): "exact" | "correct" | "wrong" {
  const isKnockout = match.phase !== "GROUP";
  const actualPen = penaltyWinnerOf(match);
  const predDraw = pred.homeGoals === pred.awayGoals;

  // Llaves definidas por penales → el tiempo regular fue empate.
  if (isKnockout && actualPen) {
    const penOk = predDraw && pred.penaltyWinner === actualPen;
    if (!penOk) return "wrong";
    const etKnown = match.homeScore != null && match.awayScore != null;
    if (etKnown && pred.homeGoals === match.homeScore && pred.awayGoals === match.awayScore) return "exact";
    return "correct";
  }

  if (match.homeScore == null || match.awayScore == null) return "wrong";
  const isExact = pred.homeGoals === match.homeScore && pred.awayGoals === match.awayScore;
  if (isExact) return "exact";
  const predWinner = Math.sign(pred.homeGoals - pred.awayGoals);
  const actualWinner = Math.sign(match.homeScore - match.awayScore);
  if (isKnockout && actualWinner === 0) return "wrong"; // no debería pasar (llaves no empatan sin penales)
  return predWinner === actualWinner ? "correct" : "wrong";
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
