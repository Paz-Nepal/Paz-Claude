-- 0022_drop_legacy_auth_trigger.sql
--
-- Migration 0019 dropped the legacy Horizons tables including
-- public.profiles, but missed a legacy trigger on auth.users
-- (`auth_user_created`, calling `create_profile_for_user()`) that inserted
-- into that table on every sign-up. Left in place, it broke EVERY new
-- account creation from that point on ("relation public.profiles does not
-- exist") — caught immediately when creating a fresh verification account
-- for this domain's live testing, before any real user hit it. Our own
-- `on_auth_user_created` trigger (identity.handle_new_auth_user) already
-- does the real identity.people linking this project depends on; this
-- legacy trigger was always redundant with it, never load-bearing for
-- anything we built.

drop trigger if exists auth_user_created on auth.users;
drop function if exists public.create_profile_for_user();
