/**
 * Pobla la tabla `matches` con los datos reales del Mundial 2026
 * desde football-data.org.
 *
 * Requiere Node 18+ (fetch built-in). Lee las keys de .env.local
 *
 * Uso (desde la raíz del proyecto):
 *   node scripts/populate-matches.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// -------------------------------------------------------
// Leer .env.local
// -------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

let env = {};
try {
  env = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
      .map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
} catch {
  console.error("No se encontró .env.local — asegurate de correr este script desde la raíz del proyecto.");
  process.exit(1);
}

const FOOTBALL_DATA_KEY = env.FOOTBALL_DATA_API_KEY;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const WORLD_CUP_ID = 2000; // FIFA World Cup en football-data.org

if (!FOOTBALL_DATA_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan variables de entorno en .env.local");
  console.error("  FOOTBALL_DATA_API_KEY:", !!FOOTBALL_DATA_KEY);
  console.error("  NEXT_PUBLIC_SUPABASE_URL:", !!SUPABASE_URL);
  console.error("  SUPABASE_SERVICE_ROLE_KEY:", !!SERVICE_ROLE_KEY);
  process.exit(1);
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function mapStage(stage) {
  const map = {
    GROUP_STAGE: "GROUP",
    ROUND_OF_32: "ROUND_OF_32",
    LAST_16: "ROUND_OF_16",
    QUARTER_FINALS: "QUARTER_FINAL",
    SEMI_FINALS: "SEMI_FINAL",
    FINAL: "FINAL",
  };
  return map[stage] ?? "GROUP";
}

function mapStatus(status) {
  const map = {
    SCHEDULED: "SCHEDULED",
    TIMED: "SCHEDULED",
    IN_PLAY: "LIVE",
    PAUSED: "LIVE",
    FINISHED: "FINISHED",
    POSTPONED: "POSTPONED",
  };
  return map[status] ?? "SCHEDULED";
}

async function supabaseRest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: "return=minimal",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("json") && res.status !== 204) return res.json();
  return null;
}

async function rpc(fnName, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`  ⚠️  RPC ${fnName} error ${res.status}: ${text.slice(0, 200)}`);
    return null;
  }
  return res.json();
}

// -------------------------------------------------------
// Main
// -------------------------------------------------------

async function main() {
  console.log("🌍  Conectando a football-data.org...");

  // 1. Verificar que el ID de competición existe
  const compRes = await fetch(
    `https://api.football-data.org/v4/competitions/${WORLD_CUP_ID}`,
    { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
  );

  if (!compRes.ok) {
    const text = await compRes.text();
    console.error(`❌  Error verificando competición ${WORLD_CUP_ID}: ${compRes.status}`);
    console.error(text.slice(0, 300));

    // Intentar con el endpoint de lista para encontrar el ID correcto
    console.log("\n🔍  Buscando ID correcto del Mundial...");
    const listRes = await fetch(
      "https://api.football-data.org/v4/competitions/?plan=TIER_ONE",
      { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
    );
    if (listRes.ok) {
      const { competitions } = await listRes.json();
      const wc = competitions?.find(
        (c) => c.code === "WC" || c.name?.toLowerCase().includes("world cup")
      );
      if (wc) {
        console.log(`✅  Mundial encontrado: ID=${wc.id}, nombre="${wc.name}", código="${wc.code}"`);
        console.log(`\n   → Actualizá WORLD_CUP_ID en scripts/populate-matches.mjs y src/lib/sync-matches.ts a ${wc.id}`);
      } else {
        console.log("Competiciones disponibles:");
        competitions?.forEach((c) => console.log(`  ID=${c.id} code=${c.code} "${c.name}"`));
      }
    }
    process.exit(1);
  }

  const comp = await compRes.json();
  console.log(`✅  Competición: "${comp.name}" (ID: ${WORLD_CUP_ID}, edición: ${comp.currentSeason?.year ?? "?"})`);

  // 2. Traer partidos
  console.log("\n⬇️   Descargando partidos...");
  const matchesRes = await fetch(
    `https://api.football-data.org/v4/competitions/${WORLD_CUP_ID}/matches`,
    { headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } }
  );

  if (!matchesRes.ok) {
    const text = await matchesRes.text();
    console.error(`❌  Error descargando partidos: ${matchesRes.status}`);
    console.error(text.slice(0, 300));
    process.exit(1);
  }

  const { matches: apiMatches } = await matchesRes.json();
  console.log(`   ${apiMatches.length} partidos encontrados`);

  if (apiMatches.length === 0) {
    console.log("⚠️  No hay partidos aún disponibles para esta competición.");
    process.exit(0);
  }

  // 3. Transformar
  const rows = apiMatches.map((m) => {
    const home = m.homeTeam ?? {};
    const away = m.awayTeam ?? {};
    const fullTime = m.score?.fullTime ?? {};

    return {
      api_id: String(m.id),
      home_team_name: home.name ?? "TBD",
      home_team_short: home.tla ?? "TBD",
      away_team_name: away.name ?? "TBD",
      away_team_short: away.tla ?? "TBD",
      phase: mapStage(String(m.stage ?? "")),
      group_name: m.group ? String(m.group).replace("GROUP_", "") : null,
      date: m.utcDate,
      status: mapStatus(String(m.status ?? "")),
      home_score: fullTime.home ?? null,
      away_score: fullTime.away ?? null,
      venue: m.venue ?? null,
      updated_at: new Date().toISOString(),
    };
  });

  // 4. Upsert en Supabase
  console.log("\n⬆️   Upsertando en Supabase...");
  const BATCH = 50;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await supabaseRest("/matches?on_conflict=api_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(batch),
    });
    upserted += batch.length;
    process.stdout.write(`   ${upserted}/${rows.length}\r`);
  }
  console.log(`✅  ${upserted} partidos upserted                    `);

  // 5. Calcular puntos en partidos terminados
  const finished = rows.filter((r) => r.status === "FINISHED");
  if (finished.length > 0) {
    console.log(`\n🧮  Calculando puntos en ${finished.length} partidos terminados...`);

    // Traer IDs de los partidos en DB
    const idsParam = finished.map((r) => `api_id.eq.${r.api_id}`).join(",");
    const dbMatches = await supabaseRest(
      `/matches?select=id,calculated_at&or=(${idsParam})`
    );

    let calculated = 0;
    for (const m of dbMatches ?? []) {
      if (!m.calculated_at) {
        const result = await rpc("calculate_match_points", { p_match_id: m.id });
        if (typeof result === "number") calculated += result;
      }
    }
    console.log(`✅  ${calculated} predicciones calculadas`);
  }

  // 6. Decay tokens si grupos terminaron
  const decayResult = await rpc("decay_group_tokens", {});
  if (typeof decayResult === "number" && decayResult > 0) {
    console.log(`✅  ${decayResult} tokens decaídos (grupos terminados)`);
  }

  console.log("\n🎉  ¡Listo! La tabla matches está poblada.");
  console.log("   Entrá a la app y vas a ver los partidos del Mundial 2026.\n");
}

main().catch((err) => {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
});
