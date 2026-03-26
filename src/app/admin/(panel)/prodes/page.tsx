import Link from "next/link";
import { getAllProdes } from "@/lib/supabase/admin-queries";
import { DeleteProdeButton } from "./_components/delete-prode-button";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AdminProdesPage() {
  let prodes: Awaited<ReturnType<typeof getAllProdes>> = [];
  let error: string | null = null;

  try {
    prodes = await getAllProdes();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-black text-white">Prodes</h1>
        <p className="text-sm text-white/40 mt-0.5">{prodes.length} creados</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          Error: {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Código</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Miembros</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Premio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {prodes.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-white/30">
                    No hay prodes creados
                  </td>
                </tr>
              )}
              {prodes.map((prode) => (
                <tr key={prode.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/prodes/${prode.id}`}
                      className="font-medium text-white hover:text-indigo-300 transition-colors"
                    >
                      {prode.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/60">{prode.admin_name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70">
                      {prode.invite_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-white/5 text-white/70 text-xs font-medium">
                      {prode.members_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs max-w-[12rem] truncate">
                    {prode.prize_description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">{formatDate(prode.created_at)}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Link
                      href={`/admin/prodes/${prode.id}`}
                      className="p-1.5 rounded-lg text-white/20 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Ver detalle"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <DeleteProdeButton prodeId={prode.id} prodeName={prode.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
