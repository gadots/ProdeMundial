-- Migration 018: Penales en llaves — datos + scoring
--
-- Problema:
--   Para partidos de llaves definidos por penales, la sync guardaba en
--   home_score/away_score el tanteo del shootout (ej. 5-3), y las funciones de
--   scoring nunca miraban penales. Resultado: a quien predijo "gana X en tiempo
--   regular" se le sumaban puntos de ganador (incorrecto: en realidad empataron),
--   y a quien predijo bien "empate + X en penales" se le daba 0.
--
-- Solución:
--   - home_score/away_score guardan el resultado de tiempo regular/suplementario
--     (el empate). Nuevas columnas penalty_home/penalty_away guardan el shootout.
--   - El scoring de llaves usa el resultado de tiempo regular + el ganador de
--     penales, espejando src/lib/scoring.ts:
--       * exacto en tiempo regular sin empate → exact
--       * ganador correcto sin empate         → winner
--       * empate + penales al equipo correcto → exact si clavó el marcador del
--                                                empate, si no penales
--       * cualquier otra cosa                 → 0

alter table public.matches add column if not exists penalty_home int;
alter table public.matches add column if not exists penalty_away int;

-- ─── recalculate_all_points: full replay reversible con penales ───────────────

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
  is_penalty       boolean;
  actual_pen       text;
  total            int := 0;
begin
  update public.predictions set points_earned = null where points_earned is not null;
  delete from public.scores where true;
  update public.streaks set current_streak = 0, best_streak = 0 where true;

  for m in
    select * from public.matches
    where status = 'FINISHED'
      and (
        (home_score is not null and away_score is not null)
        or (penalty_home is not null and penalty_away is not null)
      )
    order by date asc, id asc
  loop
    is_penalty := (m.penalty_home is not null and m.penalty_away is not null);
    if is_penalty then
      actual_pen := case when m.penalty_home > m.penalty_away then 'home' else 'away' end;
    else
      actual_pen := null;
    end if;
    if m.home_score is not null and m.away_score is not null then
      actual_winner := sign(m.home_score - m.away_score);
    else
      actual_winner := 0; -- penales sin marcador de ET conocido → tratamos como empate
    end if;

    for rec in
      select pr.id          as prediction_id,
             pr.user_id,
             pr.prode_id,
             pr.home_goals,
             pr.away_goals,
             pr.multiplier,
             pr.penalty_winner
      from public.predictions pr
      join public.prode_members pm
        on pm.user_id = pr.user_id and pm.prode_id = pr.prode_id
      where pr.match_id = m.id
    loop
      base_pts         := 0;
      predicted_winner := sign(rec.home_goals - rec.away_goals);

      if m.phase = 'GROUP' then
        -- Fase de grupos: exacto / ganador / empate
        if m.home_score is not null
           and rec.home_goals = m.home_score and rec.away_goals = m.away_score then
          base_pts := 3;
        elsif predicted_winner = actual_winner then
          if actual_winner = 0 then base_pts := 2; else base_pts := 1; end if;
        end if;
      elsif is_penalty then
        -- Llaves definidas por penales: el tiempo regular fue empate.
        if rec.home_goals = rec.away_goals
           and rec.penalty_winner is not null
           and rec.penalty_winner = actual_pen then
          if m.home_score is not null
             and rec.home_goals = m.home_score and rec.away_goals = m.away_score then
            base_pts := case m.phase
              when 'ROUND_OF_32' then 6  when 'ROUND_OF_16' then 10
              when 'QUARTER_FINAL' then 18 when 'SEMI_FINAL' then 30
              when 'THIRD_PLACE' then 30 when 'FINAL' then 50 else 6 end;
          else
            base_pts := case m.phase
              when 'ROUND_OF_32' then 4  when 'ROUND_OF_16' then 7
              when 'QUARTER_FINAL' then 12 when 'SEMI_FINAL' then 20
              when 'THIRD_PLACE' then 20 when 'FINAL' then 35 else 4 end;
          end if;
        end if;
      else
        -- Llaves resueltas en tiempo regular/suplementario (sin empate).
        if rec.home_goals = m.home_score and rec.away_goals = m.away_score then
          base_pts := case m.phase
            when 'ROUND_OF_32' then 6  when 'ROUND_OF_16' then 10
            when 'QUARTER_FINAL' then 18 when 'SEMI_FINAL' then 30
            when 'THIRD_PLACE' then 30 when 'FINAL' then 50 else 6 end;
        elsif predicted_winner = actual_winner and actual_winner <> 0 then
          base_pts := case m.phase
            when 'ROUND_OF_32' then 2  when 'ROUND_OF_16' then 4
            when 'QUARTER_FINAL' then 6 when 'SEMI_FINAL' then 10
            when 'THIRD_PLACE' then 10 when 'FINAL' then 20 else 2 end;
        end if;
      end if;

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
          do update set current_streak = 0, updated_at = now();
      end if;

      total := total + 1;
    end loop;
  end loop;

  update public.matches set calculated_at = now()
    where status = 'FINISHED'
      and (
        (home_score is not null and away_score is not null)
        or (penalty_home is not null and penalty_away is not null)
      );

  return total;
