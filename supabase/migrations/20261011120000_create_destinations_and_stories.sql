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
