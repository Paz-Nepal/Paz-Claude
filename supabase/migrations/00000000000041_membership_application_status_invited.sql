-- 0041_membership_application_status_invited.sql
--
-- Adds the 'invited' value to membership.application_status (D-12).
-- Enum values are added in their own migration with no other statements
-- (Build Readiness Review §3.6 -- Postgres enum ALTER TYPE ADD VALUE
-- cannot run in the same transaction as other DDL that might use the new
-- value). The invitations table and functions that actually use this
-- value are migration 0040, deliberately split out.

alter type membership.application_status add value if not exists 'invited';
