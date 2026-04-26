import { Match, Member, Prode, Prediction, MultiplierToken, WildcardChallenge, WildcardAnswer } from "./types";

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

function matchDate(daysFromStart: number, hour = 18): string {
  const start = new Date("2026-06-11T00:00:00Z");
  start.setDate(start.getDate() + daysFromStart);
  start.setUTCHours(hour);
  return start.toISOString();
}

export const MOCK_MATCHES: Match[] = [
  // FINISHED
  { id: "m1", homeTeam: MOCK_TEAMS.MEX, awayTeam: MOCK_TEAMS.USA, phase: "GROUP", group: "A", date: matchDate(0), status: "FINISHED", homeScore: 1, awayScore: 2, venue: "MetLife Stadium" },
  { id: "m2", homeTeam: MOCK_TEAMS.ARG, awayTeam: MOCK_TEAMS.URU, phase: "GROUP", group: "B", date: matchDate(1), status: "FINISHED", homeScore: 3, awayScore: 1, venue: "Rose Bowl" },
  { id: "m3", homeTeam: MOCK_TEAMS.BRA, awayTeam: MOCK_TEAMS.GER, phase: "GROUP", group: "C", date: matchDate(2), status: "FINISHED", homeScore: 2, awayScore: 2, venue: "Estadio Azteca" },
  { id: "m4", homeTeam: MOCK_TEAMS.FRA, awayTeam: MOCK_TEAMS.MAR, phase: "GROUP", group: "D", date: matchDate(3), status: "FINISHED", homeScore: 2, awayScore: 0, venue: "SoFi Stadium" },
  { id: "m5", homeTeam: MOCK_TEAMS.ESP, awayTeam: MOCK_TEAMS.NED, phase: "GROUP", group: "E", date: matchDate(4), status: "FINISHED", homeScore: 1, awayScore: 1, venue: "AT&T Stadium" },
  // LIVE
  { id: "m6", homeTeam: MOCK_TEAMS.POR, awayTeam: MOCK_TEAMS.ENG, phase: "GROUP", group: "F", date: matchDate(5), status: "LIVE", homeScore: 1, awayScore: 0, venue: "Gillette Stadium" },
  // SCHEDULED
  { id: "m7", homeTeam: MOCK_TEAMS.ARG, awayTeam: MOCK_TEAMS.BRA, phase: "GROUP", group: "B", date: matchDate(6, 21), status: "SCHEDULED", venue: "Hard Rock Stadium" },
  { id: "m8", homeTeam: MOCK_TEAMS.ENG, awayTeam: MOCK_TEAMS.FRA, phase: "GROUP", group: "G", date: matchDate(7, 18), status: "SCHEDULED", venue: "Arrowhead Stadium" },
  { id: "m9", homeTeam: MOCK_TEAMS.ESP, awayTeam: MOCK_TEAMS.GER, phase: "GROUP", group: "H", date: matchDate(8, 15), status: "SCHEDULED", venue: "Lincoln Financial Field" },
  // KNOCKOUT
  // TEMPORAL — borrar después de testear ROUND_OF_32
  { id: "mr32-1", homeTeam: MOCK_TEAMS.ARG, awayTeam: MOCK_TEAMS.URU, phase: "ROUND_OF_32", date: matchDate(18, 20), status: "SCHEDULED", venue: "MetLife Stadium" },
  { id: "m16-1", homeTeam: MOCK_TEAMS.ARG, awayTeam: MOCK_TEAMS.NED, phase: "ROUND_OF_16", date: matchDate(20, 20), status: "SCHEDULED", venue: "MetLife Stadium" },
  { id: "m16-2", homeTeam: MOCK_TEAMS.FRA, awayTeam: MOCK_TEAMS.POR, phase: "ROUND_OF_16", date: matchDate(21, 20), status: "SCHEDULED", venue: "Rose Bowl" },
  { id: "mqf-1", homeTeam: MOCK_TEAMS.ARG, awayTeam: MOCK_TEAMS.FRA, phase: "QUARTER_FINAL", date: matchDate(32, 20), status: "SCHEDULED", venue: "MetLife Stadium" },
  { id: "msf-1",  homeTeam: MOCK_TEAMS.ARG, awayTeam: MOCK_TEAMS.BRA, phase: "SEMI_FINAL",   date: matchDate(38, 20), status: "SCHEDULED", venue: "MetLife Stadium" },
  { id: "m3rd",   homeTeam: MOCK_TEAMS.BRA, awayTeam: MOCK_TEAMS.FRA, phase: "THIRD_PLACE", date: matchDate(44, 17), status: "SCHEDULED", venue: "AT&T Stadium" },
  { id: "mfinal", homeTeam: MOCK_TEAMS.ARG, awayTeam: MOCK_TEAMS.FRA, phase: "FINAL",       date: matchDate(45, 20), status: "SCHEDULED", venue: "MetLife Stadium" },
];

