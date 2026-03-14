import { NextResponse } from "next/server";
import { syncMatches } from "@/lib/sync-matches";

/**
 * Manual sync trigger — same as the cron job but callable on-demand.
 * Protected by CRON_SECRET.
 *
 * Usage:
 *   curl -X POST /api/admin/sync \
 *     -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMatches();
    if (result.error) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("admin/sync exception:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
