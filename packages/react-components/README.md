# RDF React Components

React components for rendering RDF data with a focus on structured, readable output.

## Install

```bash
bun add @sral/react-rdf-components
```

## Usage

```tsx
import "@digdir/designsystemet-css";
import { RdfViewer } from "@sral/react-rdf-components";

const data = `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
<http://example.org/alice> a foaf:Person ; foaf:name "Alice" .`;

export function Example() {
  return <RdfViewer data={data} format="turtle" layout="table" />;
}
```

## Styles

This library renders Designsystemet React components. Import the Designsystemet CSS in your app and load a theme from `@digdir/designsystemet-css/theme` or a custom theme generated from Designsystemet tokens.

## RdfViewer Props

- `data` (string, required): RDF document content.
- `format` (string): `turtle`, `n-triples`, `n-quads`, `trig`, `json-ld`.
- `layout` (string): `table` or `turtle`.
- `showNamespaces` (boolean): Show namespace prefixes.
- `expandUris` (boolean): Expand prefixed URIs.
- `preferredLanguages` (string[]): Preferred label languages.
- `theme` (string): `light` or `dark`.
- `showImagesInline` (boolean): Inline image rendering.
- `className` (string): Wrapper class name.
