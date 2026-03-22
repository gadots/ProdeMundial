-- Allow users to leave a prode (delete their own membership)
drop policy if exists "Members can leave prode" on public.prode_members;
create policy "Members can leave prode"
  on public.prode_members for delete
  using (user_id = auth.uid());

-- Allow admin to delete their prode
drop policy if exists "Admin can delete prode" on public.prodes;
create policy "Admin can delete prode"
  on public.prodes for delete
  using (admin_id = auth.uid());
