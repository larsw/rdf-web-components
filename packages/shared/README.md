# RDF Components Shared

Shared helpers and vocabulary descriptors for RDF components.

This package is not intended to be used directly.

## Exports

- `parseRdf(data: string, format?: RDFFormat): Quad[]`
- `extractNamespacesFromQuads(quads: Quad[]): NamespaceMap`
- `generatePrefix(namespace: string): string | null`
- `shortenUri(uri: string, namespaces: NamespaceMap): string`
- `localVocabularies: VocabularyDescriptor[]`
- `findVocabularyByRoute(route: string): VocabularyDescriptor | undefined`
- `findVocabularyByKey(key: string): VocabularyDescriptor | undefined`
- `RDFFormat`: `turtle`, `n-triples`, `n-quads`, `trig`, `json-ld`
- `NamespaceMap`: `Map<string, string>`
- `VocabularyDescriptor`

