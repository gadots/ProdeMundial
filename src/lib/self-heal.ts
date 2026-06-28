// Auto-recuperación ante un crash client-side.
//
// La causa más común de un crash intermitente en producción es un bundle viejo
// servido desde caché (el service worker, en navegación, usa network-first con
// timeout: en redes lentas sirve el shell viejo y el JS desactualizado corre
// contra la API/data nueva → TypeError). Ante eso, lo correcto es purgar SW +
// caches y recargar una sola vez para levantar la versión fresca.
//
// Guard por sessionStorage para NO entrar en loop si el error fuese
// determinístico: solo auto-curamos una vez por sesión (pestaña). Devuelve true
// si disparó la auto-cura (el caller debería mostrar "recargando…"), false si ya
// se curó antes en esta sesión (el caller muestra el fallback con el error real).

const HEAL_FLAG = "prode-self-healed";

export function selfHealOnce(): boolean {
  if (typeof window === "undefined") return false;

  let alreadyHealed = false;
  try {
    alreadyHealed = sessionStorage.getItem(HEAL_FLAG) === "1";
  } catch {
    // sessionStorage inaccesible (modo privado/storage bloqueado) → no curamos.
    return false;
  }

  if (alreadyHealed) return false;

  try {
    sessionStorage.setItem(HEAL_FLAG, "1");
  } catch {
    return false;
  }

  // Purgar caches del SW y desregistrarlo, después recargar. Las operaciones son
  // best-effort: si alguna falla, igual recargamos para intentar el bundle nuevo.
  const cleanup = Promise.allSettled([
    typeof caches !== "undefined"
      ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      : Promise.resolve(),
    typeof navigator !== "undefined" && navigator.serviceWorker
      ? navigator.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.unregister())))
      : Promise.resolve(),
  ]);

  cleanup.finally(() => {
    window.location.reload();
  });

  return true;
}
