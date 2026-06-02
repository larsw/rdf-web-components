# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime

This is a Bun project (no Node). See `AGENTS.md` for Bun-vs-Node conventions (use `Bun.serve`, `bun:sqlite`, `Bun.file`, etc. instead of their npm equivalents). CI pins Bun `1.3.1`.

## Commands

Run from the repo root unless noted:

- `bun install` — install all workspace deps.
- `bun run build` — build web-components then react-components (`bun build` per package).
- `bun run test` — runs each package's tests in order: shared → web-components → react-components.
- `bun run lint` / `bun run format` — Prettier check / write over `**/*.{ts,tsx,md}` (config in root `package.json`: single quotes, no semicolons, 2-space, trailing commas).
- `bun run dev` — starts the web-components dev server (`bun --hot index.ts`) on port 3002 (override with `PORT`). It also serves the bundled vocabulary files over HTTP with CORS headers so the demo can load them locally.

### Running a single package / test

The three packages have **different test setups**, so run tests from within the package, not just the root:

- React tests require the Testing Library DOM setup. The root `bunfig.toml` preloads `packages/react-components/test/setup.ts` globally, and each UI package's `test` script also passes `--preload ./test/setup.ts`.
- `bun run --filter @sral/react-rdf-components test` (or `@sral/rdf-web-components`, `@sral/rdf-components-shared`).
- Single file/case: `cd packages/<pkg> && bun test --preload ./test/setup.ts <file>` and add `-t "<name pattern>"` to filter.
- React/web tests use `happy-dom` as the DOM environment.

## Architecture

Bun-workspace monorepo (`packages/*`) with one shared core and two independent UI renderings of the same idea — an "RDF details view" that displays parsed RDF as readable property/value rows.

### `@sral/rdf-components-shared` (`packages/shared`)

The framework-agnostic core both UI packages depend on. Owns:

- **RDF parsing & namespace logic** (`src/index.ts`): `parseRdf` (wraps N3.js `Parser`), `extractNamespacesFromQuads`, `generatePrefix`, `shortenUri`, plus the `RDFFormat` and `NamespaceMap` types and a `COMMON_PREFIXES` table. It also shims `globalThis.global` for N3 compatibility.
- **Bundled vocabularies** (`src/vocab/`): `VocabularyDescriptor`s pointing at local `.ttl`/`.rdf`/`.jsonld` files under `src/vocab/files/`, with `findVocabularyByKey` / `findVocabularyByRoute` lookups. The web-components dev server serves these by route for offline/CORS-free label resolution.

When changing parsing, prefix generation, or URI shortening, edit it **here** — both UI packages call into it rather than reimplementing it.

### `@sral/rdf-web-components` (`packages/web-components`)

Vanilla custom element, no framework. `rdf-details-view.ts` defines the `RDFDetailsView` class (`<rdf-details-view>`) using Shadow DOM and its own embedded CSS/theming. State lives in N3 `Store`s (one for data, one for loaded vocabularies). Public surface: HTML attributes (see `observedAttributes`) and an imperative JS API (`setData`, `setConfig`, `getQuads`, `addVocabulary`, `navigateToSubject`, …). `index.ts` is only the dev server; `index.html` + `frontend.ts` are the demo page.

### `@sral/react-rdf-components` (`packages/react-components`)

React 19 component (`src/components/RdfDetailsView.tsx`) built on `@digdir/designsystemet-react` (Digdir Designsystemet — `designsystemet-css` is a peer dep) with a plain CSS file. Uses the shared parsing utilities but renders via React hooks/JSX rather than reusing the web component. Supports pluggable rendering via `LiteralRenderer` / `PredicateRenderer` props keyed by datatype/predicate IRI. Has Storybook (`bun run --filter @sral/react-rdf-components storybook`) and a Bun dev server under `dev/`.

### Key cross-cutting points

- The two UI packages **share parsing but not rendering** — a display change (e.g. how dates or images render) usually must be made twice, once in each package. Only the parse/namespace/vocab layer is centralized in `shared`.
- Object rendering is type-aware: URIs are shortened via `shortenUri`, and values are detected as images, dates, numbers, emails, phone, booleans for richer display.
- Workspace deps reference exact pinned versions (e.g. `@sral/rdf-components-shared: 0.1.2`); all three packages are versioned and published together (`publishConfig.access: public`). Publishing runs via `.github/workflows/publish.yml`, triggered by pushing a `v*` tag whose version must match `package.json`.
