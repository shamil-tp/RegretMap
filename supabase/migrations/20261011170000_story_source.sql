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
