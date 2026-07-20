"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/app-context";
import * as Q from "@/lib/supabase/queries";
import { ALL_WC_TEAMS } from "@/lib/mock-data";
import { MOCK_PRODE_SPECIAL_PREDICTIONS, MOCK_SPECIAL_RESULTS } from "@/lib/mock-data";
import { Flag } from "@/components/flag";
import { Lock, Save, Check, Info, Search } from "lucide-react";
import type { Member } from "@/lib/types";

const IS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<your-project>") &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://")
);

const SPECIAL_PREDICTIONS = [
  { id: "champion",   label: "Campeón del Mundo",         description: "¿Qué selección va a ganar el Mundial 2026?",              points: 60, emoji: "🏆", type: "team"   },
  { id: "finalist",   label: "Finalista",                 description: "¿Qué otro equipo llega a la final (sin ganarla)?",        points: 35, emoji: "🥈", type: "team"   },
  { id: "third",      label: "Tercer Puesto",             description: "¿Quién gana el partido por el tercer puesto?",            points: 25, emoji: "🥉", type: "team"   },
  { id: "topScorer",  label: "Goleador del Torneo",       description: "¿Quién va a meter más goles en el Mundial?",             points: 40, emoji: "⚽", type: "player" },
  { id: "mostGoals",  label: "Selección con más goles",   description: "¿Qué país va a anotar más goles en total?",              points: 20, emoji: "🎯", type: "team"   },
] as const;

type SpecialId = (typeof SPECIAL_PREDICTIONS)[number]["id"];

const PRED_KEY: Record<SpecialId, keyof Q.SpecialPredRow> = {
  champion:  "champion",
  finalist:  "finalist",
  third:     "third",
  topScorer: "topScorer",
  mostGoals: "mostGoals",
};

const RESULT_KEY: Record<SpecialId, keyof Q.SpecialResults> = {
  champion:  "champion",
  finalist:  "finalist",
  third:     "third",
  topScorer: "topScorer",
  mostGoals: "mostGoals",
};

// ¿La predicción `val` acierta el resultado real `actual` para este especial?
function isSpecialHit(type: "team" | "player", val: string | null, actual: string | null): boolean {
  if (!val || !actual) return false;
  if (type === "player") return val.trim().toLowerCase() === actual.trim().toLowerCase();
  return val === actual;
}

const LOCK_DATE = new Date("2026-06-11T18:00:00Z");
const LOCKED = new Date() >= LOCK_DATE;

const TOP_PLAYERS = [
  "Lionel Messi", "Kylian Mbappé", "Vinicius Jr.", "Erling Haaland",
  "Harry Kane", "Cristiano Ronaldo", "Pedri", "Jude Bellingham",
  "Rodri", "Mohamed Salah", "Lamine Yamal", "Phil Foden",
  "Bukayo Saka", "Federico Valverde", "Raphinha",
  "Antoine Griezmann", "Bernardo Silva", "Bruno Fernandes", "Rúben Dias",
  "Gavi", "Dani Olmo", "Alvaro Morata",
  "Romelu Lukaku", "Cody Gakpo", "Wout Weghorst", "Julian Alvarez",
  "Paulo Dybala", "Lautaro Martínez", "Darwin Núñez", "Luis Suárez",
  "Neymar Jr.", "Raphael Veiga", "Son Heung-min", "Takumi Minamino",
  "Achraf Hakimi", "Hakim Ziyech", "Sadio Mané", "André Ayew",
  "Edin Džeko", "Thiago Almada",
];

