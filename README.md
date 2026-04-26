# ProdeMundial ⚽

A full-stack prediction pool ("prode") app for the **2026 FIFA World Cup** (USA · MEX · CAN). Built with Next.js 16, Supabase, and Vercel.

> **Works out of the box.** All UI is fully functional with mock data — no Supabase or API keys needed to run it locally.

---

## Quick start

```bash
git clone https://github.com/gadots/ProdeMundial
cd ProdeMundial
npm install
npm run dev
```

Open http://localhost:3000 — it works immediately with sample data.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Components | shadcn/ui |
| Auth | Supabase Auth (email + Google SSO) |
| Database | Supabase (PostgreSQL + RLS) |
| Realtime | Supabase Realtime (live leaderboard) |
| Match data | football-data.org (free tier, synced every 4 hours via GitHub Actions) |
| Hosting | Vercel (Hobby plan compatible) |
| PWA | Static service worker + Web App Manifest (installable on Android/iOS) |

---

## Screens

| Route | Description |
|-------|-------------|
| `/dashboard` | Live matches, upcoming fixtures, recent results, streak indicator, token alerts |
| `/predicciones` | Match predictions with 2x/3x/5x multiplier token selector |
| `/predicciones/especiales` | Champion, top scorer, finalist, third place, most goals country |
| `/tabla` | Leaderboard with rank changes, today's points, and share button |
| `/grupo` | Prode info, invite code, member list |
| `/perfil` | User profile, edit display name, change password, logout |
| `/admin` | Admin panel: manage users, prodes, matches, and trigger manual sync |

---

## Scoring system

### Base points by phase

| Phase | Exact score | Correct winner | Draw |
|-------|-------------|----------------|------|
| Group stage | 3 | 1 | 2 |
| Round of 32 | 6 | 2 | — |
| Round of 16 | 10 | 4 | — |
| Quarter-finals | 18 | 6 | — |
| Semi-finals | 30 | 10 | — |
| Third place | 30 | 10 | — |
| Final | 50 | 20 | — |

### Multiplier tokens

Each player receives **3 unique tokens** when joining a prode:

| Token | Multiplier | Color |
|-------|-----------|-------|
| ⚡ | 2x | Blue |
| 🔥 | 3x | Orange |
| 💥 | 5x | Purple |

- Can be applied to **any match** before it starts
- **Expire** if unused before the end of the group stage
- Each token can only be used **once**

### Hot streak 🔥

| Streak | Bonus on next correct prediction |
|--------|----------------------------------|
| 3+ consecutive | +2 pts |
| 5+ consecutive | +5 pts |

### Special predictions ⭐

| Prediction | Points |
|-----------|--------|
| Champion | 60 |
| Top scorer | 40 |
| Finalist | 35 |
| Third place | 25 |
| Most goals country | 20 |

Locked once the tournament starts.

---

## Full setup (with Supabase)

### 1. Clone and install

```bash
git clone https://github.com/gadots/ProdeMundial
cd ProdeMundial
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy `Project URL` and `anon key` (Settings → API)
3. Copy `service_role key` (Settings → API → Service role — keep this secret)

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FOOTBALL_DATA_API_KEY=your_key_from_football-data.org
CRON_SECRET=any_random_secret_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose_a_strong_password
```

### 4. Run database migrations

In Supabase → SQL Editor, run each migration file **in order**:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_idempotent_points_and_decay.sql
supabase/migrations/003_fix_rls_recursion.sql
supabase/migrations/004_fix_prode_admin_select.sql
supabase/migrations/005_add_delete_policies.sql
supabase/migrations/006_fix_leaderboard_security_invoker.sql
supabase/migrations/007_add_third_place_phase.sql
```

This creates all tables, RLS policies, triggers, and scoring functions.

### 5. Run

```bash
npm run dev
```

---

## Automated match sync (GitHub Actions)

Since Vercel's Hobby plan doesn't support cron jobs, match data is synced automatically via GitHub Actions (`.github/workflows/sync-matches.yml`):

- Every **5 minutes** during the World Cup (June 11 – July 19, 2026)
- Once **daily** the rest of the year

**Required GitHub secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `CRON_SECRET` | Same value as your `CRON_SECRET` env var in Vercel |
| `APP_URL` | Your Vercel app URL (e.g. `https://elprofe.vercel.app`) |

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.example` under **Settings → Environment Variables**
4. Deploy

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | For auth/DB | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth/DB | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | For sync/admin | Service role key (server-side only, never expose) |
| `FOOTBALL_DATA_API_KEY` | For live data | API key from football-data.org (free tier) |
| `CRON_SECRET` | For sync | Shared secret between GitHub Actions and Vercel |
| `ADMIN_USERNAME` | For admin panel | Admin login username (default: `admin`) |
| `ADMIN_PASSWORD` | For admin panel | Admin login password — **required** to enable admin access |

> Without these variables the app runs fully with mock data.

---

## Admin panel

Available at `/admin`. Lets you:
- View and delete users and prodes
- See all synced matches by phase
- Trigger a manual match sync from football-data.org

Access is protected by `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars via an HttpOnly session cookie. If `ADMIN_PASSWORD` is not set, the admin panel is disabled.

---

## Database schema

```
profiles              ← extends auth.users
prodes                ← prediction pool groups
prode_members         ← membership (trigger auto-assigns tokens on join)
matches               ← fixtures synced from football-data.org
predictions           ← user predictions with multiplier (1/2/3/5)
special_predictions   ← champion, top scorer, finalist, etc.
scores                ← accumulated points per user per phase
multiplier_tokens     ← 2x/3x/5x tokens per user per prode
streaks               ← current and best streak per user per prode
wildcard_challenges   ← weekly challenges (reserved, not in MVP)
wildcard_answers      ← user answers (reserved, not in MVP)
```

All scoring logic lives in the SQL function `calculate_match_points(match_id uuid)`.

---

## Useful commands

```bash
npm run dev          # development server (Turbopack)
npm run build        # production build
npm run lint         # ESLint
npm run test         # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
```
