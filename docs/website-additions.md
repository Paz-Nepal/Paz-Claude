# Website additions: what the site could have, and how to build it

A build brief for PAZ OS, written against the codebase as it stands on the
branch `site-wording-editable` (migration 0080, the editable wording
register). Every item below is something the founder has agreed the site
should have. They are grouped by what they are about, not ranked.

Each item says what it is, which ruling it rests on, how to build it in this
codebase, and, where it applies, what it waits on. "Waits on" means a
decision the house has not made; build the surface so it can stand empty,
but do not invent the decision.

The rulings this brief works inside:

- The site is reasoned from what PAZ is: a home first (a grandmother's house
  you are allowed into, a garden with a house at one end), art hung in every
  room, making that can be seen, a table open to the neighbours, a Record
  that keeps things alive and, in time, open.
- Build everything the site will need up front. Every section stays on the
  site even when it is empty.
- Nothing on the site describes a room the house does not have. The house is
  never called a cafe. The Table is described, never offered or booked.
- No cookies, no analytics, no reader tracking. Counting the house's own work
  in aggregate is allowed; following a person is not.
- The house style holds: no em dashes in anything published.

## Conventions every item follows

These are the patterns the codebase already uses. New work should look like
the work beside it.

**Database.** Numbered, additive migrations from `00000000000081` on. Staff
writes go through `security definer` functions that begin with
`wall.require('<permission>')` and end with `wall.audit(...)`, as in 0077,
0078 and 0080. Public reads go through `api.*` views (`security_invoker`) or
`security definer` functions, never direct table grants to `anon`. Every
table holding published text gets the `publishing.reject_em_dash()` trigger.
Bilingual fields are `<field>` and `<field>_ne`. Append-only records (like
`guild.punch_destructions`) get a trigger that refuses update and delete.
New permissions go in the migration, in `supabase/seed/authz.sql`, and in
`docs/authz-matrix.md` (CI checks the last two match). Write role grants as
a select over `authz.roles` so they apply on a fresh database (see 0080).
Regenerate `packages/types/src/database.generated.ts` after each migration.

**Public intakes.** A form the public can submit goes through an Edge
Function that is the only way in, with `checkRateLimit` (ADR 036), wrapping
an `api.*` function granted to `service_role` only. The rows are readable by
staff holding one named permission. No intake sends email unless the house
decides it should. To avoid seven near-identical functions, most new intakes
share one table and one function (see "One intake for offers" below).

**Wording.** Every fixed line a new page says goes into
`apps/web/src/modules/site/wording.json` and is read with `useWording()` in
the app and `say()` in `scripts/prerender.mjs`, so the house can reword it
from Admin, Wording. Every new empty section gets an `empty.*` line.

**Pages the house writes.** Where the words are the house's own (a
statement, an explanation), use a CMS page of type `page` and render it with
`ShellPage` (it already says "This page has not been written yet" until the
house publishes one). Nothing is written in the house's place.

**Static pages.** Every new public route is also written by
`scripts/prerender.mjs`, included in the sitemap, and readable without
JavaScript. A form's static page says the form needs JavaScript and gives
the contact address. Anything that changes by the hour (the house's status,
"on this day") is left out of the static copy rather than frozen in it.

**Desk.** Each new staff screen gets an entry in
`apps/web/src/modules/admin-core/components/admin-layout.tsx`, a route under
`/admin` wrapped in `ProtectedRoute` with its permission, and a short section
in `KEEPING.md` written for someone who is not a programmer.

**Tests.** A pgTAP file under `supabase/tests/` for each migration (allow,
deny, the append-only rule, the em dash rule). Vitest for any logic in the
app.

---

## A. The house as a place

The site describes an institution but not yet a house a person could walk
into. The house falls vacant this month, has a soft opening before January,
and opens in January.

### A1. Is anyone home

One line, changed from the desk: "The house is open this afternoon", or
"Closed today; the house is at Ascend." It suits a home rather than an
institution with opening hours, and gives the soft opening a way to exist
online.

- Data: two settings, `house.status` and `house.status_ne`, plus
  `house.status_set_at` written by the save. Add them to
  `packages/types/src/settings.ts` (`SettingsRegistry`) and to the hard-coded
  whitelist in `api.site_info()` (replace the function; keep the whitelist
  explicit).
- Desk: a small form at the top of Admin, Settings, or its own screen "The
  house today", with a "clear" button. Permission `admin.settings.manage`.
- Public: shown on the home page and the House page, with the time it was
  set ("as of 10:05"). Hidden when empty.
- Static pages: leave it out.

### A2. What you may do there

