-- ============================================================
-- ProdeMundial — Initial Schema (idempotent version)
-- Run this in your Supabase SQL editor or via supabase db push
-- ============================================================

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

drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles"
  on public.profiles for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
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

drop policy if exists "Everyone can read matches" on public.matches;
create policy "Everyone can read matches"
  on public.matches for select using (true);

drop policy if exists "Service role can manage matches" on public.matches;
create policy "Service role can manage matches"
  on public.matches for all using (auth.role() = 'service_role');

-- -------------------------------------------------------
-- PRODES (groups / prediction pools)
-- NOTE: the "Members can view" policy is added AFTER prode_members is created
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

drop policy if exists "Authenticated users can create prodes" on public.prodes;
create policy "Authenticated users can create prodes"
  on public.prodes for insert with check (auth.uid() = admin_id);

drop policy if exists "Admin can update their prode" on public.prodes;
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

drop policy if exists "Members can view prode membership" on public.prode_members;
create policy "Members can view prode membership"
  on public.prode_members for select
  using (
    exists (
      select 1 from public.prode_members pm2
      where pm2.prode_id = prode_id and pm2.user_id = auth.uid()
    )
  );

drop policy if exists "Users can join prodes" on public.prode_members;
create policy "Users can join prodes"
  on public.prode_members for insert with check (auth.uid() = user_id);

-- Now that prode_members exists, add the select policy on prodes
drop policy if exists "Members can view their prodes" on public.prodes;
create policy "Members can view their prodes"
  on public.prodes for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = id and pm.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- PREDICTIONS
-- -------------------------------------------------------
create table if not exists public.predictions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  match_id      uuid not null references public.matches(id) on delete cascade,
  prode_id      uuid not null references public.prodes(id) on delete cascade,
  home_goals    int not null check (home_goals >= 0),
  away_goals    int not null check (away_goals >= 0),
  multiplier    int not null default 1 check (multiplier in (1, 2, 3, 5)),
  points_earned int,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,
  unique (user_id, match_id, prode_id)
);

alter table public.predictions enable row level security;

drop policy if exists "Members can view predictions in their prodes" on public.predictions;
create policy "Members can view predictions in their prodes"
  on public.predictions for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = prode_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage their own predictions" on public.predictions;
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

drop trigger if exists prediction_window_check on public.predictions;
create trigger prediction_window_check
  before insert or update on public.predictions
  for each row execute procedure check_prediction_window();

-- -------------------------------------------------------
-- SPECIAL PREDICTIONS
-- -------------------------------------------------------
create table if not exists public.special_predictions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  prode_id           uuid not null references public.prodes(id) on delete cascade,
  champion           text,
  finalist           text,
  third_place        text,
  top_scorer         text,
  most_goals_country text,
  locked             boolean not null default false,
  points_earned      int not null default 0,
  created_at         timestamptz default now() not null,
  updated_at         timestamptz default now() not null,
  unique (user_id, prode_id)
);

alter table public.special_predictions enable row level security;

drop policy if exists "Members can view special predictions in their prodes" on public.special_predictions;
create policy "Members can view special predictions in their prodes"
  on public.special_predictions for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = prode_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage their own special predictions" on public.special_predictions;
create policy "Users can manage their own special predictions"
  on public.special_predictions for all
  using (auth.uid() = user_id);

-- -------------------------------------------------------
-- SCORES (leaderboard cache — updated after each result)
-- -------------------------------------------------------
create table if not exists public.scores (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  prode_id   uuid not null references public.prodes(id) on delete cascade,
  phase      text not null,
  points     int not null default 0,
  updated_at timestamptz default now() not null,
  primary key (user_id, prode_id, phase)
);

alter table public.scores enable row level security;

drop policy if exists "Members can view scores in their prodes" on public.scores;
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
-- MULTIPLIER TOKENS (one row per token per user per prode)
-- -------------------------------------------------------
create table if not exists public.multiplier_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  prode_id      uuid not null references public.prodes(id) on delete cascade,
  multiplier    int not null check (multiplier in (2, 3, 5)),
  used_on_match uuid references public.matches(id),
  decayed       boolean not null default false,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null,
  unique (user_id, prode_id, multiplier)
);

alter table public.multiplier_tokens enable row level security;

drop policy if exists "Members can view tokens in their prodes" on public.multiplier_tokens;
create policy "Members can view tokens in their prodes"
  on public.multiplier_tokens for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = multiplier_tokens.prode_id
        and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage their own tokens" on public.multiplier_tokens;
create policy "Users can manage their own tokens"
  on public.multiplier_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-assign 3 tokens when a user joins a prode
create or replace function public.assign_tokens_on_join()
returns trigger language plpgsql security definer as $$
begin
  insert into public.multiplier_tokens (user_id, prode_id, multiplier)
  values
    (new.user_id, new.prode_id, 2),
    (new.user_id, new.prode_id, 3),
    (new.user_id, new.prode_id, 5)
  on conflict (user_id, prode_id, multiplier) do nothing;
  return new;
end;
$$;

create or replace trigger on_prode_member_added
  after insert on public.prode_members
  for each row execute procedure public.assign_tokens_on_join();

-- -------------------------------------------------------
-- HOT STREAK (one row per user per prode)
-- -------------------------------------------------------
create table if not exists public.streaks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  prode_id       uuid not null references public.prodes(id) on delete cascade,
  current_streak int not null default 0,
  best_streak    int not null default 0,
  updated_at     timestamptz default now() not null,
  unique (user_id, prode_id)
);

alter table public.streaks enable row level security;

