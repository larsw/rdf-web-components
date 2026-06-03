# Migration plan: Digdir Designsystemet → Palantir Blueprint v6

Status: **complete.** Both renderings are on the Blueprint v6 visual language
(React via real Blueprint components, the web component via a hand-mirrored
`--rdf-*` token layer). Dark is the default in both. All 26 tests pass, both
packages build. See "Implementation notes" for deviations found during the work.

## Goal

Replace `@digdir/designsystemet-react` / `-css` with **Palantir Blueprint v6**
as the design-system source of truth for `@sral/react-rdf-components`, then
retheme `@sral/rdf-web-components` to mirror Blueprint's look. Dark is the
default theme. See `PRODUCT.md` (direction) and `DESIGN.md` (tokens) for the
visual target. The shared core (`@sral/rdf-components-shared`) does not change —
it has no UI dependency.

## Why Blueprint fits

Blueprint was built by Palantir for dense, data-heavy technical interfaces.
A triple view is exactly that. Its compact `HTMLTable`, `Card`, `Callout`, and
intent system map cleanly onto the current Designsystemet usage, and its dark
theme is a first-class, well-tested target.

## Blueprint v6 facts that shape the work

- Packages: `@blueprintjs/core`, `@blueprintjs/icons` (and `@blueprintjs/select`
  only if a vocabulary picker is later added). Install latest v6.x.
- **React peer is `18`** (not a `>=18` range). bun therefore installed a nested
  React 18 copy next to `@blueprintjs/*`, which broke rendering with a
  dual-React `$$typeof` mismatch ("Objects are not valid as a React child").
  Fixed with a root `package.json` `overrides` forcing `react`/`react-dom` to
  `19.2.1` so the whole tree dedupes onto one React. Blueprint 6 runs fine on
  React 19 in practice; the peer string is just conservative.
- CSS namespace is **`bp6-`** (was `bp5-`). Anywhere we hardcode a Blueprint
  class, use `bp6-` or the exported `Classes.*` constants instead of literals.
- No more UMD bundles; ESM only. Our Bun build is ESM, so fine.
- Stylesheet import: `@blueprintjs/core/lib/css/blueprint.css` (plus
  `@blueprintjs/icons/lib/css/blueprint-icons.css` if icons are used). This
  replaces the two `@digdir/designsystemet-css` imports.
- Dark theme = add `Classes.DARK` (`"bp6-dark"`) to a container element.
- Component API notes for v6: `Button` uses a `variant` prop
  (`"solid" | "outlined" | "minimal"`); `Icon` uses `size` (not `iconSize`).

## Component & API mapping

Current Designsystemet usage in `RdfDetailsView.tsx` → Blueprint v6:

