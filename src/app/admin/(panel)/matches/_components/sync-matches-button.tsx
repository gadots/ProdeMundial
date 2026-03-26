"use client";

import { useState } from "react";
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export function SyncMatchesButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/sync-matches", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ""}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ ok: true, message: data.message ?? "Sincronización completada" });
      } else {
        setResult({ ok: false, message: data.error ?? `Error ${res.status}` });
      }
    } catch {
      setResult({ ok: false, message: "Error de red" });
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <div className={`flex items-center gap-1.5 text-xs ${result.ok ? "text-green-400" : "text-red-400"}`}>
          {result.ok ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {result.message}
        </div>
      )}
      <button
        onClick={handleSync}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sincronizar partidos
      </button>
    </div>
  );
}
