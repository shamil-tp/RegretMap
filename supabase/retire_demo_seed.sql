-- RegretMap Phase 11 (optional, run AFTER seed_india_editorial.sql):
-- retire the original development demo content.
--
-- What it does:
--   1. Hides the 18 demo stories from supabase/seed.sql (is_demo = true).
--      Nothing is deleted; to restore them:
--        update public.stories set status = 'published' where is_demo;
--   2. Clears the demo flag on the five destinations created by that seed
--      (Manali, Munnar, Jaipur, Leh, Varkala). They stay published and now hold
--      editorial travel notes plus any real community stories filed under them,
--      so the "Demo destination" / "demo stories" labels no longer apply.
--
-- Only rows with is_demo = true are touched. Community submissions
-- (is_demo = false) and editorial notes are never changed by this script.

begin;

update public.stories
set status = 'hidden'
where is_demo
  and status = 'published';

update public.destinations
set is_demo = false
where is_demo
  and slug in ('manali', 'munnar', 'jaipur', 'leh', 'varkala');

commit;

-- Check: should return 0 rows.
select slug from public.destinations where is_demo and status = 'published';
