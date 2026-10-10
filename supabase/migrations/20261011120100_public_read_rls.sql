-- RegretMap Phase 4: Row Level Security for public read access.
--
-- anon / authenticated may SELECT only published destinations and published
-- stories whose destination is also published. There are deliberately NO
-- insert/update/delete policies, so clients cannot create, publish or edit
-- rows. Write privileges are also revoked as defence in depth. Server-side
-- moderation and submission paths arrive in later phases.

alter table public.destinations enable row level security;
alter table public.stories enable row level security;

revoke insert, update, delete, truncate, references, trigger
  on public.destinations, public.stories
  from anon, authenticated;

grant select on public.destinations, public.stories to anon, authenticated;

create policy "Public can read published destinations"
  on public.destinations
  for select
  to anon, authenticated
  using (status = 'published');

create policy "Public can read published stories of published destinations"
  on public.stories
  for select
  to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.destinations d
      where d.id = stories.destination_id
        and d.status = 'published'
    )
  );
