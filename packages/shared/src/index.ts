import { Parser, Quad } from "n3";

const globalScope = globalThis as typeof globalThis & {
  global?: typeof globalThis;
};
if (!globalScope.global) {
  globalScope.global = globalScope;
}
/**
 * Vocabulary lookups and descriptors for local sample vocabularies.
 */
export {
  findVocabularyByKey,
  findVocabularyByRoute,
  localVocabularies,
  type VocabularyDescriptor,
} from "./vocab";

/** Supported RDF parser formats. */
export type RDFFormat = "turtle" | "n-triples" | "n-quads" | "trig" | "json-ld";
/** Map of prefix to namespace URI. */
export type NamespaceMap = Map<string, string>;

const COMMON_PREFIXES: Record<string, string> = {
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#": "rdf",
  "http://www.w3.org/2000/01/rdf-schema#": "rdfs",
  "http://www.w3.org/2002/07/owl#": "owl",
  "http://purl.org/dc/elements/1.1/": "dc",
  "http://xmlns.com/foaf/0.1/": "foaf",
  "http://www.w3.org/2004/02/skos/core#": "skos",
  "http://schema.org/": "schema",
  "http://www.w3.org/2001/XMLSchema#": "xsd",
};

/**
 * Parse RDF data into N3 quads.
 */
export const parseRdf = (
  data: string,
  format: RDFFormat = "turtle",
): Quad[] => {
  const parser = new Parser({ format });
  return parser.parse(data);
};

/**
 * Extract namespace prefixes from RDF quads.
 */
export const extractNamespacesFromQuads = (quads: Quad[]): NamespaceMap => {
  const discovered = quads
    .flatMap((quad) => [quad.subject.value, quad.predicate.value, quad.object.value])
    .filter((value) => value.startsWith("http://") || value.startsWith("https://"))
    .map((value) => {
      const uriMatch = value.match(/^https?:\/\/[^\/\s]+/);
      if (!uriMatch) return null;
      const lastSlash = Math.max(value.lastIndexOf("/"), value.lastIndexOf("#"));
      if (lastSlash <= 0) return null;
      const namespace = value.substring(0, lastSlash + 1);
      return namespace.endsWith("/") || namespace.endsWith("#") ? namespace : null;
    })
    .filter((namespace): namespace is string => Boolean(namespace));

  return discovered.reduce<NamespaceMap>((acc, namespace) => {
    const prefix = generatePrefix(namespace);
    if (prefix && !acc.has(prefix)) {
      acc.set(prefix, namespace);
    }
    return acc;
  }, new Map());
};

/**
 * Generate a prefix suggestion for a namespace URI.
 */
export const generatePrefix = (namespace: string): string | null => {
  if (COMMON_PREFIXES[namespace]) {
    return COMMON_PREFIXES[namespace];
  }

  const match = namespace.match(/https?:\/\/([^\/]+)/);
  if (match && match[1]) {
    const domain = match[1].replace(/^www\./, "");
    const parts = domain.split(".");
    if (parts[0] && parts[0].length > 0) {
      const prefix = parts[0].substring(0, 3).toLowerCase();
      if (prefix.length > 0) {
        return prefix;
      }
    }
  }

  return null;
};

/**
 * Shorten a URI using known namespaces, falling back to the full URI.
 */
export const shortenUri = (uri: string, namespaces: NamespaceMap): string => {
  for (const [prefix, namespace] of namespaces) {
    if (uri.startsWith(namespace)) {
      return `${prefix}:${uri.substring(namespace.length)}`;
    }
  }

  for (const [namespace, prefix] of Object.entries(COMMON_PREFIXES)) {
    if (uri.startsWith(namespace)) {
      return `${prefix}:${uri.substring(namespace.length)}`;
    }
  }

  return uri;
};
