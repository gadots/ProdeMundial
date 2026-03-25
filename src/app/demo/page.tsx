"use client";

import { useEffect } from "react";

export default function DemoPage() {
  useEffect(() => {
    // Setear cookie client-side antes de navegar — garantiza que el server la lea
    document.cookie = "demo_mode=1; path=/; max-age=86400; SameSite=Lax";
    window.location.replace("/dashboard");
  }, []);

  return (
    <div className="min-h-dvh bg-[#0a1628] flex items-center justify-center">
      <p className="text-white/50 text-sm">Cargando modo demo…</p>
    </div>
  );
}
