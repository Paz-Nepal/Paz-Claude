# Credentials, and the three copies

The canon already solved this problem for the marks and the masters: three
copies, a named holder, a successor. This applies the same rule to the site,
because an institution built for a century would lose its entire public
existence not because the canon failed but because nobody else can sign in.

**Today one person holds all of these.** This file is where the house writes
who else does. Names are the house's to enter; nothing here is filled in by
guesswork.

| What                                                   | Held by | Successor | Where the recovery details are kept |
| ------------------------------------------------------ | ------- | --------- | ----------------------------------- |
| The domain (registrar account)                         |         |           |                                     |
| DNS                                                    |         |           |                                     |
| The web host                                           |         |           |                                     |
| The repository (GitHub organisation)                   |         |           |                                     |
| The database project (Supabase)                        |         |           |                                     |
| The mail sender (Resend) and its sending domain        |         |           |                                     |
| The staff sign-in authenticator (Super Admin recovery) |         |           |                                     |

A holder is a person, not a shared login. A successor can sign in on the day the
holder cannot. Recovery details are kept on paper, in the house, not in the
repository.

## The three copies

1. **The repository.** Every line of code, every migration, the seed, and the
   documents in `docs/`. Held on GitHub, and cloned by at least one other person.
2. **The built files.** `apps/web/dist/` after `pnpm site`: every deposited page
   as flat HTML and plain text. Held on the web host, and a copy of each upload
   kept off the host.
3. **The deposit copy.** The plain-file export of everything in the database
   (`pnpm exec node scripts/export-content.mjs <folder>`: items, the Record,
   the Wall, the Sattal, the Chronicle, the glossary). The house keeps this copy,
   outside any platform.

Name here who runs the export, how often, and where each copy goes:

- Runs the export:
- How often:
- Where the copy is kept, and the second place it is kept:

The nightly backup and the quarterly restore drill
(`.github/workflows/nightly-backup-export.yml`, `quarterly-restore-drill.yml`)
are the mechanism; they need the secrets listed in `docs/runbooks/environments.md`.

## Two decisions recorded, not defaulted

- **The address.** The house is a family home and the founder lives in it. The
  lane is public and the door is not. The site names Patan, Lalitpur and gives no
  street address; the address is given when an arrangement is made. The
  company's statutory details will carry a real address whether or not the site
  does, and that is a legal matter, not a design one.
- **The domain.** `paz.com.np` is a Nepal domain, and the architecture above it
  imagines a Foundation over several countries with the marks passing to it.
  Permanent addresses are the one thing that cannot be revisited later, so this
  decision sits underneath every deposit number and every canonical link. It is
  undecided. Until it is decided, nothing should be deposited that would be
  embarrassing to move.
