-- 0034_fix_publishing_sequence_grants.sql
--
-- Live bug found while smoke-testing 0033 under the actual `authenticated`
-- role (not the bypass-RLS `postgres` role `supabase db query` runs as by
-- default -- the same class of miss that caught the hospitality reservation
-- grant gap): 0025 created paper_no_seq/brief_no_seq/dispatch_no_seq/
-- pigeon_post_no_seq as column defaults on the four series detail tables,
-- but never granted `authenticated` USAGE on any of them. Every direct
-- insert into paper_details/brief_details/dispatch_details/
-- pigeon_post_details -- including api.save_paper_details() and friends
-- (0029), which are security invoker -- has been failing with "permission
-- denied for sequence" for any real staff caller since 0025 shipped.
--
-- deposit_seq is unaffected: it's only touched through
-- publishing.next_deposit_ref(), always called from inside
-- publishing.deposit_item(), which is security definer -- the sequence
-- access there runs as the function owner regardless of the caller's own
-- grants, so it was never actually broken.

grant usage on sequence
  publishing.paper_no_seq,
  publishing.brief_no_seq,
  publishing.dispatch_no_seq,
  publishing.pigeon_post_no_seq
  to authenticated;
