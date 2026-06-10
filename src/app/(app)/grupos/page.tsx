"use client";

import { useMemo, Suspense } from "react";
import { TopBar } from "@/components/nav";
import { useApp } from "@/components/app-context";
import { buildGroupStandings, GruposContent } from "@/components/grupos-content";

function GruposPageInner() {
  const { matches } = useApp();

  const groupStandings = useMemo(() => buildGroupStandings(matches), [matches]);

  const totalFinished = matches.filter(
    (m) => m.phase === "GROUP" && m.status === "FINISHED"
  ).length;

  const subtitle =
    groupStandings.size === 0
      ? "Los grupos aparecerán cuando comiencen los partidos"
      : totalFinished === 0
      ? `${groupStandings.size} grupos · Sin partidos finalizados aún`
      : `${groupStandings.size} grupos · ${totalFinished} partido${totalFinished > 1 ? "s" : ""} finalizado${totalFinished > 1 ? "s" : ""}`;

  return (
    <div className="pb-24">
      <TopBar title="Grupos" subtitle={subtitle} showProfile />
      <GruposContent />
    </div>
  );
}

export default function GruposPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white/30 text-sm text-center">Cargando grupos…</div>}>
      <GruposPageInner />
    </Suspense>
  );
}
