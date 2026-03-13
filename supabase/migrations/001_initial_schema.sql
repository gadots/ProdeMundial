-- ============================================================
-- ProdeMundial — Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push
-- ============================================================

-- Enable RLS on all tables
-- Auth is handled by Supabase (auth.users)

-- -------------------------------------------------------
-- PROFILES (extends auth.users)
-- -------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  push_token   text,
  created_at   timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------
-- MATCHES (populated by cron job from football-data.org)
-- -------------------------------------------------------
create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  api_id       text unique not null,
  home_team_name  text not null,
  home_team_short text not null default '',
  away_team_name  text not null,
  away_team_short text not null default '',
  phase        text not null check (phase in ('GROUP','ROUND_OF_32','ROUND_OF_16','QUARTER_FINAL','SEMI_FINAL','FINAL')),
  group_name   text,
  date         timestamptz not null,
  status       text not null check (status in ('SCHEDULED','LIVE','FINISHED','POSTPONED')) default 'SCHEDULED',
  home_score   int,
  away_score   int,
  venue        text,
  updated_at   timestamptz default now() not null
);

alter table public.matches enable row level security;

create policy "Everyone can read matches"
  on public.matches for select using (true);

create policy "Service role can manage matches"
  on public.matches for all using (auth.role() = 'service_role');

-- -------------------------------------------------------
-- PRODES (groups / prediction pools)
-- -------------------------------------------------------
create table if not exists public.prodes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  admin_id          uuid not null references public.profiles(id) on delete restrict,
  prize_description text,
  invite_code       text unique not null,
  created_at        timestamptz default now() not null
);

alter table public.prodes enable row level security;

create policy "Members can view their prodes"
  on public.prodes for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = id and pm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create prodes"
  on public.prodes for insert with check (auth.uid() = admin_id);

create policy "Admin can update their prode"
  on public.prodes for update using (auth.uid() = admin_id);

-- -------------------------------------------------------
-- PRODE MEMBERS
-- -------------------------------------------------------
create table if not exists public.prode_members (
  prode_id   uuid not null references public.prodes(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz default now() not null,
  primary key (prode_id, user_id)
);

alter table public.prode_members enable row level security;

create policy "Members can view prode membership"
  on public.prode_members for select
  using (
    exists (
      select 1 from public.prode_members pm2
      where pm2.prode_id = prode_id and pm2.user_id = auth.uid()
    )
  );

create policy "Users can join prodes"
  on public.prode_members for insert with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- PREDICTIONS
-- -------------------------------------------------------
create table if not exists public.predictions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  match_id     uuid not null references public.matches(id) on delete cascade,
  prode_id     uuid not null references public.prodes(id) on delete cascade,
  home_goals   int not null check (home_goals >= 0),
  away_goals   int not null check (away_goals >= 0),
  joker_used   boolean not null default false,
  points_earned int,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  unique (user_id, match_id, prode_id)
);

alter table public.predictions enable row level security;

create policy "Members can view predictions in their prodes"
  on public.predictions for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = prode_id and pm.user_id = auth.uid()
    )
  );

create policy "Users can manage their own predictions"
  on public.predictions for all
  using (auth.uid() = user_id);

-- Prevent editing after match starts
create or replace function check_prediction_window()
returns trigger language plpgsql as $$
declare
  match_date timestamptz;
begin
  select date into match_date from public.matches where id = new.match_id;
  if now() >= match_date then
    raise exception 'El partido ya comenzó, no se puede modificar la predicción';
  end if;
  return new;
end;
$$;

create trigger prediction_window_check
  before insert or update on public.predictions
  for each row execute procedure check_prediction_window();

