"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Trophy, Settings, Star, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Inicio" },
  { href: "/predicciones", icon: List, label: "Predecir" },
  { href: "/tabla", icon: Trophy, label: "Tabla" },
  { href: "/predicciones/especiales", icon: Star, label: "Especiales" },
  { href: "/grupo", icon: Settings, label: "Grupo" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a1628]/95 backdrop-blur-lg pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all",
                isActive
                  ? "text-green-400"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]")} />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="block h-1 w-1 rounded-full bg-green-400 mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({
  title,
  subtitle,
  showNotification = false,
}: {
  title: string;
  subtitle?: string;
  showNotification?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
        <div>
          <h1 className="text-base font-bold text-white">{title}</h1>
          {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
        </div>
        {showNotification && (
          <Link href="/perfil" className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Bell className="h-5 w-5 text-white/70" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </Link>
        )}
      </div>
    </header>
  );
}
