import { createClient } from "@/lib/supabase/client";
import {
  Match, Prediction, MultiplierToken, Member, Phase, MatchStatus,
  WildcardChallenge, WildcardAnswer, StreakInfo, TokenMultiplier, Prode,
  INITIAL_TOKENS,
} from "@/lib/types";
import { ALL_WC_TEAMS, EXTRA_FLAGS } from "@/lib/mock-data";

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const FLAG_MAP: Record<string, string> = {
  ...Object.fromEntries(ALL_WC_TEAMS.map((t) => [t.shortName, t.flag])),
  ...EXTRA_FLAGS,
};

const TOKEN_DISPLAY = {
  2: { label: "2x", emoji: "⚡", color: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
  3: { label: "3x", emoji: "🔥", color: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  5: { label: "5x", emoji: "💥", color: "text-purple-400 border-purple-500/40 bg-purple-500/10" },
} as const;

type DbRow = Record<string, unknown>;

function dbToMatch(row: DbRow): Match {
  return {
    id: row.id as string,
    homeTeam: {
      id: row.home_team_short as string,
      name: row.home_team_name as string,
      shortName: row.home_team_short as string,
      flag: FLAG_MAP[row.home_team_short as string] ?? "🏳️",
    },
    awayTeam: {
      id: row.away_team_short as string,
      name: row.away_team_name as string,
      shortName: row.away_team_short as string,
      flag: FLAG_MAP[row.away_team_short as string] ?? "🏳️",
    },
    phase: row.phase as Phase,
    group: (row.group_name as string | null)?.replace(/^GROUP_/i, "").toUpperCase() || undefined,
    date: row.date as string,
    status: row.status as MatchStatus,
    homeScore: (row.home_score as number | null) ?? undefined,
    awayScore: (row.away_score as number | null) ?? undefined,
    venue: (row.venue as string | null) ?? undefined,
  };
}

function dbToToken(row: DbRow): MultiplierToken {
  const m = row.multiplier as 2 | 3 | 5;
  const display = TOKEN_DISPLAY[m];
  return {
    multiplier: m,
    label: display.label,
    emoji: display.emoji,
    color: display.color,
    usedOnMatchId: (row.used_on_match as string | null) ?? undefined,
    decayed: row.decayed as boolean,
  };
}

// -------------------------------------------------------
// Matches
// -------------------------------------------------------

export async function getMatches(): Promise<Match[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("date", { ascending: true });
  if (error || !data) return [];
  return data.map(dbToMatch);
}

// -------------------------------------------------------
// Prode + members
// -------------------------------------------------------

export interface ProdeInfo {
  id: string;
  name: string;
  adminId: string;
  prizeDescription?: string;
  inviteCode: string;
  createdAt: string;
}

export async function getMyProdeInfo(userId: string): Promise<ProdeInfo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prode_members")
    .select("prode_id, prodes(id, name, admin_id, prize_description, invite_code, created_at)")
    .eq("user_id", userId)
    .limit(1)
    .single();
  if (error || !data) return null;
  const p = (data as DbRow).prodes as DbRow | null;
  if (!p) return null;
  return {
    id: p.id as string,
    name: p.name as string,
    adminId: p.admin_id as string,
    prizeDescription: (p.prize_description as string | null) ?? undefined,
    inviteCode: p.invite_code as string,
    createdAt: p.created_at as string,
  };
}

export async function getAllMyProdes(userId: string): Promise<ProdeInfo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("prode_members")
    .select("prode_id, prodes(id, name, admin_id, prize_description, invite_code, created_at)")
    .eq("user_id", userId);
  if (error || !data) return [];
  const result: ProdeInfo[] = [];
  for (const row of data) {
    const p = (row as DbRow).prodes as DbRow | null;
    if (!p) continue;
    result.push({
      id: p.id as string,
      name: p.name as string,
      adminId: p.admin_id as string,
      prizeDescription: (p.prize_description as string | null) ?? undefined,
      inviteCode: p.invite_code as string,
      createdAt: p.created_at as string,
    });
  }
  return result;
}

