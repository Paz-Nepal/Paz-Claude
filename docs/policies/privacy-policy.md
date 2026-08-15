# Privacy Policy — draft for the CMS

**Status: draft, not yet published anywhere.** This is copy-ready text for
whoever holds the `administrator`/`editor` role to paste into the CMS as a
`page`-type item with slug `privacy` once a real Supabase project and a
real staff account exist (`docs/runbooks/go-live.md`). It is grounded only
in what this codebase actually does — no invented certifications, no
claims about jurisdictions this wasn't written for. **Have this reviewed
by someone qualified in Nepali data-protection law before treating it as
PAZ's real privacy policy** — this is an accurate first draft, not legal
advice.

---

## What PAZ collects, and why

PAZ collects the minimum needed to run each thing you actually asked it
to do — there is no data collected "just in case," and no analytics or
advertising use of anything below.

| What you do                                              | What's collected                                                                                                                             | Why                                                                                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apply for membership                                     | Name, email, phone (if given), your written application, tier selected                                                                       | To review and decide the application, and to run your membership if accepted                                                                              |
| Reserve a table (the Hearth)                             | Name, party size, date/time, contact info, any notes you add                                                                                 | A person confirms every reservation by hand — this is what they see                                                                                       |
| Send a message (contact form, Pigeon Post)               | Name/email if given, the message itself                                                                                                      | To read and reply to you, or (Pigeon Post) to consider for publication                                                                                    |
| Register for a programme                                 | Name, contact info, which session                                                                                                            | To run the session and manage capacity/waitlist                                                                                                           |
| Pay a membership fee online (eSewa/Khalti, when enabled) | The gateway's own transaction reference number, amount, and date                                                                             | To record that your term is paid. **PAZ never sees or stores your card, bank, or wallet details** — that happens entirely on eSewa's/Khalti's own systems |
| Read the public site                                     | Nothing tied to you. No cookies, no analytics, no tracking pixels, no third-party fonts or scripts that would leak your visit to anyone else |                                                                                                                                                           |

**A note on the last row, because it's a deliberate choice, not an
oversight:** this site self-hosts its own fonts specifically so that
loading a page never tells a third party (like Google Fonts' CDN) that
you visited. There is no visitor-counting beacon, no cookie banner
because there are no cookies to consent to, and no reader-tracking of any
kind.

**Automated abuse protection.** Public forms (Pigeon Post, contact,
membership applications, invitation acceptance) are rate-limited to stop
spam/abuse. This works by taking your IP address, immediately hashing it
(a one-way transformation — the original address can't be recovered from
the hash) together with a short-lived salt, and checking the hash against
recent submissions. The hash is never linked to your name or account, is
kept only briefly, and is never used to identify or track you — only to
notice "too many submissions in a short time from the same place."

## Who processes this data

- **Supabase** — hosts PAZ's database and handles sign-in. This is where
  everything in the table above actually lives.
- **Resend** — sends transactional email only (reservation confirmations,
  application decisions, renewal notices). Never marketing email, never a
  mailing list you didn't ask to join.
- **Cloudflare R2** — receives an encrypted nightly backup of the
  database, under a separate account from Supabase, so one provider being
  compromised doesn't also compromise the backup.
- **eSewa / Khalti** (only if online payment is enabled) — process your
  payment directly; PAZ receives only a transaction reference, never your
  payment details.

No data is sold, and none is shared with any other third party.

## How long this is kept

Membership and institutional-relationship records are kept as part of
PAZ's ongoing history for as long as you're a member or the institution
has an active relationship with you, plus a reasonable period after — the
same way a physical membership ledger would be kept. You can ask for this
to end at any time; see below.

## Your rights

You can ask PAZ to erase your personal data at any time. Contact PAZ
(details on the [Contact](/contact) page) and ask — staff will pass this
to an Administrator, who processes it under PAZ's erasure policy
(`docs/policies/erasure.md`). In short: your name, email, phone, and any
personal notes are removed; anything already published under a byline
stays published (that's the institutional record, not a data-processing
record — ask an Editor if you specifically want a byline changed); your
membership number, if any, is kept as a placeholder so PAZ's own history
stays continuous, with everything identifying about it gone.

## Children

This site is not directed at children, and PAZ does not knowingly collect
data from anyone below the age required to enter into an agreement under
Nepali law without a guardian.

## Changes to this policy

If this policy changes in a way that matters, PAZ will post an updated
version here with a visible date.

## Questions

Reach PAZ through the [Contact](/contact) page.
