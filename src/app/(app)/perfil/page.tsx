"use client";

import { useState, useEffect } from "react";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/app-context";
import { LogOut, ChevronRight, User, CheckCircle2, AlertCircle, Loader2, KeyRound, Link2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateDisplayName } from "@/lib/supabase/queries";
import { signOut } from "./actions";

export default function PerfilPage() {
  const { user, prode, refreshUser, allProdes, mainProdeId, setMainProdeId, matches, predictions, predictionsLoading } = useApp();
  const me = prode?.members.find((m) => m.id === user?.id) ?? prode?.members[0];

  // ── Edit name ──
  const [nameValue, setNameValue] = useState(user?.displayName ?? "");
  // Sync when user loads asynchronously (context was still loading on first render)
  useEffect(() => {
    if (user?.displayName) setNameValue(user.displayName);
  }, [user?.displayName]);
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

  // ── Copycat sync ──
  const [syncSaving, setSyncSaving] = useState(false);
  const hasManyProdes = allProdes.length >= 2;

  // Pending state: separates local selection from the saved value.
  // null = not editing, UI shows the saved mainProdeId state.
  const [pendingMode, setPendingMode] = useState<"libre" | "copycat" | null>(null);
  const [pendingProdeId, setPendingProdeId] = useState<string | null>(null);

  const displayMode = pendingMode ?? (mainProdeId !== null ? "copycat" : "libre");
  const displayProdeId = pendingMode === "copycat" ? pendingProdeId : mainProdeId;
  const isDirty = pendingMode !== null;

  const handleSetMainProde = async (id: string | null) => {
    setSyncSaving(true);
    await setMainProdeId(id);
    setSyncSaving(false);
    setPendingMode(null);
    setPendingProdeId(null);
  };

  const handleConfirm = () => {
    handleSetMainProde(pendingMode === "copycat" ? pendingProdeId : null);
  };

  const handleCancel = () => {
    setPendingMode(null);
    setPendingProdeId(null);
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

  const handleLogout = () => signOut();

  // ── Export predictions ──
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  const PHASE_LABELS: Record<string, string> = {
    GROUP: "Fase de grupos",
    ROUND_OF_32: "Ronda de 32",
    ROUND_OF_16: "Octavos de final",
    QUARTER_FINAL: "Cuartos de final",
    SEMI_FINAL: "Semifinal",
    THIRD_PLACE: "Tercer puesto",
    FINAL: "Final",
  };

  const STATUS_LABELS: Record<string, string> = {
    SCHEDULED: "Programado",
    LIVE: "En vivo",
    FINISHED: "Finalizado",
    POSTPONED: "Postergado",
  };

  const handleExport = () => {
    const matchMap = new Map(matches.map((m) => [m.id, m]));
    const rows = Object.values(predictions).map((pred) => {
      const match = matchMap.get(pred.matchId);
      return {
        fecha: match?.date ?? "",
        fase: PHASE_LABELS[match?.phase ?? ""] ?? (match?.phase ?? ""),
        grupo: match?.group ?? "",
        local: match?.homeTeam.name ?? "",
        visitante: match?.awayTeam.name ?? "",
        pred_local: pred.homeGoals,
        pred_visitante: pred.awayGoals,
        potenciador: `${pred.multiplier}x`,
        ganador_penales: pred.penaltyWinner === "home" ? "local" : pred.penaltyWinner === "away" ? "visitante" : "",
        resultado_local: match?.homeScore ?? "",
        resultado_visitante: match?.awayScore ?? "",
        estado: STATUS_LABELS[match?.status ?? ""] ?? (match?.status ?? ""),
        puntos: pred.pointsEarned ?? "",
      };
    });

    rows.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const safeName = (prode?.name ?? "prode")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const date = new Date().toISOString().slice(0, 10);
    const filename = `predicciones-${safeName}-${date}.${exportFormat}`;

    let content: string;
    let mimeType: string;

    if (exportFormat === "json") {
      content = JSON.stringify(rows, null, 2);
      mimeType = "application/json";
    } else {
      const headers = Object.keys(rows[0] ?? {});
      const escape = (v: unknown) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h as keyof typeof r])).join(","))];
      content = lines.join("\n");
      mimeType = "text/csv;charset=utf-8;";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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

        {/* Sync between prodes (only shown when user is in 2+ prodes) */}
        {hasManyProdes && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-white/40" />
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Sincronización entre prodes</p>
                {syncSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30 ml-auto" />}
              </div>

              {/* Libre mode */}
              <button
                onClick={() => {
                  if (syncSaving) return;
                  if (displayMode !== "libre") setPendingMode("libre");
                }}
                disabled={syncSaving}
                className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  displayMode === "libre"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-white/10 bg-white/3 hover:border-white/20"
                }`}
              >
                <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                  displayMode === "libre" ? "border-amber-500" : "border-white/30"
                }`}>
                  {displayMode === "libre" && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${displayMode === "libre" ? "text-amber-400" : "text-white/70"}`}>Libre</p>
                  <p className="text-xs text-white/35 mt-0.5">Cada prode tiene sus propias predicciones</p>
                </div>
              </button>

              {/* Copycat mode */}
              <div className={`rounded-xl border transition-all ${
                displayMode === "copycat"
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-white/10 bg-white/3"
              }`}>
                <button
                  onClick={() => {
                    if (syncSaving) return;
                    if (displayMode !== "copycat") {
                      setPendingMode("copycat");
                      setPendingProdeId(mainProdeId ?? allProdes[0].id);
                    }
                  }}
                  disabled={syncSaving}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left"
                >
                  <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                    displayMode === "copycat" ? "border-amber-500" : "border-white/30"
                  }`}>
                    {displayMode === "copycat" && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${displayMode === "copycat" ? "text-amber-400" : "text-white/70"}`}>Copycat</p>
                    <p className="text-xs text-white/35 mt-0.5">Un prode es la fuente de verdad; los demás se sincronizan desde ahí</p>
                  </div>
                </button>

                {displayMode === "copycat" && (
                  <div className="px-4 pb-3 border-t border-white/10 pt-2.5">
                    <p className="text-[11px] text-white/40 mb-2">Prode principal:</p>
                    <div className="flex flex-col gap-1.5">
                      {allProdes.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (syncSaving || displayProdeId === p.id) return;
                            setPendingMode("copycat");
                            setPendingProdeId(p.id);
                          }}
                          disabled={syncSaving}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-all ${
                            displayProdeId === p.id
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                          }`}
                        >
                          <span className={`h-2 w-2 shrink-0 rounded-full ${displayProdeId === p.id ? "bg-amber-400" : "bg-white/20"}`} />
                          {p.name}
                          {displayProdeId === p.id && !isDirty && <span className="ml-auto text-[10px] text-amber-400/70">principal</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm / Cancel — only shown when there's a pending change */}
              {isDirty && (
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={handleConfirm}
                    disabled={syncSaving || (pendingMode === "copycat" && !pendingProdeId)}
                    size="sm"
                    className="flex-1"
                  >
                    {syncSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    disabled={syncSaving}
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Export predictions */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Exportar predicciones</p>
            <div className="flex gap-2">
              <button
                onClick={() => setExportFormat("csv")}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                  exportFormat === "csv"
                    ? "bg-amber-500 text-black"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setExportFormat("json")}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all ${
                  exportFormat === "json"
                    ? "bg-amber-500 text-black"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                JSON
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-white/30">
                {predictionsLoading ? "Cargando…" : `${Object.keys(predictions).length} predicciones`}
              </p>
              <Button
                onClick={handleExport}
                disabled={predictionsLoading || Object.keys(predictions).length === 0}
                size="sm"
                className="gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar
              </Button>
            </div>
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
