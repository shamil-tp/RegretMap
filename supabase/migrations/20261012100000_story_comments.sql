-- RegretMap Phase 12: comments and one level of replies on published stories.
-- Additive only. Requires Supabase Auth (auth.users), present in every project.
--
-- Security model
--   * Anyone can read visible comments ('published' or 'deleted' placeholders)
--     on publicly visible stories only. user_id is never readable by clients.
--   * Signed-in users insert through their own session (RLS). user_id defaults
--     to auth.uid() and isn't in the insert grant, so it can't be spoofed;
--     status isn't grantable either. author_name is set by a trigger from the
--     account, never from the request.
--   * A reply's parent must be a top-level, visible comment on the SAME story
--     (composite foreign key + trigger), so replies can't cross stories.
--   * Authors can edit only the body of their own comments; deletion goes
--     through delete_story_comment(), which leaves a "deleted" placeholder when
--     the comment has replies so other people's replies aren't removed.
--   * 'hidden' is the moderator state (set with SQL / service role); hidden
--     comments are invisible to the public.

create table if not exists public.story_comments (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid not null references public.stories (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_id   uuid,
  author_name text not null check (char_length(author_name) between 1 and 40),
  body        text not null check (char_length(body) between 1 and 1000),
  status      text not null default 'published'
              check (status in ('published', 'deleted', 'hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint story_comments_id_story_key unique (id, story_id),
  -- A reply must belong to the same story as its parent.
  constraint story_comments_parent_same_story
    foreign key (parent_id, story_id) references public.story_comments (id, story_id)
    on delete cascade,
  constraint story_comments_not_own_parent check (parent_id is null or parent_id <> id)
);

comment on table public.story_comments is
  'Comments and one level of replies on published stories. user_id is private.';

create index if not exists story_comments_story_created_idx
  on public.story_comments (story_id, created_at);
create index if not exists story_comments_parent_idx
  on public.story_comments (parent_id) where parent_id is not null;
create index if not exists story_comments_user_idx
  on public.story_comments (user_id);

create or replace trigger story_comments_set_updated_at
  before update on public.story_comments
  for each row execute function public.set_updated_at();

-- Sets the public display name from the account and checks the parent.
-- SECURITY DEFINER so it can read auth.users and hidden parents; it only
-- reads, and only for the row being written.
create or replace function public.story_comments_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent record;
  meta jsonb;
begin
  if tg_op = 'INSERT' then
    select raw_user_meta_data into meta from auth.users where id = new.user_id;
    new.author_name := left(coalesce(
      nullif(btrim(meta ->> 'display_name'), ''),
      'Traveller ' || upper(substr(md5(new.user_id::text), 1, 4))
    ), 40);
  else
    -- Only the body (and status via the delete function) may change.
    new.author_name := old.author_name;
    new.user_id := old.user_id;
    new.story_id := old.story_id;
    new.parent_id := old.parent_id;
    new.created_at := old.created_at;
  end if;

  if tg_op = 'INSERT' and new.parent_id is not null then
    select c.parent_id, c.status, c.story_id into parent
    from public.story_comments c where c.id = new.parent_id;
    if not found or parent.story_id <> new.story_id then
      raise exception 'Reply parent must be a comment on the same story' using errcode = '23503';
    end if;
    if parent.parent_id is not null then
      raise exception 'Replies can only be one level deep' using errcode = '23514';
    end if;
    if parent.status <> 'published' then
      raise exception 'Cannot reply to this comment' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.story_comments_before_write() from public, anon, authenticated;

create or replace trigger story_comments_before_write
  before insert or update on public.story_comments
  for each row execute function public.story_comments_before_write();

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security
-- ---------------------------------------------------------------------------
alter table public.story_comments enable row level security;

revoke all on public.story_comments from anon, authenticated;
grant select (id, story_id, parent_id, author_name, body, status, created_at, updated_at)
  on public.story_comments to anon, authenticated;
grant insert (story_id, parent_id, body) on public.story_comments to authenticated;
grant update (body) on public.story_comments to authenticated;

drop policy if exists "Public can read visible comments on public stories" on public.story_comments;
create policy "Public can read visible comments on public stories"
  on public.story_comments
  for select
  to anon, authenticated
  using (
    status in ('published', 'deleted')
    and exists (
      select 1
      from public.stories s
      join public.destinations d on d.id = s.destination_id
      where s.id = story_comments.story_id
        and s.status = 'published'
        and d.status = 'published'
    )
  );

drop policy if exists "Users can comment on public stories as themselves" on public.story_comments;
create policy "Users can comment on public stories as themselves"
  on public.story_comments
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'published'
    and exists (
      select 1
      from public.stories s
      join public.destinations d on d.id = s.destination_id
      where s.id = story_comments.story_id
        and s.status = 'published'
        and d.status = 'published'
    )
  );

drop policy if exists "Users can edit their own published comments" on public.story_comments;
create policy "Users can edit their own published comments"
  on public.story_comments
  for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'published')
  with check (user_id = (select auth.uid()) and status = 'published');

-- No DELETE policy: deletion goes through delete_story_comment().

-- ---------------------------------------------------------------------------
-- Helper functions for signed-in users
-- ---------------------------------------------------------------------------

-- Which of a story's comments belong to the caller (without exposing user_id).
create or replace function public.my_story_comment_ids(p_story_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.story_comments c
  where c.story_id = p_story_id
    and c.user_id = (select auth.uid())
    and c.status = 'published';
$$;

revoke all on function public.my_story_comment_ids(uuid) from public, anon;
grant execute on function public.my_story_comment_ids(uuid) to authenticated;

-- Deletes the caller's own comment. A comment with visible replies becomes a
-- "deleted" placeholder so the replies stay attached; otherwise it's removed.
create or replace function public.delete_story_comment(p_comment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_replies boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  perform 1 from public.story_comments
  where id = p_comment_id and user_id = (select auth.uid()) and status = 'published'
  for update;
  if not found then
    raise exception 'Comment not found' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.story_comments
    where parent_id = p_comment_id and status = 'published'
  ) into has_replies;

  if has_replies then
    update public.story_comments
    set status = 'deleted', body = '[deleted]'
    where id = p_comment_id;
    return 'placeholder';
  end if;
  delete from public.story_comments where id = p_comment_id;
  return 'deleted';
end;
$$;

revoke all on function public.delete_story_comment(uuid) from public, anon;
grant execute on function public.delete_story_comment(uuid) to authenticated;
