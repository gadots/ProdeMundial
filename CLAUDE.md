# ProdeMundial — Guía para Claude

## ¿Qué es este proyecto?

App de prode para el Mundial 2026 (USA · MEX · CAN). Los usuarios forman grupos ("prodes"), predicen resultados partido a partido, acumulan puntos y compiten en una tabla de posiciones. Es una app mobile-first, completamente en español rioplatense.

## Stack

- **Next.js 16** (App Router, `src/app`)  
- **TypeScript** estricto
- **Tailwind CSS** con paleta oscura (`#0a1628` base)
- **Supabase** (Auth + PostgreSQL + Realtime) — actualmente la app funciona con **datos mock** sin Supabase real
- **shadcn/ui** componentes en `src/components/ui/`

## Estructura de carpetas clave

```
src/
  app/
    (app)/          ← rutas protegidas con layout (nav, etc.)
      dashboard/    ← home con partidos, racha, tokens, wildcards
      predicciones/ ← predicciones de partidos + selector de tokens
        especiales/ ← campeón, goleador, etc.
      tabla/        ← leaderboard con racha y tokens
      desafios/     ← wildcards semanales + link a especiales
      grupo/        ← info del prode, código de invitación
      perfil/       ← perfil del usuario
    (auth)/         ← login / registro
    api/
      cron/sync-matches/ ← endpoint para sincronizar partidos
  components/
    nav.tsx         ← TopBar + BottomNav (5 ítems)
    ui/             ← Badge, Button, Card (shadcn)
  lib/
    types.ts        ← todos los tipos TypeScript
    mock-data.ts    ← datos de ejemplo (funciona sin Supabase)
    scoring.ts      ← lógica de puntos, tokens, streaks
    utils.ts
supabase/
  migrations/
    001_initial_schema.sql  ← schema completo + RLS + funciones
```

## Mecánicas de puntuación

### Puntos base por fase

| Fase         | Exacto | Ganador | Empate |
|--------------|--------|---------|--------|
| Grupos       | 3 pts  | 1 pt    | 2 pts  |
| Ronda de 32  | 6 pts  | 2 pts   | —      |
| Octavos      | 10 pts | 4 pts   | —      |
| Cuartos      | 18 pts | 6 pts   | —      |
| Semis        | 30 pts | 10 pts  | —      |
| Final        | 50 pts | 20 pts  | —      |

### Tokens multiplicadores (⚡2x / 🔥3x / 💥5x)

- Cada usuario recibe **1 token de cada tipo** al unirse a un prode
- Se aplican a **cualquier partido** (sin restricción de fase)
- Si no se usan antes del fin de la fase de grupos → **caducan** (pierden efecto)
- Cada token solo se puede usar **una vez**
- Se gestionan en `src/lib/mock-data.ts` (`MOCK_MY_TOKENS`) y en la página de predicciones

### Hot streak (racha)

- +2 pts automáticos en la próxima predicción correcta si tenés racha de **3 aciertos consecutivos**
- +5 pts si tenés **5+** consecutivos
- La racha se rompe con cualquier predicción incorrecta o sin puntos
- Ver `streakBonusPoints()` en `scoring.ts`

### Wildcards semanales

- Desafíos de 3 tipos: `PICK_TEAM`, `NUMERIC`, `YES_NO`
- Puntos fijos por desafío (8–25 pts)
- Deadline de respuesta antes del cierre
- Gestionados en `MOCK_WILDCARDS` y página `/desafios`

### Predicciones especiales

- Campeón: 60 pts · Goleador: 40 pts · Finalista: 35 pts · Tercer puesto: 25 pts · País más goles: 20 pts
- Se bloquean cuando el torneo arranca
- Página `/predicciones/especiales`

## Convenciones de código

- Siempre en **español rioplatense** en UI (vos, pts, guardado, etc.)
- Componentes: arrow functions + `"use client"` explícito donde haga falta
- No usar `jokerUsed` (reemplazado por `multiplier: TokenMultiplier`)
- Paleta de tokens: azul=2x, naranja=3x, púrpura=5x
- Los datos mock en `mock-data.ts` se usan como fallback; en producción todo viene de Supabase
- Evitar imports circulares: `types.ts` no importa nada del proyecto

## Comandos

```bash
npm run dev      # desarrollo en localhost:3000
npm run build    # build de producción (debe pasar sin errores TS)
npm run lint     # ESLint
```

## Variables de entorno necesarias (en producción)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FOOTBALL_DATA_API_KEY=      # football-data.org (free tier)
CRON_SECRET=                # para proteger el endpoint /api/cron/sync-matches
```

Sin estas variables la app funciona igual con datos mock.

## Base de datos

Toda la configuración está en `supabase/migrations/001_initial_schema.sql`:
- RLS habilitado en todas las tablas
- Trigger `on_auth_user_created` → crea perfil automáticamente
- Trigger `on_prode_member_added` → asigna 3 tokens automáticamente
- Función `calculate_match_points(match_id)` → calcula y acumula puntos con multiplier + streak bonus

## Estado actual del proyecto

- Prototipo completo con mock data, funciona sin Supabase
- Falta conectar Supabase real (auth flows, queries a DB)
- Falta integración football-data.org en producción
- No hay modo negativo (predefinido que no se implementa)
- Desafíos (wildcards semanales) fue removido del MVP. La carpeta `src/app/(app)/desafios/` fue eliminada y el slot del nav fue reemplazado por Especiales. El tipo `WildcardChallenge` y la lógica asociada siguen en `types.ts` y `mock-data.ts` por si se reactiva.
- Los "Tokens" se llaman "Potenciadores" en la UI. Los nombres de tipos TypeScript (`MultiplierToken`, `TokenMultiplier`) no cambiaron.