export async function getLeaderboard(prodeId: string): Promise<Member[]> {
  const supabase = createClient();

  const [membersResult, scoresResult, tokensResult, streaksResult] = await Promise.all([
    supabase
      .from("prode_members")
      .select("user_id, profiles(display_name, avatar_url)")
      .eq("prode_id", prodeId),
    supabase
      .from("scores")
      .select("user_id, phase, points")
      .eq("prode_id", prodeId),
    supabase
      .from("multiplier_tokens")
      .select("user_id, multiplier, used_on_match, decayed")
      .eq("prode_id", prodeId),
    supabase
      .from("streaks")
      .select("user_id, current_streak, best_streak")
      .eq("prode_id", prodeId),
  ]);

  const members = membersResult.data ?? [];
  const scores = scoresResult.data ?? [];
  const tokens = tokensResult.data ?? [];
  const streaks = streaksResult.data ?? [];

  const membersWithPoints = members.map((m) => {
    const profile = (m as DbRow).profiles as DbRow | null;
    const memberScores = scores.filter((s) => s.user_id === m.user_id);
    const pointsPerPhase: Record<Phase, number> = {
      GROUP: 0, ROUND_OF_32: 0, ROUND_OF_16: 0, QUARTER_FINAL: 0, SEMI_FINAL: 0, THIRD_PLACE: 0, FINAL: 0,
    };
    let totalPoints = 0;
    memberScores.forEach((s) => {
      pointsPerPhase[s.phase as Phase] = (pointsPerPhase[s.phase as Phase] ?? 0) + s.points;
      totalPoints += s.points;
    });

    const memberTokens = tokens.filter((t) => t.user_id === m.user_id).map(dbToToken);
    const memberStreak = streaks.find((s) => s.user_id === m.user_id);
    const streak: StreakInfo = memberStreak
      ? {
          current: memberStreak.current_streak,
          best: memberStreak.best_streak,
          bonusNext: memberStreak.current_streak >= 5 ? 5 : memberStreak.current_streak >= 3 ? 2 : 0,
        }
      : { current: 0, best: 0, bonusNext: 0 };

    return {
      id: m.user_id,
      displayName: profile?.display_name as string ?? "Usuario",
      avatarUrl: (profile?.avatar_url as string | null) ?? undefined,
      totalPoints,
      pointsPerPhase,
      rank: 0, // will be set below
      tokens: memberTokens.length > 0 ? memberTokens : INITIAL_TOKENS.map((t) => ({ ...t, decayed: false })),
      streak,
    } as Member;
  });

  // Sort and assign ranks
  membersWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);
  membersWithPoints.forEach((m, i) => { m.rank = i + 1; });

  return membersWithPoints;
}

export async function getProde(prodeId: string, prodeInfo: ProdeInfo): Promise<Prode> {
  const members = await getLeaderboard(prodeId);
  return {
    id: prodeInfo.id,
    name: prodeInfo.name,
    adminId: prodeInfo.adminId,
    prizeDescription: prodeInfo.prizeDescription,
    inviteCode: prodeInfo.inviteCode,
    members,
    createdAt: prodeInfo.createdAt,
  };
}

// -------------------------------------------------------
// Predictions
// -------------------------------------------------------

export async function getMyPredictions(
  userId: string,
  prodeId: string
): Promise<Record<string, Prediction>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId)
    .eq("prode_id", prodeId);
  if (error || !data) return {};
  return Object.fromEntries(
    data.map((row) => [
      row.match_id,
      {
        id: row.id,
        userId: row.user_id,
        matchId: row.match_id,
        prodeId: row.prode_id,
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
        multiplier: row.multiplier as TokenMultiplier,
        pointsEarned: (row.points_earned as number | null) ?? undefined,
      } as Prediction,
    ])
  );
}

