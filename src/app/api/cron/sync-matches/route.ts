import { NextResponse } from "next/server";

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";
const WORLD_CUP_ID = 2000; // FIFA World Cup competition ID

/**
 * Cron job: syncs match data from football-data.org into Supabase.
 * Called by Vercel Cron every 5 min during live matches, hourly otherwise.
 *
 * Vercel cron config is defined in vercel.json (schedule: every 5 minutes).
 */
export async function GET(request: Request) {
  // Validate cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${FOOTBALL_DATA_API}/competitions/${WORLD_CUP_ID}/matches`,
      {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY!,
        },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `API error: ${res.status}`, detail: text }, { status: 500 });
    }

    const data = await res.json();
    const matches = data.matches ?? [];

    // Import Supabase client for server
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    // Upsert matches into the DB
    const rows = matches.map((m: Record<string, unknown>) => {
      const home = m.homeTeam as Record<string, unknown>;
      const away = m.awayTeam as Record<string, unknown>;
      const score = m.score as Record<string, unknown>;
      const fullTime = score?.fullTime as Record<string, number | null> | undefined;
      return {
        api_id: String(m.id),
        home_team_name: home?.name ?? "",
        home_team_short: home?.tla ?? "",
        away_team_name: away?.name ?? "",
        away_team_short: away?.tla ?? "",
        phase: mapStage(String(m.stage ?? "")),
        group_name: m.group ? String(m.group) : null,
        date: m.utcDate,
        status: mapStatus(String(m.status ?? "")),
        home_score: fullTime?.home ?? null,
        away_score: fullTime?.away ?? null,
        venue: m.venue ? String(m.venue) : null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from("matches")
      .upsert(rows, { onConflict: "api_id" });

    if (error) throw error;

    return NextResponse.json({ synced: rows.length, at: new Date().toISOString() });
  } catch (err) {
    console.error("sync-matches error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
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
