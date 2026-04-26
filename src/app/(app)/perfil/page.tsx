"use client";

import { useState } from "react";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/app-context";
import { LogOut, ChevronRight, User, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateDisplayName } from "@/lib/supabase/queries";

export default function PerfilPage() {
  const { user, prode, refreshUser } = useApp();
  const me = prode?.members.find((m) => m.id === user?.id) ?? prode?.members[0];

  // ── Edit name ──
  const [nameValue, setNameValue] = useState(user?.displayName ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");

  const handleSaveName = async () => {
    if (!user || !nameValue.trim() || nameValue.trim() === user.displayName) return;
    setNameSaving(true);
    setNameError("");
    setNameSuccess(false);
    const { error } = await updateDisplayName(user.id, nameValue.trim());
    setNameSaving(false);
    if (error) {
      setNameError(error);
    } else {
      setNameSuccess(true);
      await refreshUser();
      setTimeout(() => setNameSuccess(false), 3000);
    }
  };

  // ── Change password ──
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passSaving, setPassSaving] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState("");

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess(false);
    if (password.length < 6) { setPassError("Mínimo 6 caracteres"); return; }
    if (password !== confirmPassword) { setPassError("Las contraseñas no coinciden"); return; }
    setPassSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    setPassSaving(false);
    if (error) {
      setPassError(error.message);
    } else {
      setPassSuccess(true);
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => { setPassSuccess(false); setShowPassword(false); }, 2500);
    }
  };

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
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 to-blue-600 flex items-center justify-center shrink-0">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{user?.displayName ?? "…"}</h2>
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
                  <p className="text-xl font-black text-amber-400">{me.totalPoints}</p>
                  <p className="text-xs text-white/40 mt-0.5">Pts totales</p>
                </div>
                <div className="text-center rounded-xl bg-white/5 p-3">
                  <p className="text-xl font-black text-white">#{me.rank}</p>
                  <p className="text-xs text-white/40 mt-0.5">Posición</p>
                </div>
                <div className="text-center rounded-xl bg-white/5 p-3">
                  <p className="text-xl font-black text-orange-400">{me.streak.current}</p>
                  <p className="text-xs text-white/40 mt-0.5">Racha actual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit name */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Tu nombre</p>
            <div className="flex gap-2">
              <Input
                value={nameValue}
                onChange={(e) => { setNameValue(e.target.value); setNameSuccess(false); setNameError(""); }}
                placeholder="Tu nombre"
                disabled={nameSaving}
                maxLength={40}
              />
              <Button
                onClick={handleSaveName}
                disabled={nameSaving || !nameValue.trim() || nameValue.trim() === user?.displayName}
                className="shrink-0"
              >
                {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </div>
            {nameSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">Nombre actualizado</p>
              </div>
            )}
            {nameError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300">{nameError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => { setShowPassword((v) => !v); setPassError(""); setPassSuccess(false); }}
              className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors"
            >
              <KeyRound className="h-4 w-4 text-white/50" />
              <span className="text-sm text-white/80 flex-1 text-left">Cambiar contraseña</span>
              <ChevronRight className={`h-4 w-4 text-white/20 transition-transform ${showPassword ? "rotate-90" : ""}`} />
            </button>
            {showPassword && (
              <form onSubmit={handleSavePassword} className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                <Input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={passSaving || passSuccess}
                />
                <Input
                  type="password"
                  placeholder="Confirmá la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={passSaving || passSuccess}
                />
                {passError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">{passError}</p>
                  </div>
                )}
                {passSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-300">¡Contraseña actualizada!</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={passSaving || passSuccess}>
                  {passSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar contraseña"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardContent className="p-0">
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
