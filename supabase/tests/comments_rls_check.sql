-- RegretMap — RLS checks for story comments (migration 20261012100000).
-- Run in the Supabase SQL Editor AFTER the migration. Everything happens in one
-- transaction that is rolled back at the end, so no test rows are kept.
-- Each failed check raises an exception; success prints a NOTICE.

begin;

-- Test fixtures (rolled back): two users, one public story, one hidden story.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a@example.invalid', '{"display_name":"Asha"}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b@example.invalid', '{}', now(), now());

insert into public.destinations (id, slug, name, status)
values ('00000000-0000-4000-8000-0000000000d1', 'rls-comments-test', 'RLS test', 'published');

insert into public.stories (id, destination_id, title, body, category, status, published_at)
values
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-0000000000d1', 'Public story', 'A public story body for tests.', 'other', 'published', now()),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-0000000000d1', 'Hidden story', 'A hidden story body for tests.', 'other', 'pending', null),
  ('00000000-0000-4000-8000-000000000053', '00000000-0000-4000-8000-0000000000d1', 'Other story', 'Another public story for tests.', 'other', 'published', now());

-- ---------------------------------------------------------------------------
-- As user A
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$
declare
  c1 uuid;
  r1 uuid;
  shown_name text;
begin
  insert into public.story_comments (story_id, body)
  values ('00000000-0000-4000-8000-000000000051', 'First comment')
  returning id into c1;

  select author_name into shown_name from public.story_comments where id = c1;
  if shown_name <> 'Asha' then
    raise exception 'FAIL: author_name not taken from the account (got %)', shown_name;
  end if;

  -- Impersonation: user_id isn't insertable.
  begin
    insert into public.story_comments (story_id, body, user_id)
    values ('00000000-0000-4000-8000-000000000051', 'Spoof', '00000000-0000-4000-8000-0000000000b2');
    raise exception 'FAIL: user_id could be supplied';
  exception when insufficient_privilege then null;
  end;

  -- Forged author name / status aren't insertable.
  begin
    insert into public.story_comments (story_id, body, author_name)
    values ('00000000-0000-4000-8000-000000000051', 'Spoof', 'Moderator');
    raise exception 'FAIL: author_name could be supplied';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.story_comments (story_id, body, status)
    values ('00000000-0000-4000-8000-000000000051', 'Spoof', 'hidden');
    raise exception 'FAIL: status could be supplied';
  exception when insufficient_privilege then null;
  end;

  -- Unpublished story.
  begin
    insert into public.story_comments (story_id, body)
    values ('00000000-0000-4000-8000-000000000052', 'On a pending story');
    raise exception 'FAIL: could comment on an unpublished story';
  exception when insufficient_privilege then null;
  end;

  -- Reply on the same story works.
  insert into public.story_comments (story_id, parent_id, body)
  values ('00000000-0000-4000-8000-000000000051', c1, 'A reply')
  returning id into r1;

  -- Reply attached to a different story.
  begin
    insert into public.story_comments (story_id, parent_id, body)
    values ('00000000-0000-4000-8000-000000000053', c1, 'Cross-story reply');
    raise exception 'FAIL: reply could point at another story''s comment';
  exception when foreign_key_violation then null;
  end;

  -- Reply to a reply (only one level allowed).
  begin
    insert into public.story_comments (story_id, parent_id, body)
    values ('00000000-0000-4000-8000-000000000051', r1, 'Too deep');
    raise exception 'FAIL: nested reply allowed';
  exception when check_violation then null;
  end;

  -- Empty and oversized bodies.
  begin
    insert into public.story_comments (story_id, body) values ('00000000-0000-4000-8000-000000000051', '');
    raise exception 'FAIL: empty comment allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.story_comments (story_id, body) values ('00000000-0000-4000-8000-000000000051', repeat('x', 1001));
    raise exception 'FAIL: oversized comment allowed';
  exception when check_violation then null;
  end;

  -- user_id isn't readable.
  begin
    perform user_id from public.story_comments limit 1;
    raise exception 'FAIL: user_id is readable';
  exception when insufficient_privilege then null;
  end;

  -- No direct deletes.
  begin
    delete from public.story_comments where id = r1;
    raise exception 'FAIL: direct delete allowed';
  exception when insufficient_privilege then null;
  end;

  -- Own comment ids helper.
  if (select count(*) from public.my_story_comment_ids('00000000-0000-4000-8000-000000000051')) <> 2 then
    raise exception 'FAIL: my_story_comment_ids did not return own comments';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- As user B: can't edit or delete A's comments
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

do $$
declare
  changed int;
  c1 uuid;
begin
  select id into c1 from public.story_comments
  where story_id = '00000000-0000-4000-8000-000000000051' and parent_id is null;

  update public.story_comments set body = 'Hacked' where id = c1;
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'FAIL: user B edited user A''s comment';
  end if;

  begin
    perform public.delete_story_comment(c1);
    raise exception 'FAIL: user B deleted user A''s comment';
  exception when insufficient_privilege then null;
  end;

  if (select author_name from public.story_comments where id = c1) <> 'Asha' then
    raise exception 'FAIL: comment changed';
  end if;

  -- B's pseudonymous name comes from the account, not the request.
  insert into public.story_comments (story_id, body) values ('00000000-0000-4000-8000-000000000051', 'Hi from B');
  if not exists (
    select 1 from public.story_comments
    where body = 'Hi from B' and author_name like 'Traveller %'
  ) then
    raise exception 'FAIL: default display name not applied';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Back to A: deleting a comment with replies leaves a placeholder
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$
declare
  c1 uuid;
begin
  select id into c1 from public.story_comments
  where story_id = '00000000-0000-4000-8000-000000000051' and parent_id is null and author_name = 'Asha';
  if public.delete_story_comment(c1) <> 'placeholder' then
    raise exception 'FAIL: comment with replies was removed instead of replaced';
  end if;
  if (select status from public.story_comments where id = c1) <> 'deleted' then
    raise exception 'FAIL: placeholder not visible';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Anonymous visitors: read only
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  if (select count(*) from public.story_comments where story_id = '00000000-0000-4000-8000-000000000051') = 0 then
    raise exception 'FAIL: anon cannot read public comments';
  end if;
  begin
    insert into public.story_comments (story_id, body) values ('00000000-0000-4000-8000-000000000051', 'anon');
    raise exception 'FAIL: anon can comment';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.delete_story_comment(gen_random_uuid());
    raise exception 'FAIL: anon can call delete_story_comment';
  exception when insufficient_privilege then null;
  end;
  raise notice 'All comment RLS checks passed';
end;
$$;

rollback;
