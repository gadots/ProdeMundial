"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_WILDCARDS, MOCK_MY_WILDCARD_ANSWERS } from "@/lib/mock-data";
import { WildcardChallenge, WildcardType } from "@/lib/types";
import { ChevronRight, Clock, Check, Lock, Star } from "lucide-react";

function useCountdown(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return "Cerrado";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const TYPE_LABELS: Record<WildcardType, string> = {
  PICK_TEAM: "Elegir equipo",
  NUMERIC: "Número exacto",
  YES_NO: "Sí / No",
};

const TYPE_ICONS: Record<WildcardType, string> = {
  PICK_TEAM: "🏆",
  NUMERIC: "🔢",
  YES_NO: "✅",
};

function AnswerInput({
  challenge,
  existingAnswer,
  onSubmit,
}: {
  challenge: WildcardChallenge;
  existingAnswer?: string;
  onSubmit: (answer: string) => void;
}) {
  const [value, setValue] = useState(existingAnswer ?? "");
  const [submitted, setSubmitted] = useState(!!existingAnswer);

  const handleSubmit = () => {
    if (!value.trim()) return;
    setSubmitted(true);
    onSubmit(value.trim());
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2">
        <Check className="h-4 w-4 text-green-400 shrink-0" />
        <p className="text-sm text-green-300">
          Respuesta enviada: <span className="font-bold">{value}</span>
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="ml-auto text-[10px] text-white/30 hover:text-white/60"
        >
          Editar
        </button>
      </div>
    );
  }

  if (challenge.type === "YES_NO") {
    return (
      <div className="flex gap-2">
        <Button
          variant={value === "Si" ? "default" : "secondary"}
          size="sm"
          className="flex-1"
          onClick={() => { setValue("Si"); handleSubmit(); }}
        >
          Sí
        </Button>
        <Button
          variant={value === "No" ? "default" : "secondary"}
          size="sm"
          className="flex-1"
          onClick={() => { setValue("No"); handleSubmit(); }}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        type={challenge.type === "NUMERIC" ? "number" : "text"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={challenge.type === "NUMERIC" ? "Ej: 42" : "Escribí tu respuesta…"}
        className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      <Button onClick={handleSubmit} disabled={!value.trim()} size="sm">
        Enviar
      </Button>
    </div>
  );
}

function WildcardCard({ challenge }: { challenge: WildcardChallenge }) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    MOCK_MY_WILDCARD_ANSWERS[challenge.id]
      ? { [challenge.id]: MOCK_MY_WILDCARD_ANSWERS[challenge.id].answer }
      : {}
  );

  const countdown = useCountdown(challenge.deadline);
  const isClosed = challenge.status === "CLOSED" || challenge.status === "GRADED";
  const isGraded = challenge.status === "GRADED";
  const myAnswer = answers[challenge.id];

  return (
    <Card className={`overflow-hidden ${isClosed ? "opacity-70" : "border-purple-500/20 hover:border-purple-500/35"} transition-all`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={`text-[10px] ${
                isClosed ? "bg-white/10 text-white/50" : "bg-purple-500/20 text-purple-300 border-purple-500/30"
              }`}
            >
              {challenge.weekLabel}
            </Badge>
            <Badge className="text-[10px] bg-white/5 text-white/40 border-white/10">
              {TYPE_ICONS[challenge.type]} {TYPE_LABELS[challenge.type]}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs font-bold text-purple-400">+{challenge.points} pts</span>
          </div>
        </div>

        {/* Title + desc */}
        <p className="text-sm font-bold text-white mb-1">{challenge.title}</p>
        <p className="text-xs text-white/50 mb-3 leading-relaxed">{challenge.description}</p>

        {/* Deadline */}
        {!isClosed && (
          <div className="flex items-center gap-1 text-xs text-white/40 mb-3">
            <Clock className="h-3.5 w-3.5" />
            <span>Cierra en {countdown}</span>
          </div>
        )}

        {/* Answer area */}
        {!isClosed ? (
          <AnswerInput
            challenge={challenge}
            existingAnswer={myAnswer}
            onSubmit={(answer) => setAnswers((prev) => ({ ...prev, [challenge.id]: answer }))}
          />
        ) : isGraded && challenge.correctAnswer ? (
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/30">Respuesta correcta</p>
              <p className="text-sm font-bold text-white">{challenge.correctAnswer}</p>
            </div>
            {myAnswer && (
              <div className="text-right">
                <p className="text-[10px] text-white/30">Tu respuesta</p>
                <p className={`text-sm font-bold ${myAnswer === challenge.correctAnswer ? "text-green-400" : "text-white/60"}`}>
                  {myAnswer}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-white/30">
            <Lock className="h-3.5 w-3.5" />
            <span>Cerrado · Resultados próximamente</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DesafiosPage() {
  const [tab, setTab] = useState<"open" | "closed">("open");

  const open = MOCK_WILDCARDS.filter((w) => w.status === "OPEN");
  const closed = MOCK_WILDCARDS.filter((w) => w.status !== "OPEN");
  const display = tab === "open" ? open : closed;

  return (
    <div>
      <TopBar
        title="Desafíos"
        subtitle={`${open.length} activos · hasta 25 pts c/u`}
      />

      {/* Intro banner */}
      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="rounded-2xl bg-gradient-to-br from-purple-600/15 to-blue-600/10 border border-purple-500/20 p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🎯</span>
            <div>
              <p className="text-sm font-bold text-white">Wildcards semanales</p>
              <p className="text-xs text-white/50">Preguntas especiales con puntos extra</p>
            </div>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            Cada semana hay nuevos desafíos. Predicciones especiales que no tienen nada que ver con los resultados parciales — 
            son sobre tendencias, goles totales, equipos sorpresa. Respondé antes del cierre para sumar puntos.
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mx-auto max-w-lg px-4 pt-3">
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          <button
            onClick={() => setTab("open")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              tab === "open"
                ? "bg-purple-600 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Abiertos ({open.length})
          </button>
          <button
            onClick={() => setTab("closed")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              tab === "closed"
                ? "bg-purple-600 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Cerrados ({closed.length})
          </button>
        </div>
      </div>

      {/* Wildcard list */}
      <div className="mx-auto max-w-lg space-y-3 px-4 py-3">
        {display.length === 0 ? (
          <div className="py-12 text-center text-white/30">
            <p className="text-4xl mb-2">🗓️</p>
            <p>{tab === "open" ? "No hay desafíos abiertos por ahora" : "No hay desafíos cerrados aún"}</p>
          </div>
        ) : (
          display.map((w) => <WildcardCard key={w.id} challenge={w} />)
        )}
      </div>

      {/* Link to especiales */}
      <div className="mx-auto max-w-lg px-4 pb-6">
        <Link href="/predicciones/especiales">
          <Card className="overflow-hidden hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20 shrink-0">
                <Star className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Predicciones especiales</p>
                <p className="text-xs text-white/40">Campeón, goleador y más — hasta 60 pts</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
