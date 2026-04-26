"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegister() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check if there's already a waiting worker (e.g. page refreshed after update)
        if (reg.waiting && navigator.serviceWorker.controller) {
          setShowUpdate(true);
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });
      })
      .catch((err) => console.warn("SW registration failed:", err));

    // When a new SW takes control, reload to apply the update
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl bg-[#0a1628] border border-amber-500/30 px-4 py-3 shadow-lg shadow-black/40">
      <span className="text-sm text-white/80">Nueva versión disponible</span>
      <button
        onClick={() => {
          navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
        }}
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#0a1628] hover:bg-amber-400 transition-colors"
      >
        Recargar
      </button>
    </div>
  );
}
