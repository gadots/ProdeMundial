export type Phase =
  | "GROUP"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "FINAL";

export const PHASE_LABELS: Record<Phase, string> = {
  GROUP: "Fase de Grupos",
  ROUND_OF_32: "Ronda de 32",
  ROUND_OF_16: "Octavos de Final",
  QUARTER_FINAL: "Cuartos de Final",
  SEMI_FINAL: "Semifinal",
  FINAL: "Final",
};

export const PHASE_POINTS: Record<Phase, { exact: number; winner: number; draw: number; penales?: number }> = {
  GROUP:         { exact: 3,  winner: 1,  draw: 1 },
  ROUND_OF_32:   { exact: 5,  winner: 2,  draw: 0, penales: 3 },
  ROUND_OF_16:   { exact: 12, winner: 5,  draw: 0, penales: 7 },
  QUARTER_FINAL: { exact: 20, winner: 8,  draw: 0, penales: 12 },
  SEMI_FINAL:    { exact: 35, winner: 12, draw: 0, penales: 18 },
  FINAL:         { exact: 60, winner: 25, draw: 0, penales: 35 },
};

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  flag: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  phase: Phase;
  group?: string;
  date: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
}

// -------------------------------------------------------
// MULTIPLIER TOKENS  (2x / 3x / 5x)
// -------------------------------------------------------
export type TokenMultiplier = 1 | 2 | 3 | 5;

export interface MultiplierToken {
  multiplier: TokenMultiplier;
  label: string;
  emoji: string;
  color: string;
  usedOnMatchId?: string;
  decayed: boolean;
}

export const INITIAL_TOKENS: Omit<MultiplierToken, "usedOnMatchId" | "decayed">[] = [
  { multiplier: 2, label: "2x", emoji: "⚡", color: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
  { multiplier: 3, label: "3x", emoji: "🔥", color: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  { multiplier: 5, label: "5x", emoji: "💥", color: "text-purple-400 border-purple-500/40 bg-purple-500/10" },
];

// -------------------------------------------------------
// PREDICTIONS
// -------------------------------------------------------
export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  prodeId: string;
  homeGoals: number;
  awayGoals: number;
  multiplier: TokenMultiplier;
  penaltyWinner?: "home" | "away";  // solo para fases eliminatorias cuando predice empate
  pointsEarned?: number;
}

// -------------------------------------------------------
// WILDCARD CHALLENGES
// -------------------------------------------------------
export type WildcardType = "PICK_TEAM" | "NUMERIC" | "YES_NO";

export interface WildcardChallenge {
  id: string;
  title: string;
  description: string;
  type: WildcardType;
  phase: Phase | "ALL";
  points: number;
  deadline: string;
  correctAnswer?: string;
  status: "OPEN" | "CLOSED" | "GRADED";
  weekLabel: string;
}

export interface WildcardAnswer {
  challengeId: string;
  userId: string;
  answer: string;
  submittedAt: string;
  pointsEarned?: number;
}

// -------------------------------------------------------
// HOT STREAK
// -------------------------------------------------------
export interface StreakInfo {
  current: number;
  best: number;
  bonusNext: number;
}

// -------------------------------------------------------
// MEMBER / PRODE
// -------------------------------------------------------
export interface Member {
  id: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  pointsPerPhase: Record<Phase, number>;
  rank: number;
  previousRank?: number;
  tokens: MultiplierToken[];
  streak: StreakInfo;
}

export interface Prode {
  id: string;
  name: string;
  adminId: string;
  prizeDescription?: string;
  inviteCode: string;
  members: Member[];
  createdAt: string;
}

export interface SpecialPredictions {
  userId: string;
  prodeId: string;
  champion?: string;
  finalist?: string;
  thirdPlace?: string;
  topScorer?: string;
  mostGoalsCountry?: string;
  locked: boolean;
}

export type NotificationType =
  | "MATCH_STARTING"
  | "RESULT_CONFIRMED"
  | "LEADERBOARD_CHANGE"
  | "PREDICTIONS_CLOSING"
  | "WILDCARD_AVAILABLE"
  | "STREAK_BONUS"
  | "TOKEN_EXPIRING";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}
