"use client";

import { useEffect, useState } from "react";
import { selfHealOnce } from "@/lib/self-heal";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [healing, setHealing] = useState(true);

  useEffect(() => {
    console.error("Error en la app:", error);
    // Primer crash de la sesión → purgar SW/caches y recargar (cura bundle viejo).
    // Si ya se curó antes, mostramos el fallback con el error real.
    const healed = selfHealOnce();
    setHealing(healed);
  }, [error]);

  if (healing) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-amber-500" />
        <p className="text-sm text-white/50">Actualizando la app…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-3xl">⚠️</p>
      <div>
        <p className="text-base font-semibold text-white">Algo se rompió</p>
        <p className="mt-1 text-sm text-white/50">Probá reintentar o recargar la página.</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => reset()}
          className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          Reintentar
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/15"
        >
          Recargar
        </button>
      </div>
      {error?.message && (
        <p className="mt-2 max-w-sm break-words text-[10px] text-white/25">{error.message}</p>
      )}
    </div>
  );
}