A plain page of what the house actually has for someone who comes to pass
the time: the easels, the sewing machine, the shelves, the garden. It names
only what exists.

- A CMS page, slug `at-the-house`, route `/at-the-house`, rendered with
  `ShellPage`; linked from the House page and the footer.
- Later, the list can be drawn from "The house's things" (F1) where a thing
  is marked as for use.

### A3. Finding the house

The lane, the gate, and the arrival as the founder described it (the garage
seen whole, the narrow path, the place opening past the south wall), in the
house's voice rather than a map pin.

- A CMS page, slug `finding-the-house`, route `/finding-the-house`.
- No embedded map from a map company: it would load a third party's scripts
  and break the no-tracking promise. A drawn plan uploaded through Media is
  fine.

### A4. Photographs of the house

The site has no picture of the place. Once rooms are set, photographs of the
real rooms, each with its photographer named.

- Data: a new schema `house`. `house.rooms` (slug, name, name_ne, floor,
  note, note_ne, sort, published) and `house.room_images` (room_id, media_id,
  alt, alt_ne, photographer not null, sort), on the pattern of
  `wall.work_images`. A room is published only when it exists as described.
- Desk: "Rooms" under a new "The house" group. Permission `house.manage`
  (new).
- Public: `/house/rooms` and `/house/rooms/:slug`, linked from the House
  page. The same `WorkPicture` component serves the images.
- The rooms table is also what A5, B1 and F1 point at.

### A5. A page for the neighbours, Nepali first

"The door is open to you": a standing welcome to the tole and the A.V.M.
School, since the house is always open to them.

- A CMS page, slug `neighbours`, route `/neighbours`, rendered Nepali first
  and English beneath it whichever language the reader chose, using the
  `leads_ne` idea already in Encounters.
- The static page is written with `lang="ne"` on the Nepali block.

---

## B. The Wall as the house's walls

The ruling is art in every room and no separate gallery room, with the
formality carried by the rigour behind the scenes.

### B1. Where each work hangs

Each work records the room it hangs in. Walking the house and walking the
Wall become the same thing.

- Data: `wall.works.room_id uuid references house.rooms (id)`, nullable
  ("not hanging now"). Moving a work adds a `wall.work_events` line of kind
  `rehoused` or `shown` as now; the room column says where it is today.
- Desk: a room picker on the work form in Admin, Works.
- Public: the room on the work page ("In the Table room"), and an optional
  "By room" view on the Wall. The static work page carries it too.

### B2. In the studio this month

The Painting Afternoon's painter rotates monthly, and the studio shed exists
so the making is seen. A line on the home page says who is making in the
studio now; past months become the studio's own record.

- Data: `house.studio_months` (person_id references `wall.people`,
  from_on, to_on, note, note_ne, published).
- Desk: part of "The house" group.
- Public: "In the studio" on the home page (current entry only) and a list
  on the studio's room page.
- Static pages: the current entry at build time is acceptable, since it
  changes monthly, not hourly.

### B3. The show on the walls now

The January opening is carried by a group show. Shows already exist
(`wall.shows`). What is missing is the home page saying which show is up.

- No schema. The home page shows the current show (opened, not closed) above
  "Recent work".
- The opening day itself is invitation only at 40 to 50 people: no public
  signup page.

### B4. Early painters at one house price

The gallery runs two tiers: very early painters at one house price, and
semi-established artists the house signs at their own prices.

- Data: `wall.people.tier` (`early` or `signed`, nullable) and a setting
  `wall.early_price_minor`. A work by an early painter shows the house price
  unless the work sets its own.
- Public: the Wall states the early-painter price once, plainly, rather than
  repeating it on every card.
- Waits on: the price itself (NPR 7,000 was floated, not settled).

### B5. Young painters can show the house their work

Today an artist reaches the site only if the house adds them.

- An offer of kind `painter` through the shared intake (G below): name, how
  to reach them, a link to where the work can be seen, a note. No image
  upload from the public.
- A line on the Wall and on the painter's terms page points to it.

---

## C. The Record

The founder ruled that PAZ needs a public archive. Photographs, family
papers and documentation of the present begin now; recording voices stays
paused. The Open Record standing order is still to be checked against the
Ethics of Memory, and the access procedure is unwritten. Build what the
rulings settle; leave the rest standing empty.

### C1. Offer something to the Record

A way to begin a conversation, never an upload. Consent for papers and
photographs is still a spoken, witnessed asking, so the site can only open
the door.

- Data: extend `crm.voice_intake` (it is already the Record's private intake,
  read only under `crm.voice.read`) with `kind` (`voice`, `photographs`,
  `papers`, `the_present`, `other`), default `voice`. Update
  `api.submit_voice_intake` and the `submit-voice-intake` function to take
  it.
