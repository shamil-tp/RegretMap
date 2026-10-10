-- RegretMap Phase 10: story authorship, "helpful" reactions, and their RLS.
--
-- Additive only: new tables, one new column with a default, new policies and
-- triggers. No data is changed or removed.
--
-- * story_authors  — private link between a story and the signed-in user who
--                    submitted it (anonymous submissions have no row). Authors
--                    can read their own rows; nobody else can.
-- * stories        — authors may also READ their own stories in any status
--                    (to see "pending review"); public rules are unchanged.
-- * story_reactions — one 'helpful' per user per story. Users can add/remove
--                    only their own, and only on published stories.
-- * stories.helpful_count — maintained by a trigger from story_reactions, so
--                    clients can never set it.

-- ---------------------------------------------------------------------------
-- Authorship (private)
-- ---------------------------------------------------------------------------
create table if not exists public.story_authors (
  story_id   uuid primary key references public.stories (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists story_authors_user_idx on public.story_authors (user_id);

alter table public.story_authors enable row level security;
revoke all on public.story_authors from anon, authenticated;
grant select on public.story_authors to authenticated;

drop policy if exists "Authors can read their own authorship rows" on public.story_authors;
create policy "Authors can read their own authorship rows"
  on public.story_authors
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Authors can see their own stories whatever the status (e.g. pending).
drop policy if exists "Authors can read their own stories" on public.stories;
create policy "Authors can read their own stories"
  on public.stories
  for select
  to authenticated
  using (
    exists (
      select 1 from public.story_authors a
      where a.story_id = stories.id
        and a.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Reactions ("helpful")
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists helpful_count integer not null default 0
  check (helpful_count >= 0);

create table if not exists public.story_reactions (
  id            uuid primary key default gen_random_uuid(),
  story_id      uuid not null references public.stories (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  reaction_type text not null default 'helpful' check (reaction_type in ('helpful')),
  created_at    timestamptz not null default now(),
  constraint story_reactions_unique unique (story_id, user_id, reaction_type)
);

create index if not exists story_reactions_user_idx on public.story_reactions (user_id);

alter table public.story_reactions enable row level security;
revoke all on public.story_reactions from anon, authenticated;
grant select, insert, delete on public.story_reactions to authenticated;

drop policy if exists "Users can read their own reactions" on public.story_reactions;
create policy "Users can read their own reactions"
  on public.story_reactions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can react to published stories as themselves" on public.story_reactions;
create policy "Users can react to published stories as themselves"
  on public.story_reactions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.stories s
      join public.destinations d on d.id = s.destination_id
      where s.id = story_reactions.story_id
        and s.status = 'published'
        and d.status = 'published'
    )
  );

drop policy if exists "Users can remove their own reactions" on public.story_reactions;
create policy "Users can remove their own reactions"
  on public.story_reactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Keep stories.helpful_count in sync. SECURITY DEFINER because reacting users
-- have no UPDATE privilege on stories; it only ever recounts one story.
create or replace function public.sync_story_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.story_id, old.story_id);
begin
  update public.stories
     set helpful_count = (
       select count(*) from public.story_reactions r
       where r.story_id = target and r.reaction_type = 'helpful'
     )
   where id = target;
  return null;
end;
$$;

revoke all on function public.sync_story_helpful_count() from public, anon, authenticated;

create or replace trigger story_reactions_sync_count
  after insert or delete on public.story_reactions
  for each row execute function public.sync_story_helpful_count();
