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

// Ventana del torneo. Pedimos el fixture completo con dateFrom/dateTo en lugar
// del request pelado, que en la práctica devolvía solo los próximos partidos y
// dejaba afuera los cruces de llaves todavía no inminentes.
const WC_DATE_FROM = "2026-06-01";
const WC_DATE_TO = "2026-07-31";
const MATCHES_PATH = `/competitions/${WORLD_CUP_ID}/matches`;

export const MATCHES_URL_FULL = `${FOOTBALL_DATA_API}${MATCHES_PATH}?dateFrom=${WC_DATE_FROM}&dateTo=${WC_DATE_TO}`;
export const MATCHES_URL_BARE = `${FOOTBALL_DATA_API}${MATCHES_PATH}`;

export interface SyncResult {
  synced: number;
  calculated: number;
  decayedTokens: number;
  at: string;
  error?: string;
}

export function mapStage(stage: string): string {
  // football-data.org v4 usa la convención LAST_16/LAST_32 para las llaves.
  // El Mundial 2026 (48 equipos) arranca con Ronda de 32 = LAST_32. Soportamos
  // ambas convenciones para no depender de cómo lo nombre la API.
  const map: Record<string, string> = {
    GROUP_STAGE: "GROUP",
    LAST_32: "ROUND_OF_32",
    ROUND_OF_32: "ROUND_OF_32",
    LAST_16: "ROUND_OF_16",
    ROUND_OF_16: "ROUND_OF_16",
    QUARTER_FINALS: "QUARTER_FINAL",
    QUARTER_FINAL: "QUARTER_FINAL",
    SEMI_FINALS: "SEMI_FINAL",
    SEMI_FINAL: "SEMI_FINAL",
    THIRD_PLACE: "THIRD_PLACE",
    FINAL: "FINAL",
  };
  const mapped = map[stage];
  if (!mapped) {
    // No tragar stages desconocidos en silencio: si la API introduce un nombre
    // nuevo, queremos verlo en logs en vez de mandarlo a GROUP sin aviso.
    console.warn(`mapStage: stage desconocido "${stage}" → fallback GROUP`);
    return "GROUP";
  }
  return mapped;
}

export function mapStatus(status: string): string {
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

/**
 * Fetch the World Cup matches with retry + exponential backoff on transient
 * failures (429 rate limit, 5xx). The free football-data.org tier rate-limits
 * to ~10 req/min, so a 429 during a busy sync window is expected and should be
 * retried rather than failing the whole run.
 */
async function fetchMatchesWithRetry(apiKey: string, url: string, maxAttempts = 4): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });
    if (res.ok) return res;
    lastRes = res;
    // Only retry transient errors; 4xx other than 429 won't fix themselves.
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt < maxAttempts) {
      const delayMs = 2000 * 2 ** (attempt - 1); // 2s, 4s, 8s
      console.warn(`football-data.org ${res.status}, retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return lastRes!;
}

export async function syncMatches(): Promise<SyncResult> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return { synced: 0, calculated: 0, decayedTokens: 0, at: new Date().toISOString(), error: "FOOTBALL_DATA_API_KEY not set" };
  }

  // 1. Fetch from football-data.org (with retry/backoff on 429 + 5xx).
  // Pedimos el fixture completo del torneo (dateFrom/dateTo). Si football-data
  // rechaza el rango con 400, caemos al request pelado para no romper la sync.
  let res = await fetchMatchesWithRetry(apiKey, MATCHES_URL_FULL);
  if (res.status === 400) {
    console.warn("football-data.org rechazó el rango de fechas (400) → reintento sin parámetros");
    res = await fetchMatchesWithRetry(apiKey, MATCHES_URL_BARE);
  }

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

  // 2b. Snapshot del estado actual de estos partidos ANTES del upsert, para
  // detectar correcciones de marcador en partidos que ya estaban FINISHED.
  const apiIds = rows.map((r) => r.api_id);
  const { data: prevRows } = await supabase
    .from("matches")
    .select("api_id, status, home_score, away_score")
    .in("api_id", apiIds);
  const prevMap = new Map(
    (prevRows ?? []).map((p: { api_id: string; status: string; home_score: number | null; away_score: number | null }) => [p.api_id, p])
  );

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

  // 4. Calculate points.
  //
  // Two paths:
  //  - Correction: an already-FINISHED match changed its score. The forward
  //    calculator can't fix this (it skips predictions that already have
  //    points_earned and only adds to scores). We run a full reversible replay
  //    once, which also recomputes streaks in chronological order.
  //  - Normal: brand-new finishes / late-saved predictions → forward calc per
  //    match (cheap), same as before.

  const correction = rows.some((r) => {
    const before = prevMap.get(r.api_id);
    return (
      !!before &&
      before.status === "FINISHED" &&
      (before.home_score !== r.home_score || before.away_score !== r.away_score)
    );
  });

  let calculated = 0;

  if (correction) {
    const { data: recalcResult, error: recalcError } = await supabase.rpc("recalculate_all_points");
    if (recalcError) {
      console.error("recalculate_all_points failed:", recalcError.message);
    } else if (typeof recalcResult === "number") {
      calculated = recalcResult;
    }
  } else {
    // Forward path: union of (a) FINISHED with calculated_at IS NULL +
    // (b) FINISHED matches that own an uncalculated prediction.
    const [{ data: neverCalculated }, { data: uncalcPreds }] = await Promise.all([
      supabase.from("matches").select("id").eq("status", "FINISHED").is("calculated_at", null),
      supabase.from("predictions").select("match_id").is("points_earned", null),
    ]);

    const toCalculate = new Set<string>((neverCalculated ?? []).map((m: { id: string }) => m.id));

    if (uncalcPreds && uncalcPreds.length > 0) {
      const pendingMatchIds = [...new Set(uncalcPreds.map((p: { match_id: string }) => p.match_id))];
      const { data: finishedPending } = await supabase
        .from("matches")
        .select("id")
        .eq("status", "FINISHED")
        .in("id", pendingMatchIds);
      (finishedPending ?? []).forEach((m: { id: string }) => toCalculate.add(m.id));
    }

    for (const matchId of toCalculate) {
      const { data: calcResult, error: calcError } = await supabase.rpc(
        "calculate_match_points",
        { p_match_id: matchId }
      );
      if (calcError) {
        // Log instead of silently swallowing — a stuck match here means players
        // never earn points for that game, which is exactly the bug we hit before.
        console.error(`calculate_match_points failed for match ${matchId}:`, calcError.message);
      } else if (typeof calcResult === "number") {
        calculated += calcResult;
      }
    }
  }

  // 5. Decay unused group-phase tokens if all GROUP matches are done
  const { data: decayResult, error: decayError } = await supabase.rpc("decay_group_tokens");
  if (decayError) {
    console.error("decay_group_tokens failed:", decayError.message);
  }
  const decayedTokens = typeof decayResult === "number" ? decayResult : 0;

  return {
    synced: rows.length,
    calculated,
    decayedTokens,
    at: new Date().toISOString(),
  };
}
