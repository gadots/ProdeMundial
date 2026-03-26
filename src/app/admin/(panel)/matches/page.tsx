import { getAllMatches } from "@/lib/supabase/admin-queries";
import { SyncMatchesButton } from "./_components/sync-matches-button";

export const dynamic = "force-dynamic";

const PHASE_LABELS: Record<string, string> = {
  GROUP: "Grupos",
  ROUND_OF_32: "Ronda de 32",
  ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semifinal",
  FINAL: "Final",
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Programado", className: "bg-blue-500/15 text-blue-300" },
  LIVE: { label: "En vivo", className: "bg-green-500/15 text-green-300" },
  FINISHED: { label: "Finalizado", className: "bg-white/10 text-white/50" },
  POSTPONED: { label: "Postergado", className: "bg-yellow-500/15 text-yellow-300" },
  CANCELLED: { label: "Cancelado", className: "bg-red-500/15 text-red-300" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AdminMatchesPage() {
  let matches: Awaited<ReturnType<typeof getAllMatches>> = [];
  let error: string | null = null;

  try {
    matches = await getAllMatches();
  } catch (e) {
    error = (e as Error).message;
  }

  const byPhase = matches.reduce<Record<string, typeof matches>>((acc, m) => {
    (acc[m.phase] ??= []).push(m);
    return acc;
  }, {});

  const phases = ["GROUP", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Partidos</h1>
          <p className="text-sm text-white/40 mt-0.5">{matches.length} en total</p>
        </div>
        <SyncMatchesButton />
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          Error: {error}
        </div>
      )}

      {phases.map((phase) => {
        const phaseMatches = byPhase[phase];
        if (!phaseMatches?.length) return null;
        return (
          <div key={phase}>
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2 px-1">
              {PHASE_LABELS[phase] ?? phase} ({phaseMatches.length})
            </h2>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-white/40">Partido</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-white/40">Resultado</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-white/40">Fecha</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-white/40">Estadio</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-white/40">Estado</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-white/40">Pred.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {phaseMatches.map((m) => {
                      const status = STATUS_STYLES[m.status] ?? { label: m.status, className: "bg-white/5 text-white/50" };
                      return (
                        <tr key={m.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                            {m.home_team_name} vs {m.away_team_name}
                            {m.group_name && (
                              <span className="ml-2 text-xs text-white/30">({m.group_name})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-white/80">
                            {m.home_score !== null && m.away_score !== null
                              ? `${m.home_score} - ${m.away_score}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{formatDate(m.date)}</td>
                          <td className="px-4 py-3 text-white/40 text-xs max-w-[10rem] truncate">{m.venue ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-white/50 text-xs">{m.predictions_count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {matches.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-12 text-center">
          <p className="text-sm text-white/30 mb-4">No hay partidos cargados</p>
          <p className="text-xs text-white/20">Usá el botón "Sincronizar" para importar los partidos desde la API</p>
        </div>
      )}
    </div>
  );
}
