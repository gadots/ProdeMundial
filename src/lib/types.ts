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

export const PHASE_POINTS: Record<Phase, { exact: number; winner: number; draw: number }> = {
  GROUP:         { exact: 3,  winner: 1,  draw: 2 },
  ROUND_OF_32:   { exact: 6,  winner: 2,  draw: 0 },
  ROUND_OF_16:   { exact: 10, winner: 4,  draw: 0 },
  QUARTER_FINAL: { exact: 18, winner: 6,  draw: 0 },
  SEMI_FINAL:    { exact: 30, winner: 10, draw: 0 },
  FINAL:         { exact: 50, winner: 20, draw: 0 },
};

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  flag: string; // emoji flag
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  phase: Phase;
  group?: string;
  date: string; // ISO string
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  prodeId: string;
  homeGoals: number;
  awayGoals: number;
  jokerUsed: boolean;
  pointsEarned?: number;
}

export interface SpecialPredictions {
  userId: string;
  prodeId: string;
  champion?: string; // team id
  finalist?: string;
  thirdPlace?: string;
  topScorer?: string;
  mostGoalsCountry?: string;
  locked: boolean;
}

export interface Member {
  id: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  pointsPerPhase: Record<Phase, number>;
  rank: number;
  previousRank?: number;
  jokersLeft: Record<Phase, number>;
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

export type NotificationType =
  | "MATCH_STARTING"
  | "RESULT_CONFIRMED"
  | "LEADERBOARD_CHANGE"
  | "PREDICTIONS_CLOSING";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}
