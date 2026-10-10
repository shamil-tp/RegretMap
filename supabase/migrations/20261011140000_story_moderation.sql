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
