-- Fix: leaderboard view must use security_invoker so RLS policies of the
-- querying user apply instead of the view creator's permissions.
create or replace view public.leaderboard with (security_invoker = true) as
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
