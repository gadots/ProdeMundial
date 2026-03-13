"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CURRENT_USER_NAME, MOCK_PRODE } from "@/lib/mock-data";
import { Bell, BellOff, LogOut, ChevronRight, User } from "lucide-react";

const MOCK_NOTIFICATIONS = [
  { id: "n1", emoji: "🔴", message: "Portugal vs Inglaterra comenzó hace 5 minutos", time: "Hace 5 min", read: false },
  { id: "n2", emoji: "⚽", message: "¡ARG 3-1 URU! Ganaste 1 punto en ese partido", time: "Ayer", read: false },
  { id: "n3", emoji: "📈", message: "Sofía R. subió al 1er puesto después del partido Brasil-Alemania", time: "Ayer", read: true },
  { id: "n4", emoji: "⏰", message: "Quedan 3 partidos sin predecir en la Fase de Grupos", time: "Hace 2 días", read: true },
  { id: "n5", emoji: "⭐", message: "Recordá completar tus predicciones especiales — cierran el 11 de junio", time: "Hace 3 días", read: true },
];

export default function PerfilPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [pushEnabled, setPushEnabled] = useState(false);
  const me = MOCK_PRODE.members.find((m) => m.id === "u1")!;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((n) => n.map((notif) => ({ ...notif, read: true })));

  return (
    <div>
      <TopBar title="Perfil" />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">

        {/* Profile card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shrink-0">
                {me.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatarUrl} alt={me.displayName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-white truncate">{me.displayName}</h2>
                <p className="text-sm text-white/40">guido@ejemplo.com</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="phase">#{me.rank} en el prode</Badge>
                  <Badge variant="default">{me.totalPoints} pts</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
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
                <button
                  onClick={() => setPushEnabled(!pushEnabled)}
                  className={`flex items-center gap-1 text-xs transition-colors ${pushEnabled ? "text-green-400" : "text-white/40"}`}
                >
                  {pushEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                  {pushEnabled ? "On" : "Off"}
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    !notif.read ? "bg-white/5" : ""
                  }`}
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
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-white/40 mb-3 font-semibold uppercase tracking-wider">Mis estadísticas</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center rounded-xl bg-white/5 p-3">
                <p className="text-xl font-black text-green-400">{me.totalPoints}</p>
                <p className="text-[10px] text-white/40 mt-0.5">Pts totales</p>
              </div>
              <div className="text-center rounded-xl bg-white/5 p-3">
                <p className="text-xl font-black text-white">#{me.rank}</p>
                <p className="text-[10px] text-white/40 mt-0.5">Posición</p>
              </div>
              <div className="text-center rounded-xl bg-white/5 p-3">
                <p className="text-xl font-black text-yellow-400">3</p>
                <p className="text-[10px] text-white/40 mt-0.5">Exactos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardContent className="p-0 divide-y divide-white/10">
            <Link href="/" className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
              <LogOut className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">Cerrar sesión</span>
              <ChevronRight className="h-4 w-4 text-white/20 ml-auto" />
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
