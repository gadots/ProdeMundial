import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { LogoutButton } from "../_components/logout-button";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/users",     label: "Usuarios",  icon: "👥" },
  { href: "/admin/prodes",    label: "Prodes",    icon: "🏆" },
  { href: "/admin/matches",   label: "Partidos",  icon: "⚽" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  if (!isAdminAuthenticated(cookieStore)) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-dvh bg-[#080f1e] flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-white/10 flex flex-col">
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <p className="text-sm font-black text-white">Admin</p>
              <p className="text-[10px] text-white/30">ProdeMundial</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
