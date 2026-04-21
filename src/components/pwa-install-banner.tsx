"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X, Share } from "lucide-react";

const STORAGE_KEY = "pwa-banner-dismissed";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const deferredPrompt = useRef<{ prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (isStandalone()) return;

    if (isIos()) {
      setIos(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as unknown as typeof deferredPrompt.current;
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") dismiss();
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-2xl border border-blue-500/25 bg-blue-500/8 px-4 py-3">
      <div className="mt-0.5 shrink-0 rounded-xl bg-blue-500/20 p-1.5">
        <Download className="h-4 w-4 text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">Instalá la app</p>
        {ios ? (
          <p className="mt-0.5 text-xs text-white/50 leading-snug">
            Tocá{" "}
            <Share className="inline h-3 w-3 text-blue-400 mx-0.5 align-[-1px]" />
            {" "}en Safari → <span className="text-white/70 font-medium">Agregar a inicio</span>
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-white/50">Funciona sin internet · Acceso rápido desde tu pantalla</p>
        )}
        {!ios && (
          <button
            onClick={handleInstall}
            className="mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
          >
            Instalar
          </button>
        )}
      </div>

      <button
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1 text-white/30 hover:text-white/60 transition-colors"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
