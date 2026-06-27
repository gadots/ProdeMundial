-- Migration 016: Recálculo total reversible cuando se corrige un resultado
--
-- Problema:
--   calculate_match_points() solo procesa predicciones con points_earned IS NULL
--   y acumula sobre scores (no es reversible). El trigger tg_match_finished solo
--   dispara en la transición de status → FINISHED. Cuando football-data.org
--   corrige el marcador de un partido YA finalizado y puntuado (p. ej. reporta
--   0-1 provisional y después 1-1), nada recalcula: los puntos quedan congelados
--   contra el marcador viejo, tanto en predictions.points_earned como en scores
--   (que alimenta la view leaderboard = sum(scores.points)).
--
-- Solución:
--   recalculate_all_points() — full replay idempotente y reversible. Resetea
--   points_earned, scores y streaks, y reproduce TODOS los partidos finalizados
--   en orden cronológico. Es la única forma correcta de recomputar el bonus de
--   racha, que depende del orden en que se resolvieron los partidos.
--
--   El sync (src/lib/sync-matches.ts) la llama una sola vez cuando detecta que
--   un partido ya FINISHED cambió de marcador. El forward path
--   (calculate_match_points + triggers) se mantiene para el caso normal de un
--   partido que recién finaliza.

create or replace function public.recalculate_all_points()
returns int language plpgsql security definer as $$
declare
  m                public.matches%rowtype;
  rec              record;
  base_pts         int;
  pts              int;
  streak_bonus     int;
  actual_winner    int;
  predicted_winner int;
  cur_streak       int;
  total            int := 0;
begin
  -- Reset total: borramos el estado puntuado para reconstruirlo desde cero.
  update public.predictions set points_earned = null where points_earned is not null;
  delete from public.scores;
  update public.streaks set current_streak = 0, best_streak = 0;

  -- Reproducir los partidos finalizados en orden cronológico
  -- (las rachas dependen del orden).
  for m in
    select * from public.matches
    where status = 'FINISHED'
      and home_score is not null
      and away_score is not null
    order by date asc, id asc
  loop
    actual_winner := sign(m.home_score - m.away_score);

    for rec in
      select pr.id          as prediction_id,
             pr.user_id,
             pr.prode_id,
             pr.home_goals,
             pr.away_goals,
             pr.multiplier
      from public.predictions pr
      join public.prode_members pm
        on pm.user_id = pr.user_id and pm.prode_id = pr.prode_id
      where pr.match_id = m.id
    loop
      base_pts         := 0;
      predicted_winner := sign(rec.home_goals - rec.away_goals);

      -- Resultado exacto
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
      -- Ganador correcto / empate
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

      -- Bonus de racha leído del estado ACTUAL (ya en orden cronológico)
      streak_bonus := 0;
      if base_pts > 0 then
        select current_streak into cur_streak from public.streaks
          where user_id = rec.user_id and prode_id = rec.prode_id;
        if    coalesce(cur_streak, 0) >= 5 then streak_bonus := 8;
        elsif coalesce(cur_streak, 0) >= 3 then streak_bonus := 3;
        end if;
      end if;

      pts := (base_pts + streak_bonus) * coalesce(rec.multiplier, 1);

      update public.predictions
        set points_earned = pts, updated_at = now()
        where id = rec.prediction_id;

      insert into public.scores (user_id, prode_id, phase, points, updated_at)
        values (rec.user_id, rec.prode_id, m.phase, pts, now())
        on conflict (user_id, prode_id, phase)
        do update set
          points     = public.scores.points + excluded.points,
          updated_at = now();

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

      total := total + 1;
    end loop;
  end loop;

  update public.matches set calculated_at = now()
    where status = 'FINISHED'
      and home_score is not null
      and away_score is not null;

  return total;
end;
$$;

-- Backfill inmediato: corrige los puntos congelados existentes
-- (Egypt–Iran y cualquier otro partido cuyo marcador haya sido corregido).
select public.recalculate_all_points();
