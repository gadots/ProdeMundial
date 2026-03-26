import Link from "next/link";
import { notFound } from "next/navigation";
import { getProdeDetail } from "@/lib/supabase/admin-queries";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AdminProdeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let prode: Awaited<ReturnType<typeof getProdeDetail>> = null;

  try {
    prode = await getProdeDetail(id);
  } catch (e) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          Error: {(e as Error).message}
        </div>
      </div>
    );
  }

  if (!prode) notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/prodes" className="text-white/40 hover:text-white/70 transition-colors text-sm">
          ← Prodes
        </Link>
        <span className="text-white/20">/</span>
        <h1 className="text-xl font-black text-white">{prode.name}</h1>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Miembros", value: prode.members_count },
          { label: "Predicciones", value: prode.predictions_count },
          { label: "Creado", value: formatDate(prode.created_at) },
          { label: "Admin", value: prode.admin_name },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-white/40 mb-1">{item.label}</p>
            <p className="text-lg font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Invite code + prize */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-white/40 mb-1">Código de invitación</p>
            <span className="font-mono text-sm bg-white/5 border border-white/10 rounded px-3 py-1.5 text-white">
              {prode.invite_code}
            </span>
          </div>
          {prode.prize_description && (
            <div>
              <p className="text-xs text-white/40 mb-1">Premio</p>
              <p className="text-sm text-white">{prode.prize_description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Members ranking */}
      <div>
        <h2 className="text-sm font-semibold text-white/70 mb-3">Tabla de posiciones</h2>
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Email</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Pts</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Se unió</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {prode.members.map((member, i) => (
                <tr key={member.user_id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-white/60" : i === 2 ? "text-amber-600" : "text-white/30"}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{member.display_name}</td>
                  <td className="px-4 py-3 text-white/50 font-mono text-xs">{member.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-white">{member.total_points}</span>
                    <span className="text-white/40 text-xs ml-1">pts</span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">{formatDate(member.joined_at)}</td>
                </tr>
              ))}
              {prode.members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-white/30">
                    Sin miembros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
