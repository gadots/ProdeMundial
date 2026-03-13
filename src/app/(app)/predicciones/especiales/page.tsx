"use client";

import { useState } from "react";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALL_WC_TEAMS } from "@/lib/mock-data";
import { Lock, Save, Check, Info, Search } from "lucide-react";

const SPECIAL_PREDICTIONS = [
  { id: "champion",   label: "Campeón del Mundo",         description: "¿Qué selección va a ganar el Mundial 2026?",              points: 60, emoji: "🏆", type: "team"   },
  { id: "finalist",   label: "Finalista",                 description: "¿Qué otro equipo llega a la final (sin ganarla)?",        points: 35, emoji: "🥈", type: "team"   },
  { id: "third",      label: "Tercer Puesto",             description: "¿Quién gana el partido por el tercer puesto?",            points: 25, emoji: "🥉", type: "team"   },
  { id: "topScorer",  label: "Goleador del Torneo",       description: "¿Quién va a meter más goles en el Mundial?",             points: 40, emoji: "⚽", type: "player" },
  { id: "mostGoals",  label: "Selección con más goles",   description: "¿Qué país va a anotar más goles en total?",              points: 20, emoji: "🎯", type: "team"   },
] as const;

const LOCK_DATE = new Date("2026-06-11T18:00:00Z");
const LOCKED = new Date() >= LOCK_DATE;

const TOP_PLAYERS = [
  "Lionel Messi", "Kylian Mbappé", "Vinicius Jr.", "Erling Haaland",
  "Harry Kane", "Cristiano Ronaldo", "Pedri", "Jude Bellingham",
  "Rodri", "Mohamed Salah", "Lamine Yamal", "Phil Foden",
  "Bukayo Saka", "Federico Valverde", "Vinícius Jr.", "Raphinha",
  "Antoine Griezmann", "Bernardo Silva", "Bruno Fernandes", "Rúben Dias",
  "Gavi", "Dani Olmo", "Alvaro Morata", "Robert Lewandowski",
  "Romelu Lukaku", "Cody Gakpo", "Wout Weghorst", "Julian Alvarez",
  "Paulo Dybala", "Lautaro Martínez", "Darwin Núñez", "Luis Suárez",
  "Neymar Jr.", "Raphael Veiga", "Son Heung-min", "Takumi Minamino",
  "Achraf Hakimi", "Hakim Ziyech", "Victor Osimhen", "Mohamed Salah",
  "Sadio Mané", "Vincent Aboubakar", "André Ayew",
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
  const [showAll, setShowAll] = useState(false);

  const filtered = search.trim()
    ? ALL_WC_TEAMS.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.shortName.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_WC_TEAMS;

  const visible = showAll || search.trim() ? filtered : filtered.slice(0, 12);
  const hiddenCount = filtered.length - 12;

  return (
    <div className="mt-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowAll(true); }}
          placeholder="Buscar selección…"
          disabled={disabled}
          className="w-full h-9 rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-40"
        />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {visible.map((team) => (
          <button
            key={team.id}
            disabled={disabled}
            onClick={() => onChange(team.id)}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-2 px-1 text-[10px] transition-all border ${
              value === team.id
                ? "bg-green-600/20 border-green-500/40 text-green-300"
                : "bg-white/5 border-white/8 text-white/60 hover:bg-white/10 hover:text-white/80"
            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span className="text-lg leading-none">{team.flag}</span>
            <span className="font-semibold leading-tight text-center truncate w-full px-0.5">{team.shortName}</span>
          </button>
        ))}
      </div>
      {!search.trim() && !showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Ver {hiddenCount} selecciones más ↓
        </button>
      )}
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
        className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-40"
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-[#0f1f3d] shadow-xl overflow-hidden">
          {filtered.slice(0, 6).map((p) => (
            <button
              key={p}
              onMouseDown={() => { onChange(p); setShowSuggestions(false); }}
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

export default function EspecialesPage() {
  const [predictions, setPredictions] = useState<Record<string, string>>({
    champion: "ARG",
    topScorer: "Lionel Messi",
  });
  const [saved, setSaved] = useState(false);

  const totalPotential = SPECIAL_PREDICTIONS.reduce((sum, p) => sum + p.points, 0);
  const filled = SPECIAL_PREDICTIONS.filter((p) => predictions[p.id]).length;

  const handleSave = () => {
    if (LOCKED) return;
    setSaved(true);
  };

  const getTeamName = (id: string) => ALL_WC_TEAMS.find((t) => t.id === id)?.name ?? id;

  return (
    <div>
      <TopBar
        title="Predicciones Especiales"
        subtitle={`Hasta ${totalPotential} pts en juego`}
      />

      <div className="mx-auto max-w-lg px-4 pt-4">
        {LOCKED ? (
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

        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/50">{filled} de {SPECIAL_PREDICTIONS.length} completadas</span>
          <span className="text-xs text-green-400 font-semibold">{totalPotential} pts disponibles</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 mb-5">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${(filled / SPECIAL_PREDICTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-3 px-4">
        {SPECIAL_PREDICTIONS.map((pred) => (
          <Card key={pred.id} className={LOCKED ? "opacity-70" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{pred.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{pred.label}</p>
                    <p className="text-xs text-white/40">{pred.description}</p>
                  </div>
                </div>
                <Badge variant="default" className="shrink-0 ml-2">
                  {pred.points} pts
                </Badge>
              </div>

              {pred.type === "team" ? (
                <TeamSelector
                  value={predictions[pred.id] ?? ""}
                  onChange={(v) => { setPredictions((p) => ({ ...p, [pred.id]: v })); setSaved(false); }}
                  disabled={LOCKED}
                />
              ) : (
                <PlayerInput
                  value={predictions[pred.id] ?? ""}
                  onChange={(v) => { setPredictions((p) => ({ ...p, [pred.id]: v })); setSaved(false); }}
                  disabled={LOCKED}
                />
              )}

              {predictions[pred.id] && (
                <div className="mt-2.5 flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span className="text-xs text-green-400">
                    {pred.type === "team" ? getTeamName(predictions[pred.id]) : predictions[pred.id]}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {!LOCKED && (
          <Button onClick={handleSave} className="w-full" disabled={filled === 0} size="lg">
            {saved ? (
              <><Check className="h-4 w-4" /> Predicciones guardadas</>
            ) : (
              <><Save className="h-4 w-4" /> Guardar predicciones especiales</>
            )}
          </Button>
        )}
      </div>

      <div className="h-6" />
    </div>
  );
}
