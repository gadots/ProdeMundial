"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/app-context";
import { createClient } from "@/lib/supabase/client";
import * as Q from "@/lib/supabase/queries";
import Link from "next/link";
import {
  Share2, Check, QrCode, UserPlus, Trophy, Settings2,
  Crown, Pencil, X, LogOut, ArrowLeftRight, PlusCircle, Users,
} from "lucide-react";

function QrModal({ url, onClose }: { url: string; onClose: () => void }) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#0d1f3c] border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white">Código QR de invitación</p>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt="QR de invitación"
            width={240}
            height={240}
            className="rounded-xl bg-white p-2"
          />
        </div>
        <p className="text-xs text-white/40 text-center mt-4">
          Escaneá para unirte al prode
        </p>
      </div>
    </div>
  );
}

export default function GrupoPage() {
  const { user, prode, prodeId, allProdes, switchProde } = useApp();
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Prode ${prode?.name ?? ""}`,
          text: `Sumate al prode "${prode?.name ?? ""}" para el Mundial 2026`,
          url: inviteLink,
        });
        return;
      } catch {
        // User cancelled or share failed → fall through to clipboard
      }
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [editingPrize, setEditingPrize] = useState(false);
  const [prize, setPrize] = useState(prode?.prizeDescription ?? "");

  const [editingName, setEditingName] = useState(false);
  const [prodeName, setProdeName] = useState(prode?.name ?? "");
  const [savedName, setSavedName] = useState(false);

  const [switching, setSwitching] = useState(false);

  const isAdmin = prode?.adminId === user?.id;
  const inviteLink = prode ? `https://prodemundial.app/join/${prode.inviteCode}` : "";

  const handleSaveName = async () => {
    if (!prodeId) return;
    await Q.updateProdeName(prodeId, prodeName);
    setSavedName(true);
    setEditingName(false);
    setTimeout(() => setSavedName(false), 2000);
  };

  const handleSavePrize = async () => {
    if (!prodeId) return;
    await Q.updateProdePrize(prodeId, prize);
    setEditingPrize(false);
  };

  const handleSwitchProde = async (id: string) => {
    if (id === prodeId) return;
    setSwitching(true);
    await switchProde(id);
    setSwitching(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!prode) {
    return (
      <div>
        <TopBar title="Configuraciones" />
        <div className="flex items-center justify-center h-40 text-white/30 text-sm">Cargando…</div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Configuraciones" subtitle={prodeName || prode.name} />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">

        {/* Prode info + nombre editable */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="space-y-2">
                    <Input
                      value={prodeName}
                      onChange={(e) => setProdeName(e.target.value)}
                      placeholder="Nombre del prode"
                      maxLength={60}
                      className="text-sm font-bold"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveName} className="flex-1">
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {savedName ? "Guardado" : "Guardar"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => { setEditingName(false); setProdeName(prode.name); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white leading-tight">{prodeName || prode.name}</h2>
                    {isAdmin && (
                      <button onClick={() => setEditingName(true)} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {!editingName && (
                <Badge variant="default" className="shrink-0 ml-3">{prode.members.length} jugadores</Badge>
              )}
            </div>
            {!editingName && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>Creado el {new Date(prode.createdAt).toLocaleDateString("es-AR")}</span>
                <span>·</span>
                <span>Código: <span className="font-bold text-white/70">{prode.inviteCode}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mis prodes + crear/unirse */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 pb-3">
              <ArrowLeftRight className="h-4 w-4 text-blue-400" />
              <CardTitle className="text-sm">Mis prodes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {allProdes.map((p) => (
              <button
                key={p.id}
                disabled={switching}
                onClick={() => handleSwitchProde(p.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  p.id === prodeId
                    ? "bg-green-500/10 border border-green-500/30 text-green-300"
                    : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80"
                }`}
              >
                <span className="font-medium truncate">{p.name}</span>
                {p.id === prodeId && (
                  <span className="text-[10px] text-green-500 ml-2 shrink-0">activo</span>
                )}
              </button>
            ))}
            <div className="flex gap-2 pt-1">
              <Link
                href="/join?tab=crear"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors font-medium"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Crear nuevo
              </Link>
              <Link
                href="/join?tab=unirse"
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors font-medium"
              >
                <Users className="h-3.5 w-3.5" /> Unirme a otro
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Premio */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <CardTitle className="text-sm">Premio al ganador</CardTitle>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setEditingPrize(!editingPrize)}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {editingPrize ? "Cancelar" : "Editar"}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {editingPrize ? (
              <div className="space-y-3">
                <Input
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  placeholder="Ej: Cena para 2, una birra, la gloria eterna..."
                  maxLength={200}
                />
                <Button size="sm" onClick={handleSavePrize} className="w-full">
                  <Check className="h-3.5 w-3.5 mr-1" /> Guardar
                </Button>
              </div>
            ) : (
              <div className="rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-3">
                <p className="text-sm text-white/80">
                  {prize || prode.prizeDescription || <span className="text-white/30 italic">Sin premio definido aún</span>}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 pb-3">
              <UserPlus className="h-4 w-4 text-green-400" />
              <CardTitle className="text-sm">Invitar participantes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Clickable link → copies to clipboard */}
            <button
              onClick={handleCopyLink}
              className="relative w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50 font-mono text-left hover:bg-white/10 transition-colors overflow-hidden"
            >
              <span className="block truncate">{inviteLink}</span>
              {copied && (
                <span className="absolute inset-0 flex items-center justify-center bg-[#0d1f3c]/90 text-green-400 text-xs font-semibold rounded-xl gap-1">
                  <Check className="h-3.5 w-3.5" /> Copiado
                </span>
              )}
            </button>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleShare} className="flex-1">
                {copied ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Share2 className="h-3.5 w-3.5" /> Compartir</>}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowQr(true)} className="shrink-0 gap-1.5">
                <QrCode className="h-3.5 w-3.5" /> QR
              </Button>
            </div>
            <p className="text-xs text-white/30 text-center">
              Compartí el link o el código <span className="font-bold text-white/50">{prode.inviteCode}</span> para que tus amigos se unan
            </p>
          </CardContent>
        </Card>

        {/* Participantes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between pb-3">
              <CardTitle className="text-sm">Participantes ({prode.members.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {prode.members.map((member, idx) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                  member.id === user?.id ? "bg-green-500/10" : "hover:bg-white/5"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-base">{member.displayName[0]}</span>
                    )}
                  </div>
                  {prode.adminId === member.id && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                      <Crown className="h-2 w-2 text-yellow-400" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${member.id === user?.id ? "text-green-300" : "text-white"}`}>
                    {member.displayName}
                    {member.id === user?.id && <span className="ml-1 text-[10px] text-green-500">(vos)</span>}
                  </p>
                  {prode.adminId === member.id && (
                    <p className="text-[10px] text-yellow-500/70">Admin</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-white">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${member.rank}`}
                  </p>
                  <p className="text-[10px] text-white/40">{member.totalPoints} pts</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-3 text-sm text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>

      </div>

      {showQr && <QrModal url={inviteLink} onClose={() => setShowQr(false)} />}
    </div>
  );
}
