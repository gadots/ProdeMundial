# ProdeMundial ⚽

App de prode para el **Mundial 2026** (USA · MEX · CAN) — Next.js + Supabase + Vercel.

> Estado actual: **prototipo funcional con datos mock**. Todo el UI está terminado y funciona sin necesitar Supabase ni claves de API.

---

## Demo rápida

```bash
npm install
npm run dev
```

Abre http://localhost:3000 — funciona de inmediato con datos de ejemplo.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Componentes | shadcn/ui |
| Auth | Supabase Auth (email + Google SSO) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Realtime | Supabase Realtime (leaderboard en vivo) |
| Datos de partidos | football-data.org (free tier, cacheado cada 5 min) |
| Hosting | Vercel |

---

## Pantallas

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Partidos en vivo, próximos, últimos resultados, racha, alertas de tokens |
| `/predicciones` | Predicción de partidos con selector de token 2x/3x/5x |
| `/predicciones/especiales` | Campeón, goleador, finalista, etc. |
| `/tabla` | Leaderboard con racha y tokens disponibles |
| `/desafios` | Wildcards semanales (pick team, numérico, sí/no) |
| `/grupo` | Info del prode, código de invitación, miembros |
| `/perfil` | Perfil, historial de predicciones, notificaciones |

---

## Sistema de puntos

### Puntos base

| Fase | Exacto | Ganador | Empate |
|------|--------|---------|--------|
| Grupos | 3 | 1 | 2 |
| Ronda de 32 | 6 | 2 | — |
| Octavos | 10 | 4 | — |
| Cuartos | 18 | 6 | — |
| Semis | 30 | 10 | — |
| Final | 50 | 20 | — |

### Tokens multiplicadores

Cada jugador recibe **3 tokens únicos** al entrar a un prode:

| Token | Multiplicador | Color |
|-------|--------------|-------|
| ⚡ | 2x | Azul |
| 🔥 | 3x | Naranja |
| 💥 | 5x | Púrpura |

- Se aplican a **cualquier partido** antes de que empiece
- **Caducan** si no se usan antes de que termine la fase de grupos
- Cada token se usa **una sola vez**

### Hot streak 🔥

| Racha | Bonus siguiente predicción correcta |
|-------|-------------------------------------|
| 3+ consecutivos | +2 pts |
| 5+ consecutivos | +5 pts |

La racha se muestra en la tabla de posiciones y en el dashboard.

### Wildcards semanales 🎯

Desafíos especiales con puntos fijos (8–25 pts):
- Elegir equipo / respuesta numérica / sí o no
- Deadline semanal — no se pueden editar después del cierre

### Predicciones especiales ⭐

| Predicción | Puntos |
|-----------|--------|
| Campeón | 60 |
| Goleador | 40 |
| Finalista | 35 |
| Tercer puesto | 25 |
| País con más goles | 20 |

---

## Setup completo (con Supabase)

### 1. Clonar y dependencias

```bash
git clone https://github.com/gadots/ProdeMundial
cd ProdeMundial
npm install
```

### 2. Crear proyecto Supabase

1. Ir a [supabase.com](https://supabase.com) → New project
2. Copiar `Project URL` y `anon key` (Settings → API)
3. Copiar `service_role key` (Settings → API → Service role)

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FOOTBALL_DATA_API_KEY=tu_key_de_football-data.org
CRON_SECRET=cualquier_string_secreto
```

### 4. Crear la base de datos

En Supabase → SQL Editor → pegar y ejecutar:

```
supabase/migrations/001_initial_schema.sql
```

Esto crea todas las tablas, políticas RLS, triggers y funciones.

### 5. Correr

```bash
npm run dev
```

---

## Deploy en Vercel

Ver sección "Deploy a Vercel" más abajo.

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Para auth/DB | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Para auth/DB | Clave anónima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Para cron | Clave de servicio (solo server-side) |
| `FOOTBALL_DATA_API_KEY` | Para datos reales | API key de football-data.org |
| `CRON_SECRET` | Para cron | Protege el endpoint de sincronización |

Sin estas variables la app funciona con datos mock.

---

## Comandos útiles

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # linter
```

---

## Arquitectura de la base de datos

```
profiles          ← extiende auth.users
prodes            ← grupos de prode
prode_members     ← membresía (trigger auto-asigna tokens)
matches           ← partidos (sincronizados por cron)
predictions       ← predicciones con multiplier (1/2/3/5)
special_predictions
scores            ← puntos acumulados por fase
multiplier_tokens ← tokens 2x/3x/5x por usuario por prode
streaks           ← racha actual y mejor racha
wildcard_challenges ← desafíos semanales
wildcard_answers  ← respuestas de usuarios
```

Toda la lógica de puntuación está en la función SQL `calculate_match_points(match_id)`.
