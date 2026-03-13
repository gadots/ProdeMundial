"use client";

import { useState } from "react";
import { TopBar } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_PRODE, CURRENT_USER_ID } from "@/lib/mock-data";
import { Copy, Check, QrCode, UserPlus, Trophy, Settings2, Crown } from "lucide-react";

export default function GrupoPage() {
  const [copied, setCopied] = useState(false);
  const [editingPrize, setEditingPrize] = useState(false);
  const [prize, setPrize] = useState(MOCK_PRODE.prizeDescription ?? "");
  const [savedPrize, setSavedPrize] = useState(false);

  const isAdmin = MOCK_PRODE.adminId === CURRENT_USER_ID;
  const inviteLink = `https://prodemundial.app/join/${MOCK_PRODE.inviteCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePrize = () => {
    setSavedPrize(true);
    setEditingPrize(false);
    setTimeout(() => setSavedPrize(false), 2000);
    // In production: update Supabase prodes table
  };

  return (
    <div>
      <TopBar title="Mi Grupo" subtitle={MOCK_PRODE.name} />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">

        {/* Prode info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-white/40 mb-0.5">Prode</p>
                <h2 className="text-lg font-black text-white">{MOCK_PRODE.name}</h2>
              </div>
              <Badge variant="default">{MOCK_PRODE.members.length} jugadores</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>Creado el {new Date(MOCK_PRODE.createdAt).toLocaleDateString("es-AR")}</span>
              <span>·</span>
              <span>Código: <span className="font-bold text-white/70">{MOCK_PRODE.inviteCode}</span></span>
            </div>
          </CardContent>
        </Card>

        {/* Prize */}
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
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePrize} className="flex-1">
                    {savedPrize ? <><Check className="h-3.5 w-3.5" /> Guardado</> : <><Check className="h-3.5 w-3.5" /> Guardar</>}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-3">
                <p className="text-sm text-white/80">
                  {prize || <span className="text-white/30 italic">Sin premio definido aún</span>}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 pb-3">
              <UserPlus className="h-4 w-4 text-green-400" />
              <CardTitle className="text-sm">Invitar participantes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* Link */}
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50 font-mono truncate">
                {inviteLink}
              </div>
              <Button size="sm" variant="secondary" onClick={handleCopy} className="shrink-0">
                {copied ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
              </Button>
            </div>

            {/* QR placeholder */}
            <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors">
              <QrCode className="h-4 w-4" />
              Ver código QR
            </button>

            <p className="text-xs text-white/30 text-center">
              Compartí el link o el código <span className="font-bold text-white/50">{MOCK_PRODE.inviteCode}</span> para que tus amigos se unan
            </p>
          </CardContent>
        </Card>

        {/* Members list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between pb-3">
              <CardTitle className="text-sm">Participantes ({MOCK_PRODE.members.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {MOCK_PRODE.members.map((member, idx) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                  member.id === CURRENT_USER_ID ? "bg-green-500/10" : "hover:bg-white/5"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatarUrl} alt={member.displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-base">{member.displayName[0]}</span>
                    )}
                  </div>
                  {MOCK_PRODE.adminId === member.id && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                      <Crown className="h-2 w-2 text-yellow-400" />
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${member.id === CURRENT_USER_ID ? "text-green-300" : "text-white"}`}>
                    {member.displayName}
                    {member.id === CURRENT_USER_ID && <span className="ml-1 text-[10px] text-green-500">(vos)</span>}
                  </p>
                  {MOCK_PRODE.adminId === member.id && (
                    <p className="text-[10px] text-yellow-500/70">Admin</p>
                  )}
                </div>

                {/* Rank + points */}
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

      </div>
    </div>
  );
}
