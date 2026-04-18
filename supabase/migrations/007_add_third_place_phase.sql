-- Add THIRD_PLACE to the phase check constraint on matches and wildcards tables,
-- and update calculate_match_points to award the same points as SEMI_FINAL.

-- 1. Drop old constraint and add new one on matches
alter table public.matches
  drop constraint if exists matches_phase_check;

alter table public.matches
  add constraint matches_phase_check
  check (phase in ('GROUP','ROUND_OF_32','ROUND_OF_16','QUARTER_FINAL','SEMI_FINAL','THIRD_PLACE','FINAL'));

-- 2. Drop old constraint and add new one on wildcard_challenges
alter table public.wildcard_challenges
  drop constraint if exists wildcard_challenges_phase_check;

alter table public.wildcard_challenges
  add constraint wildcard_challenges_phase_check
  check (phase in ('GROUP','ROUND_OF_32','ROUND_OF_16','QUARTER_FINAL','SEMI_FINAL','THIRD_PLACE','FINAL','ALL'));

-- 3. Replace calculate_match_points to handle THIRD_PLACE (same points as SEMI_FINAL)
create or replace function public.calculate_match_points(p_match_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  m           public.matches%rowtype;
  rec         record;
  base_pts    integer;
  pts         integer;
  streak_bonus integer;
  streak_rec  public.streaks%rowtype;
  actual_winner integer;
  predicted_winner integer;
  total_updated integer := 0;
begin
  select * into m from public.matches where id = p_match_id;
  if not found or m.status <> 'FINISHED' then return 0; end if;

  actual_winner := sign(m.home_score - m.away_score);

  for rec in
    select p.*, pr.home_goals, pr.away_goals, pr.multiplier
    from public.predictions pr
    join public.prode_members p on p.user_id = pr.user_id and p.prode_id = pr.prode_id
    where pr.match_id = p_match_id and pr.points_earned is null
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
        when 'THIRD_PLACE'   then 30
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
          when 'THIRD_PLACE'   then 10
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

    total_updated := total_updated + 1;
  end loop;

  -- Mark match as calculated
  update public.matches set calculated_at = now() where id = p_match_id;

  return total_updated;
end;
$$;
