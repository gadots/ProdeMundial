# ProdeMundial ⚽

App de prode para el Mundial 2026 (USA · MEX · CAN) — Next.js + Supabase.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Auth**: Supabase Auth (email/password + Google SSO)
- **DB + Realtime**: Supabase (PostgreSQL)
- **Football data**: football-data.org (free tier, cached via cron)
- **Hosting**: Vercel (free tier)

## Correr localmente

```bash
npm install
cp .env.example .env.local   # completar con tus claves
npm run dev
```

Abre http://localhost:3000. Funciona con datos mock sin necesitar Supabase real.

## Variables de entorno

Ver `.env.example` para la lista completa:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FOOTBALL_DATA_API_KEY`
- `CRON_SECRET`

## Base de datos

Correr en el SQL editor de Supabase: `supabase/migrations/001_initial_schema.sql`

## Sistema de puntos

| Fase    | Exacto | Ganador |
|---------|--------|---------|
| Grupos  | 3 pts  | 1 pt    |
| Octavos | 10 pts | 4 pts   |
| Cuartos | 18 pts | 6 pts   |
| Semis   | 30 pts | 10 pts  |
| Final   | 50 pts | 20 pts  |

**Comodín**: 1 por fase eliminatoria, duplica los puntos del partido elegido.
**Especiales**: campeón (60 pts), goleador (40 pts), finalista (35 pts), etc.
