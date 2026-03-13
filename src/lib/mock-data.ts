import { Match, Member, Prode, Prediction, Phase } from "./types";

export const MOCK_TEAMS = {
  ARG: { id: "ARG", name: "Argentina", shortName: "ARG", flag: "🇦🇷" },
  BRA: { id: "BRA", name: "Brasil", shortName: "BRA", flag: "🇧🇷" },
  FRA: { id: "FRA", name: "Francia", shortName: "FRA", flag: "🇫🇷" },
  ENG: { id: "ENG", name: "Inglaterra", shortName: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  ESP: { id: "ESP", name: "España", shortName: "ESP", flag: "🇪🇸" },
  GER: { id: "GER", name: "Alemania", shortName: "GER", flag: "🇩🇪" },
  POR: { id: "POR", name: "Portugal", shortName: "POR", flag: "🇵🇹" },
  URU: { id: "URU", name: "Uruguay", shortName: "URU", flag: "🇺🇾" },
  MEX: { id: "MEX", name: "México", shortName: "MEX", flag: "🇲🇽" },
  USA: { id: "USA", name: "EE.UU.", shortName: "USA", flag: "🇺🇸" },
  MAR: { id: "MAR", name: "Marruecos", shortName: "MAR", flag: "🇲🇦" },
  NED: { id: "NED", name: "Países Bajos", shortName: "NED", flag: "🇳🇱" },
};

// Helper to get a date offset from tournament start (June 11, 2026)
function matchDate(daysFromStart: number, hour = 18): string {
  const start = new Date("2026-06-11T00:00:00Z");
  start.setDate(start.getDate() + daysFromStart);
  start.setUTCHours(hour);
  return start.toISOString();
}

export const MOCK_MATCHES: Match[] = [
  // ---- GROUP STAGE ----
  {
    id: "m1",
    homeTeam: MOCK_TEAMS.MEX,
    awayTeam: MOCK_TEAMS.USA,
    phase: "GROUP",
    group: "A",
    date: matchDate(0),
    status: "FINISHED",
    homeScore: 1,
    awayScore: 2,
    venue: "MetLife Stadium",
  },
  {
    id: "m2",
    homeTeam: MOCK_TEAMS.ARG,
    awayTeam: MOCK_TEAMS.URU,
    phase: "GROUP",
    group: "B",
    date: matchDate(1),
    status: "FINISHED",
    homeScore: 3,
    awayScore: 1,
    venue: "Rose Bowl",
  },
  {
    id: "m3",
    homeTeam: MOCK_TEAMS.BRA,
    awayTeam: MOCK_TEAMS.GER,
    phase: "GROUP",
    group: "C",
    date: matchDate(2),
    status: "FINISHED",
    homeScore: 2,
    awayScore: 2,
    venue: "Estadio Azteca",
  },
  {
    id: "m4",
    homeTeam: MOCK_TEAMS.FRA,
    awayTeam: MOCK_TEAMS.MAR,
    phase: "GROUP",
    group: "D",
    date: matchDate(3),
    status: "FINISHED",
    homeScore: 2,
    awayScore: 0,
    venue: "SoFi Stadium",
  },
  {
    id: "m5",
    homeTeam: MOCK_TEAMS.ESP,
    awayTeam: MOCK_TEAMS.NED,
    phase: "GROUP",
    group: "E",
    date: matchDate(4),
    status: "FINISHED",
    homeScore: 1,
    awayScore: 1,
    venue: "AT&T Stadium",
  },
  {
    id: "m6",
    homeTeam: MOCK_TEAMS.POR,
    awayTeam: MOCK_TEAMS.ENG,
    phase: "GROUP",
    group: "F",
    date: matchDate(5),
    status: "LIVE",
    homeScore: 1,
    awayScore: 0,
    venue: "Gillette Stadium",
  },
  // Upcoming group matches
  {
    id: "m7",
    homeTeam: MOCK_TEAMS.ARG,
    awayTeam: MOCK_TEAMS.BRA,
    phase: "GROUP",
    group: "B",
    date: matchDate(6, 21),
    status: "SCHEDULED",
    venue: "Hard Rock Stadium",
  },
  {
    id: "m8",
    homeTeam: MOCK_TEAMS.ENG,
    awayTeam: MOCK_TEAMS.FRA,
    phase: "GROUP",
    group: "G",
    date: matchDate(7, 18),
    status: "SCHEDULED",
    venue: "Arrowhead Stadium",
  },
  {
    id: "m9",
    homeTeam: MOCK_TEAMS.ESP,
    awayTeam: MOCK_TEAMS.GER,
    phase: "GROUP",
    group: "H",
    date: matchDate(8, 15),
    status: "SCHEDULED",
    venue: "Lincoln Financial Field",
  },
  // ---- ROUND OF 16 ----
  {
    id: "m16-1",
    homeTeam: MOCK_TEAMS.ARG,
    awayTeam: MOCK_TEAMS.NED,
    phase: "ROUND_OF_16",
    date: matchDate(20, 20),
    status: "SCHEDULED",
    venue: "MetLife Stadium",
  },
  {
    id: "m16-2",
    homeTeam: MOCK_TEAMS.FRA,
    awayTeam: MOCK_TEAMS.POR,
    phase: "ROUND_OF_16",
    date: matchDate(21, 20),
    status: "SCHEDULED",
    venue: "Rose Bowl",
  },
  // ---- QUARTER FINALS ----
  {
    id: "mqf-1",
    homeTeam: MOCK_TEAMS.ARG,
    awayTeam: MOCK_TEAMS.FRA,
    phase: "QUARTER_FINAL",
    date: matchDate(32, 20),
    status: "SCHEDULED",
    venue: "MetLife Stadium",
  },
  // ---- SEMI FINALS ----
  {
    id: "msf-1",
    homeTeam: MOCK_TEAMS.ARG,
    awayTeam: MOCK_TEAMS.BRA,
    phase: "SEMI_FINAL",
    date: matchDate(38, 20),
    status: "SCHEDULED",
    venue: "MetLife Stadium",
  },
  // ---- FINAL ----
  {
    id: "mfinal",
    homeTeam: MOCK_TEAMS.ARG,
    awayTeam: MOCK_TEAMS.FRA,
    phase: "FINAL",
    date: matchDate(38, 20),
    status: "SCHEDULED",
    venue: "MetLife Stadium",
  },
];

export const MOCK_MEMBERS: Member[] = [
  {
    id: "u1",
    displayName: "Guido G.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guido",
    totalPoints: 94,
    pointsPerPhase: { GROUP: 76, ROUND_OF_32: 0, ROUND_OF_16: 18, QUARTER_FINAL: 0, SEMI_FINAL: 0, FINAL: 0 },
    rank: 1,
    previousRank: 2,
    jokersLeft: { GROUP: 0, ROUND_OF_32: 1, ROUND_OF_16: 0, QUARTER_FINAL: 1, SEMI_FINAL: 1, FINAL: 1 },
  },
  {
    id: "u2",
    displayName: "Sofía R.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia",
    totalPoints: 88,
    pointsPerPhase: { GROUP: 70, ROUND_OF_32: 0, ROUND_OF_16: 18, QUARTER_FINAL: 0, SEMI_FINAL: 0, FINAL: 0 },
    rank: 2,
    previousRank: 1,
    jokersLeft: { GROUP: 0, ROUND_OF_32: 1, ROUND_OF_16: 0, QUARTER_FINAL: 1, SEMI_FINAL: 1, FINAL: 1 },
  },
  {
    id: "u3",
    displayName: "Martín L.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Martin",
    totalPoints: 72,
    pointsPerPhase: { GROUP: 60, ROUND_OF_32: 0, ROUND_OF_16: 12, QUARTER_FINAL: 0, SEMI_FINAL: 0, FINAL: 0 },
    rank: 3,
    previousRank: 3,
    jokersLeft: { GROUP: 0, ROUND_OF_32: 1, ROUND_OF_16: 1, QUARTER_FINAL: 1, SEMI_FINAL: 1, FINAL: 1 },
  },
  {
    id: "u4",
    displayName: "Valentina C.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Valentina",
    totalPoints: 65,
    pointsPerPhase: { GROUP: 65, ROUND_OF_32: 0, ROUND_OF_16: 0, QUARTER_FINAL: 0, SEMI_FINAL: 0, FINAL: 0 },
    rank: 4,
    previousRank: 4,
    jokersLeft: { GROUP: 0, ROUND_OF_32: 1, ROUND_OF_16: 1, QUARTER_FINAL: 1, SEMI_FINAL: 1, FINAL: 1 },
  },
  {
    id: "u5",
    displayName: "Lucas P.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas",
    totalPoints: 58,
    pointsPerPhase: { GROUP: 55, ROUND_OF_32: 0, ROUND_OF_16: 3, QUARTER_FINAL: 0, SEMI_FINAL: 0, FINAL: 0 },
    rank: 5,
    previousRank: 5,
    jokersLeft: { GROUP: 0, ROUND_OF_32: 1, ROUND_OF_16: 1, QUARTER_FINAL: 1, SEMI_FINAL: 1, FINAL: 1 },
  },
];

export const MOCK_PRODE: Prode = {
  id: "prode1",
  name: "Prode del Mundial ⚽",
  adminId: "u1",
  prizeDescription: "Cena para 2 en Lo de Julio + la gloria eterna",
  inviteCode: "MUNDIAL26",
  members: MOCK_MEMBERS,
  createdAt: "2026-05-01T00:00:00Z",
};

export const MOCK_MY_PREDICTIONS: Record<string, Prediction> = {
  m1: { id: "p1", userId: "u1", matchId: "m1", prodeId: "prode1", homeGoals: 1, awayGoals: 2, jokerUsed: false, pointsEarned: 3 },
  m2: { id: "p2", userId: "u1", matchId: "m2", prodeId: "prode1", homeGoals: 2, awayGoals: 1, jokerUsed: false, pointsEarned: 1 },
  m3: { id: "p3", userId: "u1", matchId: "m3", prodeId: "prode1", homeGoals: 1, awayGoals: 1, jokerUsed: false, pointsEarned: 2 },
  m4: { id: "p4", userId: "u1", matchId: "m4", prodeId: "prode1", homeGoals: 2, awayGoals: 0, jokerUsed: false, pointsEarned: 3 },
  m5: { id: "p5", userId: "u1", matchId: "m5", prodeId: "prode1", homeGoals: 0, awayGoals: 0, jokerUsed: false, pointsEarned: 2 },
  // m6 in progress
  "m16-1": { id: "p10", userId: "u1", matchId: "m16-1", prodeId: "prode1", homeGoals: 2, awayGoals: 1, jokerUsed: true, pointsEarned: 20 },
};

export const CURRENT_USER_ID = "u1";
export const CURRENT_USER_NAME = "Guido G.";
