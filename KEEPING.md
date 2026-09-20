# Keeping the house

This is for whoever keeps the site next. You do not need to be a
programmer for most of it. Everything below is a form in the admin
console or one command. If a step needs more than that, something has
been built wrongly and should be fixed, not explained.

## How it fits together

There are two halves.

**The desk.** This is the admin console at `/admin`. It is where work is
made, revised, reviewed and held before it is public. It runs on a
database (Supabase). Staff sign in with a password and a code from an
authenticator app.

**The pages.** When something is ready, one command writes it all out as
plain pages and plain text files. Those files are what readers get. They
need no database, no login and no JavaScript to be read.

The test of the whole design: if the company hosting the database
vanished on a Tuesday, every deposited page would still read on
Wednesday, because the files are already on the web host.

## Adding a line to the Chronicle

1. Sign in. Choose **Chronicle**.
2. Pick the date. Type one line. Press **Add to the Chronicle**.

That is all. The Chronicle records what the house did. It never names
the people things were done to. A recording is written down by its
accession number only: no giver, no family, no place. A death is one
line and nothing else: no page, no picture.

A line is never edited or removed. If one is wrong, press **Correct**
beside it and add another line.

## Hanging a work

1. **People**: add the artist first, if they are not there. Tick
   whether the gallery represents them and, separately, whether the Guild
   has formed them. Neither implies the other. Leave **Published**
   unticked until the page is ready.
2. **Works**: add the work. Enter the price in rupees, once. Enter the
   Friends of PAZ price only if there is one; it is shown as a second
   price, never as a saving. Do not use "first showing" to sort or group
   anything. It is only recorded.
3. Open the work again and add the three photographs: the whole work, a
   detail showing the surface, and one showing scale. Each needs a
   description and the name of the photographer. Sizes are made
   automatically.
4. Add a line to **Its life** for each thing that happens to the work:
   made, shown, sold, loaned, returned, damaged, restored, rehoused.
   These are only added, never changed.
5. Any text about a work must say whose words it is: the maker's own,
   or the house speaking. The form will not save it otherwise.
6. Tick **Published**. Then publish the pages (see the end).

A sold work keeps its page. Set it to **Sold**; its price is no longer
shown. When an artist leaves, untick **Currently presented** on their
person. Their page, their works and their shows all stay.

A show is added under **Shows**. Works can be added to a show at any
time and are never taken out.

## Depositing a piece

**A Paper, Brief, Dispatch, Annual or Pigeon Post.** Open **Desk**, write
it, send it for review, then deposit it. Deposit gives it a permanent
number such as `PAZ-DEP-000123`. That number is its address for good
(`/record/PAZ-DEP-000123`). The readable address still works and simply
points to it.

**A Sattal piece.** Open **Sattal**. Add the author first under
**People** and tick **Author**. Then add the piece.

- Every piece needs a statement of the author's relation to the subject.
  The database refuses to save it without one.
- If the piece is about work the house shows, sells or has formed, or
  about PAZ itself, it can only be published when a named outside reader
  has accepted it, the acceptance date is recorded, and the author is
  not connected to the subject. The database enforces this. If the
  Publish button says no, it is telling the truth. Name a reader under
  **Outside readers**. Until there is one, that kind of piece cannot go
  out, and the Sattal front page says so.
- Press **Publish**. It goes out that day. There are no issues and no
  schedule.

There is no comment box anywhere. A reply is another Sattal piece, with
its own author and number, chosen under **A reply to**. It then shows on
the original's page.

## Correcting something

Nothing published is rewritten or recalled.

- **A deposited Paper and the like:** make a new version from the item
  and deposit that too. The old one stays, marked as replaced.
- **A Sattal piece:** open it and add a correction. It appears on the
  page.
- **A work:** add a line to its life. The work's fields can be changed
  for a fact that was wrong, but its life is only added to.
- **A Chronicle line:** add a corrected line.

## Adding a word

Choose **Words**. Enter the word, its meaning, and whether it is a term
or a spelling. Newari and Nepali words go in plain Latin, no diacritics,
no italics, spelled as they are said: `hiti`.

## Pages whose words the house supplies

These exist but say "This page has not been written yet" until someone
publishes a page with the matching address (the slug) from **Desk**:
`privacy`, `terms`, `name`, `table`, `encounters`, `looking-for`,
`commons`, `a-voice`, `struck-row`, and `canon-1` to `canon-7`. Do not
copy words into them from elsewhere. The words are the house's.

## Publishing the pages

