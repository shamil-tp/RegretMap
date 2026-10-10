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