drop policy if exists "Members can view streaks in their prodes" on public.streaks;
create policy "Members can view streaks in their prodes"
  on public.streaks for select
  using (
    exists (
      select 1 from public.prode_members pm
      where pm.prode_id = streaks.prode_id
        and pm.user_id = auth.uid()
    )
  );

drop policy if exists "Streaks are updated by server functions only" on public.streaks;
create policy "Streaks are updated by server functions only"
  on public.streaks for all
  using (user_id = auth.uid());

-- -------------------------------------------------------
-- WILDCARD CHALLENGES
-- -------------------------------------------------------
create table if not exists public.wildcard_challenges (
  id             uuid primary key default gen_random_uuid(),
  prode_id       uuid references public.prodes(id) on delete cascade,
  title          text not null,
  description    text,
  type           text not null check (type in ('PICK_TEAM', 'NUMERIC', 'YES_NO')),
  phase          text check (phase in ('GROUP','ROUND_OF_32','ROUND_OF_16','QUARTER_FINAL','SEMI_FINAL','FINAL','ALL')),
  points         int not null default 10,
  deadline       timestamptz not null,
  correct_answer text,
  status         text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'GRADED')),
  week_label     text not null default '',
  created_at     timestamptz default now() not null
);

alter table public.wildcard_challenges enable row level security;

drop policy if exists "Everyone can read wildcard challenges" on public.wildcard_challenges;
create policy "Everyone can read wildcard challenges"
  on public.wildcard_challenges for select using (true);

drop policy if exists "Only admins can create wildcard challenges" on public.wildcard_challenges;
create policy "Only admins can create wildcard challenges"
  on public.wildcard_challenges for insert
  with check (
    exists (
      select 1 from public.prodes p
      where p.id = wildcard_challenges.prode_id
        and p.admin_id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- WILDCARD ANSWERS
-- -------------------------------------------------------
create table if not exists public.wildcard_answers (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.wildcard_challenges(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  answer        text not null,
  points_earned int,
  submitted_at  timestamptz default now() not null,
  unique (challenge_id, user_id)
);

alter table public.wildcard_answers enable row level security;

drop policy if exists "Users can view all answers after challenge closes" on public.wildcard_answers;
create policy "Users can view all answers after challenge closes"
  on public.wildcard_answers for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.wildcard_challenges wc
      where wc.id = wildcard_answers.challenge_id
        and wc.status in ('CLOSED', 'GRADED')
    )
  );

drop policy if exists "Users can submit their own answers" on public.wildcard_answers;
create policy "Users can submit their own answers"
  on public.wildcard_answers for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.wildcard_challenges wc
      where wc.id = wildcard_answers.challenge_id
        and wc.status = 'OPEN'
        and wc.deadline > now()
    )
  );

drop policy if exists "Users can update their own answers while open" on public.wildcard_answers;
create policy "Users can update their own answers while open"
  on public.wildcard_answers for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.wildcard_challenges wc
      where wc.id = wildcard_answers.challenge_id
        and wc.status = 'OPEN'
        and wc.deadline > now()
    )
  );

-- -------------------------------------------------------
-- FUNCTION: calculate and store points after a match result
-- -------------------------------------------------------
create or replace function public.calculate_match_points(p_match_id uuid)
returns void language plpgsql security definer as $$
declare
  m            public.matches%rowtype;
  rec          record;
  pts          int;
  base_pts     int;
  predicted_winner int;
  actual_winner    int;
  streak_rec   record;
  streak_bonus int;
begin
  select * into m from public.matches where id = p_match_id;
  if m.home_score is null or m.away_score is null then return; end if;

  actual_winner := sign(m.home_score - m.away_score);

  for rec in
    select * from public.predictions where match_id = p_match_id
  loop
    base_pts := 0;
    predicted_winner := sign(rec.home_goals - rec.away_goals);

    -- Exact result
    if rec.home_goals = m.home_score and rec.away_goals = m.away_score then
      base_pts := case m.phase
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
        base_pts := case m.phase when 'GROUP' then 2 else 0 end;
      else
        base_pts := case m.phase
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

    -- Apply token multiplier
    pts := base_pts * coalesce(rec.multiplier, 1);

    -- Apply streak bonus (only if scored points)
    streak_bonus := 0;
    if pts > 0 then
      select * into streak_rec from public.streaks
        where user_id = rec.user_id and prode_id = rec.prode_id;
      if found then
        if streak_rec.current_streak >= 5 then streak_bonus := 5;
        elsif streak_rec.current_streak >= 3 then streak_bonus := 2;
        end if;
      end if;
      pts := pts + streak_bonus;
    end if;

    -- Update prediction (idempotent: set, not accumulate)
    update public.predictions
      set points_earned = pts, updated_at = now()
      where id = rec.id;

    -- Upsert into scores (idempotent per match via prediction)
    insert into public.scores (user_id, prode_id, phase, points, updated_at)
      values (rec.user_id, rec.prode_id, m.phase, pts, now())
      on conflict (user_id, prode_id, phase)
      do update set
        points     = public.scores.points + excluded.points,
        updated_at = now();

    -- Update streak
    if pts > 0 then
      insert into public.streaks (user_id, prode_id, current_streak, best_streak)
        values (rec.user_id, rec.prode_id, 1, 1)
        on conflict (user_id, prode_id)
        do update set
          current_streak = public.streaks.current_streak + 1,
          best_streak    = greatest(public.streaks.best_streak, public.streaks.current_streak + 1),
          updated_at     = now();
    else
      insert into public.streaks (user_id, prode_id, current_streak, best_streak)
        values (rec.user_id, rec.prode_id, 0, 0)
        on conflict (user_id, prode_id)
        do update set
          current_streak = 0,
          updated_at     = now();
    end if;

  end loop;
end;
$$;