After anything changes that readers should see, one person runs this
once, on a computer with the project on it:

```bash
pnpm site
```

Then upload the contents of `apps/web/dist/` to the web host,
replacing what is there. That is the whole job. It builds the app fresh, then writes every page,
the sitemap, the feeds, and plain text copies of everything deposited
(`record/<number>/text.txt`, `chronicle.txt`, `record.txt`).

The very first time on a new computer, `docs/runbooks/go-live.md` says
what to install and which keys to set.

## Two rulings, recorded

- **A chronicle line is a date and one line in the console**, not a line
  appended to a text file. That is accepted for now. `chronicle.txt` is
  generated from the console entries on every publish.
- **A sold work does not show its price.** A record says what a work is,
  not what it fetched. The Sattal's conflict rule reads "connected to the
  house" broadly: anyone represented, formed, or holding works.

## The rest of the house

Each of these is a form in the console, under its own name.

- **Dealings** (Wall): an enquiry to delivery. Start a dealing against a work,
  itemise the quote, then move it through accepted, invoiced, dispatched and
  arrived. Accepting marks the work sold; dispatch and arrival are added to the
  work's life. The invoice prints from the dealing and is the only place the
  company's name appears. The certificate prints from the dealing too. The
  customs value can never be below the agreed price.
- **Hands**: every named role and office, who holds it, and which seats are
  open. A seat is published only when the house means the promise.
- **Encounters**: the public calendar. Nothing here links to formation, the
  Commons or Friends, and a workshop sells a day, never formation or a
  hallmark. Tick **Nepali first** for anything addressed to the neighbourhood.
- **Guild**: the hallmark register. Record a punch that has left the house's
  keeping as destroyed; a destruction is never changed.
- **Commons**: a register the house keeps. A rung above Companion needs a
  recorded covenant date. Nothing here reads the Friends tiers. Tables kept
  are reported, confirmed, and become a Chronicle line with no name in it.
  The concurrence roll is shown to the house and never published.
- **Treasury**: the year's account, written for the Annual.
- **Brief**: send a deposited Brief to the confirmed list, once. There is one
  list and no way to slice it.
- **Concerns**: only the one person holding the safeguarding permission sees
  this page. It exists so a concern never passes through the person it is about.

Failures go in the Chronicle like everything else: a parcel lost, a promise
broken, a Review that was wrong. A dated line, permanent and unremarkable.

## Terms documents

The painter's terms, the Sattal's terms, the Ethics of Memory and Friends are
deposited documents. Create an item of type **Terms** with the slug `painters`,
`writers`, `memory` or `friends`, then deposit it. A later version takes the
slug `painters-v2` and so on; the earlier version stays, and the page shows the
history. Links to them sit where a person is asked for something: on every
enquiry, on the Sattal's front page, on the Friends page, and on the voice form.

## The empty sentences

What a room says before anything is in it lives in one file:
`apps/web/src/modules/site/empty-states.json`. Each sentence is a promise, so
each is the house's to word. Change it there and publish; the app and the static
pages read the same file.

## The mark

The house's mark is undrawn, so every place it belongs is left empty rather than
filled. The day it exists, save it as `apps/web/public/mark.svg`, publish, and it
appears in the tab, on the seal line of a Sattal piece, on the struck row of a
hallmarked work, on the certificate, and on every deposit entry.

## Credentials and copies

See `docs/runbooks/credentials-and-copies.md`. One person holding every key is
the one failure the canon does not protect against.

## The one thing that needs to be running

Forms (write to the house about a work, send a pigeon, offer a voice,
contact, become a Friend) need the database to be up. If it is not, every
page still reads and only the forms say so, with an address to write to
instead. Nobody needs an account to read anything.

## When something breaks

1. **A page is blank or says something odd.** Run the publishing steps
   above again and upload. Most problems are an old upload.
2. **A form says it is not working.** The database or its functions are
   down or misconfigured. Reading is unaffected. Check the Supabase
   dashboard for the project; `docs/runbooks/` has the details.
3. **The Publish button refuses.** Read the message. It names the rule.
4. **You cannot sign in.** Staff need the authenticator code as well as
   the password. If the phone is lost, a Super Admin can reset it.
5. **You think something was lost.** Nothing is ever deleted. Deposited
   things are also on the web host as files, and `pnpm` can export the
   database as plain files (`docs/runbooks/` describes the nightly
   backup and the quarterly restore drill).

If you cannot fix it in an evening, write down what you saw and what you
did, and ask the last person who kept the house.
