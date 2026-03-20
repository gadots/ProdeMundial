-- Allow users to leave a prode (delete their own membership)
create policy "Members can leave prode"
  on public.prode_members for delete
  using (user_id = auth.uid());

-- Allow admin to delete their prode
create policy "Admin can delete prode"
  on public.prodes for delete
  using (admin_id = auth.uid());