// -------------------------------------------------------
// MY TOKENS (mock for current user)
// -------------------------------------------------------
export const MOCK_MY_TOKENS: MultiplierToken[] = [
  { multiplier: 2, label: "2x", emoji: "⚡", color: "text-blue-400 border-blue-500/40 bg-blue-500/10", usedOnMatchId: "m2", decayed: false },
  { multiplier: 3, label: "3x", emoji: "🔥", color: "text-orange-400 border-orange-500/40 bg-orange-500/10", usedOnMatchId: undefined, decayed: false },
  { multiplier: 5, label: "5x", emoji: "💥", color: "text-purple-400 border-purple-500/40 bg-purple-500/10", usedOnMatchId: undefined, decayed: false },
];

// -------------------------------------------------------
// MY PREDICTIONS
// -------------------------------------------------------
export const MOCK_MY_PREDICTIONS: Record<string, Prediction> = {
  m1: { id: "p1", userId: "u1", matchId: "m1", prodeId: "prode1", homeGoals: 1, awayGoals: 2, multiplier: 1, pointsEarned: 3 },
  m2: { id: "p2", userId: "u1", matchId: "m2", prodeId: "prode1", homeGoals: 2, awayGoals: 1, multiplier: 2, pointsEarned: 2 },
  m3: { id: "p3", userId: "u1", matchId: "m3", prodeId: "prode1", homeGoals: 1, awayGoals: 1, multiplier: 1, pointsEarned: 2 },
  m4: { id: "p4", userId: "u1", matchId: "m4", prodeId: "prode1", homeGoals: 2, awayGoals: 0, multiplier: 1, pointsEarned: 3 },
  m5: { id: "p5", userId: "u1", matchId: "m5", prodeId: "prode1", homeGoals: 0, awayGoals: 0, multiplier: 1, pointsEarned: 2 },
};

// -------------------------------------------------------
// MEMBERS
// -------------------------------------------------------
function makeTokens(used2?: string, used3?: string, used5?: string): MultiplierToken[] {
  return [
    { multiplier: 2, label: "2x", emoji: "⚡", color: "text-blue-400 border-blue-500/40 bg-blue-500/10", usedOnMatchId: used2, decayed: false },
    { multiplier: 3, label: "3x", emoji: "🔥", color: "text-orange-400 border-orange-500/40 bg-orange-500/10", usedOnMatchId: used3, decayed: false },
    { multiplier: 5, label: "5x", emoji: "💥", color: "text-purple-400 border-purple-500/40 bg-purple-500/10", usedOnMatchId: used5, decayed: false },
  ];
}

