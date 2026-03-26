import { getAllUsers } from "@/lib/supabase/admin-queries";
import { DeleteUserButton } from "./_components/delete-user-button";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function AdminUsersPage() {
  let users: Awaited<ReturnType<typeof getAllUsers>> = [];
  let error: string | null = null;

  try {
    users = await getAllUsers();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Usuarios</h1>
          <p className="text-sm text-white/40 mt-0.5">{users.length} registrados</p>
        </div>
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Email</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Prodes</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Predicciones</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Último login</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-white/30">
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-600/40 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-indigo-300">{user.display_name[0]?.toUpperCase()}</span>
                        </div>
                      )}
                      <span className="text-white font-medium">{user.display_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60 font-mono text-xs">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-white/5 text-white/70 text-xs font-medium">
                      {user.prodes_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 rounded-full bg-white/5 text-white/70 text-xs font-medium">
                      {user.predictions_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">{formatDate(user.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <DeleteUserButton userId={user.id} displayName={user.display_name} />
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
