# Design

The visual system for the RDF components, expressed as **Palantir Blueprint v6**
tokens. Dark is the default theme; light is a first-class opt-in. The React
package consumes Blueprint directly; the vanilla web component mirrors these
values by hand (Blueprint is React-only). All hex values below are Blueprint's
own palette, so "on brand" means "indistinguishable from a native Blueprint app."

> Status: implemented in **both** renderings. `@sral/react-rdf-components` uses
> real Blueprint v6 components; `@sral/rdf-web-components` mirrors the same
> `--rdf-*` token layer by hand (`:host` dark default + `:host([theme="light"])`).
> Dark is the default in both. See `docs/blueprint-migration-plan.md`.

## Theme

- **Default:** dark (Blueprint `bp6-dark`, applied via the `Classes.DARK`
  container class). The data-tool aesthetic the library is aiming for.
- **Opt-in:** light. Toggled by the existing `theme` prop / `theme` attribute,
  which now adds or removes the dark class rather than setting Designsystemet's
  `data-color-scheme`.
- **System:** when no theme is set, respect `prefers-color-scheme`.

## Color

Blueprint's grayscale carries the UI; intent colors are reserved for meaning
(links, success/warning/danger), never decoration. The literal-type tints
(numeric, date, boolean, email) map onto Blueprint's extended palette.

### Grayscale (Blueprint core)

| Token      | Hex       | Token       | Hex       |
| ---------- | --------- | ----------- | --------- |
| black      | `#111418` | gray3       | `#8f99a8` |
| dark-gray1 | `#1c2127` | gray4       | `#abb3bf` |
| dark-gray2 | `#252a31` | gray5       | `#c5cbd3` |
| dark-gray3 | `#2f343c` | light-gray1 | `#d3d8de` |
| dark-gray4 | `#383e47` | light-gray2 | `#dce0e5` |
| dark-gray5 | `#404854` | light-gray3 | `#e5e8eb` |
| gray1      | `#5f6b7c` | light-gray4 | `#edeff2` |
| gray2      | `#738091` | light-gray5 | `#f6f7f9` |
|            |           | white       | `#ffffff` |

### Semantic roles (Blueprint aliases)

| Role             | Dark (default)        | Light                 |
| ---------------- | --------------------- | --------------------- |
| App background   | dark-gray1 `#1c2127`  | light-gray5 `#f6f7f9` |
| Elevated surface | dark-gray3 `#2f343c`  | light-gray4 `#edeff2` |
| Body text        | light-gray5 `#f6f7f9` | dark-gray1 `#1c2127`  |
| Muted text       | gray4 `#abb3bf`       | gray1 `#5f6b7c`       |
| Disabled text    | `rgba(#abb3bf, 0.6)`  | `rgba(#5f6b7c, 0.6)`  |
| Divider / border | `rgba(#ffffff, 0.2)`  | `rgba(#111418, 0.15)` |

### Intent & literal-type accents

| Role                   | Light shade | Dark shade | Blueprint name    |
| ---------------------- | ----------- | ---------- | ----------------- |
| Primary / link / email | `#215db0`   | `#8abbff`  | blue2 / blue5     |
| Numeric (info)         | `#0f6894`   | `#68c1ee`  | cerulean2 / 5     |
| Date                   | `#7c327c`   | `#d69fd6`  | violet2 / violet5 |
| Boolean                | `#935610`   | `#fbb360`  | orange2 / orange5 |
| Success (Callout)      | `#238551`   | `#72ca9b`  | green3 / green5   |
| Danger (Callout)       | `#cd4246`   | `#fa999c`  | red3 / red5       |

Literal-value text is small body text, so on **light** it uses the darker
shade (`*2`) and on **dark** the lighter shade (`*5`). Both directions are
verified ≥ 4.5:1 against the actual surfaces, including the white striped table
rows (measured: 5.0–8.1:1). The mid shade (`*3`) was borderline for small text
on light, so `*2` is used instead. Success/Danger are Blueprint's own `Callout`
intents (error and empty states), not literal-value text. Accents apply to the
value glyph only; labels stay in body/muted gray.

## Typography

Blueprint's defaults; no custom font loading.

- **UI / body:** `-apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto",
"Oxygen", "Ubuntu", "Cantarell", "Open Sans", "Helvetica Neue", sans-serif`.
- **Monospace** (URIs, prefixes, datatypes, raw RDF): `"SF Mono", "Monaco",
"Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace`.
- **Base size:** 14px (Blueprint default), 1.5 line-height. Dense by design.
- **Headings:** Blueprint `H1`–`H6` scale. Subject headings use `H5`/`H6`
  weight, not large display type — the data is the focus, not the chrome.
- **Numerics:** `font-variant-numeric: tabular-nums` on literal values so
  numbers align in columns.
- Language tags / datatype badges: monospace, uppercase, ~0.7em, in a tinted
  pill (muted surface + subtle border).

## Spacing & Density

- Blueprint's compact rhythm. Base unit 10px (`$pt-grid-size`); use multiples
  (5 / 10 / 20px) and Blueprint's `compact` table density for triple lists.
- Predicate column: fixed, clamped 14–28ch (preserve current behavior).
- Stack gap between subject cards / sections: 10–16px.
- Cap value text measure where prose-like; URIs wrap with `overflow-wrap:
anywhere` rather than overflowing.

## Components (Blueprint v6 mapping)

The view is built from these Blueprint primitives:

| Purpose            | Blueprint v6                                                 |
| ------------------ | ------------------------------------------------------------ |
| Subject container  | `Card` (single-level only — no nested cards)                 |
| Property grid      | `HTMLTable` with `compact` + `striped` (+ `bordered`)        |
| Namespaces / lists | `<ul className={Classes.LIST}>` or Blueprint list class      |
| Subject heading    | `H5` / `H6`                                                  |
| Error / empty      | `Callout` with `intent` (`danger`, or none for empty)        |
| Buttons (nav)      | `Button variant="minimal"` for in-place nav                  |
| URI / mailto / tel | styled `<a>` (Blueprint `a` styles); nav uses minimal Button |
| Image preview      | plain `<img>` + Blueprint surface border, ~220×160 cap       |
| Badges (lang/type) | `Tag minimal` or a custom monospace pill                     |

## Iconography

Blueprint icons (`@blueprintjs/icons`) only where they add meaning: navigation
chevrons (replacing the `»` glyph), external-link affordance on outbound URIs,
image/RDF/HTML content-type hints. No decorative icons.

## Motion

Minimal and functional. Blueprint's built-in transitions for interactive states
(hover, focus, active) are kept; nothing animates layout. Carousel/image and
navigation changes are instant or a short crossfade. Every transition respects
`@media (prefers-reduced-motion: reduce)`.

## Accessibility

- **WCAG 2.2 AA**, verified in **dark** (the default) as well as light.
- Body text ≥ 4.5:1, large/bold ≥ 3:1, against the actual Blueprint surfaces
  listed above. The literal-accent shades are chosen per-theme to hold this.
- Visible focus rings on every interactive element (Blueprint focus styles);
  keyboard-operable navigation controls.
- Language tags carry `aria-label`; decorative glyphs use `aria-hidden`.

## Web-component parity

The vanilla web component cannot import Blueprint. It defines a `--rdf-*` CSS
variable layer whose values are the hex codes above, in two blocks: a `:host`
default (dark) and a light override keyed off the `theme` attribute. Shared
parsing/labeling already lives in `@sral/rdf-components-shared`; only the
presentation values are duplicated, and they trace back to this file.
