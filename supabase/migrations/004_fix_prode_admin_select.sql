-- ============================================================
-- Migration 004 — Allow prode admin to select their own prode
-- ============================================================
-- Root cause: createProde() does INSERT + .select("id") in one
-- PostgREST call. PostgREST applies the SELECT policy to return
-- the inserted row. But the admin isn't in prode_members yet
-- (that INSERT happens right after), so is_member_of_prode()
-- returns false and PostgREST raises an RLS violation.
--
-- Fix: extend the prodes SELECT policy to also allow the admin
-- (admin_id = auth.uid()) to read their own prode, regardless
-- of membership.
-- ============================================================

drop policy if exists "Members can view their prodes" on public.prodes;
create policy "Members can view their prodes"
  on public.prodes for select
  using (
    admin_id = auth.uid()
    or public.is_member_of_prode(id)
  );
