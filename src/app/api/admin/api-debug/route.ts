import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

async function handleDebug() {
  const headerStore = await headers();
  const auth = headerStore.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const validBearer = cronSecret && auth === `Bearer ${cronSecret}`;

  if (!validBearer) {
    const cookieStore = await cookies();
    if (!isAdminAuthenticated(cookieStore)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/2000/matches", {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });

    const statusCode = res.status;
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `API ${statusCode}: ${text.slice(0, 300)}`, statusCode });
    }

    const data = await res.json();
    const allMatches: Record<string, unknown>[] = data.matches ?? [];

    // Focus on recent matches: finished in the last 48h + currently live
    const now = Date.now();
    const twoDaysMs = 48 * 60 * 60 * 1000;

    const recent = allMatches
      .filter((m) => {
        const kickoff = new Date(m.utcDate as string).getTime();
        const status = m.status as string;
        return (
          status === "FINISHED" ||
          status === "IN_PLAY" ||
          status === "PAUSED" ||
          (kickoff >= now - twoDaysMs && kickoff <= now + twoDaysMs)
        );
      })
      .map((m) => {
        const score = m.score as Record<string, unknown>;
        const ft = score?.fullTime as Record<string, number | null> | undefined;
        const home = m.homeTeam as Record<string, unknown>;
        const away = m.awayTeam as Record<string, unknown>;
        return {
          api_id: m.id,
          home: home?.name,
          away: away?.name,
          utcDate: m.utcDate,
          stage: m.stage,
          status: m.status,
          home_score: ft?.home ?? null,
          away_score: ft?.away ?? null,
        };
      })
      .sort((a, b) => new Date(b.utcDate as string).getTime() - new Date(a.utcDate as string).getTime())
      .slice(0, 20);

    return NextResponse.json({
      fetched_at: new Date().toISOString(),
      total_matches: allMatches.length,
      status_summary: allMatches.reduce<Record<string, number>>((acc, m) => {
        const s = m.status as string;
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}),
      recent_matches: recent,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const GET = handleDebug;
export const POST = handleDebug;