| Designsystemet (now)                                      | Blueprint v6 (target)                                               | Notes                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Alert` + `data-color="danger"`                           | `Callout intent="danger"`                                           | Empty-state alert → `Callout` with no intent.                                                             |
| `Card` + `CardBlock`                                      | `Card`                                                              | Blueprint `Card` is a single element; drop `CardBlock`, put content directly inside. **No nested cards.** |
| `Heading level={3} data-size="sm"`                        | `H5` / `H6` (from `@blueprintjs/core`)                              | Subject headings stay small; data is the focus.                                                           |
| `Paragraph data-size="sm"`                                | `<p>` + `Classes.TEXT_SMALL` / `Classes.TEXT_MUTED`                 |                                                                                                           |
| `List.Unordered` / `List.Item`                            | `<ul className={Classes.LIST}>` / `<li>`                            |                                                                                                           |
| `Table` `border` `zebra` + `.Body/.Row/.HeaderCell/.Cell` | `HTMLTable compact striped bordered` + raw `<tbody>/<tr>/<th>/<td>` | Blueprint exposes one `HTMLTable`; rows/cells are plain elements.                                         |
| `Button variant="tertiary"`                               | `Button variant="minimal"`                                          | Used for in-place subject navigation and carousel prev/next.                                              |
| `Link`                                                    | styled `<a>` (Blueprint anchor styles)                              | Blueprint has no `Link` component; nav links remain `Button variant="minimal"`.                           |

## Token mapping (CSS)

`packages/react-components/src/components/rdf-details-view.css` currently
references `--ds-color-*`. Replace each with a local `--rdf-*` variable defined
once for light and once under `.bp6-dark`, using the hex values in `DESIGN.md`:

| Current `--ds-color-*`                  | Replacement intent (see DESIGN.md)        |
| --------------------------------------- | ----------------------------------------- |
| `--ds-color-neutral-text-default`       | body text (light-gray5 dark / dark-gray1) |
| `--ds-color-neutral-text-subtle`        | muted text (gray4 dark / gray1 light)     |
| `--ds-color-info-text-default`          | numeric accent (cerulean5/3)              |
| `--ds-color-brand2-text-default`        | date accent (violet5/3)                   |
| `--ds-color-warning-text-default`       | boolean accent (orange5/3)                |
| `--ds-color-accent-text-default/subtle` | link / email accent (blue5/3)             |
| `--ds-color-neutral-surface-tinted`     | badge surface (dark-gray3 / light-gray4)  |
| `--ds-color-neutral-border-subtle`      | divider (rgba white .2 / black .15)       |

## Affected files (inventory)

- `packages/react-components/package.json` — swap deps:
  remove `@digdir/designsystemet-react`, `@digdir/designsystemet-css`; add
  `@blueprintjs/core` (+ `@blueprintjs/icons` if used). Update the `build`
  `--external` list to externalize `@blueprintjs/*` instead of designsystemet.
- `packages/react-components/src/components/RdfDetailsView.tsx` — component
  swaps per the mapping table; theme handling switches from `data-color-scheme`
  to toggling `Classes.DARK`.
- `packages/react-components/src/components/rdf-details-view.css` — token swap.
- `packages/react-components/dev/frontend.tsx` — replace the two
  `@digdir/designsystemet-css` imports with the Blueprint stylesheet; default
  the demo container to dark.
- `packages/react-components/.storybook/main.ts` + `.storybook/preview.ts` —
  remove designsystemet-css vite aliases; import Blueprint CSS in preview; set
  the dark background as the Storybook default.
- `packages/react-components/src/RdfDetailsView.stories.tsx` — verify stories
  still render; add a light/dark toggle story.
- `packages/web-components/rdf-details-view.ts` — replace the ad-hoc hex theme
  (lines ~355–710) with the `--rdf-*` variable layer from `DESIGN.md`; make dark
  the `:host` default and light an override on the `theme` attribute. **Audit
  the `border-left` accent (~line 705) — replace with a full border or tint.**

## Sequencing

1. **Deps + build** — install Blueprint, update `package.json` deps and the
   `build --external` flags. Repo builds (even if visuals are mid-migration).
2. **React component** — rewrite `RdfDetailsView.tsx` imports/JSX per the
   mapping; switch theme wiring to `Classes.DARK`.
3. **React tokens** — rewrite `rdf-details-view.css` with `--rdf-*` light/dark.
4. **Dev + Storybook** — swap CSS imports and aliases; dark default; a11y addon
   already present (`@storybook/addon-a11y`) — use it to check contrast.
5. **Web component parity** ✅ — `getStyles()` in `rdf-details-view.ts` now
   defines `--rdf-*` tokens on `:host` (dark default) + `:host([theme="light"])`
   (light override), keyed off the host `theme` attribute; all `.dark` override
   rules deleted; default `theme` flipped to `dark`; the `border-left`
   side-stripes on `.rdf-resource`/`.html-resource` replaced with full thin
   tinted chips. Literal/accent token values match the React package exactly.
6. **Verify** — `bun run build`, `bun run test` (all three packages), visual
   pass in Storybook + both dev servers, AA contrast check in dark.

## Risks / open questions

- **`HTMLTable` structure:** Designsystemet's `Table.*` subcomponents become raw
  table elements under Blueprint. Confirm `striped`/`compact`/`bordered` give
  the zebra+border look the current `Table border zebra` provides.
- **No `Link` / `CardBlock` equivalents:** minor refactors, noted above.
- **Tests:** any test asserting on Designsystemet class names / `data-*`
  attributes will need updating to Blueprint `bp6-` classes.
- **Bundle size:** Blueprint core is heavier than the current setup; acceptable
  for the data-tool target, but worth a note in the README for consumers.
- **Light parity:** dark is the priority; confirm light still meets AA before
  shipping.

## Implementation notes (what actually happened)

The React migration is done. Three things differed from the original plan:

1. **React-instance dedupe.** Blueprint's `react: "18"` peer made bun install a
   nested React 18, causing a dual-React render crash. Fixed with root
   `overrides` (`react`/`react-dom` → `19.2.1`) and a clean reinstall.
2. **`n3` was undeclared.** `@sral/react-rdf-components` imports `n3` (and
   `@rdfjs/types` in the dev playground) directly but never declared them; it
   relied on the old flat-hoist layout. After the reinstall switched to bun's
   isolated store, the dev server couldn't resolve `n3`. Fixed by adding
   `n3` to dependencies and `@rdfjs/types` to devDependencies. (Tests/build were
   unaffected; only the dev-server bundler surfaced it.)
3. **Bun CSS bundler vs. `oklch()`.** Blueprint's `blueprint.css` uses the
   `oklch(from …)` relative-color syntax, which Bun 1.3.x's CSS bundler can't
   parse (`Unexpected token: l`). The dev server now serves Blueprint's CSS as a
   static file (`dev/server.ts`) and injects the `<link>`s at runtime
   (`dev/frontend.tsx`) so the bundler never touches it. Storybook (Vite) and
   real consumer bundlers handle the syntax fine — this is a Bun-only quirk.
   **The web component (step 5) embeds its own CSS, so it is not affected**, but
   keep this in mind if the web-component dev server ever imports Blueprint CSS.

Verification: `bun run test` → 26/26 pass (2 shared + 7 web + 17 react);
`bun run build` → both packages build; React and web-component dev servers both
render Blueprint with dark default; all literal-accent token pairs measured
≥ 4.5:1 in both themes.

## Out of scope (for now)

Shared-core changes, new features, and any redesign of the demo's page chrome
beyond theming. This migration is a like-for-like re-skin onto Blueprint, not a
feature change.
