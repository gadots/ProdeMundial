import { getAdminStats } from "@/lib/supabase/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let stats = { users: 0, prodes: 0, matches: 0, predictions: 0 };
  let error: string | null = null;

  try {
    stats = await getAdminStats();
  } catch (e) {
    error = (e as Error).message;
  }

  const CARDS = [
    { label: "Usuarios", value: stats.users, icon: "👥", href: "/admin/users" },
    { label: "Prodes", value: stats.prodes, icon: "🏆", href: "/admin/prodes" },
    { label: "Partidos", value: stats.matches, icon: "⚽", href: "/admin/matches" },
    { label: "Predicciones", value: stats.predictions, icon: "📝", href: null },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-0.5">Resumen general del sistema</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          Error al cargar estadísticas: {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              {card.href && (
                <a
                  href={card.href}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Ver →
                </a>
              )}
            </div>
            <p className="text-3xl font-black text-white">{stats.users === 0 && error ? "—" : card.value}</p>
            <p className="text-xs text-white/40 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-sm font-semibold text-white/70 mb-3">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-sm text-white transition-colors"
          >
            👥 Gestionar usuarios
          </a>
          <a
            href="/admin/prodes"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-sm text-white transition-colors"
          >
            🏆 Gestionar prodes
          </a>
          <a
            href="/admin/matches"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-sm text-white transition-colors"
          >
            ⚽ Partidos y sincronización
          </a>
        </div>
      </div>
    </div>
  );
}