export async function upsertPrediction(pred: {
  userId: string;
  matchId: string;
  prodeId: string;
  homeGoals: number;
  awayGoals: number;
  multiplier: TokenMultiplier;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: pred.userId,
      match_id: pred.matchId,
      prode_id: pred.prodeId,
      home_goals: pred.homeGoals,
      away_goals: pred.awayGoals,
      multiplier: pred.multiplier,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,match_id,prode_id" }
  );
  return { error: error?.message ?? null };
}

// -------------------------------------------------------
// Tokens
// -------------------------------------------------------

export async function getMyTokens(userId: string, prodeId: string): Promise<MultiplierToken[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("multiplier_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("prode_id", prodeId)
    .order("multiplier", { ascending: true });
  if (error || !data) return [];
  return data.map(dbToToken);
}

export async function updateTokenUsage(
  userId: string,
  prodeId: string,
  multiplier: TokenMultiplier,
  matchId: string | null
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("multiplier_tokens")
    .update({ used_on_match: matchId, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("prode_id", prodeId)
    .eq("multiplier", multiplier);
}

// -------------------------------------------------------
// Streaks
// -------------------------------------------------------

export async function getMyStreak(userId: string, prodeId: string): Promise<StreakInfo> {
  const supabase = createClient();
  const { data } = await supabase
    .from("streaks")
    .select("current_streak, best_streak")
    .eq("user_id", userId)
    .eq("prode_id", prodeId)
    .single();
  if (!data) return { current: 0, best: 0, bonusNext: 0 };
  const current = data.current_streak;
  return {
    current,
    best: data.best_streak,
    bonusNext: current >= 5 ? 5 : current >= 3 ? 2 : 0,
  };
}

// -------------------------------------------------------
// Wildcards
// -------------------------------------------------------

export async function getWildcards(prodeId: string): Promise<WildcardChallenge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("wildcard_challenges")
    .select("*")
    .or(`prode_id.eq.${prodeId},prode_id.is.null`)
    .order("deadline", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    type: row.type as WildcardChallenge["type"],
    phase: (row.phase ?? "ALL") as WildcardChallenge["phase"],
    points: row.points,
    deadline: row.deadline,
    correctAnswer: (row.correct_answer as string | null) ?? undefined,
    status: row.status as WildcardChallenge["status"],
    weekLabel: row.week_label,
  }));
}

export async function getMyWildcardAnswers(userId: string): Promise<Record<string, WildcardAnswer>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("wildcard_answers")
    .select("*")
    .eq("user_id", userId);
  if (error || !data) return {};
  return Object.fromEntries(
    data.map((row) => [
      row.challenge_id,
      {
        challengeId: row.challenge_id,
        userId: row.user_id,
        answer: row.answer,
        submittedAt: row.submitted_at,
        pointsEarned: (row.points_earned as number | null) ?? undefined,
      } as WildcardAnswer,
    ])
  );
}

export async function upsertWildcardAnswer(
  userId: string,
  challengeId: string,
  answer: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("wildcard_answers").upsert(
    {
      user_id: userId,
      challenge_id: challengeId,
      answer,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "challenge_id,user_id" }
  );
  return { error: error?.message ?? null };
}

// -------------------------------------------------------
// Special predictions
// -------------------------------------------------------

export async function getSpecialPredictions(
  userId: string,
  prodeId: string
): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("special_predictions")
    .select("champion, finalist, third_place, top_scorer, most_goals_country")
    .eq("user_id", userId)
    .eq("prode_id", prodeId)
    .single();
  if (!data) return {};
  return {
    ...(data.champion ? { champion: data.champion } : {}),
    ...(data.finalist ? { finalist: data.finalist } : {}),
    ...(data.third_place ? { third: data.third_place } : {}),
    ...(data.top_scorer ? { topScorer: data.top_scorer } : {}),
    ...(data.most_goals_country ? { mostGoals: data.most_goals_country } : {}),
  };
}