export const MOCK_MEMBERS: Member[] = [
  {
    id: "u1", displayName: "Guido G.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guido",
    totalPoints: 94,
    pointsPerPhase: { GROUP: 76, ROUND_OF_32: 0, ROUND_OF_16: 18, QUARTER_FINAL: 0, SEMI_FINAL: 0, THIRD_PLACE: 0, FINAL: 0 },
    rank: 1, previousRank: 2,
    tokens: makeTokens("m2"),
    streak: { current: 4, best: 5, bonusNext: 2 },
  },
  {
    id: "u2", displayName: "Sofía R.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia",
    totalPoints: 88,
    pointsPerPhase: { GROUP: 70, ROUND_OF_32: 0, ROUND_OF_16: 18, QUARTER_FINAL: 0, SEMI_FINAL: 0, THIRD_PLACE: 0, FINAL: 0 },
    rank: 2, previousRank: 1,
    tokens: makeTokens("m1", "m3"),
    streak: { current: 2, best: 6, bonusNext: 0 },
  },
  {
    id: "u3", displayName: "Martín L.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Martin",
    totalPoints: 72,
    pointsPerPhase: { GROUP: 60, ROUND_OF_32: 0, ROUND_OF_16: 12, QUARTER_FINAL: 0, SEMI_FINAL: 0, THIRD_PLACE: 0, FINAL: 0 },
    rank: 3, previousRank: 3,
    tokens: makeTokens(),
    streak: { current: 0, best: 3, bonusNext: 0 },
  },
  {
    id: "u4", displayName: "Valentina C.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Valentina",
    totalPoints: 65,
    pointsPerPhase: { GROUP: 65, ROUND_OF_32: 0, ROUND_OF_16: 0, QUARTER_FINAL: 0, SEMI_FINAL: 0, THIRD_PLACE: 0, FINAL: 0 },
    rank: 4, previousRank: 4,
    tokens: makeTokens(undefined, undefined),
    streak: { current: 1, best: 4, bonusNext: 0 },
  },
  {
    id: "u5", displayName: "Lucas P.", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas",
    totalPoints: 58,
    pointsPerPhase: { GROUP: 55, ROUND_OF_32: 0, ROUND_OF_16: 3, QUARTER_FINAL: 0, SEMI_FINAL: 0, THIRD_PLACE: 0, FINAL: 0 },
    rank: 5, previousRank: 5,
    tokens: makeTokens(undefined, undefined, undefined),
    streak: { current: 0, best: 2, bonusNext: 0 },
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

// -------------------------------------------------------
// WILDCARD CHALLENGES
// -------------------------------------------------------
export const MOCK_WILDCARDS: WildcardChallenge[] = [
  {
    id: "wc1",
    title: "¿Quién anota más goles esta semana?",
    description: "Elegí la selección que creas que va a marcar más goles en los partidos de esta semana (semana 1 de grupos).",
    type: "PICK_TEAM",
    phase: "GROUP",
    points: 10,
    deadline: matchDate(7, 23),
    status: "OPEN",
    weekLabel: "Semana 1",
  },
  {
    id: "wc2",
    title: "¿Cuántos goles totales habrá esta semana?",
    description: "Predecí el número exacto de goles en todos los partidos de la semana 1. El más cercano gana.",
    type: "NUMERIC",
    phase: "GROUP",
    points: 15,
    deadline: matchDate(7, 23),
    status: "OPEN",
    weekLabel: "Semana 1",
  },
  {
    id: "wc3",
    title: "¿Habrá algún 0-0 en la semana 2?",
    description: "Sí o No. ¿Algún partido terminará 0-0 durante la semana 2 de grupos?",
    type: "YES_NO",
    phase: "GROUP",
    points: 8,
    deadline: matchDate(14, 23),
    status: "OPEN",
    weekLabel: "Semana 2",
  },
  {
    id: "wc4",
    title: "Predecí los 4 cuartos de final",
    description: "Elegí un ganador para cada cuarto de final. Todas correctas: 25pts, 3 correctas: 12pts, 2 correctas: 5pts.",
    type: "PICK_TEAM",
    phase: "QUARTER_FINAL",
    points: 25,
    deadline: matchDate(31, 23),
    status: "OPEN",
    weekLabel: "Cuartos",
  },
  {
    id: "wc5",
    title: "Goles totales en Octavos de Final",
    description: "¿Cuántos goles en total en los 16 partidos de Octavos? El más cercano gana 20 pts.",
    type: "NUMERIC",
    phase: "ROUND_OF_16",
    points: 20,
    deadline: matchDate(27, 23),
    status: "CLOSED",
    correctAnswer: "38",
    weekLabel: "Octavos",
  },
];

export const MOCK_MY_WILDCARD_ANSWERS: Record<string, WildcardAnswer> = {
  wc2: {
    challengeId: "wc2",
    userId: "u1",
    answer: "41",
    submittedAt: matchDate(5, 10),
    pointsEarned: undefined,
  },
};

export const CURRENT_USER_ID = "u1";
export const CURRENT_USER_NAME = "Guido G.";

// -------------------------------------------------------
// ALL 48 WORLD CUP 2026 TEAMS
// -------------------------------------------------------
export const ALL_WC_TEAMS = [
  // Anfitriones
  { id: "USA", name: "EE.UU.",          shortName: "USA", flag: "🇺🇸" },
  { id: "MEX", name: "México",           shortName: "MEX", flag: "🇲🇽" },
  { id: "CAN", name: "Canadá",           shortName: "CAN", flag: "🇨🇦" },
  // CONMEBOL
  { id: "ARG", name: "Argentina",        shortName: "ARG", flag: "🇦🇷" },
  { id: "BRA", name: "Brasil",           shortName: "BRA", flag: "🇧🇷" },
  { id: "URU", name: "Uruguay",          shortName: "URU", flag: "🇺🇾" },
  { id: "COL", name: "Colombia",         shortName: "COL", flag: "🇨🇴" },
  { id: "ECU", name: "Ecuador",          shortName: "ECU", flag: "🇪🇨" },
  { id: "VEN", name: "Venezuela",        shortName: "VEN", flag: "🇻🇪" },
  // UEFA
  { id: "ENG", name: "Inglaterra",       shortName: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "FRA", name: "Francia",          shortName: "FRA", flag: "🇫🇷" },
  { id: "ESP", name: "España",           shortName: "ESP", flag: "🇪🇸" },
  { id: "GER", name: "Alemania",         shortName: "GER", flag: "🇩🇪" },
  { id: "POR", name: "Portugal",         shortName: "POR", flag: "🇵🇹" },
  { id: "NED", name: "Países Bajos",     shortName: "NED", flag: "🇳🇱" },
  { id: "ITA", name: "Italia",           shortName: "ITA", flag: "🇮🇹" },
  { id: "BEL", name: "Bélgica",          shortName: "BEL", flag: "🇧🇪" },
  { id: "CRO", name: "Croacia",          shortName: "CRO", flag: "🇭🇷" },
  { id: "POL", name: "Polonia",          shortName: "POL", flag: "🇵🇱" },
  { id: "SUI", name: "Suiza",            shortName: "SUI", flag: "🇨🇭" },
  { id: "AUT", name: "Austria",          shortName: "AUT", flag: "🇦🇹" },
  { id: "SCO", name: "Escocia",          shortName: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: "SER", name: "Serbia",           shortName: "SER", flag: "🇷🇸" },
  { id: "TUR", name: "Turquía",          shortName: "TUR", flag: "🇹🇷" },
  { id: "DEN", name: "Dinamarca",        shortName: "DEN", flag: "🇩🇰" },
  { id: "UKR", name: "Ucrania",          shortName: "UKR", flag: "🇺🇦" },
  { id: "HUN", name: "Hungría",          shortName: "HUN", flag: "🇭🇺" },
  // CAF
  { id: "MAR", name: "Marruecos",        shortName: "MAR", flag: "🇲🇦" },
  { id: "SEN", name: "Senegal",          shortName: "SEN", flag: "🇸🇳" },
  { id: "CMR", name: "Camerún",          shortName: "CMR", flag: "🇨🇲" },
  { id: "NGA", name: "Nigeria",          shortName: "NGA", flag: "🇳🇬" },
  { id: "EGY", name: "Egipto",           shortName: "EGY", flag: "🇪🇬" },
  { id: "CIV", name: "Costa de Marfil",  shortName: "CIV", flag: "🇨🇮" },
  { id: "GHA", name: "Ghana",            shortName: "GHA", flag: "🇬🇭" },
  { id: "TUN", name: "Túnez",            shortName: "TUN", flag: "🇹🇳" },
  { id: "RSA", name: "Sudáfrica",        shortName: "RSA", flag: "🇿🇦" },
  // AFC
  { id: "JPN", name: "Japón",            shortName: "JPN", flag: "🇯🇵" },
  { id: "KOR", name: "Corea del Sur",    shortName: "KOR", flag: "🇰🇷" },
  { id: "IRN", name: "Irán",             shortName: "IRN", flag: "🇮🇷" },
  { id: "AUS", name: "Australia",        shortName: "AUS", flag: "🇦🇺" },
  { id: "SAU", name: "Arabia Saudita",   shortName: "SAU", flag: "🇸🇦" },
  { id: "JOR", name: "Jordania",         shortName: "JOR", flag: "🇯🇴" },
  { id: "IRQ", name: "Irak",             shortName: "IRQ", flag: "🇮🇶" },
  { id: "UZB", name: "Uzbekistán",       shortName: "UZB", flag: "🇺🇿" },
  // CONCACAF (no anfitriones)
  { id: "CRC", name: "Costa Rica",       shortName: "CRC", flag: "🇨🇷" },
  { id: "PAN", name: "Panamá",           shortName: "PAN", flag: "🇵🇦" },
  { id: "JAM", name: "Jamaica",          shortName: "JAM", flag: "🇯🇲" },
  // OFC
  { id: "NZL", name: "Nueva Zelanda",    shortName: "NZL", flag: "🇳🇿" },
];

// Extra TLA codes for teams that may appear in football-data.org API responses
// but are not in ALL_WC_TEAMS, or use different codes than our shortNames.
// Used by queries.ts to extend FLAG_MAP beyond the 48 WC 2026 qualifiers.
export const EXTRA_FLAGS: Record<string, string> = {
  // Alternate codes for teams already in ALL_WC_TEAMS
  "SRB": "🇷🇸", // Serbia — football-data.org usa SRB, nosotros SER
  "WAL": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", // Gales
  // CONMEBOL no clasificados
  "CHI": "🇨🇱", "CHL": "🇨🇱", // Chile
  "BOL": "🇧🇴", // Bolivia
  "PAR": "🇵🇾", "PRY": "🇵🇾", // Paraguay
  "PER": "🇵🇪", // Perú
  // UEFA no clasificados
  "NOR": "🇳🇴", // Noruega
  "SWE": "🇸🇪", "SVE": "🇸🇪", // Suecia
  "SVN": "🇸🇮", "SLO": "🇸🇮", // Eslovenia
  "CZE": "🇨🇿", // República Checa
  "SVK": "🇸🇰", "SLK": "🇸🇰", // Eslovaquia
  "ROU": "🇷🇴", "ROM": "🇷🇴", // Rumania
  "GRE": "🇬🇷", "GRC": "🇬🇷", // Grecia
  "IRL": "🇮🇪", "IRE": "🇮🇪", // Irlanda
  "FIN": "🇫🇮", // Finlandia
  "ISL": "🇮🇸", // Islandia
  "GEO": "🇬🇪", // Georgia
  "MKD": "🇲🇰", // Macedonia del Norte
  "MNE": "🇲🇪", // Montenegro
  "BIH": "🇧🇦", // Bosnia
  "ALB": "🇦🇱", // Albania
  "KSV": "🇽🇰", // Kosovo
  "ARM": "🇦🇲", // Armenia
  "AZE": "🇦🇿", // Azerbaiyán
  "BLR": "🇧🇾", // Bielorrusia
  "LTU": "🇱🇹", // Lituania
  "LVA": "🇱🇻", // Letonia
  "EST": "🇪🇪", // Estonia
  // CAF no clasificados
  "ALG": "🇩🇿", // Argelia
  "CGO": "🇨🇬", "COG": "🇨🇬", // Congo
  "COD": "🇨🇩", // RD Congo
  "MLI": "🇲🇱", // Malí
  "BFA": "🇧🇫", // Burkina Faso
  "GNB": "🇬🇼", // Guinea-Bisáu
  "GUI": "🇬🇳", "GIN": "🇬🇳", // Guinea
  "GAB": "🇬🇦", // Gabón
  "BEN": "🇧🇯", // Benín
  "MRT": "🇲🇷", // Mauritania
  "MOZ": "🇲🇿", // Mozambique
  "TAN": "🇹🇿", "TZA": "🇹🇿", // Tanzania
  "ETH": "🇪🇹", // Etiopía
  "COM": "🇰🇲", // Comoras
  "CHA": "🇹🇩", // Chad
  "ZAM": "🇿🇲", "ZMB": "🇿🇲", // Zambia
  "ZIM": "🇿🇼", "ZWE": "🇿🇼", // Zimbabue
  "ANG": "🇦🇴", "AGO": "🇦🇴", // Angola
  "KEN": "🇰🇪", // Kenia
  "UGA": "🇺🇬", // Uganda
  "LIB": "🇱🇾", // Libia
  // AFC no clasificados
  "QAT": "🇶🇦", // Qatar
  "CHN": "🇨🇳", // China
  "THA": "🇹🇭", // Tailandia
  "VNM": "🇻🇳", "VIE": "🇻🇳", // Vietnam
  "IDN": "🇮🇩", // Indonesia
  "MYS": "🇲🇾", "MAL": "🇲🇾", // Malasia
  "PHI": "🇵🇭", // Filipinas
  "TJK": "🇹🇯", // Tayikistán
  "KGZ": "🇰🇬", // Kirguistán
  "TKM": "🇹🇲", // Turkmenistán
  "OMA": "🇴🇲", // Omán
  "KUW": "🇰🇼", "KWT": "🇰🇼", // Kuwait
  "BHR": "🇧🇭", // Bahréin
  "ARE": "🇦🇪", "UAE": "🇦🇪", // Emiratos
  "YEM": "🇾🇪", // Yemen
  "LBN": "🇱🇧", // Líbano
  "SYR": "🇸🇾", // Siria
  "PAL": "🇵🇸", // Palestina
  // CONCACAF no clasificados
  "HAI": "🇭🇹", "HTI": "🇭🇹", // Haití
  "HON": "🇭🇳", "HND": "🇭🇳", // Honduras
  "GTM": "🇬🇹", "GUA": "🇬🇹", // Guatemala
  "SLV": "🇸🇻", // El Salvador
  "NCA": "🇳🇮", "NIC": "🇳🇮", // Nicaragua
  "CUB": "🇨🇺", // Cuba
  "TRI": "🇹🇹", "TTO": "🇹🇹", // Trinidad y Tobago
  "DOM": "🇩🇴", // Rep. Dominicana
  "GUY": "🇬🇾", // Guyana
  "SUR": "🇸🇷", // Surinam
  // OFC no clasificados
  "FIJ": "🇫🇯", "FJI": "🇫🇯", // Fiyi
  "PNG": "🇵🇬", // Papua Nueva Guinea
  "VAN": "🇻🇺", "VUT": "🇻🇺", // Vanuatu
  "TAH": "🇵🇫", // Tahití/Polinesia Francesa
  "NCL": "🇳🇨", // Nueva Caledonia
  "SOL": "🇸🇧", "SLB": "🇸🇧", // Islas Salomón
};


export const MOCK_POINTS_TODAY: Record<string, number> = {
  u1: 5,
  u2: 0,
  u3: 3,
  u4: 0,
  u5: 2,
};

// -------------------------------------------------------
// MATCH PREDICTIONS (all members, for reveal post-partido)
// -------------------------------------------------------
export const MOCK_MATCH_PREDICTIONS: Record<string, Record<string, Prediction>> = {
  // m1: MEX 1-2 USA
  m1: {
    u1: { id: "p1",  userId: "u1", matchId: "m1", prodeId: "prode1", homeGoals: 1, awayGoals: 2, multiplier: 1, pointsEarned: 3 },
    u2: { id: "p1b", userId: "u2", matchId: "m1", prodeId: "prode1", homeGoals: 0, awayGoals: 1, multiplier: 1, pointsEarned: 1 },
    u3: { id: "p1c", userId: "u3", matchId: "m1", prodeId: "prode1", homeGoals: 2, awayGoals: 2, multiplier: 1, pointsEarned: 0 },
    u4: { id: "p1d", userId: "u4", matchId: "m1", prodeId: "prode1", homeGoals: 1, awayGoals: 2, multiplier: 1, pointsEarned: 3 },
    // u5 no predijo
  },
  // m2: ARG 3-1 URU
  m2: {
    u1: { id: "p2",  userId: "u1", matchId: "m2", prodeId: "prode1", homeGoals: 2, awayGoals: 1, multiplier: 2, pointsEarned: 2 },
    u2: { id: "p2b", userId: "u2", matchId: "m2", prodeId: "prode1", homeGoals: 3, awayGoals: 1, multiplier: 1, pointsEarned: 3 },
    u3: { id: "p2c", userId: "u3", matchId: "m2", prodeId: "prode1", homeGoals: 2, awayGoals: 0, multiplier: 1, pointsEarned: 1 },
    u4: { id: "p2d", userId: "u4", matchId: "m2", prodeId: "prode1", homeGoals: 1, awayGoals: 0, multiplier: 1, pointsEarned: 1 },
    u5: { id: "p2e", userId: "u5", matchId: "m2", prodeId: "prode1", homeGoals: 0, awayGoals: 1, multiplier: 1, pointsEarned: 0 },
  },
  // m3: BRA 2-2 GER
  m3: {
    u1: { id: "p3",  userId: "u1", matchId: "m3", prodeId: "prode1", homeGoals: 1, awayGoals: 1, multiplier: 1, pointsEarned: 2 },
    u2: { id: "p3b", userId: "u2", matchId: "m3", prodeId: "prode1", homeGoals: 2, awayGoals: 2, multiplier: 3, pointsEarned: 9 },
    u4: { id: "p3d", userId: "u4", matchId: "m3", prodeId: "prode1", homeGoals: 3, awayGoals: 1, multiplier: 1, pointsEarned: 0 },
    u5: { id: "p3e", userId: "u5", matchId: "m3", prodeId: "prode1", homeGoals: 1, awayGoals: 2, multiplier: 1, pointsEarned: 0 },
    // u3 no predijo
  },
  // m4: FRA 2-0 MAR
  m4: {
    u1: { id: "p4",  userId: "u1", matchId: "m4", prodeId: "prode1", homeGoals: 2, awayGoals: 0, multiplier: 1, pointsEarned: 3 },
    u2: { id: "p4b", userId: "u2", matchId: "m4", prodeId: "prode1", homeGoals: 1, awayGoals: 0, multiplier: 1, pointsEarned: 1 },
    u3: { id: "p4c", userId: "u3", matchId: "m4", prodeId: "prode1", homeGoals: 2, awayGoals: 1, multiplier: 1, pointsEarned: 1 },
    u4: { id: "p4d", userId: "u4", matchId: "m4", prodeId: "prode1", homeGoals: 0, awayGoals: 1, multiplier: 1, pointsEarned: 0 },
    u5: { id: "p4e", userId: "u5", matchId: "m4", prodeId: "prode1", homeGoals: 2, awayGoals: 0, multiplier: 1, pointsEarned: 3 },
  },
  // m5: ESP 1-1 NED
  m5: {
    u1: { id: "p5",  userId: "u1", matchId: "m5", prodeId: "prode1", homeGoals: 0, awayGoals: 0, multiplier: 1, pointsEarned: 2 },
    u2: { id: "p5b", userId: "u2", matchId: "m5", prodeId: "prode1", homeGoals: 1, awayGoals: 1, multiplier: 1, pointsEarned: 3 },
    u3: { id: "p5c", userId: "u3", matchId: "m5", prodeId: "prode1", homeGoals: 2, awayGoals: 0, multiplier: 1, pointsEarned: 0 },
    u5: { id: "p5e", userId: "u5", matchId: "m5", prodeId: "prode1", homeGoals: 0, awayGoals: 2, multiplier: 1, pointsEarned: 0 },
    // u4 no predijo
  },
  // m6: POR 1-0 ENG (LIVE) — predicciones bloqueadas
  m6: {
    u1: { id: "p6",  userId: "u1", matchId: "m6", prodeId: "prode1", homeGoals: 2, awayGoals: 1, multiplier: 1, pointsEarned: undefined },
    u2: { id: "p6b", userId: "u2", matchId: "m6", prodeId: "prode1", homeGoals: 1, awayGoals: 0, multiplier: 1, pointsEarned: undefined },
    u3: { id: "p6c", userId: "u3", matchId: "m6", prodeId: "prode1", homeGoals: 1, awayGoals: 1, multiplier: 1, pointsEarned: undefined },
    u4: { id: "p6d", userId: "u4", matchId: "m6", prodeId: "prode1", homeGoals: 0, awayGoals: 2, multiplier: 1, pointsEarned: undefined },
    // u5 no predijo
  },
};
