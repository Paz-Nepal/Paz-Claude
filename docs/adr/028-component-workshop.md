# ADR-28: Component Workshop (T-035)

**Status:** Implemented (`packages/ui` — Ladle, `*.stories.tsx` per
component, `scripts/check-a11y.mjs`, CI job `component-workshop`).

## Decision

- **Ladle, not Storybook.** `packages/ui` is a small, already-Vite-based
  design system package (Vitest, no bundler of its own beyond what Vite
  gives it) — Ladle is itself a thin Vite app with near-zero
  configuration, versus Storybook's much larger dependency footprint and
  its own webpack/Vite builder abstraction on top of that. For eight
  components, the lighter tool is the right one; nothing here is
  Storybook-specific enough to need its addon ecosystem.
- **Design tokens are shared, not duplicated.** The workshop needs the
  same `:root` CSS custom properties (`--background`, `--brand`, …) the
  real app uses, or every story would render in Tailwind's undefined-token
  fallback instead of the actual palette. Extracted the `:root` block out
  of `apps/web/src/styles/globals.css` into `packages/config/design-tokens.css`
  (`@paz/config` already owns the shared `tailwind.preset.js` these tokens
  feed) and `@import` it from both `apps/web`'s real stylesheet and
  `packages/ui/.ladle/globals.css` — verified by grepping the compiled
  output of both builds for `--brand` after the change, not just assumed.
- **`packages/ui` gained its own `tailwind.config.js`/`postcss.config.js`**
  (previously it had neither — it only ever produced className strings,
  never ran its own CSS build) so Ladle's Vite instance has something to
  process `@tailwind` directives against, content-scoped to `./src` and
  `./.ladle`.
- **axe-core runs against the built workshop, not source.** `scripts/check-a11y.mjs`
  builds nothing itself — it expects `pnpm workshop:build` to have already
  run, then serves the static output (`ladle preview`) and drives real
  Chromium (`playwright`, `@axe-core/playwright`) to every story in
  isolation (`?story=<id>&mode=preview`, Ladle's own single-story URL
  scheme, read from `build/meta.json`). This is the same shape as the
  existing Playwright critical-journey suite — real browser, real
  rendered DOM — rather than a static/heuristic lint rule, because axe's
  checks (contrast, landmark structure, aria-* wiring) depend on the
  actual computed accessibility tree.
- **`.ladle/components.tsx` wraps every story in `<main>`, not a plain
  `<div>`.** Found by actually running the check while writing it: axe's
  `region` rule failed on every single story otherwise ("all page content
  should be contained by landmarks") — each story is a standalone page as
  far as axe is concerned, so it needs a real landmark, not just visual
  padding.
- **Chromium is launched by explicit `executablePath` when
  `/opt/pw-browsers/chromium` exists**, falling back to Playwright's
  normal resolution otherwise — this development environment's
  pre-installed Chromium revision didn't match what the installed
  `playwright` version expected by default (`browserType.launch: Executable
doesn't exist at .../chromium_headless_shell-1234/...` — the pre-installed
  build was revision 1194), so relying on default resolution failed
  outright until this was added. A CI runner installs its own
  version-matched browser (`playwright install --with-deps chromium`) and
  won't need the override, but the check doesn't fail there either way.

## Consequences

- New CI job `component-workshop` (`.github/workflows/ci.yml`): installs
  Chromium, runs `pnpm --filter @paz/ui workshop:build`, then
  `pnpm --filter @paz/ui a11y-check`. Independent of the existing `e2e`
  job — no Supabase instance needed, since this never touches the
  database.
- `pnpm --filter @paz/ui workshop` serves the workshop locally for
  development (component-by-component, outside the full app shell);
  `workshop:build` produces the static site the a11y check (and any
  future deploy of the workshop itself, if that's ever wanted) uses.
- Every exported component in `packages/ui/src/index.ts` has at least one
  story exercising its documented variants (Button's four variants/three
  sizes/loading/disabled; Badge's four variants; Card; Field including
  its error state; Input/Textarea including disabled; StatePanel's empty
  and error shapes; RichText against a doc exercising every node type in
  the frozen v1 schema, plus its `null`-doc no-op case).
- Every story passes axe-core with zero violations as of this ADR — not
  asserted, actually run (`node scripts/check-a11y.mjs`, all green)
  after fixing the one real issue the check itself surfaced (the
  landmark wrapper above). A future component or story that introduces a
  real accessibility regression is what this CI job exists to catch —
  it isn't a rubber stamp added after the fact.

## Still open

- Coverage is the shell of `@paz/ui`'s current eight components, not
  every state a consuming page constructs (e.g. `Field` wired to a real
  `react-hook-form` error, `RichText` against every article actually in
  the seed data). New components should get a story as part of adding
  them, the same discipline this repo already applies to RLS policies
  needing pgTAP coverage — not enforced by tooling here, just convention.
- The axe run is slow in this environment (~20s/story — fresh navigation
  plus a full accessibility-tree scan each time, not cached or
  parallelized). Fine for 13 stories in CI; worth revisiting (parallel
  pages, a persistent browser context reused more aggressively) if the
  story count grows enough to make CI wall-clock time a problem.
