#!/usr/bin/env node
// scripts/sync-now.cjs — one-shot sync, corre con: node scripts/sync-now.cjs
// Lee .env.local automáticamente

const fs = require("fs");
const path = require("path");

// ── Leer .env.local ─────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    });
}

const { createClient } = require("@supabase/supabase-js");

const FOOTBALL_DATA_API = "https://api.football-data.org/v4";
const WORLD_CUP_ID = 2000;

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

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) { console.error("❌  FOOTBALL_DATA_API_KEY no configurada"); process.exit(1); }
  if (!supabaseUrl || !serviceKey) { console.error("❌  NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas"); process.exit(1); }

  console.log("🌐  Fetching partidos desde football-data.org…");
  const res = await fetch(
    `${FOOTBALL_DATA_API}/competitions/${WORLD_CUP_ID}/matches`,
    { headers: { "X-Auth-Token": apiKey } }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌  API error ${res.status}: ${text.slice(0, 300)}`);
    process.exit(1);
  }

  const data = await res.json();
  const apiMatches = data.matches ?? [];
  console.log(`📋  ${apiMatches.length} partidos recibidos de la API`);

  if (apiMatches.length === 0) {
    console.log("⚠️  Sin partidos para sincronizar");
    return;
  }

  // Agrupar por fase para mostrar resumen
  const byPhase = {};
  for (const m of apiMatches) {
    const phase = mapStage(String(m.stage ?? ""));
    byPhase[phase] = (byPhase[phase] ?? 0) + 1;
  }
  console.log("   Por fase:", Object.entries(byPhase).map(([k, v]) => `${k}×${v}`).join(", "));

  const rows = apiMatches.map((m) => {
    const home = m.homeTeam ?? {};
    const away = m.awayTeam ?? {};
    const fullTime = m.score?.fullTime ?? {};
    return {
      api_id: String(m.id),
      home_team_name: home.name ?? "",
      home_team_short: home.tla ?? "",
      away_team_name: away.name ?? "",
      away_team_short: away.tla ?? "",
      phase: mapStage(String(m.stage ?? "")),
      group_name: m.group ? String(m.group) : null,
      date: m.utcDate,
      status: mapStatus(String(m.status ?? "")),
      home_score: fullTime.home ?? null,
      away_score: fullTime.away ?? null,
      venue: m.venue ? String(m.venue) : null,
      updated_at: new Date().toISOString(),
    };
  });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("💾  Upserting en Supabase…");
  const { error: upsertError } = await supabase
    .from("matches")
    .upsert(rows, { onConflict: "api_id" });

  if (upsertError) {
    console.error("❌  Upsert error:", upsertError.message);
    process.exit(1);
  }

  console.log(`✅  ${rows.length} partidos sincronizados correctamente`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("❌  Error inesperado:", err);
  process.exit(1);
});
