import { Parser, Quad } from "n3";

const globalScope = globalThis as typeof globalThis & {
  global?: typeof globalThis;
};
if (!globalScope.global) {
  globalScope.global = globalScope;
}
export {
  findVocabularyByKey,
  findVocabularyByRoute,
  localVocabularies,
  type VocabularyDescriptor,
} from "./vocab";

export type RDFFormat = "turtle" | "n-triples" | "n-quads" | "trig" | "json-ld";
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

export const parseRdf = (
  data: string,
  format: RDFFormat = "turtle",
): Quad[] => {
  const parser = new Parser({ format });
  return parser.parse(data);
};

export const extractNamespacesFromQuads = (quads: Quad[]): NamespaceMap => {
  const namespaces: NamespaceMap = new Map();

  quads.forEach((quad: Quad) => {
    [quad.subject.value, quad.predicate.value, quad.object.value].forEach(
      (value) => {
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
          return;
        }

        const uriMatch = value.match(/^https?:\/\/[^\/\s]+/);
        if (!uriMatch) {
          return;
        }

        const lastSlash = Math.max(
          value.lastIndexOf("/"),
          value.lastIndexOf("#"),
        );
        if (lastSlash <= 0) {
          return;
        }

        const namespace = value.substring(0, lastSlash + 1);
        if (!namespace.endsWith("/") && !namespace.endsWith("#")) {
          return;
        }

        const prefix = generatePrefix(namespace);
        if (prefix && !namespaces.has(prefix)) {
          namespaces.set(prefix, namespace);
        }
      },
    );
  });

  return namespaces;
};

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
