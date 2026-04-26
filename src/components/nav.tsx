"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, List, Trophy, Settings, Bell, Star, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/components/app-context";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard",               icon: Home,     label: "Dashboard"    },
  { href: "/predicciones",            icon: List,     label: "Predicciones" },
  { href: "/tabla",                   icon: Trophy,   label: "Posiciones"   },
  { href: "/predicciones/especiales", icon: Star,     label: "Especiales"   },
  { href: "/grupo",                   icon: Settings, label: "Config"       },
];

interface Notification {
  id: string;
  emoji: string;
  message: string;
  time: string;
  unread: boolean;
}

function useNotifications(): Notification[] {
  const { matches, predictions } = useApp();

  return useMemo(() => {
    const notifs: Notification[] = [];
    const now = new Date();

    // Live matches
    matches
      .filter((m) => m.status === "LIVE")
      .forEach((m) => {
        notifs.push({
          id: `live-${m.id}`,
          emoji: "🔴",
          message: `${m.homeTeam.name} vs ${m.awayTeam.name} está en vivo ahora`,
          time: "Ahora",
          unread: true,
        });
      });

    // Recently scored predictions (points_earned set, match finished)
    const scoredPreds = Object.values(predictions)
      .filter((p) => p.pointsEarned !== undefined)
      .slice(-5);
    scoredPreds.forEach((p) => {
      const match = matches.find((m) => m.id === p.matchId);
      if (!match || match.status !== "FINISHED") return;
      notifs.push({
        id: `pts-${p.matchId}`,
        emoji: (p.pointsEarned ?? 0) > 0 ? "⚽" : "❌",
        message:
          (p.pointsEarned ?? 0) > 0
            ? `Ganaste ${p.pointsEarned} pts en ${match.homeTeam.shortName} vs ${match.awayTeam.shortName}`
            : `Sin puntos en ${match.homeTeam.shortName} vs ${match.awayTeam.shortName}`,
        time: "Reciente",
        unread: false,
      });
    });

    // Upcoming unpredicted matches (next 48 h)
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const unpredicted = matches.filter(
      (m) =>
        m.status === "SCHEDULED" &&
        new Date(m.date) > now &&
        new Date(m.date) <= in48h &&
        !predictions[m.id]
    );
    if (unpredicted.length > 0) {
      notifs.push({
        id: "upcoming-unpredicted",
        emoji: "⏰",
        message: `Tenés ${unpredicted.length} partido${unpredicted.length > 1 ? "s" : ""} sin predecir en las próximas 48 horas`,
        time: "Próximamente",
        unread: true,
      });
    }

    return notifs;
  }, [matches, predictions]);
}

function NotificationsDrawer({ onClose }: { onClose: () => void }) {
  const computed = useNotifications();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const notifications = computed.map((n) => ({
    ...n,
    unread: n.unread && !readIds.has(n.id),
  }));

  const unreadCount = notifications.filter((n) => n.unread).length;
  const markAllRead = () => setReadIds(new Set(computed.map((n) => n.id)));

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
              <button onClick={markAllRead} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                Marcar leídas
              </button>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-white/30 text-sm gap-2">
              <Bell className="h-8 w-8 opacity-30" />
              <p>Sin notificaciones</p>
            </div>
          )}
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-3 px-5 py-4 ${notif.unread ? "bg-white/5" : ""}`}
            >
              <span className="text-lg shrink-0 mt-0.5">{notif.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${notif.unread ? "text-white" : "text-white/50"}`}>
                  {notif.message}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">{notif.time}</p>
              </div>
              {notif.unread && (
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
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
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex flex-col h-full px-3 py-6">
      <div className="mb-8 px-3">
        <p className="text-lg font-bold text-white">Prode <span className="text-amber-400">26</span></p>
        <p className="text-xs text-white/40">Mundial 2026</p>
      </div>

      <nav className="space-y-0.5 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (pathname.startsWith(href + "/") && href !== "/predicciones");
          const isPrediccionesActive = href === "/predicciones" && pathname.startsWith("/predicciones") && !pathname.startsWith("/predicciones/especiales");
          const active = isActive || isPrediccionesActive;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                active
                  ? "bg-amber-600/20 text-amber-400"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 shrink-0 h-[18px] w-[18px]", active && "drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]")} />
              {label}
            </Link>
          );
        })}

      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-white/5 transition-all mt-4 w-full text-left"
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        Cerrar sesión
      </button>
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0a1628]/95 backdrop-blur-lg pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === "/predicciones"
              ? pathname === href ||
                (pathname.startsWith("/predicciones/") &&
                  !pathname.startsWith("/predicciones/especiales"))
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all",
                isActive ? "text-amber-400" : "text-white/40 hover:text-white/70"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]")} />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && <span className="block h-1 w-1 rounded-full bg-amber-400 mt-0.5" />}
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
  showProfile = false,
}: {
  title: string;
  subtitle?: string;
  showNotification?: boolean;
  showProfile?: boolean;
}) {
  const router = useRouter();
  const [showDrawer, setShowDrawer] = useState(false);
  const notifications = useNotifications();
  const hasUnread = notifications.some((n) => n.unread);
  const { user } = useApp();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a1628]/95 backdrop-blur-lg">
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h1 className="text-base font-bold text-white">{title}</h1>
            {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1">
            {showNotification && (
              <button
                onClick={() => setShowDrawer(true)}
                className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
                aria-label="Ver notificaciones"
              >
                <Bell className="h-5 w-5 text-white/70" />
                {hasUnread && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />}
              </button>
            )}
            {showProfile && user && (
              <button
                onClick={() => router.push("/perfil")}
                className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-amber-500 to-blue-600 flex items-center justify-center hover:opacity-80 transition-opacity ml-1 shrink-0"
                aria-label="Mi perfil"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white select-none">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>
      {showDrawer && <NotificationsDrawer onClose={() => setShowDrawer(false)} />}
    </>
  );
}