- Public: the A voice page becomes "Offer something to the Record" with a
  first question, what are you offering, and keeps its address `/a-voice`
  (add `/record/offer` as an alias route). Wording must not promise a
  recording or a sitting.
- No file or photograph is accepted through the site, and nothing here asks
  for consent.

### C2. Three registers, shown as three

The Record carries testimony and the house's institutional memory, kept in
three registers: the catalogue (what was given in), the deposit register
(what the Press published, which exists at `/record/deposits`), and the
house's own papers.

- Data, catalogue: a new schema `record`.
  - `record.accessions`: number (`PTN-0042`, unique, never reused, assigned
    by a function only after agreement), kind, dates, listening tier,
    description level, giver-chosen opening date, state of the three copies,
    published flag. The open layer only.
  - `record.parts`: `PTN-0042.01` and on, the first part always the consents.
  - `record.consent_lines`: append-only dated lines, newest last; update and
    delete refused by trigger.
  - `record.closed`: giver, witness, how the family is reached,
    cross-references between one giver's accessions. RLS limited to a new
    permission `record.closed.read`, held by the Keeper. Never exposed
    through `api`.
  - Material under different rulings arriving together becomes separate
    accessions (a rule for the desk form, enforced by a check that one
    accession has one ruling).
- Data, the house's papers: `record.house_papers` (reference, title, date,
  kind, note, published), its own numbering distinct from `PTN`.
- Public: `/record` lists the three registers. `/record/catalogue` shows the
  open layer: number, dates, consent as it stands, what would open it, the
  copies. A withdrawn giver's gap shows as a numbered gap with no name.
  `/record/papers` lists the house's papers.
- Desk: "Catalogue" and "House papers" screens, permission `record.manage`
  (new); the closed layer on a separate screen under `record.closed.read`.
- Waits on: the check of the Open Record against the Ethics of Memory, and
  the word for families' material (the ruling keeps "deposit" for the
  Press's published works).

### C3. Each entry's standing

- Listening tier on each accession, as ruled, with the top tier split:
  online · in the house's own works · anyone who comes and asks, in the
  house · the people of the house · the family only · no one.
- Description level: none · subjects only · a short account. No account of
  content is shown until a holding opens.
- Opening only by the giver's chosen date; no perpetual seals, and after a
  giver's death the Ethics of Memory's kin consultation governs (a note on
  the entry, not an automatic opening).
- Waits on: the access procedure before any "ask to listen" route is built.
  Putting a recording online stays a per-recording choice, off unless the
  giver chooses it.

### C4. Listening counts and fingerprints

- The listening log keeps names for a fixed period, then counts only. Build
  `record.listenings` with a scheduled job (like `publish-scheduled`) that
  strips names after the period. The public entry may show a count only.
- Each master already has a SHA-256 fingerprint. For parts opened online,
  publish the fingerprint beside the file so anyone can check the copy they
  hold. Never for unopened parts.
- Waits on: the length of the fixed period.

---

## D. The Press

### D1. Writing for the Sattal

Criticism is the Sattal's founding case, since Nepal has almost none. The
charter says the refusal grounds and the rate are published.

- A CMS page, slug `sattal-writing`, route `/sattal/writing`: the three
  forms, how to propose, the refusal grounds, and whether an outside reader
  is named yet (read live from `sattal.outside_readers`).
- The rate as a setting, `sattal.rate_minor`, shown when set.
- A proposal intake of kind `sattal` through the shared intake: name,
  contact, form (Study, Review, Account), subject, relation to the subject,
  a paragraph. Staff read it under `sattal.manage`.
- Waits on: the rate.

### D2. Hear a Paper read

An audio reading of each Paper by a named person. It opens the Papers to
people who do not read easily, and the voice is real and credited.

- Data: on the Paper details, `audio_media_id` and `audio_reader`, saved by
  `api.save_paper_details`.
- Media: `ingest-media` currently accepts JPEG, PNG, GIF and PDF only; add
  MP3 (or Ogg) sniffing in `_shared/media-processing.ts` with a test.
- Public: an `<audio controls>` element on the Paper page with "Read by
  {name}", also in the static page. No autoplay.

### D3. Where the pigeons went

A count of Pigeon Post copies and the countries they reached, and nothing
about who received them. The subsidiary instrument on knowing the reach of
the work permits exactly this.

- Data: `publishing.pigeon_post_distribution` (item_id, country, copies,
  noted_on). No names, no addresses, enforced by the table having no column
  for them.
