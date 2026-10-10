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