-- -------------------------------------------------------
-- SPECIAL PREDICTIONS
-- -------------------------------------------------------
create table if not exists public.special_predictions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  prode_id              uuid not null references public.prodes(id) on delete cascade,
  champion              text,  -- team name/id
  finalist              text,
  third_place           text,
  top_scorer            text,  -- player name
  most_goals_country    text,
  locked                boolean not null default false,
  points_earned         int not null default 0,
  created_at            timestamptz default now() not null,
  updated_at            timestamptz default now() not null,
  unique (user_id, prode_id)
);

alter table public.special_predictions enable row level security;

create policy "Members can view special predictions in their prodes"
  on public.special_predictions for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = prode_id and pm.user_id = auth.uid()
    )
  );

create policy "Users can manage their own special predictions"
  on public.special_predictions for all
  using (auth.uid() = user_id);

-- -------------------------------------------------------
-- SCORES (leaderboard cache — updated after each result)
-- -------------------------------------------------------
create table if not exists public.scores (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  prode_id     uuid not null references public.prodes(id) on delete cascade,
  phase        text not null,
  points       int not null default 0,
  updated_at   timestamptz default now() not null,
  primary key (user_id, prode_id, phase)
);

alter table public.scores enable row level security;

create policy "Members can view scores in their prodes"
  on public.scores for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = prode_id and pm.user_id = auth.uid()
    )
  );

-- View: leaderboard
create or replace view public.leaderboard as
select
  pm.prode_id,
  p.id as user_id,
  p.display_name,
  p.avatar_url,
  coalesce(sum(s.points), 0) as total_points,
  rank() over (partition by pm.prode_id order by coalesce(sum(s.points), 0) desc) as rank
from public.prode_members pm
join public.profiles p on p.id = pm.user_id
left join public.scores s on s.user_id = pm.user_id and s.prode_id = pm.prode_id
group by pm.prode_id, p.id, p.display_name, p.avatar_url;

-- -------------------------------------------------------
-- FUNCTION: calculate and store points after a match result
-- -------------------------------------------------------
create or replace function public.calculate_match_points(p_match_id uuid)
returns void language plpgsql security definer as $$
declare
  rec record;
  m   record;
  pts int;
  predicted_winner int;
  actual_winner    int;
  phase_pts        record;
begin
  select * into m from public.matches where id = p_match_id;
  if not found or m.status != 'FINISHED' then return; end if;

  -- Point values per phase
  for rec in
    select * from public.predictions where match_id = p_match_id
  loop
    pts := 0;
    predicted_winner := sign(rec.home_goals - rec.away_goals);
    actual_winner    := sign(m.home_score  - m.away_score);

    -- Exact result
    if rec.home_goals = m.home_score and rec.away_goals = m.away_score then
      pts := case m.phase
        when 'GROUP'         then 3
        when 'ROUND_OF_32'   then 6
        when 'ROUND_OF_16'   then 10
        when 'QUARTER_FINAL' then 18
        when 'SEMI_FINAL'    then 30
        when 'FINAL'         then 50
        else 3
      end;
    -- Correct winner/draw
    elsif predicted_winner = actual_winner then
      if actual_winner = 0 then
        -- Draw (only in group stage)
        pts := case m.phase when 'GROUP' then 2 else 0 end;
      else
        pts := case m.phase
          when 'GROUP'         then 1
          when 'ROUND_OF_32'   then 2
          when 'ROUND_OF_16'   then 4
          when 'QUARTER_FINAL' then 6
          when 'SEMI_FINAL'    then 10
          when 'FINAL'         then 20
          else 1
        end;
      end if;
    end if;

    -- Joker doubles points
    if rec.joker_used then pts := pts * 2; end if;

    -- Store on prediction
    update public.predictions set points_earned = pts, updated_at = now()
      where id = rec.id;

    -- Upsert into scores table (accumulate per phase)
    insert into public.scores (user_id, prode_id, phase, points, updated_at)
      values (rec.user_id, rec.prode_id, m.phase, pts, now())
      on conflict (user_id, prode_id, phase)
      do update set points = public.scores.points + pts, updated_at = now();
  end loop;
end;
$$;
