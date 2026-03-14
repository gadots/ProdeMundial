"use client";

import Link from "next/link";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/app-context";
import { LogOut, ChevronRight, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";


export default function PerfilPage() {
  const { user, prode } = useApp();
  const me = prode?.members.find((m) => m.id === user?.id) ?? prode?.members[0];

  const handleLogout = async () => {
    await createClient().auth.signOut();
    window.location.href = "/";
  };

  return (
    <div>
      <TopBar title="Perfil" />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">

        {/* Profile card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shrink-0">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-white truncate">{user?.displayName ?? "…"}</h2>
                {user?.email && <p className="text-sm text-white/40">{user.email}</p>}
                <div className="flex items-center gap-2 mt-2">
                  {me && (
                    <>
                      <Badge variant="phase">#{me.rank} en el prode</Badge>
                      <Badge variant="default">{me.totalPoints} pts</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {me && (
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
                  <p className="text-xl font-black text-orange-400">{me.streak.current}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Racha actual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings */}
        <Card>
          <CardContent className="p-0 divide-y divide-white/10">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
              <LogOut className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">Cerrar sesión</span>
              <ChevronRight className="h-4 w-4 text-white/20 ml-auto" />
            </button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