- Desk: a small table on the Pigeon Post item in the Desk.
- Public: `/pigeon-post/where`, totals by country, and per edition on its
  page.

---

## E. Continuity

### E1. The house's year

The festivals and days the house keeps (Yenya, Dashain, Tihar and the
rest), with what the house does on each.

- Data: `house.days` (name, name_ne, reckoning `nepal_sambat`,
  `bikram_sambat` or `gregorian`, how it is reckoned as words, what the
  house does, _ne) and `house.day_dates` (day_id, falls_on) entered each
  year, since lunar days move and a converter would be guessing.
- Public: `/the-year`, in calendar order for the coming twelve months, with
  Bikram Sambat dates from the existing `formatBikramSambatDate` and the
  Nepal Sambat date as entered text.
- Desk: part of "The house" group.

### E2. On this day

A line on the home page from the Chronicle: what the house did on this date
in an earlier year.

- No schema: a view `api.chronicle_on_this_day` returning lines whose month
  and day match today in Kathmandu and whose year is earlier.
- Hidden when there is nothing. Left out of the static page.

### E3. Tables kept elsewhere

A Table can be held anywhere the spirit is kept. People abroad can send
their Chronicle line home, so the diaspora appears in the house's own record.

- A CMS page, slug `a-table-elsewhere`, route `/table/elsewhere`, describing
  the three acts: the meal shared, the welcome given, the remembering done.
- An offer of kind `table` through the shared intake: date, place, one line.
- `commons.tables_kept` requires a covenanted keeper
  (`kept_by_person_id not null`). Add `reported_by text` and make the keeper
  nullable only when `reported_by` is set, so a Table reported from abroad
  can be confirmed by staff and given its Chronicle line. The Chronicle line
  names no one, as always.

---

## F. Provenance, where people can see it

### F1. The house's things

In a grandmother's house nothing is bought as a set. Each chair, pot and
shelf has a line saying where it came from and who gave it, and the house
keeps a list of what it still needs, so people can give furniture with its
story.

- Data: `house.things` (name, name_ne, came_from, given_by, given_by_shown
  boolean default false, room_id, media_id, for_use boolean, published) and
  `house.wanted` (what, what_ne, note, still_wanted).
- Offers of things come through the shared intake, kind `thing`.
- Public: `/house/things` and "What the house would welcome" on the same
  page. A giver's name appears only when they have said yes.

### F2. Check a certificate

Anyone can enter a work number and see what the house says about that work.
The certificate already prints "Work no." (Admin, Dealings, certificate).

- Public: `/verify` with a work-number field, and `/verify/work/:number`.
  Shows the maker, title, year, medium, size, hallmark, and the work's life
  events. Never the buyer, never a price paid.
- Data: an `api.verify_work(p_number int)` function returning only those
  fields for published works.
- Print the verify address on the certificate.

### F3. Check a hallmark

The same for the Guild: enter a maker's mark or year letter, and the register
confirms it or says the punch was destroyed.

- Public: a search box on the Guild page, answered by an
  `api.verify_hallmark(p_query text)` function over `guild.makers` and
  `guild.punch_destructions` (published makers only).

---

## G. One intake for offers

Most new forms above are small offers to the house. Rather than one Edge
Function each, one table and one function:

- `crm.offers` (id, kind, name, contact, subject, note, ref jsonb, created_at,
  reviewed_at, reviewed_by), kind one of `painter`, `sattal`, `table`,
  `thing`, `book`, `word`, `leaving`.
- `api.submit_offer(...)` granted to `service_role` only; Edge Function
  `submit-offer` with `checkRateLimit`, validating per kind.
- Desk: "Offers", filtered by kind; each kind readable under the permission
  of the part of the house it belongs to (`sattal.manage` for `sattal`,
  `house.manage` for `thing` and `book`, `publishing.item.update` for
  `word`, `commons.manage` for `table`, `wall.manage` for `painter`,
  `identity.person.erase` for `leaving`).
- Offers to the Record stay in `crm.voice_intake` (C1), which has its own,
  narrower permission.

---

## H. The language

### H1. Words the house is looking for

The Record's hardest problem is the old vocabulary. A public list of words
the house has met but cannot yet explain, with a way to write in.

- Data: `publishing.glossary_terms.kind` gains `sought`, and `definition`
  becomes nullable only for that kind (check constraint).
- Public: a "Words the house is looking for" section on `/words`, each with
  an offer of kind `word`.
- No word is linked to a giver or an accession: the table has no such
  column, and must not gain one.

### H2. The reading room shelves

The reading room upstairs is a room to read in, not a lending library.

