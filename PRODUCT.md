# Product

## Register

product

## Users

Frontend and full-stack **developers integrating the library** into their own
applications. They reach for `@sral/rdf-web-components` (vanilla custom element)
or `@sral/react-rdf-components` (React) to drop a readable RDF view into a page
without building triple-rendering logic themselves. Their context is evaluation
and integration: they care about API clarity, sensible defaults, theming hooks,
and whether the component looks correct against real RDF graphs.

Their end-users (people actually reading the rendered RDF) are served
indirectly: the component must make property/value rows scannable and navigable,
but the design decisions are made for the integrator who is judging the library.

## Product Purpose

A small family of components that render parsed RDF as readable property/value
rows: an "RDF details view." One framework-agnostic core (`@sral/rdf-components-shared`)
handles parsing, namespace logic, URI shortening, and bundled vocabularies; two
independent UI renderings (vanilla web component + React) present the same idea.

Success right now means **the two renderings feel like one library.** Today they
diverge: the React package is built on a public-sector design system and the web
component is hand-rolled with ad-hoc hex values. The product goal is a single,
coherent visual and behavioral language across both.

## Design Direction (decided)

- **Palantir Blueprint v6** (latest) is the design-system source of truth,
  replacing `@digdir/designsystemet-react`. Blueprint was built for dense,
  data-heavy technical interfaces, which is exactly what a triple view is.
- The **React package** consumes real Blueprint components and tokens.
- Blueprint is React-only, so the **vanilla web component mirrors Blueprint's
  visual language by hand** (CSS variables matching Blueprint's palette, type,
  spacing/density, and dark theme) so both renderings match.
- **Dark theme is the default** (Blueprint `.bp6-dark`); light is a first-class
  opt-in.
- Status: **done in both renderings.** The React package uses Blueprint v6
  directly; the web component mirrors the same `--rdf-*` tokens by hand. Dark is
  the default in both; tests/build green. See `docs/blueprint-migration-plan.md`.

## Brand Personality

Technical, sharp, precise. The components should feel like instruments a serious
developer trusts: correct, dense, quiet. Confidence comes from legibility and
accuracy, not decoration. Three words: **precise, technical, trustworthy.**

## Anti-references

- **Raw semantic-web tooling.** Avoid the dense, unstyled, academic look of
  Protégé, raw triple tables, and RDF validators. Same domain, opposite craft.
- **Generic SaaS dashboard.** No gradient hero-metric cards, no identical card
  grids, no AI-SaaS template look.
- **Over-branded / flashy.** No marketing decoration, heavy animation, or styling
  that competes with the data for attention.
- **Government-portal aesthetic.** We are deliberately leaving the Designsystemet
  public-sector look behind.

## Design Principles

1. **Data is the interface.** Chrome recedes; the triples read clearly. Any
   styling that pulls attention away from the property/value content is wrong.
2. **One library, one feel.** A change to how something renders should land in
   both packages and look identical. Divergence between the two renderings is a
   defect, not a variation.
3. **Density without clutter.** Show a lot of triples and stay legible — the
   Blueprint ethos. Whitespace and rhythm survive even on large graphs.
4. **Correct by default, expert on demand.** Good output with zero config;
   power features (vocabularies, navigation, layout modes) available but not in
   the way.
5. **Accessible in the dark.** The default theme is dark, where body-text
   contrast most often fails. AA contrast is verified in dark mode, not assumed.

## Accessibility & Inclusion

Target **WCAG 2.2 AA**, with explicit attention to **dark-mode contrast** since
dark is the default theme. Body text ≥ 4.5:1, large/bold text ≥ 3:1, verified
against the actual Blueprint dark surfaces (not just light). Keyboard navigation
and visible focus states for all interactive elements (URI links, navigation
controls, layout toggles). Honor `prefers-reduced-motion` for any transitions.
