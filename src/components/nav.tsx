"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Trophy, Settings, Target, Bell, Star, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",    icon: Home,     label: "Inicio"   },
  { href: "/predicciones", icon: List,     label: "Predecir" },
  { href: "/tabla",        icon: Trophy,   label: "Tabla"    },
  { href: "/desafios",     icon: Target,   label: "Desafíos" },
  { href: "/grupo",        icon: Settings, label: "Grupo"    },
];

const MOCK_NOTIFICATIONS = [
  { id: "n1", emoji: "🔴", message: "Portugal vs Inglaterra comenzó hace 5 minutos", time: "Hace 5 min", read: false },
  { id: "n2", emoji: "⚽", message: "¡ARG 3-1 URU! Ganaste 1 punto en ese partido", time: "Ayer", read: false },
  { id: "n3", emoji: "📈", message: "Sofía R. subió al 1er puesto después del partido Brasil-Alemania", time: "Ayer", read: true },
  { id: "n4", emoji: "⏰", message: "Quedan 3 partidos sin predecir en la Fase de Grupos", time: "Hace 2 días", read: true },
  { id: "n5", emoji: "⭐", message: "Recordá completar tus predicciones especiales — cierran el 11 de junio", time: "Hace 3 días", read: true },
];

function NotificationsDrawer({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAllRead = () => setNotifications((n) => n.map((notif) => ({ ...notif, read: true })));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-[#0d1f3c] border-l border-white/10 h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0d1f3c]/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-white/70" />
            <span className="text-sm font-semibold text-white">Notificaciones</span>
            {unreadCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-green-400 hover:text-green-300 transition-colors">
                Marcar leídas
              </button>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 px-5 py-4 ${!notif.read ? "bg-white/5" : ""}`}
            >
              <span className="text-lg shrink-0 mt-0.5">{notif.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${notif.read ? "text-white/50" : "text-white"}`}>
                  {notif.message}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">{notif.time}</p>
              </div>
              {!notif.read && (
                <span className="h-2 w-2 rounded-full bg-green-400 shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full px-3 py-6">
      <div className="mb-8 px-3">
        <p className="text-lg font-black text-white">Prode <span className="text-green-400">26</span></p>
        <p className="text-xs text-white/40">Mundial 2026</p>
      </div>

      <nav className="space-y-0.5 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (pathname.startsWith(href + "/") && href !== "/predicciones");
          const isPrediccionesActive = href === "/predicciones" && pathname.startsWith("/predicciones") && pathname !== "/predicciones/especiales";
          const active = isActive || isPrediccionesActive;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                active
                  ? "bg-green-600/20 text-green-400"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 shrink-0 h-[18px] w-[18px]", active && "drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]")} />
              {label}
            </Link>
          );
        })}

        <Link
          href="/predicciones/especiales"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
            pathname === "/predicciones/especiales"
              ? "bg-yellow-500/20 text-yellow-400"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          )}
        >
          <Star className="h-[18px] w-[18px] shrink-0" />
          Especiales
        </Link>
      </nav>

      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-white/5 transition-all mt-4"
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        Cerrar sesión
      </Link>
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a1628]/95 backdrop-blur-lg pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all",
                isActive ? "text-green-400" : "text-white/40 hover:text-white/70"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_rgba(74,222,128,0.6)]")} />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && <span className="block h-1 w-1 rounded-full bg-green-400 mt-0.5" />}
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
  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h1 className="text-base font-bold text-white">{title}</h1>
            {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
          </div>
          {showNotification && (
            <button
              onClick={() => setShowDrawer(true)}
              className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
              aria-label="Ver notificaciones"
            >
              <Bell className="h-5 w-5 text-white/70" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
          )}
        </div>
      </header>
      {showDrawer && <NotificationsDrawer onClose={() => setShowDrawer(false)} />}
    </>
  );
}
