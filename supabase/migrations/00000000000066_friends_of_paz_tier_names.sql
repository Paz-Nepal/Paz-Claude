-- Standing Specifications, 18 Sept 2026, "The outer ring: Friends of
-- PAZ": "Three tiers, named: 1. Friend 2. Patron 3. Benefactor." 0010's
-- starter seed already had Friend and Patron right; its third tier was
-- named Fellow -- explicitly wrong per the same document ("Fellow is
-- reserved for the Guild's sense"). Fixes the display name only, not
-- the `key` ('fellow') itself: key is an internal identifier no one
-- reads (application-form.tsx and every other caller display `name`,
-- never `key`), and changing it would mean cascading the FK it's
-- referenced by from three tables (membership.applications/members/terms,
-- all `on delete restrict`, no `on update cascade`) for no user-visible
-- benefit.
--
-- Also drops "member events" from the Patron description -- the outer
-- ring is Friends of PAZ, not membership, and "member" is specifically
-- what's being renamed away from here.

update membership.tiers
set name = 'Benefactor',
    description = 'Sustaining support for institutions and long-term Friends of PAZ.'
where key = 'fellow';

update membership.tiers
set description = 'Deeper support with Friends events and the quarterly Dispatch in print.'
where key = 'patron';
