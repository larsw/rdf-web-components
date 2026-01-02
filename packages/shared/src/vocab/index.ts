/** Metadata describing a locally bundled vocabulary. */
export interface VocabularyDescriptor {
  key: string;
  route: string;
  filePath: string;
  contentType: string;
  title: string;
  description?: string;
}

function filePath(relativePath: string) {
  return new URL(relativePath, import.meta.url).pathname;
}

/** Local vocabularies available for demo and development usage. */
export const localVocabularies: VocabularyDescriptor[] = [
  {
    key: "custom",
    route: "/vocab",
    filePath: filePath("./files/example-vocab.ttl"),
    contentType: "text/turtle",
    title: "Custom Example Vocabulary",
    description: "Local multilingual sample vocabulary used for demos.",
  },
  {
    key: "rdf",
    route: "/vocab/rdf",
    filePath: filePath("./files/vocabularies/rdf.ttl"),
    contentType: "text/turtle",
    title: "RDF",
    description: "RDF 1.1 vocabulary.",
  },
  {
    key: "foaf",
    route: "/vocab/foaf",
    filePath: filePath("./files/vocabularies/foaf.ttl"),
    contentType: "text/turtle",
    title: "FOAF",
    description: "Friend of a Friend vocabulary.",
  },
  {
    key: "dcterms",
    route: "/vocab/dcterms",
    filePath: filePath("./files/vocabularies/dcterms.ttl"),
    contentType: "text/turtle",
    title: "Dublin Core Terms",
    description: "DC Terms vocabulary.",
  },
  {
    key: "dcelements",
    route: "/vocab/dcelements",
    filePath: filePath("./files/vocabularies/dcelements.ttl"),
    contentType: "text/turtle",
    title: "Dublin Core Elements",
    description: "DC Elements vocabulary.",
  },
  {
    key: "rdfs",
    route: "/vocab/rdfs",
    filePath: filePath("./files/vocabularies/rdfs.ttl"),
    contentType: "text/turtle",
    title: "RDF Schema",
    description: "RDFS vocabulary.",
  },
  {
    key: "schema",
    route: "/vocab/schema",
    filePath: filePath("./files/vocabularies/schema.jsonld"),
    contentType: "application/ld+json",
    title: "Schema.org",
    description: "Schema.org JSON-LD context.",
  },
];

/**
 * Find a local vocabulary descriptor by route.
 */
export function findVocabularyByRoute(
  route: string,
): VocabularyDescriptor | undefined {
  return localVocabularies.find((vocab) => vocab.route === route);
}

/**
 * Find a local vocabulary descriptor by key.
 */
export function findVocabularyByKey(
  key: string,
): VocabularyDescriptor | undefined {
  return localVocabularies.find((vocab) => vocab.key === key);
}
