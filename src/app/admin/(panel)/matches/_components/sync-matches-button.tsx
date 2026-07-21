"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, CheckCircle, AlertCircle, Bug, Calculator } from "lucide-react";

interface ApiMatch {
  api_id: unknown;
  home: unknown;
  away: unknown;
  utcDate: unknown;
  stage: unknown;
  status: unknown;
  home_score: number | null;
  away_score: number | null;
  duration?: string | null;
  winner?: string | null;
  penalty_home?: number | null;
  penalty_away?: number | null;
}

interface ApiDebugResult {
  fetched_at: string;
  total_matches: number;
  by_stage: Record<string, number>;
  status_summary: Record<string, number>;
  knockout_matches: ApiMatch[];
  error?: string;
}

export function SyncMatchesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [debugData, setDebugData] = useState<ApiDebugResult | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const detail = `✓ ${data.synced ?? 0} partidos · ${data.calculated ?? 0} puntos calculados · ${data.decayedTokens ?? 0} tokens caducados`;
        setResult({ ok: true, message: detail });
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error ?? `Error ${res.status}` });
      }
    } catch {
      setResult({ ok: false, message: "Error de red" });
    }
    setLoading(false);
  };

  const handleRecalculate = async () => {
    if (!confirm("Recalcular TODOS los puntos del torneo? Corrige los puntos congelados contra marcadores viejos. Es seguro correrlo varias veces.")) return;
    setRecalculating(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/recalculate", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ ok: true, message: `✓ ${data.recalculated ?? 0} predicciones · ${data.specials ?? 0} especiales` });
        router.refresh();
      } else {
        setResult({ ok: false, message: data.error ?? `Error ${res.status}` });
      }
    } catch {
      setResult({ ok: false, message: "Error de red" });
    }
    setRecalculating(false);
  };

  const handleDebug = async () => {
    setDebugging(true);
    setDebugData(null);
    setShowDebug(true);
    try {
      const res = await fetch("/api/admin/api-debug");
      const data = await res.json().catch(() => ({ error: "JSON parse error" }));
      setDebugData(data);
    } catch {
      setDebugData({ error: "Error de red", fetched_at: "", total_matches: 0, by_stage: {}, status_summary: {}, knockout_matches: [] });
    }
    setDebugging(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {result && (
          <div className={`flex items-center gap-1.5 text-xs ${result.ok ? "text-green-400" : "text-red-400"}`}>
            {result.ok ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar
          </button>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            title="Recalcular todos los puntos del torneo (corrige puntos congelados)"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 disabled:opacity-50 px-3 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Recalcular todo
          </button>
          <button
            onClick={handleDebug}
            disabled={debugging}
            title="Ver qué devuelve football-data.org"
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 px-3 py-2.5 text-sm font-semibold text-white/70 transition-colors"
          >
            {debugging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
            API
          </button>
        </div>
      </div>

      {showDebug && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs font-mono space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-[11px]">Respuesta football-data.org</span>
            <button onClick={() => setShowDebug(false)} className="text-white/30 hover:text-white/60 text-[10px]">✕ cerrar</button>
          </div>
          {debugging && <p className="text-white/40">Consultando API…</p>}
          {debugData?.error && <p className="text-red-400">Error: {debugData.error}</p>}
          {debugData && !debugData.error && (
            <>
              {/* Total + conteo por estado */}
              <div className="flex flex-wrap gap-2">
                <span className="text-white/40">Total: <span className="text-white">{debugData.total_matches}</span></span>
                {Object.entries(debugData.status_summary ?? {}).map(([s, n]) => (
                  <span key={s} className={`${s === "FINISHED" ? "text-green-400" : s === "IN_PLAY" ? "text-yellow-400" : "text-white/40"}`}>
                    {s}: <span className="text-white">{n}</span>
                  </span>
                ))}
              </div>

              {/* Conteo por fase cruda de la API — clave para ver si llegan los 16 de LAST_32 */}
              <div className="flex flex-wrap gap-2 border-t border-white/5 pt-2">
                <span className="text-white/30 text-[10px]">Por fase:</span>
                {Object.entries(debugData.by_stage ?? {}).map(([s, n]) => (
                  <span key={s} className="text-white/50">
                    {s}: <span className="text-white">{n}</span>
                  </span>
                ))}
              </div>

              {/* Todos los cruces de llaves (no GROUP_STAGE) */}
              <div className="border-t border-white/5 pt-2">
                <p className="text-white/30 text-[10px] mb-1">Llaves ({(debugData.knockout_matches ?? []).length}):</p>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {(debugData.knockout_matches ?? []).length === 0 && (
                    <p className="text-white/30">La API no devolvió ningún partido de llaves.</p>
                  )}
                  {(debugData.knockout_matches ?? []).map((m, i) => (
                    <div key={i} className={`flex gap-2 py-0.5 ${m.status === "FINISHED" ? "text-green-300" : m.status === "IN_PLAY" ? "text-yellow-300" : "text-white/40"}`}>
                      <span className="shrink-0 text-white/30 w-20 truncate" title={String(m.stage ?? "")}>{String(m.stage ?? "—")}</span>
                      <span className="flex-1 truncate">{(m.home as string) ?? "TBD"} vs {(m.away as string) ?? "TBD"}</span>
                      <span className="shrink-0">
                        {m.home_score !== null ? `${m.home_score}-${m.away_score}` : "—"}
                        {m.penalty_home != null && (
                          <span className="text-amber-400"> (p{m.penalty_home}-{m.penalty_away})</span>
                        )}
                        {m.penalty_home == null && m.duration === "PENALTY_SHOOTOUT" && (
                          <span className="text-amber-400"> (pen {m.winner === "HOME_TEAM" ? "L" : "V"})</span>
                        )}
                      </span>
                      <span className="shrink-0 text-white/30">{String(m.utcDate).slice(5, 16)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-white/25 text-[10px]">{debugData.fetched_at}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
