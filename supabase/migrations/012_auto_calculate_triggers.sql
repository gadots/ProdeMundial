-- Migration 012: Auto-calculate points via DB triggers
--
-- Problem being fixed:
--   calculate_match_points() was only called from the sync API, and only for
--   matches with calculated_at IS NULL. If the sync ran right after a match
--   finished (before users saved predictions), calculated_at got stamped with
--   0 predictions processed. Later predictions saved by users never earned
--   points because the sync skipped that match forever.
--
-- Solution:
--   1. Trigger on matches: fires when status → FINISHED → calculates immediately
--   2. Trigger on predictions: fires when prediction saved for already-FINISHED
--      match → calculates immediately
--   3. Backfill: immediately fixes all existing FINISHED matches that still
--      have predictions with points_earned IS NULL

-- ─── Trigger 1: match becomes FINISHED ───────────────────────────────────────

create or replace function public.tgfn_match_finished()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'FINISHED'
     and coalesce(old.status, '') is distinct from 'FINISHED'
  then
    perform public.calculate_match_points(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists tg_match_finished on public.matches;
create trigger tg_match_finished
  after insert or update of status on public.matches
  for each row execute function public.tgfn_match_finished();

-- ─── Trigger 2: prediction saved for already-FINISHED match ──────────────────
-- Scoped to home_goals / away_goals / multiplier to avoid infinite recursion:
-- calculate_match_points() updates points_earned, but that column change will
-- NOT re-fire this trigger.

create or replace function public.tgfn_prediction_upserted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  if new.points_earned is not null then return new; end if;
  select status into v_status from public.matches where id = new.match_id;
  if v_status = 'FINISHED' then
    perform public.calculate_match_points(new.match_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tg_prediction_upserted on public.predictions;
create trigger tg_prediction_upserted
  after insert or update of home_goals, away_goals, multiplier on public.predictions
  for each row execute function public.tgfn_prediction_upserted();

-- Backfill runs in migration 013 after calculate_match_points is fixed.
