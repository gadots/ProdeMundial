"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, CheckCircle, AlertCircle, Bug } from "lucide-react";

interface ApiMatch {
  api_id: unknown;
  home: unknown;
  away: unknown;
  utcDate: unknown;
  status: unknown;
  home_score: number | null;
  away_score: number | null;
}

interface ApiDebugResult {
  fetched_at: string;
  total_matches: number;
  status_summary: Record<string, number>;
  recent_matches: ApiMatch[];
  error?: string;
}

export function SyncMatchesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);
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

  const handleDebug = async () => {
    setDebugging(true);
    setDebugData(null);
    setShowDebug(true);
    try {
      const res = await fetch("/api/admin/api-debug");
      const data = await res.json().catch(() => ({ error: "JSON parse error" }));
      setDebugData(data);
    } catch {
      setDebugData({ error: "Error de red", fetched_at: "", total_matches: 0, status_summary: {}, recent_matches: [] });
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
              <div className="flex flex-wrap gap-2">
                <span className="text-white/40">Total: <span className="text-white">{debugData.total_matches}</span></span>
                {Object.entries(debugData.status_summary).map(([s, n]) => (
                  <span key={s} className={`${s === "FINISHED" ? "text-green-400" : s === "IN_PLAY" ? "text-yellow-400" : "text-white/40"}`}>
                    {s}: <span className="text-white">{n}</span>
                  </span>
                ))}
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {debugData.recent_matches.map((m, i) => (
                  <div key={i} className={`flex gap-2 py-0.5 ${m.status === "FINISHED" ? "text-green-300" : m.status === "IN_PLAY" ? "text-yellow-300" : "text-white/40"}`}>
                    <span className="shrink-0">{(m.status as string).slice(0, 8).padEnd(8)}</span>
                    <span className="flex-1 truncate">{m.home as string} vs {m.away as string}</span>
                    <span className="shrink-0">
                      {m.home_score !== null ? `${m.home_score}-${m.away_score}` : "—"}
                    </span>
                    <span className="shrink-0 text-white/30">{String(m.utcDate).slice(5, 16)}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/25 text-[10px]">{debugData.fetched_at}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
