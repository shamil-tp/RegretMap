-- =============================================================================
-- RegretMap — complete database setup + DEMO data (single file)
-- =============================================================================
-- Paste this whole file into Supabase Dashboard -> SQL Editor and click Run.
--
-- What it does, in one transaction (if anything fails, nothing is applied):
--   1. Creates tables `destinations` and `stories` with constraints, indexes and
--      an updated_at trigger.
--   2. Enables Row Level Security: the public can only READ published rows;
--      nobody can insert/update/delete through the public API.
--   3. Adds `stories.submission_key` (prevents duplicate story submissions).
--   4. Inserts DEMO data: 5 destinations + 18 stories, all marked is_demo = true.
--      These are illustrative examples, not real community submissions.
--
-- Safe to re-run: nothing is dropped except the two read policies (recreated
-- identically), and existing rows are never overwritten or duplicated.
--
-- Generated from supabase/migrations/*.sql and supabase/seed.sql — edit those
-- files, not this one. After running, optionally run supabase/tests/rls_check.sql.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Schema
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
-- 2. Row Level Security
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
-- 3. Submission key
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
-- 4. DEMO data (is_demo = true)
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
