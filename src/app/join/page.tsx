"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users, PlusCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Q from "@/lib/supabase/queries";

type Tab = "unirse" | "crear";

export default function JoinPage() {
  return (
    <Suspense>
      <JoinPageInner />
    </Suspense>
  );
}

function JoinPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "crear" ? "crear" : "unirse";
  });

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "crear" || t === "unirse") setTab(t);
  }, [searchParams]);

  // Join
  const [code, setCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Create
  const [prodeName, setProdeName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const isSupabase = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://") &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<your-project>")
  );

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinLoading(true);
    setJoinError("");

    if (!isSupabase) {
      await new Promise((r) => setTimeout(r, 800));
      window.location.href = "/dashboard";
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setJoinError("Tenés que estar logueado para unirte a un prode");
      setJoinLoading(false);
      return;
    }

    const result = await Q.joinProde(user.id, code);

    if (result.error) {
      setJoinError(result.error);
      setJoinLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");

    if (!isSupabase) {
      await new Promise((r) => setTimeout(r, 800));
      window.location.href = "/dashboard";
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setCreateError("Tenés que estar logueado para crear un prode");
      setCreateLoading(false);
      return;
    }

    const result = await Q.createProde(user.id, prodeName.trim());

    if (result.error) {
      setCreateError(result.error);
      setCreateLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#0a1628] px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 p-4 shadow-lg shadow-amber-500/30">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {tab === "unirse" ? "Unirse al Prode" : "Crear Prode"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {tab === "unirse" ? "Ingresá el código de invitación" : "Armá tu grupo del Mundial 2026"}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex rounded-2xl border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setTab("unirse")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors ${
              tab === "unirse"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            <Users className="h-4 w-4" /> Unirme
          </button>
          <button
            onClick={() => setTab("crear")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors ${
              tab === "crear"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            <PlusCircle className="h-4 w-4" /> Crear
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
          {tab === "unirse" ? (
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                type="text"
                placeholder="MUNDIAL26"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setJoinError(""); }}
                className="text-center text-xl font-black tracking-widest uppercase"
                maxLength={12}
                required
              />
              {joinError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{joinError}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={joinLoading || code.length < 4}>
                {joinLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Users className="h-4 w-4" /> Unirme al prode
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                type="text"
                placeholder="Ej: Los Pibes del 86"
                value={prodeName}
                onChange={(e) => { setProdeName(e.target.value); setCreateError(""); }}
                maxLength={50}
                required
              />
              {createError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">{createError}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createLoading || prodeName.trim().length < 2}>
                {createLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" /> Crear prode
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
