"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users } from "lucide-react";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    window.location.href = "/dashboard";
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-[#0a1628] px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-green-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center justify-center rounded-3xl bg-gradient-to-br from-green-400 to-green-700 p-4 shadow-lg shadow-green-500/30">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Unirse al Prode</h1>
          <p className="mt-1 text-sm text-white/50">Ingresá el código de invitación</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              type="text"
              placeholder="MUNDIAL26"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="text-center text-xl font-black tracking-widest uppercase"
              maxLength={12}
              required
            />
            <Button type="submit" className="w-full" disabled={loading || code.length < 4}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Users className="h-4 w-4" /> Unirme al prode
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
