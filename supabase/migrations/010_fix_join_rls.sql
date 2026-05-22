-- Allows any authenticated user to find a prode by its invite code,
-- bypassing RLS so non-members can complete the join flow.
-- Follows the same security definer pattern used by is_member_of_prode() (migration 003).
create or replace function public.find_prode_by_invite_code(p_invite_code text)
returns table(id uuid)
language sql
security definer
stable
as $$
  select id from public.prodes
  where invite_code = upper(p_invite_code)
  limit 1;
$$;

-- Restrict execution to authenticated users only
revoke all on function public.find_prode_by_invite_code(text) from public;
grant execute on function public.find_prode_by_invite_code(text) to authenticated;
