-- =============================================================================
-- RegretMap — complete database setup + DEMO data (single file)
-- =============================================================================
-- Paste this whole file into Supabase Dashboard -> SQL Editor and click Run.
-- One transaction: if anything fails, nothing is applied.
--
-- Creates the tables, Row Level Security, the submission key, the private AI
-- moderation table + review queue, the private AI recommendation cache,
-- story authorship + helpful reactions (requires Supabase Auth's auth.users,
-- present in every Supabase project), and inserts DEMO data (5 destinations and
-- 18 stories, all is_demo = true — illustrative, not real submissions).
--
-- Safe to re-run: nothing is dropped except the read policies (recreated
-- identically); existing rows are never overwritten or duplicated.
--
-- GENERATED from supabase/migrations/*.sql and supabase/seed.sql — edit those
-- files, not this one. Afterwards, optionally run supabase/tests/rls_check.sql.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Schema: destinations and stories
--    (20261011120000_create_destinations_and_stories.sql)
-- -----------------------------------------------------------------------------

-- RegretMap Phase 4: destinations and travel stories.
-- Additive only: creates new tables; does not drop or modify existing objects.

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- destinations
-- ---------------------------------------------------------------------------
create table if not exists public.destinations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name        text not null check (char_length(name) between 1 and 120),
  region      text check (char_length(region) <= 120),
  country     text check (char_length(country) <= 120),
  description text check (char_length(description) <= 1000),
  latitude    double precision check (latitude between -90 and 90),
  longitude   double precision check (longitude between -180 and 180),
  -- Only 'published' destinations are publicly visible (see RLS migration).
  status      text not null default 'draft'
              check (status in ('draft', 'published', 'hidden')),
  -- Marks clearly labelled development/demo content.
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint destinations_coordinates_pair
    check ((latitude is null) = (longitude is null))
);

comment on table public.destinations is
  'Travel destinations. Public users can read only rows with status = published.';

create index if not exists destinations_status_name_idx
  on public.destinations (status, name);

create or replace trigger destinations_set_updated_at
  before update on public.destinations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- stories
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id             uuid primary key default gen_random_uuid(),
  -- RESTRICT: a destination with stories cannot be deleted, so stories never orphan.
  destination_id uuid not null references public.destinations (id) on delete restrict,
  title          text not null check (char_length(title) between 3 and 140),
  body           text not null check (char_length(body) between 20 and 5000),
  category       text not null check (category in (
                   'transport', 'planning', 'weather', 'packing', 'activity',
                   'accessibility', 'safety', 'costs', 'local_customs', 'other')),
  place_name     text check (char_length(place_name) <= 140),
  latitude       double precision check (latitude between -90 and 90),
  longitude      double precision check (longitude between -180 and 180),
  travel_month   smallint check (travel_month between 1 and 12),
  travel_year    smallint check (travel_year between 1950 and 2100),
  challenge      text check (char_length(challenge) <= 2000),
  lesson         text check (char_length(lesson) <= 2000),
  advice         text check (char_length(advice) <= 2000),
  -- Moderation state. Only 'published' stories are publicly visible.
  status         text not null default 'pending'
                 check (status in ('pending', 'published', 'hidden', 'rejected')),
  published_at   timestamptz,
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint stories_coordinates_pair
    check ((latitude is null) = (longitude is null)),
  constraint stories_published_has_date
    check (status <> 'published' or published_at is not null)
);

comment on table public.stories is
  'Personal travel experiences. Public users can read only published stories of published destinations.';

-- Destination feed: published stories for one destination, newest first.
create index if not exists stories_destination_published_idx
  on public.stories (destination_id, published_at desc)
  where status = 'published';

-- Global feed: all published stories, newest first.
create index if not exists stories_published_idx
  on public.stories (published_at desc)
  where status = 'published';

create or replace trigger stories_set_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Row Level Security (public can only read published rows)
--    (20261011120100_public_read_rls.sql)
-- -----------------------------------------------------------------------------

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

drop policy if exists "Public can read published destinations" on public.destinations;
create policy "Public can read published destinations"
  on public.destinations
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Public can read published stories of published destinations" on public.stories;
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

-- -----------------------------------------------------------------------------
-- 3. Submission key (prevents duplicate submissions)
--    (20261011130000_story_submission_key.sql)
-- -----------------------------------------------------------------------------

-- RegretMap Phase 5: idempotent story submissions.
-- Additive only. Each submission form carries a one-time random key; the unique
-- index makes a repeated submit (double click, retry) unable to create a second
-- story. The key is random and contains no personal information.
--
-- RLS is unchanged: there is still no public insert policy. Submissions are
-- written by the trusted server (server-only key), always as status = 'pending'.

alter table public.stories
  add column if not exists submission_key uuid;

create unique index if not exists stories_submission_key_idx
  on public.stories (submission_key)
  where submission_key is not null;

comment on column public.stories.submission_key is
  'One-time key from the submission form, used to ignore duplicate submits.';

-- -----------------------------------------------------------------------------
-- 4. AI moderation metadata (private) and review queue
--    (20261011140000_story_moderation.sql)
-- -----------------------------------------------------------------------------

-- RegretMap Phase 7: AI-assisted moderation metadata (annotate only).
--
-- Additive only. Moderation results live in a separate PRIVATE table, because
-- the public can read every column of a published story. The AI never changes
-- a story's status: stories stay 'pending' until a human publishes or rejects
-- them. This table only labels the review queue.

create table if not exists public.story_moderation (
  story_id        uuid primary key references public.stories (id) on delete cascade,
  -- Lifecycle of the automated check.
  status          text not null default 'queued'
                  check (status in ('queued', 'completed', 'failed')),
  -- Model recommendation (validated allowlist; never applied automatically).
  decision        text check (decision in ('allow_review', 'flag_review', 'reject_recommended')),
  -- Server-side policy result used to sort the human review queue.
  queue_label     text not null default 'unmoderated'
                  check (queue_label in ('clear', 'needs_attention', 'reject_recommended', 'unmoderated')),
  categories      text[] not null default '{}'
                  check (categories <@ array[
                    'spam', 'promotional', 'off_topic', 'harassment', 'threat', 'hate',
                    'personal_info', 'suspicious_link', 'scam_attempt',
                    'dangerous_instructions', 'unusable'
                  ]::text[]),
  reason_codes    text[] not null default '{}' check (cardinality(reason_codes) <= 6),
  summary         text check (char_length(summary) <= 300),
  confidence      real check (confidence between 0 and 1),
  model           text check (char_length(model) <= 80),
  attempts        smallint not null default 0 check (attempts between 0 and 20),
  -- Error class only (e.g. 'timeout', 'quota'), never provider messages or story text.
  last_error      text check (char_length(last_error) <= 40),
  moderated_at    timestamptz,
  -- Filled by trigger when a human changes the story's status.
  reviewed_status text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.story_moderation is
  'Private AI moderation metadata for the human review queue. Not readable by the public. AI results are recommendations only.';

create index if not exists story_moderation_status_idx on public.story_moderation (status);
create index if not exists story_moderation_queue_idx on public.story_moderation (queue_label);

create or replace trigger story_moderation_set_updated_at
  before update on public.story_moderation
  for each row execute function public.set_updated_at();

-- Private: RLS on, no policies, and no table privileges for public roles.
alter table public.story_moderation enable row level security;
revoke all on public.story_moderation from anon, authenticated;

-- Record the human decision when a story's status changes (audit trail kept
-- separate from the user-submitted story text).
create or replace function public.record_story_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.story_moderation
     set reviewed_status = new.status,
         reviewed_at = now()
   where story_id = new.id;
  return new;
end;
$$;

create or replace trigger stories_record_review
  after update of status on public.stories
  for each row
  when (old.status is distinct from new.status)
  execute function public.record_story_review();

-- Review queue for moderators (SQL Editor). Pending stories, most urgent first.
create or replace view public.moderation_queue
with (security_invoker = true) as
select
  s.id,
  s.created_at,
  d.name as destination,
  s.title,
  coalesce(m.queue_label, 'unmoderated') as queue_label,
  m.decision,
  m.categories,
  m.reason_codes,
  m.summary,
  m.confidence,
  m.status as moderation_status,
  m.attempts
from public.stories s
join public.destinations d on d.id = s.destination_id
left join public.story_moderation m on m.story_id = s.id
where s.status = 'pending'
order by
  case coalesce(m.queue_label, 'unmoderated')
    when 'reject_recommended' then 0
    when 'needs_attention' then 1
    when 'unmoderated' then 2
    else 3
  end,
  s.created_at;

revoke all on public.moderation_queue from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. AI recommendation cache (private)
--    (20261011150000_destination_recommendations.sql)
-- -----------------------------------------------------------------------------

-- RegretMap Phase 8: cache for AI "Before you go" recommendations.
--
-- Additive only. One row per destination holding the last validated summary.
-- A row is reused only while its evidence_hash (a hash of the eligible story
-- set, model and prompt version) still matches and it hasn't expired, so new or
-- changed published stories automatically trigger a fresh summary.
-- Private: written and read only by the trusted server.

create table if not exists public.destination_recommendations (
  destination_id   uuid primary key references public.destinations (id) on delete cascade,
  evidence_hash    text not null check (char_length(evidence_hash) = 64),
  model            text not null check (char_length(model) <= 80),
  prompt_version   text not null check (char_length(prompt_version) <= 20),
  -- Validated summary; every source id is checked against the story set first.
  payload          jsonb not null,
  source_story_ids uuid[] not null default '{}',
  from_demo        boolean not null default false,
  generated_at     timestamptz not null default now(),
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.destination_recommendations is
  'Private cache of AI summaries of published stories. AI summaries, not verified facts.';

create or replace trigger destination_recommendations_set_updated_at
  before update on public.destination_recommendations
  for each row execute function public.set_updated_at();

alter table public.destination_recommendations enable row level security;
revoke all on public.destination_recommendations from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Accounts: story authors, helpful reactions and their RLS
--    (20261011160000_auth_authors_reactions.sql)
-- -----------------------------------------------------------------------------

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
drop policy if exists "Authors can read their own authorship rows" on public.story_authors;
create policy "Authors can read their own authorship rows"
  on public.story_authors
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Authors can see their own stories whatever the status (e.g. pending).
drop policy if exists "Authors can read their own stories" on public.stories;
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
drop policy if exists "Users can read their own reactions" on public.story_reactions;
create policy "Users can read their own reactions"
  on public.story_reactions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can react to published stories as themselves" on public.story_reactions;
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

-- -----------------------------------------------------------------------------
-- 6b. Story provenance: community vs editorial
--    (20261011170000_story_source.sql)
-- -----------------------------------------------------------------------------

-- RegretMap Phase 11: story provenance.
-- Additive only. Every existing and future story defaults to 'community'
-- (a personal account submitted through the app). 'editorial' marks travel
-- notes written by the RegretMap team from general travel guidance; they are
-- not personal experiences and the UI labels them as "Travel note".
--
-- RLS is unchanged: clients still cannot insert or update stories, so they
-- cannot set this column. Submissions keep the 'community' default.

alter table public.stories
  add column if not exists source text not null default 'community';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stories_source_check' and conrelid = 'public.stories'::regclass
  ) then
    alter table public.stories
      add constraint stories_source_check check (source in ('community', 'editorial'));
  end if;
end;
$$;

comment on column public.stories.source is
  'community = personal account submitted by a user; editorial = RegretMap travel note (not a personal experience).';

-- -----------------------------------------------------------------------------
-- 6c. Story comments and threaded replies
--    (20261012100000_story_comments.sql)
-- -----------------------------------------------------------------------------

-- RegretMap Phase 12: threaded comments (Reddit-style replies to replies, up to
-- 6 levels deep) on published stories.
-- Additive only. Requires Supabase Auth (auth.users), present in every project.
--
-- Security model
--   * Anyone can read visible comments ('published' or 'deleted' placeholders)
--     on publicly visible stories only. user_id is never readable by clients.
--   * Signed-in users insert through their own session (RLS). user_id defaults
--     to auth.uid() and isn't in the insert grant, so it can't be spoofed;
--     status isn't grantable either. author_name is set by a trigger from the
--     account, never from the request.
--   * A reply's parent must be a visible comment on the SAME story (composite
--     foreign key + trigger), so replies can't cross stories. depth is set by
--     the trigger (parent depth + 1) and capped at 5 (6 visible levels).
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
  -- 0 = top-level comment; set by trigger, never by clients.
  depth       smallint not null default 0 check (depth between 0 and 5),
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
  'Threaded comments on published stories (max depth 5). user_id is private.';

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
    new.depth := old.depth;
    new.created_at := old.created_at;
  end if;

  if tg_op = 'INSERT' then
    new.depth := 0;
    if new.parent_id is not null then
      select c.depth, c.status, c.story_id into parent
      from public.story_comments c where c.id = new.parent_id;
      if not found or parent.story_id <> new.story_id then
        raise exception 'Reply parent must be a comment on the same story' using errcode = '23503';
      end if;
      if parent.depth >= 5 then
        raise exception 'This thread is too deep to reply to' using errcode = '23514';
      end if;
      if parent.status <> 'published' then
        raise exception 'Cannot reply to this comment' using errcode = '42501';
      end if;
      new.depth := parent.depth + 1;
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
grant select (id, story_id, parent_id, depth, author_name, body, status, created_at, updated_at)
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

-- -----------------------------------------------------------------------------
-- 6d. Regret emoji reactions
--    (20261012120000_regret_emoji_reactions.sql)
-- -----------------------------------------------------------------------------

-- RegretMap: "regret emoji" reactions on stories.
-- Additive. Extends story_reactions (Phase 10) with three more reaction types
-- next to 'helpful', and keeps public per-type counts on stories.reaction_counts
-- via the existing trigger. RLS on story_reactions is unchanged: users can only
-- add/remove their own reactions on published stories and read only their own
-- rows; counts are maintained by the database, never sent by clients.
--
--   helpful    👍  Helpful
--   yikes      😬  Yikes
--   been_there 🙋  Been there
--   good_tip   💡  Good tip

do $$
declare
  c record;
begin
  -- Replace the old CHECK (reaction_type in ('helpful')) whatever its name.
  for c in
    select conname from pg_constraint
    where conrelid = 'public.story_reactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%reaction_type%'
  loop
    execute format('alter table public.story_reactions drop constraint %I', c.conname);
  end loop;
  alter table public.story_reactions
    add constraint story_reactions_reaction_type_check
    check (reaction_type in ('helpful', 'yikes', 'been_there', 'good_tip'));
end;
$$;

alter table public.stories
  add column if not exists reaction_counts jsonb not null default '{}'::jsonb;

comment on column public.stories.reaction_counts is
  'Public per-type reaction counts, e.g. {"helpful": 3, "yikes": 1}. Maintained by trigger.';

-- Recount one story's helpful_count and reaction_counts after any reaction change.
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
         ),
         reaction_counts = coalesce((
           select jsonb_object_agg(t.reaction_type, t.n)
           from (
             select r.reaction_type, count(*) as n
             from public.story_reactions r
             where r.story_id = target
             group by r.reaction_type
           ) t
         ), '{}'::jsonb)
   where id = target;
  return null;
end;
$$;

revoke all on function public.sync_story_helpful_count() from public, anon, authenticated;

-- Backfill counts for stories that already have reactions.
update public.stories s
   set reaction_counts = t.counts
  from (
    select story_id, jsonb_object_agg(reaction_type, n) as counts
    from (
      select story_id, reaction_type, count(*) as n
      from public.story_reactions
      group by story_id, reaction_type
    ) x
    group by story_id
  ) t
 where t.story_id = s.id;

-- -----------------------------------------------------------------------------
-- 7. DEMO data (is_demo = true)
-- -----------------------------------------------------------------------------

-- RegretMap DEVELOPMENT SEED — clearly labelled demo content (is_demo = true).
-- These are illustrative scenarios written for development: not real people,
-- real community submissions, or verified facts. Coordinates are approximate.
--
-- Safe to re-run: existing rows are never overwritten (ON CONFLICT DO NOTHING).
-- Run manually against a development project only; never automatically in production.
-- To remove all demo content later:
--   delete from public.stories where is_demo; delete from public.destinations where is_demo;


insert into public.destinations
  (slug, name, region, country, description, latitude, longitude, status, is_demo)
values
  ('manali', 'Manali', 'Himachal Pradesh', 'India', 'A hill town in the Kullu Valley, often used as a base for nearby valleys and high mountain passes.', 32.2432, 77.1892, 'published', true),
  ('munnar', 'Munnar', 'Kerala', 'India', 'A hill station in the Western Ghats, known for tea estates and winding mountain roads.', 10.0889, 77.0595, 'published', true),
  ('jaipur', 'Jaipur', 'Rajasthan', 'India', 'The capital of Rajasthan, known for its hilltop forts, palaces and old-city markets.', 26.9124, 75.7873, 'published', true),
  ('leh', 'Leh', 'Ladakh', 'India', 'The main town of Ladakh, at roughly 3,500 m, and a base for high-altitude lakes and passes.', 34.1526, 77.5771, 'published', true),
  ('varkala', 'Varkala', 'Kerala', 'India', 'A coastal town with beaches below red laterite cliffs and a busy cliff-top walkway.', 8.7379, 76.7163, 'published', true)
on conflict (slug) do nothing;

insert into public.stories
  (id, destination_id, title, body, category, place_name, latitude, longitude,
   travel_month, travel_year, challenge, lesson, advice, status, published_at, is_demo)
select v.id::uuid, d.id, v.title, v.body, v.category, v.place_name, v.latitude, v.longitude,
       v.travel_month, v.travel_year, v.challenge, v.lesson, v.advice, 'published', v.published_at::timestamptz, true
from (values
  ('822c07c8-1ec9-407d-8581-eb5d8425a8ae', 'manali', 'I underestimated how long the drive up would take', 'I planned to reach Manali by evening and do a short walk the same day. Traffic near the valley and a few slow stretches meant we arrived after dark, tired and with nothing planned for dinner.', 'transport', 'Kullu–Manali road', 32.2432, 77.1892, 5, 2025, 'The road took several hours longer than the estimate I had used.', 'Keep the arrival day free and add a few hours of buffer to any road estimate in the hills.', 'Start early, carry snacks and water, and don''t book anything for the evening you arrive.', '2026-02-14'),
  ('6c95f4ee-1d24-409c-a5a2-5ce20f4dee66', 'manali', 'Our pass day fell apart because of a permit', 'We built a whole day around driving up to the pass. That morning our driver told us the vehicle needed a permit and none were left for the day, so we spent the day in town instead.', 'planning', 'Rohtang Pass', 32.3716, 77.2466, 6, 2025, 'I assumed we could simply drive up on the day.', 'Check permit requirements a day or more ahead for high passes.', 'Look up the current official permit process before you plan the day, and keep a backup plan nearby.', '2026-03-02'),
  ('869144a2-98b6-4de0-b3a0-cd7ae4e3b2bd', 'manali', 'Sneakers in the snow were a bad idea', 'I wore jeans and running shoes to the snow. Within an hour my feet were soaked and cold, and I spent most of the afternoon trying to warm up instead of enjoying the valley.', 'packing', 'Solang Valley', 32.3163, 77.1576, 1, 2026, 'My clothes weren''t waterproof.', 'Waterproof footwear matters more than an extra warm layer in the snow.', 'Pack waterproof boots or shoe covers and a spare pair of socks in your day bag.', '2026-04-11'),
  ('a23e271c-e477-4651-bcd4-75bd973881d2', 'manali', 'I didn''t check before taking photos at the temple', 'I started taking photos near the shrine without looking around first. Someone politely asked me to put my phone away, and I felt embarrassed that I hadn''t noticed the request.', 'local_customs', 'Hadimba Temple', 32.2482, 77.1806, 10, 2025, null, 'Look for signs and follow what others are doing before taking photos at places of worship.', 'When unsure, ask before photographing inside or near a shrine.', '2026-05-20'),
  ('b4964398-d41a-4c06-94e5-5297bdc7ebdc', 'munnar', 'Packed for sunshine, got a week of mist', 'I visited during the monsoon expecting clear views of the tea estates. Most mornings were misty, the evenings were colder than I expected, and my shoes never fully dried.', 'weather', null, 10.0889, 77.0595, 7, 2025, 'Views were hidden by mist most mornings.', 'Expect rain and cool evenings in the monsoon months, even if the forecast looks mild.', 'Bring a light rain jacket, quick-dry shoes, and a warm layer.', '2026-01-18'),
  ('34f882d4-be0f-46eb-896a-f06353d08b5f', 'munnar', 'The winding road made me carsick', 'The drive to the viewpoint had constant hairpin bends. I sat in the back reading my phone and felt sick for most of the way, so we had to stop several times.', 'transport', 'Road to Top Station', 10.1257, 77.2462, 12, 2025, 'The drive took much longer than planned because of the stops.', 'On hill roads, motion sickness can shape your whole day.', 'Sit in the front if you can, look at the road rather than your phone, and leave early so stops don''t matter.', '2026-06-03'),
  ('6bc61358-58f6-4ebc-8eb4-39b24e12458e', 'munnar', 'The park was closed when I arrived', 'Seeing the national park was the main reason for my trip. When I got to the entrance, I was told it was closed for a few weeks that season.', 'planning', 'Eravikulam National Park', 10.196, 77.087, 2, 2026, 'I hadn''t checked opening dates before booking.', 'Protected areas can close seasonally — check before planning a trip around one.', 'Confirm opening dates with the official park or forest department source close to your travel date.', '2026-07-09'),
  ('898cc0be-cc9f-423c-a169-88fafad0f9c1', 'jaipur', 'Midday sightseeing wore me out', 'I packed three forts into one afternoon. By the second one the heat had drained me, and I rushed through it without really seeing anything.', 'planning', 'Amer Fort', 26.9855, 75.8513, 4, 2025, 'Too many sights in the hottest part of the day.', 'Start early, rest through the hottest hours, and pick fewer places per day.', 'Visit hilltop forts in the morning and save indoor or shaded places for the afternoon.', '2026-01-05'),
  ('c671be59-2db5-4e1d-b8d4-f0cb83cfba5d', 'jaipur', 'The steps were harder than the photos suggested', 'I travelled with my father, who uses a walking stick. Some sections had steep, uneven steps that we didn''t know about in advance, so we turned back halfway.', 'accessibility', 'Nahargarh Fort', 26.9373, 75.8155, 11, 2025, 'We couldn''t find step-free route information beforehand.', 'Older monuments can involve steep, uneven steps that photos don''t show.', 'Ask about step-free routes and rest points before visiting with someone who has limited mobility.', '2026-02-27'),
  ('f27bc12b-c6bc-405a-b72e-cf8ec8398c9e', 'jaipur', 'I bought on the first day and regretted it', 'I bought souvenirs at the first shop I walked into. Over the next few days I saw similar items in many places and realised I hadn''t compared anything.', 'costs', 'Johari Bazaar', 26.9196, 75.826, 1, 2026, null, 'Compare a few shops before buying, especially on your first day.', 'Set a souvenir budget and look around before you decide.', '2026-08-12'),
  ('1d809abc-d7ca-4a57-ba6c-d5ed6c1afb31', 'jaipur', 'We didn''t agree on the fare before the ride', 'We hopped into an auto-rickshaw without discussing the price. At the end we disagreed about what was fair, and it turned into an awkward few minutes on the street.', 'transport', 'Near Hawa Mahal', 26.9239, 75.8267, 12, 2025, 'No price agreed in advance.', 'Agree on the fare before you start, or use a metered or app-based option.', null, '2026-09-01'),
  ('38376863-8788-4f4c-8f0f-0cc8ef474e93', 'leh', 'I skipped acclimatisation and lost a day', 'I flew in and went sightseeing the same afternoon. That night I had a headache and felt short of breath, so I spent the next day resting instead of exploring.', 'activity', null, 34.1526, 77.5771, 6, 2025, 'Altitude symptoms on the first night.', 'Plan a full rest day after arriving at altitude.', 'Follow medical advice about altitude rather than guesswork, and keep the first day free.', '2026-03-15'),
  ('951d60d1-42e6-441a-b5ea-52d4ffb0e07a', 'leh', 'A day trip to the lake was mostly a day in the car', 'I tried to see the lake as a day trip from Leh. Most of the day was spent driving, and we had barely an hour at the shore before turning back.', 'planning', 'Pangong Tso', 33.918, 78.45, 7, 2025, 'Very little time at the lake itself.', 'Long high-altitude drives are better with an overnight stay.', 'If you can, stay a night near the lake, or accept a very long day and leave before sunrise.', '2026-04-28'),
  ('95b70c82-17e6-453d-92d0-39157ebaa04d', 'leh', 'Sunny in town, freezing at the pass', 'It was warm and sunny in Leh, so I went up in a t-shirt and a light jacket. At the pass it was cold and windy, and the sun was harsh on my face.', 'packing', 'Khardung La', 34.2786, 77.6047, 8, 2025, null, 'Weather at high passes can be very different from the town below.', 'Carry warm layers, a hat, sunglasses and sunscreen, even on a warm day.', '2026-06-21'),
  ('81f7f12e-7861-488e-a391-62f9e7ee2ecd', 'leh', 'My phone plan didn''t work, so I couldn''t pay by app', 'I relied on my phone for payments and directions. My mobile plan had no service for most of the trip, and I didn''t have much cash with me.', 'costs', 'Leh market', 34.1642, 77.5848, 6, 2026, 'No mobile data for app payments or maps.', 'Don''t rely only on your phone for payments in remote regions.', 'Check whether your mobile plan works there before you go, carry enough cash, and download offline maps.', '2026-09-18'),
  ('0f3313e6-35f6-4492-bc93-043d2149fd04', 'varkala', 'Cash ran out sooner than I expected', 'Several small places along the cliff only took cash, and the nearest ATM I found had a long queue. I spent part of an evening just sorting out money.', 'costs', 'North Cliff', 8.7378, 76.7036, 12, 2025, null, 'Carry some cash for small purchases and withdraw before you need it.', null, '2026-01-30'),
  ('b2b724c2-efed-41d9-8150-ea587ce829de', 'varkala', 'The waves pulled harder than I expected', 'I went into the sea late in the afternoon. The waves pulled much harder than they looked from the beach, and a lifeguard whistled us back towards the shore.', 'safety', 'Papanasam Beach', 8.7334, 76.7059, 1, 2026, 'I misjudged the sea from the shore.', 'The sea can be stronger than it looks; listen to lifeguards and local warnings.', 'Swim only where lifeguards are present and follow any flags or instructions.', '2026-05-07'),
  ('9c5469d0-7b6a-487c-b3a2-146b30f68509', 'varkala', 'Arriving late at night without a plan', 'My train arrived late at night and I hadn''t arranged a ride to the cliff area. It took a while to find transport, and I was tired and stressed by the time I arrived.', 'transport', 'Varkala Sivagiri railway station', 8.7339, 76.7259, 3, 2026, null, 'Arrange onward transport in advance if you arrive late.', 'Share your arrival time with wherever you''re staying and ask how to get there at night.', '2026-08-25')
) as v(id, destination_slug, title, body, category, place_name, latitude, longitude,
        travel_month, travel_year, challenge, lesson, advice, published_at)
join public.destinations d on d.slug = v.destination_slug
on conflict (id) do nothing;


commit;

-- Quick check (should show 5 destinations and 18 published stories):
select
  (select count(*) from public.destinations where is_demo) as demo_destinations,
  (select count(*) from public.stories where is_demo and status = 'published') as demo_published_stories;