end;
$$;

-- ─── calculate_match_points: forward path (un partido) con penales ────────────

create or replace function public.calculate_match_points(p_match_id uuid)
returns integer language plpgsql security definer as $$
declare
  m                public.matches%rowtype;
  rec              record;
  base_pts         int;
  pts              int;
  streak_bonus     int;
  actual_winner    int;
  predicted_winner int;
  cur_streak       int;
  is_penalty       boolean;
  actual_pen       text;
  total_updated    int := 0;
begin
  select * into m from public.matches where id = p_match_id;
  if not found or m.status <> 'FINISHED' then return 0; end if;
  if (m.home_score is null or m.away_score is null)
     and (m.penalty_home is null or m.penalty_away is null) then
    return 0;
  end if;

  is_penalty := (m.penalty_home is not null and m.penalty_away is not null);
  if is_penalty then
    actual_pen := case when m.penalty_home > m.penalty_away then 'home' else 'away' end;
  else
    actual_pen := null;
  end if;
  if m.home_score is not null and m.away_score is not null then
    actual_winner := sign(m.home_score - m.away_score);
  else
    actual_winner := 0;
  end if;

  for rec in
    select pr.id as prediction_id, pr.user_id, pr.prode_id,
           pr.home_goals, pr.away_goals, pr.multiplier, pr.penalty_winner
    from public.predictions pr
    join public.prode_members pm
      on pm.user_id = pr.user_id and pm.prode_id = pr.prode_id
    where pr.match_id = p_match_id
      and pr.points_earned is null
  loop
    base_pts         := 0;
    predicted_winner := sign(rec.home_goals - rec.away_goals);

    if m.phase = 'GROUP' then
      if m.home_score is not null
         and rec.home_goals = m.home_score and rec.away_goals = m.away_score then
        base_pts := 3;
      elsif predicted_winner = actual_winner then
        if actual_winner = 0 then base_pts := 2; else base_pts := 1; end if;
      end if;
    elsif is_penalty then
      if rec.home_goals = rec.away_goals
         and rec.penalty_winner is not null
         and rec.penalty_winner = actual_pen then
        if m.home_score is not null
           and rec.home_goals = m.home_score and rec.away_goals = m.away_score then
          base_pts := case m.phase
            when 'ROUND_OF_32' then 6  when 'ROUND_OF_16' then 10
            when 'QUARTER_FINAL' then 18 when 'SEMI_FINAL' then 30
            when 'THIRD_PLACE' then 30 when 'FINAL' then 50 else 6 end;
        else
          base_pts := case m.phase
            when 'ROUND_OF_32' then 4  when 'ROUND_OF_16' then 7
            when 'QUARTER_FINAL' then 12 when 'SEMI_FINAL' then 20
            when 'THIRD_PLACE' then 20 when 'FINAL' then 35 else 4 end;
        end if;
      end if;
    else
      if rec.home_goals = m.home_score and rec.away_goals = m.away_score then
        base_pts := case m.phase
          when 'ROUND_OF_32' then 6  when 'ROUND_OF_16' then 10
          when 'QUARTER_FINAL' then 18 when 'SEMI_FINAL' then 30
          when 'THIRD_PLACE' then 30 when 'FINAL' then 50 else 6 end;
      elsif predicted_winner = actual_winner and actual_winner <> 0 then
        base_pts := case m.phase
          when 'ROUND_OF_32' then 2  when 'ROUND_OF_16' then 4
          when 'QUARTER_FINAL' then 6 when 'SEMI_FINAL' then 10
          when 'THIRD_PLACE' then 10 when 'FINAL' then 20 else 2 end;
      end if;
    end if;

    streak_bonus := 0;
    if base_pts > 0 then
      select current_streak into cur_streak from public.streaks
        where user_id = rec.user_id and prode_id = rec.prode_id;
      if    coalesce(cur_streak, 0) >= 5 then streak_bonus := 8;
      elsif coalesce(cur_streak, 0) >= 3 then streak_bonus := 3;
      end if;
    end if;

    pts := (base_pts + streak_bonus) * coalesce(rec.multiplier, 1);

    update public.predictions set points_earned = pts, updated_at = now()
      where id = rec.prediction_id;

    insert into public.scores (user_id, prode_id, phase, points, updated_at)
      values (rec.user_id, rec.prode_id, m.phase, pts, now())
      on conflict (user_id, prode_id, phase)
      do update set points = public.scores.points + excluded.points, updated_at = now();

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
        do update set current_streak = 0, updated_at = now();
    end if;

    total_updated := total_updated + 1;
  end loop;

  update public.matches set calculated_at = now() where id = p_match_id;
  return total_updated;
end;
$$;

-- Recalcular todo con la nueva lógica de penales.
select public.recalculate_all_points();
