-- RegretMap RLS check — run in the Supabase SQL Editor after applying migrations.
--
-- Non-destructive: everything runs in one transaction that is ROLLED BACK at the
-- end, so the test rows below are never kept. Each check raises an exception
-- (and stops) if a rule is broken; success prints "All RLS checks passed".

begin;

-- Test fixtures (as the table owner): one hidden destination and, under a
-- published destination, one pending and one published story.
insert into public.destinations (id, slug, name, status)
values
  ('00000000-0000-4000-8000-000000000001', 'rls-check-published', 'RLS check published', 'published'),
  ('00000000-0000-4000-8000-000000000002', 'rls-check-draft', 'RLS check draft', 'draft');

insert into public.stories (id, destination_id, title, body, category, status, published_at)
values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001',
   'Published check story', 'Published story used only for the RLS check.', 'other', 'published', now()),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001',
   'Pending check story', 'Pending story used only for the RLS check.', 'other', 'pending', null),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000002',
   'Story under draft destination', 'Published story under a draft destination.', 'other', 'published', now());

-- From here on, act as the public (anonymous) role, like the website does.
set local role anon;

do $$
begin
  if exists (select 1 from public.destinations where status <> 'published') then
    raise exception 'FAIL: anon can read unpublished destinations';
  end if;
  if not exists (select 1 from public.destinations where slug = 'rls-check-published') then
    raise exception 'FAIL: anon cannot read a published destination';
  end if;

  if exists (select 1 from public.stories where status <> 'published') then
    raise exception 'FAIL: anon can read unpublished stories';
  end if;
  if exists (select 1 from public.stories where id = '00000000-0000-4000-8000-000000000013') then
    raise exception 'FAIL: anon can read a story whose destination is not published';
  end if;
  if not exists (select 1 from public.stories where id = '00000000-0000-4000-8000-000000000011') then
    raise exception 'FAIL: anon cannot read a published story';
  end if;

  begin
    insert into public.stories (destination_id, title, body, category, status, published_at)
    values ('00000000-0000-4000-8000-000000000001', 'Forged story', 'Trying to publish directly.', 'other', 'published', now());
    raise exception 'FAIL: anon can insert stories';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.stories set status = 'published' where id = '00000000-0000-4000-8000-000000000012';
    raise exception 'FAIL: anon can update stories';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.stories where id = '00000000-0000-4000-8000-000000000011';
    raise exception 'FAIL: anon can delete stories';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.destinations (slug, name, status) values ('forged', 'Forged', 'published');
    raise exception 'FAIL: anon can insert destinations';
  exception when insufficient_privilege then null;
  end;

  -- Phase 7: AI moderation metadata is private (only present after that migration).
  if to_regclass('public.story_moderation') is not null then
    begin
      perform 1 from public.story_moderation limit 1;
      raise exception 'FAIL: anon can read story_moderation';
    exception when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.moderation_queue limit 1;
      raise exception 'FAIL: anon can read moderation_queue';
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.story_moderation (story_id, status)
      values ('00000000-0000-4000-8000-000000000012', 'completed');
      raise exception 'FAIL: anon can write story_moderation';
    exception when insufficient_privilege then null;
    end;
  end if;

  -- Phase 8: AI recommendation cache is private.
  if to_regclass('public.destination_recommendations') is not null then
    begin
      perform 1 from public.destination_recommendations limit 1;
      raise exception 'FAIL: anon can read destination_recommendations';
    exception when insufficient_privilege then null;
    end;
  end if;

  -- Phase 10: authorship and reactions are not readable or writable anonymously.
  if to_regclass('public.story_authors') is not null then
    begin
      perform 1 from public.story_authors limit 1;
      raise exception 'FAIL: anon can read story_authors';
    exception when insufficient_privilege then null;
    end;
    begin
      perform 1 from public.story_reactions limit 1;
      raise exception 'FAIL: anon can read story_reactions';
    exception when insufficient_privilege then null;
    end;
    begin
      insert into public.story_reactions (story_id, user_id)
      values ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-0000000000aa');
      raise exception 'FAIL: anon can insert story_reactions';
    exception when insufficient_privilege then null;
    end;
  end if;

  raise notice 'All RLS checks passed';
end;
$$;

rollback;