function TeamSelector({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? ALL_WC_TEAMS.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.shortName.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_WC_TEAMS;

  return (
    <div className="mt-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar selección…"
          disabled={disabled}
          className="w-full h-9 rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-40"
        />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {filtered.map((team) => (
          <button
            key={team.id}
            disabled={disabled}
            onClick={() => onChange(team.id)}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 text-[10px] transition-all border ${
              value === team.id
                ? "bg-amber-600/20 border-amber-500/40 text-amber-300"
                : "bg-white/5 border-white/8 text-white/60 hover:bg-white/10 hover:text-white/80"
            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Flag tla={team.id} size={40} className="w-6 h-auto rounded-[1px] mb-0.5" />
            <span className="font-semibold leading-tight text-center truncate w-full px-0.5">{team.shortName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filtered = value.trim()
    ? TOP_PLAYERS.filter(
        (p) => p.toLowerCase().includes(value.toLowerCase()) && p.toLowerCase() !== value.toLowerCase()
      )
    : [];

  return (
    <div className="relative mt-3">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        disabled={disabled}
        placeholder="Escribí el nombre del jugador…"
        className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40"
      />
      {showSuggestions && filtered.length > 0 && (
        <div
          className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-[#0f1f3d] shadow-xl overflow-hidden"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.slice(0, 6).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setShowSuggestions(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[10px] text-white/30">
        Escribí el nombre y seleccioná de las sugerencias para evitar errores de tipeo
      </p>
    </div>
  );
}

function ProdeSpecialsTable({ prodeId, members, results }: { prodeId: string; members: Member[]; results: Q.SpecialResults | null }) {
  const { isMockMode } = useApp();
  const [rows, setRows] = useState<Q.SpecialPredRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const graded = !!results && Object.values(results).some((v) => v);

  useEffect(() => {
    if (!IS_SUPABASE || isMockMode) {
      setRows(MOCK_PRODE_SPECIAL_PREDICTIONS);
      setLoading(false);
      return;
    }
    Q.getAllSpecialPredictions(prodeId)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [prodeId, isMockMode]);

  if (loading) {
    return <p className="text-center text-white/30 text-sm py-10">Cargando…</p>;
  }

  const byUser = Object.fromEntries((rows ?? []).map((r) => [r.userId, r]));
  const ranked = [...members].sort((a, b) => a.rank - b.rank);
  const getTeamShort = (id: string) => ALL_WC_TEAMS.find((t) => t.id === id)?.shortName ?? id;
  const showCell = (type: "team" | "player", val: string | null) => {
    if (!val) return <span className="text-white/15">—</span>;
    if (type === "team") return (
      <div className="flex flex-col items-center gap-0.5">
        <Flag tla={val} size={20} className="w-5 h-auto rounded-[1px]" />
        <span className="text-[9px] text-white/40 leading-none">{getTeamShort(val)}</span>
      </div>
    );
    return <span className="text-white/70 text-[10px] leading-tight block truncate" style={{ maxWidth: 60 }}>{val.split(" ").slice(-1)[0]}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 -mx-4 sm:mx-0">
      <table className="w-full text-xs" style={{ minWidth: 440 }}>
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="text-left pl-4 pr-3 py-2.5 text-white/40 font-medium sticky left-0 bg-[#0a1628] z-10" style={{ minWidth: 110 }}>
              Jugador
            </th>
            {SPECIAL_PREDICTIONS.map((p) => (
              <th key={p.id} className="text-center px-2 py-2.5 text-white/40 font-medium" style={{ minWidth: 64 }}>
                <span className="text-base leading-none" title={p.label}>{p.emoji}</span>
                <p className="text-[9px] text-white/25 mt-0.5 font-normal">{p.points} pts</p>
              </th>
            ))}
            {graded && <th className="text-center px-2 py-2.5 text-white/40 font-medium" style={{ minWidth: 44 }}>Pts</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {graded && (
            <tr className="bg-amber-500/10 border-b border-amber-500/20">
              <td className="pl-4 pr-3 py-2.5 sticky left-0 bg-[#12203c] z-10 text-[11px] font-bold text-amber-300">Resultado</td>
              {SPECIAL_PREDICTIONS.map((pred) => (
                <td key={pred.id} className="px-2 py-2.5 text-center align-middle">
                  {showCell(pred.type, results![RESULT_KEY[pred.id]])}
                </td>
              ))}
              <td className="px-2 py-2.5" />
            </tr>
          )}
          {ranked.map((member) => {
            const row = byUser[member.id];
            let userPts = 0;
            return (
              <tr key={member.id} className="hover:bg-white/[0.03] transition-colors">
                <td className="pl-4 pr-3 py-2.5 sticky left-0 bg-[#0a1628] z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/30 text-[10px]">#{member.rank}</span>
                    <span className="font-medium text-white truncate" style={{ maxWidth: 72 }}>{member.displayName}</span>
                  </div>
                </td>
                {SPECIAL_PREDICTIONS.map((pred) => {
                  const val = row?.[PRED_KEY[pred.id]] ?? null;
                  const hit = graded && isSpecialHit(pred.type, val, results![RESULT_KEY[pred.id]]);
                  if (hit) userPts += pred.points;
                  return (
                    <td key={pred.id} className={`px-2 py-2.5 text-center align-middle ${hit ? "bg-green-500/10" : ""}`}>
                      {showCell(pred.type, val)}
                      {hit && <span className="block text-[9px] text-green-400 leading-none mt-0.5">✓</span>}
                    </td>
                  );
                })}
                {graded && (
                  <td className="px-2 py-2.5 text-center font-black text-amber-400 tabular-nums">{userPts}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EspecialesPage() {
  const { user, prodeId, prode, isMockMode } = useApp();
  const [tab, setTab] = useState<"mine" | "prode">("mine");
  const [predictions, setPredictions] = useState<Record<string, string>>({
    champion: "ARG",
    topScorer: "Lionel Messi",
  });
  const [results, setResults] = useState<Q.SpecialResults | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !prodeId) return;
    if (!IS_SUPABASE || isMockMode) return;
    Q.getSpecialPredictions(user.id, prodeId)
      .then((data) => {
        if (Object.keys(data).length > 0) setPredictions(data);
      })
      .catch(() => {});
  }, [user?.id, prodeId, isMockMode]);

  useEffect(() => {
    if (!IS_SUPABASE || isMockMode) { setResults(MOCK_SPECIAL_RESULTS); return; }
    Q.getSpecialResults().then(setResults).catch(() => setResults(null));
  }, [isMockMode]);

  // Puntos ya definidos = todos los resultados cargados.
  const graded = !!results && Object.values(results).some((v) => v);
  const myPoints = graded
    ? SPECIAL_PREDICTIONS.reduce((sum, p) => {
        const actual = results![RESULT_KEY[p.id]];
        return sum + (isSpecialHit(p.type, predictions[p.id] ?? null, actual) ? p.points : 0);
      }, 0)
    : 0;

  const totalPotential = SPECIAL_PREDICTIONS.reduce((sum, p) => sum + p.points, 0);
  const filled = SPECIAL_PREDICTIONS.filter((p) => predictions[p.id]).length;

  const handleSave = async () => {
    if (LOCKED) return;
    setSaving(true);
    try {
      if (user && prodeId) {
        await Q.upsertSpecialPredictions(user.id, prodeId, predictions);
      }
    } catch {
      // mock/offline
    }
    setSaving(false);
    setSaved(true);
  };

  const getTeamName = (id: string) => ALL_WC_TEAMS.find((t) => t.id === id)?.name ?? id;

  return (
    <div>
      <TopBar
        title="Predicciones Especiales"
        subtitle={`Hasta ${totalPotential} pts en juego`}
        showProfile
      />

      {/* Tabs */}
      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="flex rounded-xl bg-white/5 p-1 gap-1 mb-4">
          {(["mine", "prode"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                tab === t
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {t === "mine" ? "Tus predicciones" : "Predicciones del prode"}
            </button>
          ))}
        </div>
      </div>

      {tab === "mine" && (
        <>
          <div className="mx-auto max-w-lg px-4">
            {graded ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3 mb-4">
                <div>
                  <p className="text-sm font-bold text-amber-300">Resultados finales</p>
                  <p className="text-xs text-white/50">Así te fue en las predicciones especiales</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-amber-400 leading-none">{myPoints}</p>
                  <p className="text-[10px] text-white/40">de {totalPotential} pts</p>
                </div>
              </div>
            ) : LOCKED ? (
              <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-3 mb-4">
                <Lock className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">
                  Las predicciones especiales están cerradas — se bloquearon al inicio del torneo
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3 mb-4">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-300 font-semibold mb-0.5">Se cierran al inicio del torneo</p>
                  <p className="text-xs text-white/50">
                    El 11 de junio de 2026 a las 18:00 UTC ya no vas a poder cambiarlas. Los puntos se suman al finalizar el torneo.
                  </p>
                </div>
              </div>
            )}

            {!graded && (
              <>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/50">{filled} de {SPECIAL_PREDICTIONS.length} completadas</span>
                  <span className="text-xs text-amber-400 font-semibold">{totalPotential} pts disponibles</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 mb-5">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${(filled / SPECIAL_PREDICTIONS.length) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mx-auto max-w-lg space-y-3 px-4">
            {SPECIAL_PREDICTIONS.map((pred) => {
              const actual = graded ? results![RESULT_KEY[pred.id]] : null;
              const myVal = predictions[pred.id] ?? "";
              const hit = graded && isSpecialHit(pred.type, myVal || null, actual);
              const showVal = (v: string) => pred.type === "team" ? getTeamName(v) : v;
              return (
              <Card key={pred.id} className={!graded && LOCKED ? "opacity-70" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{pred.emoji}</span>
                      <div>
                        <p className="text-sm font-bold text-white">{pred.label}</p>
                        <p className="text-xs text-white/40">{pred.description}</p>
                      </div>
                    </div>
                    <Badge variant={graded ? (hit ? "default" : "secondary") : "default"} className="shrink-0 ml-2">
                      {graded ? (hit ? `+${pred.points}` : "0") : `${pred.points} pts`}
                    </Badge>
                  </div>

                  {graded ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <span className="text-[11px] text-white/40">Resultado</span>
                        <div className="flex items-center gap-1.5">
                          {pred.type === "team" && actual && <Flag tla={actual} size={20} className="w-5 h-auto rounded-[1px]" />}
                          <span className="text-xs font-semibold text-white">{actual ? showVal(actual) : "—"}</span>
                        </div>
                      </div>
                      <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${hit ? "bg-green-500/10" : "bg-white/5"}`}>
                        <span className="text-[11px] text-white/40">Tu predicción</span>
                        <div className="flex items-center gap-1.5">
                          {pred.type === "team" && myVal && <Flag tla={myVal} size={20} className="w-5 h-auto rounded-[1px]" />}
                          <span className={`text-xs font-semibold ${hit ? "text-green-400" : "text-white/60"}`}>
                            {myVal ? showVal(myVal) : "sin predicción"}
                          </span>
                          <span className="text-xs">{hit ? "✓" : "✗"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {pred.type === "team" ? (
                        <TeamSelector
                          value={myVal}
                          onChange={(v) => { setPredictions((p) => ({ ...p, [pred.id]: v })); setSaved(false); }}
                          disabled={LOCKED}
                        />
                      ) : (
                        <PlayerInput
                          value={myVal}
                          onChange={(v) => { setPredictions((p) => ({ ...p, [pred.id]: v })); setSaved(false); }}
                          disabled={LOCKED}
                        />
                      )}
                      {myVal && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <span className="text-xs text-amber-400">{showVal(myVal)}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              );
            })}

            {!LOCKED && !graded && (
              <Button type="button" onClick={handleSave} className="w-full" disabled={filled === 0 || saving} size="lg">
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : saved ? (
                  <><Check className="h-4 w-4" /> Predicciones guardadas</>
                ) : (
                  <><Save className="h-4 w-4" /> Guardar predicciones especiales</>
                )}
              </Button>
            )}
          </div>

          <div className="h-6" />
        </>
      )}

      {tab === "prode" && (
        <div className="mx-auto max-w-lg px-4">
          <p className="text-xs text-white/40 mb-3">
            {graded
              ? "Resultados finales. Los aciertos están marcados en verde con sus puntos."
              : "Lo que predijo cada jugador del prode. Los puntos aparecen al finalizar el torneo."}
          </p>
          {prode && prodeId ? (
            <ProdeSpecialsTable prodeId={prodeId} members={prode.members} results={results} />
          ) : (
            <p className="text-center text-white/30 text-sm py-10">Sin prode activo</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/25">
            {SPECIAL_PREDICTIONS.map((p) => (
              <span key={p.id}>{p.emoji} {p.label}</span>
            ))}
          </div>
          <div className="h-6" />
        </div>
      )}
    </div>
  );
}
