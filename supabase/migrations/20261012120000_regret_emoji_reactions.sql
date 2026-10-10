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
