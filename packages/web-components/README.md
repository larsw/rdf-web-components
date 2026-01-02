# RDF Web Components

Web components for rendering RDF data in the browser.

## Usage

```html
<script type="module" src="/rdf-details-view.js"></script>

<rdf-details-view
  data="@prefix ex: <http://example.org/> . ex:alice ex:name \"Alice\" ."
  format="turtle"
  show-namespaces
  enable-navigation
></rdf-details-view>
```

## Attributes

- `data` (string): RDF data to render.
- `format` (string): `turtle`, `n-triples`, `n-quads`, `trig`, `json-ld`.
- `show-namespaces` (boolean): Show namespace prefixes.
- `expand-uris` (boolean): Expand prefixed URIs.
- `theme` (string): `light` or `dark`.
- `preferred-languages` (string): Comma-separated language list.
- `vocabularies` (string): Comma-separated vocabulary URLs.
- `show-images-inline` (boolean): Inline image previews.
- `enable-navigation` (boolean): Navigate between known subjects.
- `enable-content-negotiation` (boolean): Detect resource types via HEAD requests.

## JavaScript API

- `setData(data: string, format?: RDFDetailsViewConfig["format"])`
- `setConfig(config: Partial<RDFDetailsViewConfig>)`
- `getQuads(): Quad[]`
- `clear()`
- `addVocabulary(url: string)`
- `removeVocabulary(url: string)`
- `navigateToSubject(subjectUri: string)`
- `showAllSubjects()`

## Screenshots

Light:

![RdfDetailsView light](../../assets/web-components-light.png)

Dark:

![RdfDetailsView dark](../../assets/web-components-dark.png)
