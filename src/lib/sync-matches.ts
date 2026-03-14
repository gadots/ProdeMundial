/**
 * Core sync logic — fetches matches from football-data.org, upserts into Supabase,
 * triggers point calculation for newly-finished matches, and decays group-phase tokens.
 *
 * Used by both the Vercel Cron (/api/cron/sync-matches) and the manual admin trigger
 * (/api/admin/sync).
 */

import { createAdminClient } from "@/lib/supabase/admin";

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";
const WORLD_CUP_ID = 2000; // FIFA World Cup competition ID

export interface SyncResult {
  synced: number;
  calculated: number;
  decayedTokens: number;
  at: string;
  error?: string;
}

function mapStage(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "GROUP",
    ROUND_OF_32: "ROUND_OF_32",
    LAST_16: "ROUND_OF_16",
    QUARTER_FINALS: "QUARTER_FINAL",
    SEMI_FINALS: "SEMI_FINAL",
    FINAL: "FINAL",
  };
  return map[stage] ?? "GROUP";
}

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: "SCHEDULED",
    TIMED: "SCHEDULED",
    IN_PLAY: "LIVE",
    PAUSED: "LIVE",
    FINISHED: "FINISHED",
    POSTPONED: "POSTPONED",
  };
  return map[status] ?? "SCHEDULED";
}

export async function syncMatches(): Promise<SyncResult> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return { synced: 0, calculated: 0, decayedTokens: 0, at: new Date().toISOString(), error: "FOOTBALL_DATA_API_KEY not set" };
  }

  // 1. Fetch from football-data.org
  const res = await fetch(
    `${FOOTBALL_DATA_API}/competitions/${WORLD_CUP_ID}/matches`,
    {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return {
      synced: 0, calculated: 0, decayedTokens: 0,
      at: new Date().toISOString(),
      error: `API error ${res.status}: ${text.slice(0, 200)}`,
    };
  }

  const data = await res.json();
  const apiMatches: Record<string, unknown>[] = data.matches ?? [];

  if (apiMatches.length === 0) {
    return { synced: 0, calculated: 0, decayedTokens: 0, at: new Date().toISOString() };
  }

  const supabase = createAdminClient();

  // 2. Build rows for upsert
  const rows = apiMatches.map((m) => {
    const home = m.homeTeam as Record<string, unknown>;
    const away = m.awayTeam as Record<string, unknown>;
    const score = m.score as Record<string, unknown>;
    const fullTime = score?.fullTime as Record<string, number | null> | undefined;

    return {
      api_id: String(m.id),
      home_team_name: (home?.name as string) ?? "",
      home_team_short: (home?.tla as string) ?? "",
      away_team_name: (away?.name as string) ?? "",
      away_team_short: (away?.tla as string) ?? "",
      phase: mapStage(String(m.stage ?? "")),
      group_name: m.group ? String(m.group) : null,
      date: m.utcDate as string,
      status: mapStatus(String(m.status ?? "")),
      home_score: fullTime?.home ?? null,
      away_score: fullTime?.away ?? null,
      venue: m.venue ? String(m.venue) : null,
      updated_at: new Date().toISOString(),
    };
  });

  // 3. Upsert matches
  const { error: upsertError } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "api_id" });

  if (upsertError) {
    return {
      synced: 0, calculated: 0, decayedTokens: 0,
      at: new Date().toISOString(),
      error: upsertError.message,
    };
  }

  // 4. Find FINISHED matches that haven't had points calculated yet
  const { data: uncalculated } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "FINISHED")
    .is("calculated_at", null);

  let calculated = 0;
  for (const match of uncalculated ?? []) {
    const { data: calcResult, error: calcError } = await supabase.rpc(
      "calculate_match_points",
      { p_match_id: match.id }
    );
    if (!calcError && typeof calcResult === "number") {
      calculated += calcResult;
    }
  }

  // 5. Decay unused group-phase tokens if all GROUP matches are done
  const { data: decayResult } = await supabase.rpc("decay_group_tokens");
  const decayedTokens = typeof decayResult === "number" ? decayResult : 0;

  return {
    synced: rows.length,
    calculated,
    decayedTokens,
    at: new Date().toISOString(),
  };
}