export async function upsertSpecialPredictions(
  userId: string,
  prodeId: string,
  preds: Record<string, string>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("special_predictions").upsert(
    {
      user_id: userId,
      prode_id: prodeId,
      champion: preds.champion || null,
      finalist: preds.finalist || null,
      third_place: preds.third || null,
      top_scorer: preds.topScorer || null,
      most_goals_country: preds.mostGoals || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,prode_id" }
  );
  return { error: error?.message ?? null };
}

// -------------------------------------------------------
// Prode mutations
// -------------------------------------------------------

export async function updateProdeName(
  prodeId: string,
  name: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("prodes").update({ name }).eq("id", prodeId);
  return { error: error?.message ?? null };
}

export async function updateProdePrize(
  prodeId: string,
  prize: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("prodes")
    .update({ prize_description: prize || null })
    .eq("id", prodeId);
  return { error: error?.message ?? null };
}

export async function joinProde(
  userId: string,
  inviteCode: string
): Promise<{ error: string | null; prodeId: string | null }> {
  const supabase = createClient();
  const { data: prode } = await supabase
    .from("prodes")
    .select("id")
    .eq("invite_code", inviteCode.toUpperCase())
    .single();
  if (!prode) return { error: "Código inválido o prode no encontrado", prodeId: null };
  const { error } = await supabase
    .from("prode_members")
    .insert({ user_id: userId, prode_id: prode.id });
  if (error) {
    if (error.code === "23505") return { error: null, prodeId: prode.id }; // already a member
    return { error: error.message, prodeId: null };
  }
  return { error: null, prodeId: prode.id };
}

// -------------------------------------------------------
// Profile
// -------------------------------------------------------

export async function getMyProfile(
  userId: string
): Promise<{ displayName: string; avatarUrl?: string } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .single();
  if (!data) return null;
  return {
    displayName: data.display_name,
    avatarUrl: (data.avatar_url as string | null) ?? undefined,
  };
}

// -------------------------------------------------------
// Create prode
// -------------------------------------------------------

function generateInviteCode(): string {
  // Exclude ambiguous chars: O, 0, I, 1
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createProde(
  userId: string,
  name: string
): Promise<{ error: string | null; prodeId: string | null }> {
  const supabase = createClient();

  // Try up to 3 times in case of invite_code collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const inviteCode = generateInviteCode();

    const { data: prode, error: prodeError } = await supabase
      .from("prodes")
      .insert({ name, admin_id: userId, invite_code: inviteCode })
      .select("id")
      .single();

    if (prodeError) {
      // Unique violation on invite_code → retry
      if (prodeError.code === "23505" && prodeError.message.includes("invite_code")) {
        continue;
      }
      return { error: prodeError.message, prodeId: null };
    }

    if (!prode) return { error: "Error al crear el prode", prodeId: null };

    // Add creator as member (tokens auto-assigned by trigger)
    const { error: memberError } = await supabase
      .from("prode_members")
      .insert({ user_id: userId, prode_id: prode.id });

    if (memberError) return { error: memberError.message, prodeId: null };

    return { error: null, prodeId: prode.id };
  }

  return { error: "No se pudo generar un código único. Intentá de nuevo.", prodeId: null };
}

export async function leaveProde(
  userId: string,
  prodeId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("prode_members")
    .delete()
    .eq("user_id", userId)
    .eq("prode_id", prodeId);
  return { error: error?.message ?? null };
}

export async function deleteProde(
  prodeId: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("prodes")
    .delete()
    .eq("id", prodeId);
  return { error: error?.message ?? null };
}

// -------------------------------------------------------

export async function getPointsToday(prodeId: string): Promise<Record<string, number>> {
  const supabase = createClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("predictions")
    .select("user_id, points_earned, updated_at")
    .eq("prode_id", prodeId)
    .gte("updated_at", since.toISOString())
    .not("points_earned", "is", null);
  if (!data) return {};
  const result: Record<string, number> = {};
  data.forEach((row) => {
    const pts = (row.points_earned as number) ?? 0;
    result[row.user_id] = (result[row.user_id] ?? 0) + pts;
  });
  return result;
}
