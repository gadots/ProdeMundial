-- ============================================================
-- Migration 003 — Fix infinite recursion in RLS policies
-- ============================================================
-- Root cause: policies on prode_members, prodes, predictions,
-- scores, multiplier_tokens, streaks, and wildcard_challenges all
-- check membership via a subquery on prode_members, which triggers
-- prode_members' own RLS policy → infinite recursion.
--
-- Fix: introduce a SECURITY DEFINER helper function that bypasses
-- RLS when checking membership, then rewrite all affected policies
-- to use it.
-- ============================================================

-- -------------------------------------------------------
-- Helper function: is_member_of_prode
-- Runs as the function owner (bypasses RLS) so it can
-- safely query prode_members without triggering its policy.
-- -------------------------------------------------------
create or replace function public.is_member_of_prode(p_prode_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.prode_members
    where prode_id = p_prode_id and user_id = auth.uid()
  );
$$;

-- -------------------------------------------------------
-- prode_members — fix the self-referential SELECT policy
-- -------------------------------------------------------
drop policy if exists "Members can view prode membership" on public.prode_members;
create policy "Members can view prode membership"
  on public.prode_members for select
  using (public.is_member_of_prode(prode_id));

-- -------------------------------------------------------
-- prodes — fix the policy that queries prode_members
-- -------------------------------------------------------
drop policy if exists "Members can view their prodes" on public.prodes;
create policy "Members can view their prodes"
  on public.prodes for select
  using (public.is_member_of_prode(id));

-- -------------------------------------------------------
-- predictions
-- -------------------------------------------------------
drop policy if exists "Members can view predictions in their prodes" on public.predictions;
create policy "Members can view predictions in their prodes"
  on public.predictions for select
  using (public.is_member_of_prode(prode_id));

-- -------------------------------------------------------
-- special_predictions
-- -------------------------------------------------------
drop policy if exists "Members can view special predictions in their prodes" on public.special_predictions;
create policy "Members can view special predictions in their prodes"
  on public.special_predictions for select
  using (public.is_member_of_prode(prode_id));

-- -------------------------------------------------------
-- scores
-- -------------------------------------------------------
drop policy if exists "Members can view scores in their prodes" on public.scores;
create policy "Members can view scores in their prodes"
  on public.scores for select
  using (public.is_member_of_prode(prode_id));

-- -------------------------------------------------------
-- multiplier_tokens
-- -------------------------------------------------------
drop policy if exists "Members can view tokens in their prodes" on public.multiplier_tokens;
create policy "Members can view tokens in their prodes"
  on public.multiplier_tokens for select
  using (public.is_member_of_prode(prode_id));

-- -------------------------------------------------------
-- streaks
-- -------------------------------------------------------
drop policy if exists "Members can view streaks in their prodes" on public.streaks;
create policy "Members can view streaks in their prodes"
  on public.streaks for select
  using (public.is_member_of_prode(prode_id));

-- -------------------------------------------------------
-- wildcard_challenges — also queries prode_members in INSERT
-- -------------------------------------------------------
drop policy if exists "Only admins can create wildcard challenges" on public.wildcard_challenges;
create policy "Only admins can create wildcard challenges"
  on public.wildcard_challenges for insert
  with check (
    exists (
      select 1 from public.prodes p
      where p.id = wildcard_challenges.prode_id
        and p.admin_id = auth.uid()
    )
  );
