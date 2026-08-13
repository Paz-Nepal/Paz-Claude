# Component workshop

`pnpm --filter @paz/ui workshop` — serves every `*.stories.tsx` in
`packages/ui/src/components` locally.

`pnpm --filter @paz/ui workshop:build` — static build to `packages/ui/build/`
(gitignored).

`pnpm --filter @paz/ui a11y-check` — runs axe-core (real Chromium, via
Playwright) against every story in the build above. Run
`workshop:build` first; this script doesn't build for you. CI runs both
in sequence (`.github/workflows/ci.yml`, job `component-workshop`).

Adding a component to `packages/ui/src/index.ts`? Give it a
`<name>.stories.tsx` alongside it covering its documented variants/props
— see ADR-28 for why and `button.stories.tsx` for the shape to copy.
`.ladle/globals.css` / `.ladle/components.tsx` wire in the same design
tokens (`@paz/config/design-tokens.css`) and Tailwind build the real app
uses, so what renders here is what ships — no separate theme to keep in
sync by hand.