- Data: `house.books` (title, author, language, note, shelf, published) and
  "books the house would welcome" as rows in `house.wanted`.
- Public: `/reading-room`. Offers of books through the shared intake, kind
  `book`.

### H3. Nepal Bhasa as a third language

It fits the Table running in no default language, and Sattal pieces already
allow it.

- First, content: `_new` columns (Nepal Bhasa) beside `_ne` on the glossary
  and on house pages where the house wants them.
- Then the interface: a `new` column on `admin.site_wording` and in the
  Wording screen; `Lang` in `apps/web/src/modules/site/language.tsx` gains
  `new`, with its own route tree like `/ne`. This is the larger change;
  build it once the house has someone to write the lines.

---

## I. Places and people

### I1. Places the house has tended

Common Ground's cleanups and restorations: a page for each hiti or chautari,
with before and after, the date, and how many came.

- Data: `encounters.places` (slug, name, name_ne, kind, where) and
  `encounters.place_visits` (place_id, event_id, done_on, before_media_id,
  after_media_id, people_count, note). Counts only; no names.
- Public: `/encounters/places` and `/encounters/places/:slug`, linked from
  each Encounter held there.

### I2. The afternoons

The Painting Afternoon has run once; Paint and Climb is set. Each craft has
its own name.

- Data: `encounters.events` gains `series` (a slug such as
  `the-painting-afternoon`) and `price_note`. The kind stays `workshop`, so
  the Encounters rule holds: a workshop sells a day, never formation.
- Public: `/afternoons/:series` listing that series' dates, where to turn
  up and the price, with the Chronicle line after each.
- Waits on: whether the Painting Afternoon, kept to word of mouth, should be
  listed publicly at all, and the commerce leaning.

### I3. The open seats

Hands already lists every role with an address. The roles the house is
searching for belong there: the Sattal's outside reader, the three
Guardians, the language elder and the register-holding transcriber for the
Record, the Editor.

- Content only, in Admin, Hands. No code.

---

## J. The person's freedom

### J1. How to leave

The freedom to leave is the line the house has defended hardest. One plain
page: how to unsubscribe from the Brief, stop being a Friend, ask for your
details to be removed, or withdraw something you offered.

- A CMS page, slug `leaving`, route `/leaving`, linked from the footer and
  from Privacy.
- Each route named on it must exist: the Brief's one-action unsubscribe
  (exists); for the rest, an offer of kind `leaving` that reaches the person
  who executes erasure under `docs/policies/erasure.md`.

---

## K. Commerce

### K1. What can be bought

A plain page of what the house sells: the Papers and the Pigeon Post as
printed objects, and prints. No checkout; a sale stays a conversation, as
the Wall's enquiries and Dealings already work.

- Data: `publishing.items.for_sale_note` and `price_minor` on the item types
  sold as objects, or a small `press.objects` table if prints are separate
  from items.
- Public: `/objects`, each with an enquiry that lands in Dealings.
- Waits on: the commerce leaning (soft yes), the garage shop (floated), and
  VAT registration of PAZ Modern.

---

## L. Pages waiting for the house's words

No code, only writing, in the Desk: Paper No. 1 deposited; the Canon pages
(`canon-1` to `canon-7`); The name; The Table (described, never bookable);
The Custodian of the Name; Privacy; and the statements above
(`at-the-house`, `finding-the-house`, `neighbours`, `sattal-writing`,
`a-table-elsewhere`, `leaving`).

## What stays off the site

Anything that reads as a cafe. Any booking for the Table. A public signup
for the opening. Comments and an online guestbook (a paper visitors' book
in the house is the house's business). Maps or media embedded from
companies that track readers. Any count attached to a person.

## A migration order that keeps each step small

Suggested, so each migration can be reviewed and tested on its own:

1. `0081_house`: the `house` schema (rooms, room images, things, wanted,
   books, studio months, days and dates), `house.manage`, the status
   settings and `api.site_info()` whitelist.
2. `0082_wall_rooms_tiers`: `wall.works.room_id`, `wall.people.tier`,
   `wall.early_price_minor`, `api.verify_work`, `api.verify_hallmark`.
3. `0083_offers`: `crm.offers`, `api.submit_offer`, the `kind` on
   `crm.voice_intake`, `glossary_terms` kind `sought`,
   `commons.tables_kept.reported_by`.
4. `0084_press_reach`: Paper audio fields, `pigeon_post_distribution`,
   `sattal.rate_minor`, `encounters.places`, `place_visits`, `series`.
5. `0085_record_catalogue`: the `record` schema, once the Open Record has
   been checked against the Ethics of Memory.
6. Nepal Bhasa, when the house has someone to write it.
