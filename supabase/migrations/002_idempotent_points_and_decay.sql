-- ============================================================
-- Migration 002 — Idempotent point calculation + token decay
-- ============================================================

-- Add calculated_at to matches so the cron can find uncalculated results
alter table public.matches
  add column if not exists calculated_at timestamptz;

-- -------------------------------------------------------
-- Fix calculate_match_points to be fully idempotent:
-- Skips predictions where points_earned IS NOT NULL (already done).
-- Marks the match with calculated_at once all predictions are processed.
-- DROP first because the return type changes from void (001) to int (002).
-- -------------------------------------------------------
drop function if exists public.calculate_match_points(uuid);
create or replace function public.calculate_match_points(p_match_id uuid)
returns int language plpgsql security definer as $$
declare
  m                public.matches%rowtype;
  rec              record;
  pts              int;
  base_pts         int;
  predicted_winner int;
  actual_winner    int;
  streak_rec       record;
  streak_bonus     int;
  processed        int := 0;
begin
  select * into m from public.matches where id = p_match_id;
  if m.home_score is null or m.away_score is null then return 0; end if;

  actual_winner := sign(m.home_score - m.away_score);

  for rec in
    select * from public.predictions
    where match_id = p_match_id
      and points_earned is null   -- skip already-calculated rows (idempotency)
  loop
    base_pts := 0;
    predicted_winner := sign(rec.home_goals - rec.away_goals);

    -- Exact scoreline
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
    -- Correct winner / draw
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

    -- Apply streak bonus (only if pts > 0)
    streak_bonus := 0;
    if pts > 0 then
      select * into streak_rec
        from public.streaks
        where user_id = rec.user_id and prode_id = rec.prode_id;
      if found then
        if    streak_rec.current_streak >= 5 then streak_bonus := 5;
        elsif streak_rec.current_streak >= 3 then streak_bonus := 2;
        end if;
      end if;
      pts := pts + streak_bonus;
    end if;

    -- Save points on prediction (idempotent: set once)
    update public.predictions
      set points_earned = pts, updated_at = now()
      where id = rec.id;

    -- Accumulate into per-phase score cache
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

    processed := processed + 1;
  end loop;

  -- Mark match as fully calculated (only once all predictions done)
  update public.matches
    set calculated_at = now()
    where id = p_match_id;

  return processed;
end;
$$;

-- -------------------------------------------------------
-- decay_group_tokens: mark unused tokens as decayed once
-- all GROUP phase matches are FINISHED.
-- Returns the number of tokens decayed (0 if groups not done).
-- -------------------------------------------------------
create or replace function public.decay_group_tokens()
returns int language plpgsql security definer as $$
declare
  pending_groups int;
  decayed_count  int;
begin
  -- Only decay when every GROUP match is settled
  select count(*) into pending_groups
    from public.matches
    where phase = 'GROUP' and status != 'FINISHED';

  if pending_groups > 0 then
    return 0;
  end if;

  -- If no GROUP matches exist at all, don't decay
  if not exists (select 1 from public.matches where phase = 'GROUP') then
    return 0;
  end if;

  update public.multiplier_tokens
    set decayed = true, updated_at = now()
    where used_on_match is null and decayed = false;

  get diagnostics decayed_count = row_count;
  return decayed_count;
end;
$$;
