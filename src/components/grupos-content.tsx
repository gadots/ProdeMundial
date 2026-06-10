"use client";

import { useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/components/app-context";
import type { Match } from "@/lib/types";

interface TeamStanding {
  id: string;
  name: string;
  flag: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
}

export function buildGroupStandings(matches: Match[]): Map<string, TeamStanding[]> {
  const groupMatches = matches.filter(
    (m) => m.phase === "GROUP" && !!m.homeTeam.id && !!m.awayTeam.id
  );

  const groups = new Map<string, Map<string, TeamStanding>>();

  for (const m of groupMatches) {
    const g = m.group!;
    if (!groups.has(g)) groups.set(g, new Map());
    const table = groups.get(g)!;

    for (const [team] of [[m.homeTeam], [m.awayTeam]] as const) {
      if (!table.has(team.id)) {
        table.set(team.id, { id: team.id, name: team.name, flag: team.flag, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 });
      }
    }

    if (m.status !== "FINISHED" || m.homeScore === undefined || m.awayScore === undefined) continue;

    const home = table.get(m.homeTeam.id)!;
    const away = table.get(m.awayTeam.id)!;
    const hs = m.homeScore;
    const as_ = m.awayScore;

    home.pj++; away.pj++;
    home.gf += hs; home.gc += as_;
    away.gf += as_; away.gc += hs;

    if (hs > as_) {
      home.g++; home.pts += 3;
      away.p++;
    } else if (hs < as_) {
      away.g++; away.pts += 3;
      home.p++;
    } else {
      home.e++; home.pts++;
      away.e++; away.pts++;
    }
  }

  const result = new Map<string, TeamStanding[]>();
  for (const g of [...groups.keys()].sort()) {
    const table = groups.get(g)!;
    result.set(g, [...table.values()].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const difA = a.gf - a.gc, difB = b.gf - b.gc;
      if (difB !== difA) return difB - difA;
      return b.gf - a.gf;
    }));
  }

  return result;
}

function GroupTable({ group, standings, qualify }: {
  group: string;
  standings: TeamStanding[];
  qualify: number;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b border-white/10">
          <h2 className="text-sm font-bold text-white">Grupo {group}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[340px]">
            <thead>
              <tr className="bg-white/5 text-white/40">
                <th className="text-left px-3 py-2 font-semibold w-6">#</th>
                <th className="text-left px-3 py-2 font-semibold">Equipo</th>
                <th className="text-center px-2 py-2 font-semibold">PJ</th>
                <th className="text-center px-2 py-2 font-semibold">G</th>
                <th className="text-center px-2 py-2 font-semibold">E</th>
                <th className="text-center px-2 py-2 font-semibold">P</th>
                <th className="text-center px-2 py-2 font-semibold">GF</th>
                <th className="text-center px-2 py-2 font-semibold">GC</th>
                <th className="text-center px-2 py-2 font-semibold">Dif</th>
                <th className="text-center px-3 py-2 font-semibold text-amber-400">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {standings.map((t, i) => {
                const classifies = i < qualify;
                const dif = t.gf - t.gc;
                return (
                  <tr key={t.id} className={classifies ? "bg-amber-500/5" : ""}>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] font-bold ${classifies ? "text-amber-400" : "text-white/30"}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{t.flag}</span>
                        <span className={`font-semibold ${classifies ? "text-white" : "text-white/70"}`}>
                          {t.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center text-white/60">{t.pj}</td>
                    <td className="px-2 py-2.5 text-center text-white/60">{t.g}</td>
                    <td className="px-2 py-2.5 text-center text-white/60">{t.e}</td>
                    <td className="px-2 py-2.5 text-center text-white/60">{t.p}</td>
                    <td className="px-2 py-2.5 text-center text-white/60">{t.gf}</td>
                    <td className="px-2 py-2.5 text-center text-white/60">{t.gc}</td>
                    <td className="px-2 py-2.5 text-center text-white/60">
                      {dif > 0 ? `+${dif}` : dif}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-black text-sm ${classifies ? "text-amber-400" : "text-white"}`}>
                        {t.pts}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Needs to be wrapped in <Suspense> by the parent (uses useSearchParams)
export function GruposContent() {
  const { matches } = useApp();
  const searchParams = useSearchParams();
  const targetGroup = searchParams.get("g");
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groupStandings = useMemo(() => buildGroupStandings(matches), [matches]);

  useEffect(() => {
    if (targetGroup && groupRefs.current[targetGroup]) {
      setTimeout(() => {
        groupRefs.current[targetGroup]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [targetGroup, groupStandings]);

  if (groupStandings.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/30 text-sm gap-3">
        <span className="text-4xl">⚽</span>
        <p className="text-center leading-relaxed">
          Las posiciones de los grupos se verán acá<br />
          una vez que comiencen los partidos
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {[...groupStandings.entries()].map(([group, standings]) => (
        <div key={group} ref={(el) => { groupRefs.current[group] = el; }}>
          <GroupTable group={group} standings={standings} qualify={2} />
        </div>
      ))}
      <p className="text-[10px] text-white/25 text-center px-4">
        Las primeras 2 posiciones de cada grupo clasifican. Los 8 mejores terceros también avanzan.
      </p>
    </div>
  );
}
