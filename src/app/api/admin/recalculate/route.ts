import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function handleRecalculate() {
  // Accept either admin cookie (manual button) or CRON_SECRET Bearer token.
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

  try {
    const supabase = createAdminClient();
    // Full replay reversible e idempotente: recalcula points_earned, scores y
    // rachas de todos los partidos finalizados en orden cronológico. Corrige
    // los puntos que quedaron congelados contra un marcador viejo.
    const { data, error } = await supabase.rpc("recalculate_all_points");
    if (error) {
      console.error("recalculate_all_points failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // También puntúa las predicciones especiales (deriva campeón/finalista/3ro/
    // país con más goles de los partidos; goleador hardcodeado). Best-effort:
    // si la función no existe todavía, no rompe el recálculo de partidos.
    let specials = 0;
    const { data: sData, error: sError } = await supabase.rpc("grade_special_predictions");
    if (sError) console.error("grade_special_predictions failed:", sError.message);
    else if (typeof sData === "number") specials = sData;

    return NextResponse.json({ recalculated: typeof data === "number" ? data : 0, specials });
  } catch (err) {
    console.error("admin/recalculate exception:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST: admin panel button
export const POST = handleRecalculate;

// GET: allow manual trigger with Bearer token
export const GET = handleRecalculate;
