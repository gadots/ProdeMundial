-- Migration 013: Fix calculate_match_points — rec.id bug
--
-- Bug: the SELECT in the loop did `p.*` (from prode_members) plus
-- specific columns from predictions, but never selected `pr.id`.
-- prode_members has no `id` column, so `rec.id` at line 85 always
-- threw "record has no field id" and the function never processed
-- a single prediction. Points were always 0.
--
-- Fix: explicitly select only the columns we need, aliasing
-- predictions.id as prediction_id to avoid any ambiguity.
--
-- Also runs backfill: calculates points for all existing FINISHED
-- matches that still have predictions with points_earned IS NULL.

create or replace function public.calculate_match_points(p_match_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  m                public.matches%rowtype;
  rec              record;
  base_pts         integer;
  pts              integer;
  streak_bonus     integer;
  streak_rec       public.streaks%rowtype;
  actual_winner    integer;
  predicted_winner integer;
  total_updated    integer := 0;
begin
  select * into m from public.matches where id = p_match_id;
  if not found or m.status <> 'FINISHED'
     or m.home_score is null or m.away_score is null
  then return 0; end if;

  actual_winner := sign(m.home_score - m.away_score);

  for rec in
    select
      pr.id          as prediction_id,
      pr.user_id,
      pr.prode_id,
      pr.home_goals,
      pr.away_goals,
      pr.multiplier
    from public.predictions pr
    join public.prode_members pm
      on pm.user_id = pr.user_id and pm.prode_id = pr.prode_id
    where pr.match_id = p_match_id
      and pr.points_earned is null
  loop
    base_pts         := 0;
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
          when 'THIRD_PLACE'   then 10
          when 'FINAL'         then 20
          else 1
        end;
      end if;
    end if;

    -- Streak bonus applied BEFORE multiplier: (base + bonus) × multiplier
    streak_bonus := 0;
    if base_pts > 0 then
      select * into streak_rec from public.streaks
        where user_id = rec.user_id and prode_id = rec.prode_id;
      if found then
        if    streak_rec.current_streak >= 5 then streak_bonus := 8;
        elsif streak_rec.current_streak >= 3 then streak_bonus := 3;
        end if;
      end if;
    end if;

    pts := (base_pts + streak_bonus) * coalesce(rec.multiplier, 1);

    -- Mark prediction as calculated
    update public.predictions
      set points_earned = pts, updated_at = now()
      where id = rec.prediction_id;

    -- Accumulate into scores (per user · prode · phase)
    insert into public.scores (user_id, prode_id, phase, points, updated_at)
      values (rec.user_id, rec.prode_id, m.phase, pts, now())
      on conflict (user_id, prode_id, phase)
      do update set
        points     = public.scores.points + excluded.points,
        updated_at = now();

    -- Update streak counter
    if pts > 0 then
      insert into public.streaks (user_id, prode_id, current_streak, best_streak)
        values (rec.user_id, rec.prode_id, 1, 1)
        on conflict (user_id, prode_id)
        do update set
          current_streak = public.streaks.current_streak + 1,
          best_streak    = greatest(public.streaks.best_streak,
                                    public.streaks.current_streak + 1),
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

  update public.matches set calculated_at = now() where id = p_match_id;

  return total_updated;
end;
$$;

-- Re-confirm triggers exist (idempotent — 012 may have rolled back)
drop trigger if exists tg_match_finished on public.matches;
create trigger tg_match_finished
  after insert or update of status on public.matches
  for each row execute function public.tgfn_match_finished();

drop trigger if exists tg_prediction_upserted on public.predictions;
create trigger tg_prediction_upserted
  after insert or update of home_goals, away_goals, multiplier on public.predictions
  for each row execute function public.tgfn_prediction_upserted();

-- Backfill: calculate points for all existing FINISHED matches
-- that still have predictions with points_earned IS NULL
do $$
declare
  v_id uuid;
begin
  for v_id in
    select distinct m.id
    from   public.matches m
    where  m.status = 'FINISHED'
      and  m.home_score is not null
      and  m.away_score is not null
      and  exists (
             select 1 from public.predictions p
             where  p.match_id = m.id
               and  p.points_earned is null
           )
  loop
    perform public.calculate_match_points(v_id);
  end loop;
end;
$$;
