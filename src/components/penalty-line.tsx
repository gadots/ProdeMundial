import { Match } from "@/lib/types";
import { penaltyWinnerOf } from "@/lib/scoring";

/**
 * Muestra la definición por penales de un partido de llaves:
 * "Penales: <Ganador> 5-3". Renderiza null si el partido no fue a penales.
 * El tanteo se muestra siempre en orden ganador-perdedor.
 */
export function PenaltyLine({ match, className = "" }: { match: Match; className?: string }) {
  const winner = penaltyWinnerOf(match);
  if (winner === undefined || match.penaltyHome == null || match.penaltyAway == null) return null;

  const winnerName = winner === "home" ? match.homeTeam.shortName : match.awayTeam.shortName;
  const big = Math.max(match.penaltyHome, match.penaltyAway);
  const small = Math.min(match.penaltyHome, match.penaltyAway);

  return (
    <span className={`text-[10px] text-amber-400/90 ${className}`}>
      🥅 Penales: <span className="font-semibold">{winnerName}</span> {big}-{small}
    </span>
  );
}
