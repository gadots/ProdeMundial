import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { MATCHES_URL_FULL, MATCHES_URL_BARE } from "@/lib/sync-matches";

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
    // Misma URL que usa el sync (fixture completo del torneo). Si el rango
    // devuelve 400, caemos al request pelado, igual que la sync.
    let res = await fetch(MATCHES_URL_FULL, {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });
    if (res.status === 400) {
      res = await fetch(MATCHES_URL_BARE, {
        headers: { "X-Auth-Token": apiKey },
        cache: "no-store",
      });
    }

    const statusCode = res.status;
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `API ${statusCode}: ${text.slice(0, 300)}`, statusCode });
    }

    const data = await res.json();
    const allMatches: Record<string, unknown>[] = data.matches ?? [];

    const toRow = (m: Record<string, unknown>) => {
      const score = m.score as Record<string, unknown>;
      const ft = score?.fullTime as Record<string, number | null> | undefined;
      const pens = score?.penalties as Record<string, number | null> | undefined;
      const home = m.homeTeam as Record<string, unknown>;
      const away = m.awayTeam as Record<string, unknown>;
      return {
        api_id: m.id,
        home: (home?.name as string) ?? null,
        away: (away?.name as string) ?? null,
        utcDate: m.utcDate,
        stage: m.stage,
        status: m.status,
        home_score: ft?.home ?? null,
        away_score: ft?.away ?? null,
        // Datos crudos de penales para confirmar la forma que manda football-data.
        duration: (score?.duration as string) ?? null,
        winner: (score?.winner as string) ?? null,
        penalty_home: pens?.home ?? null,
        penalty_away: pens?.away ?? null,
      };
    };

    const byDate = (a: { utcDate: unknown }, b: { utcDate: unknown }) =>
      new Date(a.utcDate as string).getTime() - new Date(b.utcDate as string).getTime();

    // Todos los partidos de llaves (no GROUP_STAGE), sin filtro de recencia, para
    // ver de un vistazo cuántos cruces publicó la API y con qué equipos/estado.
    const knockoutMatches = allMatches
      .filter((m) => (m.stage as string) !== "GROUP_STAGE")
      .map(toRow)
      .sort(byDate)
      .slice(0, 60);

    return NextResponse.json({
      fetched_at: new Date().toISOString(),
      total_matches: allMatches.length,
      by_stage: allMatches.reduce<Record<string, number>>((acc, m) => {
        const s = (m.stage as string) ?? "—";
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}),
      status_summary: allMatches.reduce<Record<string, number>>((acc, m) => {
        const s = m.status as string;
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}),
      knockout_matches: knockoutMatches,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const GET = handleDebug;
export const POST = handleDebug;
