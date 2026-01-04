# @sral/rdfa-components

Convert RDF (Turtle, N-Triples, N-Quads, TriG) into simple RDFa HTML snippets. Ships lightweight helpers for parsing with N3, grouping quads into subjects, and rendering RDFa strings.

## Install

```bash
bun add @sral/rdfa-components
```

## Usage

```ts
import {
  parseRdfToQuads,
  quadsToRdfaSubjects,
  renderRdfa,
  renderRdfaDocument,
  rdfToRdfaHtml,
} from "@sral/rdfa-components";

const turtle = `
@prefix ex: <http://example.org/> .
ex:alice ex:name "Alice"@en ;
  ex:friend ex:bob .
`;

// 1) Parse RDF text to quads
const quads = parseRdfToQuads(turtle, "turtle");

// 2) Group quads per subject into RDFa-friendly shape
const subjects = quadsToRdfaSubjects(quads);

// 3) Render a single subject
const aliceHtml = renderRdfa(subjects[0]);

// 4) Render a full document (multiple subjects)
const docHtml = renderRdfaDocument(subjects);

// Or do everything in one go
const html = rdfToRdfaHtml(turtle, "turtle");

console.log(html);
```

### API surface

- `parseRdfToQuads(input, format)` — uses N3 to parse RDF text into quads. Supported formats: `turtle`, `trig`, `ntriples`, `nquads`.
- `quadsToRdfaSubjects(quads)` — groups quads by subject into `{ subject, properties }` entries, preserving language and datatype.
- `renderRdfa(subject)` — renders one subject into an RDFa `<div>` snippet.
- `renderRdfaDocument(subjects)` — renders multiple subjects into a wrapped HTML string.
- `rdfToRdfaHtml(input, format)` — convenience pipeline doing parse + group + render in one call.
- `extractRdfaSubjectsFromDom(root)` — read RDFa markup from a browser DOM/document into `{ subject, properties }`.
- `extractRdfaQuadsFromDom(root)` — DOM extraction + conversion to N3 quads.
- `rdfaSubjectsToQuads(subjects)` — convert RDFa subjects into N3 quads (useful if you already have the grouped shape).

All literal values are HTML-escaped during rendering.

## Development

```bash
bun install
bun run --filter @sral/rdfa-components build
bun run --filter @sral/rdfa-components test
```
```
