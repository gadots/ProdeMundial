"use client";

import { useEffect, useState } from "react";
import { selfHealOnce } from "@/lib/self-heal";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [healing, setHealing] = useState(true);

  useEffect(() => {
    console.error("Error global:", error);
    setHealing(selfHealOnce());
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#0a1628", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          {healing ? (
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Actualizando la app…</p>
          ) : (
            <>
              <p style={{ fontSize: 30, margin: 0 }}>⚠️</p>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Algo se rompió</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => reset()}
                  style={{ borderRadius: 12, border: "none", background: "#d97706", color: "#fff", padding: "8px 16px", fontSize: 14, fontWeight: 600 }}
                >
                  Reintentar
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={{ borderRadius: 12, border: "none", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "8px 16px", fontSize: 14, fontWeight: 600 }}
                >
                  Recargar
                </button>
              </div>
              {error?.message && (
                <p style={{ marginTop: 8, maxWidth: 360, wordBreak: "break-word", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                  {error.message}
                </p>
              )}
            </>
          )}
        </div>
      </body>
    </html>
  );
}
