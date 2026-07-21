-- Migration 019: Puntuar predicciones especiales
--
-- Hasta ahora las predicciones especiales (campeón, finalista, 3er puesto,
-- goleador, país con más goles) nunca se puntuaban: special_predictions.points_earned
-- quedaba en 0 y no entraba en el total.
--
-- Resultados reales:
--   * Campeón / Finalista → se derivan del partido FINAL (ganador / perdedor,
--     contando penales).
--   * Tercer puesto → ganador del partido THIRD_PLACE.
--   * País con más goles → suma de goles por selección en todos los partidos.
--   * Goleador → no está en football-data; se hardcodea (Mundial 2026: Kylian Mbappé).

-- Tabla con los resultados reales (una sola fila), para mostrarlos en la UI.
create table if not exists public.special_results (
  id            boolean primary key default true check (id),
  champion      text,
  finalist      text,
  third_place   text,
  top_scorer    text,
  most_goals    text,
  graded_at     timestamptz default now()
);

alter table public.special_results enable row level security;
drop policy if exists "Everyone can read special results" on public.special_results;
create policy "Everyone can read special results"
  on public.special_results for select using (true);

create or replace function public.grade_special_predictions()
returns int language plpgsql security definer as $$
declare
  v_final       public.matches%rowtype;
  v_third       public.matches%rowtype;
  v_champion    text;
  v_finalist    text;
  v_third_place text;
  v_most_goals  text;
  v_top_scorer  text := 'Kylian Mbappé';  -- Golden Boot Mundial 2026 (hardcode)
  rec           record;
  total_pts     int;
  n             int := 0;
begin
  -- Ganador/perdedor de la Final (contando penales).
  select * into v_final
    from public.matches
    where phase = 'FINAL' and status = 'FINISHED'
      and (home_score is not null or penalty_home is not null)
    order by date desc limit 1;

  if found then
    if v_final.home_score > v_final.away_score
       or (v_final.home_score = v_final.away_score and coalesce(v_final.penalty_home,0) > coalesce(v_final.penalty_away,0)) then
      v_champion := v_final.home_team_short;
      v_finalist := v_final.away_team_short;
    else
      v_champion := v_final.away_team_short;
      v_finalist := v_final.home_team_short;
    end if;
  end if;

  -- Ganador del partido por el tercer puesto.
  select * into v_third
    from public.matches
    where phase = 'THIRD_PLACE' and status = 'FINISHED'
      and (home_score is not null or penalty_home is not null)
    order by date desc limit 1;

  if found then
    if v_third.home_score > v_third.away_score
       or (v_third.home_score = v_third.away_score and coalesce(v_third.penalty_home,0) > coalesce(v_third.penalty_away,0)) then
      v_third_place := v_third.home_team_short;
    else
      v_third_place := v_third.away_team_short;
    end if;
  end if;

  -- País con más goles (suma en todos los partidos finalizados, sin contar penales).
  select tla into v_most_goals from (
    select home_team_short as tla, sum(coalesce(home_score,0)) as g
      from public.matches where status = 'FINISHED' group by home_team_short
    union all
    select away_team_short as tla, sum(coalesce(away_score,0)) as g
      from public.matches where status = 'FINISHED' group by away_team_short
  ) t
  where tla <> ''
  group by tla
  order by sum(g) desc, tla asc
  limit 1;

  -- Guardar resultados reales (fila única).
  insert into public.special_results (id, champion, finalist, third_place, top_scorer, most_goals, graded_at)
    values (true, v_champion, v_finalist, v_third_place, v_top_scorer, v_most_goals, now())
    on conflict (id) do update set
      champion = excluded.champion, finalist = excluded.finalist,
      third_place = excluded.third_place, top_scorer = excluded.top_scorer,
      most_goals = excluded.most_goals, graded_at = now();

  -- Puntuar cada fila de predicciones especiales.
  for rec in select * from public.special_predictions loop
    total_pts := 0;
    if v_champion is not null and rec.champion = v_champion then total_pts := total_pts + 60; end if;
    if v_finalist is not null and rec.finalist = v_finalist then total_pts := total_pts + 35; end if;
    if v_third_place is not null and rec.third_place = v_third_place then total_pts := total_pts + 25; end if;
    if v_most_goals is not null and rec.most_goals_country = v_most_goals then total_pts := total_pts + 20; end if;
    if rec.top_scorer is not null and v_top_scorer is not null
       and lower(trim(rec.top_scorer)) = lower(trim(v_top_scorer)) then total_pts := total_pts + 40; end if;

    update public.special_predictions
      set points_earned = total_pts, updated_at = now()
      where id = rec.id;
    n := n + 1;
  end loop;

  return n;
end;
$$;

-- Puntuar ahora.
select public.grade_special_predictions();
