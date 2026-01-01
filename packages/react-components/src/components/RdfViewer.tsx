import { useEffect, useMemo, useRef, useState } from "react";
import { Literal, type Quad } from "n3";
import {
  Alert,
  Button,
  Card,
  CardBlock,
  Heading,
  Link,
  List,
  Paragraph,
  Table
} from "@digdir/designsystemet-react";
import "./rdf-viewer.css";
import {
  extractNamespacesFromQuads,
  parseRdf,
  shortenUri,
  type NamespaceMap,
  type RDFFormat
} from "@rdf-web-components/shared";

export interface RdfViewerProps {
  data: string;
  format?: RDFFormat;
  layout?: "table" | "turtle";
  showNamespaces?: boolean;
  expandUris?: boolean;
  preferredLanguages?: string[];
  theme?: "light" | "dark";
  showImagesInline?: boolean;
  vocabularies?: string[];
  enableNavigation?: boolean;
  enableContentNegotiation?: boolean;
  className?: string;
}

export function RdfViewer({
  data,
  format = "turtle",
  layout = "table",
  showNamespaces = false,
  expandUris = false,
  preferredLanguages,
  theme = "light",
  showImagesInline = true,
  vocabularies,
  enableNavigation = false,
  enableContentNegotiation = false,
  className
}: RdfViewerProps) {
  const [error, setError] = useState<Error | null>(null);
  const [vocabularyQuads, setVocabularyQuads] = useState<Quad[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [contentTypeCache, setContentTypeCache] = useState(
    new Map<string, ContentTypeHint>()
  );
  const contentRequests = useRef<Set<string>>(new Set());

  const quads = useMemo(() => {
    try {
      const parsed = parseRdf(data, format);
      setError(null);
      return parsed;
    } catch (err) {
      setError(err as Error);
      return [];
    }
  }, [data, format]);

  const namespaces = useMemo(() => extractNamespacesFromQuads(quads), [quads]);
  const normalizedPreferred = useMemo(
    () => preferredLanguages?.map(lang => lang.trim().toLowerCase()).filter(Boolean) ?? [],
    [preferredLanguages]
  );
  const normalizedVocabularies = useMemo(
    () => vocabularies?.map(vocab => vocab.trim()).filter(Boolean) ?? [],
    [vocabularies]
  );

  useEffect(() => {
    let active = true;

    async function loadVocabularies() {
      if (!normalizedVocabularies.length || typeof fetch !== "function") {
        setVocabularyQuads([]);
        return;
      }

      const loaded: Quad[] = [];
      for (const url of normalizedVocabularies) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            continue;
          }
          const contentType = response.headers.get("content-type") ?? "";
          const format = resolveRdfFormat(url, contentType);
          const text = await response.text();
          loaded.push(...parseRdf(text, format));
        } catch {
          // Ignore vocabulary load failures and fall back to local labels.
        }
      }

      if (active) {
        setVocabularyQuads(loaded);
      }
    }

    loadVocabularies();

    return () => {
      active = false;
    };
  }, [normalizedVocabularies.join("|")]);
  const groupedSubjects = useMemo(() => groupQuadsBySubject(quads), [quads]);
  const labelMap = useMemo(
    () => buildLabelMap([...vocabularyQuads, ...quads], normalizedPreferred),
    [vocabularyQuads, quads, normalizedPreferred]
  );
  const metaMap = useMemo(
    () => buildMetaMap([...vocabularyQuads, ...quads], normalizedPreferred),
    [vocabularyQuads, quads, normalizedPreferred]
  );
  const subjects = useMemo(() => Array.from(groupedSubjects.keys()), [groupedSubjects]);
  const selectedSubjectLabel = selectedSubject
    ? formatTerm(selectedSubject, namespaces, expandUris)
    : null;

  useEffect(() => {
    if (!enableContentNegotiation) {
      return;
    }
    const uris = collectUriCandidates(quads);
    for (const uri of uris) {
      if (contentRequests.current.has(uri) || contentTypeCache.has(uri)) {
        continue;
      }
      contentRequests.current.add(uri);
      void negotiateContentType(uri)
        .then(result => {
          if (!result) {
            return;
          }
          setContentTypeCache(prev => {
            const next = new Map(prev);
            next.set(uri, result);
            return next;
          });
        })
        .catch(() => {
          contentRequests.current.delete(uri);
        });
    }
  }, [enableContentNegotiation, quads, contentTypeCache]);

  if (error) {
    return (
      <div className={`rdf-viewer ${className ?? ""}`.trim()} data-theme={theme}>
        <Alert data-color="danger">
          <Heading level={3} data-size="sm">
            Failed to parse RDF data
          </Heading>
          <Paragraph data-size="sm">{error.message}</Paragraph>
        </Alert>
      </div>
    );
  }

  if (quads.length === 0) {
    return (
      <div className={`rdf-viewer ${className ?? ""}`.trim()} data-theme={theme}>
        <Alert>
          <Paragraph data-size="sm">No RDF data to display.</Paragraph>
        </Alert>
      </div>
    );
  }

  const viewerClass = ["rdf-viewer", className].filter(Boolean).join(" ");

  return (
    <div
      className={viewerClass}
      data-theme={theme}
      data-color-scheme={theme}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {showNamespaces && renderNamespaceList(namespaces)}
      {enableNavigation ? (
        <NavigationControls
          selectedSubject={selectedSubject}
          selectedLabel={selectedSubjectLabel}
          onShowAll={() => setSelectedSubject(null)}
        />
      ) : null}
      {layout === "turtle"
        ? renderTurtleLayout(quads, namespaces, expandUris)
        : renderTableLayout(groupedSubjects, namespaces, {
            expandUris,
            preferredLanguages: normalizedPreferred,
            showImagesInline,
            labelMap,
            enableNavigation,
            selectedSubject,
            onNavigate: setSelectedSubject,
            subjects,
            contentTypeCache,
            metaMap
          })}
    </div>
  );
}

function renderNamespaceList(namespaces: NamespaceMap) {
  if (namespaces.size === 0) {
    return null;
  }

  return (
    <Card>
      <CardBlock>
        <Heading level={3} data-size="sm">
          Namespaces
        </Heading>
        <List.Unordered
          className="namespace-list"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.5rem",
            listStyle: "none",
            padding: 0,
            margin: "0.75rem 0 0"
          }}
        >
          {Array.from(namespaces.entries() as IterableIterator<[string, string]>).map(
            ([prefix, namespace]) => (
              <List.Item key={prefix} className="namespace-item">
                <strong>{prefix}</strong>
                <div>
                  <code>&lt;{namespace}&gt;</code>
                </div>
              </List.Item>
            )
          )}
        </List.Unordered>
      </CardBlock>
    </Card>
  );
}

function renderTableLayout(
  subjects: Map<string, Map<string, Quad[]>>,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean;
    preferredLanguages: string[];
    showImagesInline: boolean;
    labelMap: Map<string, string>;
    enableNavigation: boolean;
    selectedSubject: string | null;
    onNavigate: (subject: string | null) => void;
    subjects: string[];
    contentTypeCache: Map<string, ContentTypeHint>;
    metaMap: Map<string, string>;
  }
) {
  const visibleSubjects = options.selectedSubject
    ? Array.from(subjects.entries()).filter(
        ([subject]) => subject === options.selectedSubject
      )
    : Array.from(subjects.entries());

  return visibleSubjects.map(([subject, predicates]) => (
    <Card key={subject}>
      <CardBlock>
        <Heading level={3} data-size="sm">
          {formatTerm(subject, namespaces, options.expandUris)}
        </Heading>
        <Table border zebra>
          <Table.Body>
            {Array.from(predicates.entries()).map(([predicate, predicateQuads]) => (
              <Table.Row key={`${subject}-${predicate}`}>
                <Table.HeaderCell>
                  {renderPredicateLabel(
                    predicate,
                    namespaces,
                    options.expandUris,
                    options.labelMap,
                    options.metaMap
                  )}
                </Table.HeaderCell>
                <Table.Cell>
                  {predicateQuads.map((quad, idx) => (
                    <div key={`${quad.subject.value}-${quad.predicate.value}-${idx}`}>
                      {renderObjectValue(quad, namespaces, options)}
                    </div>
                  ))}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </CardBlock>
    </Card>
  ));
}

function renderObjectValue(
  quad: Quad,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean;
    preferredLanguages: string[];
    showImagesInline: boolean;
    enableNavigation: boolean;
    onNavigate: (subject: string | null) => void;
    subjects: string[];
    contentTypeCache: Map<string, ContentTypeHint>;
  }
) {
  const object = quad.object;

  if (object.termType === "Literal") {
    return renderLiteralValue(object, namespaces, options);
  }

  if (object.termType === "NamedNode") {
    return renderUriValue(object.value, namespaces, options);
  }

  return <span className="term">{object.value}</span>;
}

function renderTurtleLayout(quads: Quad[], namespaces: NamespaceMap, expandUris: boolean) {
  const namespaceLines = Array.from(namespaces.entries() as IterableIterator<[string, string]>)
    .map(([prefix, ns]) => `@prefix ${prefix}: <${ns}> .`)
    .join("\n");

  const statements = quads.map(quad => {
    const subject = formatTerm(quad.subject.value, namespaces, expandUris);
    const predicate = formatTerm(quad.predicate.value, namespaces, expandUris);
    const object = quad.object.termType === "Literal"
      ? formatLiteralForTurtle(quad, namespaces, expandUris)
      : formatTerm(quad.object.value, namespaces, expandUris);
    return `${subject} ${predicate} ${object} .`;
  });

  return (
    <Card>
      <CardBlock>
        <Heading level={3} data-size="sm">
          Turtle
        </Heading>
        <pre
          className="turtle-view"
          style={{ margin: "0.75rem 0 0", whiteSpace: "pre-wrap" }}
        >
          {namespaceLines}
          {"\n\n"}
          {statements.join("\n")}
        </pre>
      </CardBlock>
    </Card>
  );
}

function formatLiteralForTurtle(quad: Quad, namespaces: NamespaceMap, expandUris: boolean) {
  let lang: string | undefined;
  let datatype: string | undefined;
  let literal: string = "";
  if (quad.object instanceof Literal) {
    lang = quad.object.language;
    datatype = quad.object.datatype?.value;
    literal = `"${quad.object.value}"`;      
  }

  if (lang) {
    literal += `@${lang}`;
  } else if (datatype && datatype !== "http://www.w3.org/2001/XMLSchema#string") {
    literal += `^^${formatTerm(datatype, namespaces, expandUris)}`;
  }

  return literal;
}

function groupQuadsBySubject(quads: Quad[]): Map<string, Map<string, Quad[]>> {
  const subjects = new Map<string, Map<string, Quad[]>>();

  quads.forEach(quad => {
    const subjectKey = quad.subject.value;
    if (!subjects.has(subjectKey)) {
      subjects.set(subjectKey, new Map());
    }

    const predicateMap = subjects.get(subjectKey)!;
    const predicateKey = quad.predicate.value;
    if (!predicateMap.has(predicateKey)) {
      predicateMap.set(predicateKey, []);
    }

    predicateMap.get(predicateKey)!.push(quad);
  });

  return subjects;
}

function formatTerm(value: string, namespaces: NamespaceMap, expandUris: boolean) {
  if (value.startsWith("_:")) {
    return value;
  }

  if (expandUris && (value.startsWith("http://") || value.startsWith("https://"))) {
    return `<${value}>`;
  }

  return shortenUri(value, namespaces);
}

function NavigationControls({
  selectedSubject,
  selectedLabel,
  onShowAll
}: {
  selectedSubject: string | null;
  selectedLabel: string | null;
  onShowAll: () => void;
}) {
  if (!selectedSubject) {
    return null;
  }

  return (
    <Card>
      <CardBlock
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem"
        }}
      >
        <Paragraph data-size="sm" style={{ margin: 0 }}>
          Viewing: <strong>{selectedLabel ?? selectedSubject}</strong>
        </Paragraph>
        <Button variant="tertiary" onClick={onShowAll}>
          Show all
        </Button>
      </CardBlock>
    </Card>
  );
}

type ContentTypeHint = {
  isImage: boolean;
  isRdf: boolean;
  isHtml: boolean;
  contentType?: string;
};

function collectUriCandidates(quads: Quad[]) {
  const uris = new Set<string>();
  for (const quad of quads) {
    if (quad.subject.termType === "NamedNode") {
      uris.add(quad.subject.value);
    }
    if (quad.predicate.termType === "NamedNode") {
      uris.add(quad.predicate.value);
    }
    if (quad.object.termType === "NamedNode") {
      uris.add(quad.object.value);
    }
  }
  return uris;
}

async function negotiateContentType(uri: string): Promise<ContentTypeHint | null> {
  try {
    const response = await fetch(uri, {
      method: "HEAD",
      headers: {
        Accept: "image/*, application/rdf+xml, text/turtle, application/n-triples, text/html, */*"
      }
    });
    const contentType = response.headers.get("content-type") ?? "";
    return {
      isImage: contentType.startsWith("image/"),
      isRdf:
        contentType.includes("application/rdf+xml") ||
        contentType.includes("text/turtle") ||
        contentType.includes("application/n-triples") ||
        contentType.includes("application/n-quads") ||
        contentType.includes("application/ld+json"),
      isHtml: contentType.includes("text/html"),
      contentType: contentType || undefined
    };
  } catch {
    return null;
  }
}

function renderLiteralValue(
  literal: Literal,
  namespaces: NamespaceMap,
  options: { expandUris: boolean; preferredLanguages: string[] }
) {
  const lang = literal.language?.toLowerCase();
  const datatype = literal.datatype?.value;
  const preferred = lang && options.preferredLanguages.includes(lang);
  const value = literal.value;
  const classification = classifyLiteral(value, datatype);

  if (classification.kind === "email") {
    return (
      <Link href={`mailto:${value}`} className="literal email">
        {value}
      </Link>
    );
  }

  return (
    <span className={`literal ${classification.kind}${preferred ? " preferred" : ""}`.trim()}>
      &ldquo;{value}&rdquo;
      {lang ? <span className="lang">@{lang}</span> : null}
      {!lang && datatype && datatype !== "http://www.w3.org/2001/XMLSchema#string" ? (
        <span className="datatype">^^{formatTerm(datatype, namespaces, options.expandUris)}</span>
      ) : null}
    </span>
  );
}

function classifyLiteral(value: string, datatype?: string) {
  const normalized = value.trim().toLowerCase();
  if (datatype === "http://www.w3.org/2001/XMLSchema#boolean") {
    return { kind: "boolean" };
  }
  if (datatype === "http://www.w3.org/2001/XMLSchema#date" ||
      datatype === "http://www.w3.org/2001/XMLSchema#dateTime") {
    return { kind: "date" };
  }
  if (!Number.isNaN(Number(value)) && value !== "") {
    return { kind: "numeric" };
  }
  if (normalized === "true" || normalized === "false") {
    return { kind: "boolean" };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { kind: "email" };
  }
  return { kind: "text" };
}

function renderUriValue(
  uri: string,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean;
    showImagesInline: boolean;
    enableNavigation: boolean;
    onNavigate: (subject: string | null) => void;
    subjects: string[];
    contentTypeCache: Map<string, ContentTypeHint>;
  }
) {
  const displayValue = formatTerm(uri, namespaces, options.expandUris);
  const contentHint = options.contentTypeCache.get(uri);
  const isImage =
    (contentHint?.isImage ?? false) ||
    (options.showImagesInline && /\.(png|jpe?g|gif|webp|svg)$/i.test(uri));
  const isNavigable = options.enableNavigation && options.subjects.includes(uri);

  if (uri.startsWith("mailto:")) {
    return (
      <Link href={uri} className="uri email">
        {uri.replace("mailto:", "")}
      </Link>
    );
  }

  if (uri.startsWith("tel:")) {
    return (
      <Link href={uri} className="uri phone">
        {uri.replace("tel:", "")}
      </Link>
    );
  }

  const hint = contentHint?.contentType
    ? ` (${contentHint.contentType})`
    : contentHint?.isRdf
    ? " (RDF)"
    : contentHint?.isHtml
    ? " (HTML)"
    : null;

  const label = (
    <>
      {displayValue}
      {hint ? <span className="content-type-hint">{hint}</span> : null}
    </>
  );

  const link = isNavigable ? (
    <Button
      variant="tertiary"
      className="uri-link"
      aria-label={`Navigate to ${displayValue}`}
      onClick={() => options.onNavigate(uri)}
    >
      {label}
    </Button>
  ) : (
    <Link href={uri} target="_blank" rel="noreferrer" className="uri-link">
      {label}
    </Link>
  );

  return (
    <span className="resource">
      {link}
      {isImage ? (
        <img
          src={uri}
          alt={displayValue}
          className="resource-image"
          style={{
            display: "block",
            marginTop: "0.5rem",
            borderRadius: "6px",
            maxWidth: "220px",
            maxHeight: "160px",
            objectFit: "cover"
          }}
        />
      ) : null}
    </span>
  );
}

const LABEL_PREDICATES = [
  "http://www.w3.org/2004/02/skos/core#prefLabel",
  "http://www.w3.org/2000/01/rdf-schema#label",
  "http://schema.org/name",
  "http://xmlns.com/foaf/0.1/name",
  "http://purl.org/dc/terms/title",
  "http://purl.org/dc/elements/1.1/title",
  "http://www.w3.org/2004/02/skos/core#altLabel"
];

function buildLabelMap(quads: Quad[], preferredLanguages: string[]) {
  const candidates = new Map<
    string,
    Map<string, { value: string; lang?: string }[]>
  >();

  quads.forEach(quad => {
    if (!LABEL_PREDICATES.includes(quad.predicate.value)) {
      return;
    }
    if (quad.subject.termType !== "NamedNode" || quad.object.termType !== "Literal") {
      return;
    }
    const subjectMap = candidates.get(quad.subject.value) ?? new Map();
    const predicateList = subjectMap.get(quad.predicate.value) ?? [];
    predicateList.push({
      value: quad.object.value,
      lang: quad.object.language?.toLowerCase() || undefined
    });
    subjectMap.set(quad.predicate.value, predicateList);
    candidates.set(quad.subject.value, subjectMap);
  });

  const labelMap = new Map<string, string>();
  for (const [subject, predicateMap] of candidates.entries()) {
    for (const predicate of LABEL_PREDICATES) {
      const list = predicateMap.get(predicate);
      if (!list || list.length === 0) {
        continue;
      }
      const selected = selectPreferredLabel(list, preferredLanguages);
      if (selected) {
        labelMap.set(subject, selected);
        break;
      }
    }
  }

  return labelMap;
}

function selectPreferredLabel(
  labels: { value: string; lang?: string }[],
  preferredLanguages: string[]
) {
  if (labels.length === 0) {
    return undefined;
  }

  for (const lang of preferredLanguages) {
    const match = labels.find(label => label.lang === lang);
    if (match) {
      return match.value;
    }
  }

  const noLang = labels.find(label => !label.lang);
  return noLang?.value ?? labels[0].value;
}

function formatPredicate(
  value: string,
  namespaces: NamespaceMap,
  expandUris: boolean,
  labelMap: Map<string, string>
) {
  const label = labelMap.get(value);
  if (label) {
    return label;
  }
  return formatTerm(value, namespaces, expandUris);
}

const META_PREDICATES = [
  "http://www.w3.org/2004/02/skos/core#notation",
  "http://www.w3.org/2004/02/skos/core#definition",
  "http://www.w3.org/2004/02/skos/core#note",
  "http://www.w3.org/2000/01/rdf-schema#comment",
  "http://purl.org/dc/terms/description",
  "http://purl.org/dc/elements/1.1/description"
];

function buildMetaMap(quads: Quad[], preferredLanguages: string[]) {
  const candidates = new Map<string, { value: string; lang?: string }[]>();

  quads.forEach(quad => {
    if (!META_PREDICATES.includes(quad.predicate.value)) {
      return;
    }
    if (quad.subject.termType !== "NamedNode" || quad.object.termType !== "Literal") {
      return;
    }
    const list = candidates.get(quad.subject.value) ?? [];
    list.push({
      value: quad.object.value,
      lang: quad.object.language?.toLowerCase() || undefined
    });
    candidates.set(quad.subject.value, list);
  });

  const metaMap = new Map<string, string>();
  for (const [subject, list] of candidates.entries()) {
    const selected = selectPreferredLabel(list, preferredLanguages);
    if (selected) {
      metaMap.set(subject, selected);
    }
  }

  return metaMap;
}

function renderPredicateLabel(
  value: string,
  namespaces: NamespaceMap,
  expandUris: boolean,
  labelMap: Map<string, string>,
  metaMap: Map<string, string>
) {
  const display = formatPredicate(value, namespaces, expandUris, labelMap);
  const meta = metaMap.get(value);
  const tooltip = meta ? `${value}\n${meta}` : value;
  return <span title={tooltip}>{display}</span>;
}

function resolveRdfFormat(url: string, contentType: string): RDFFormat {
  const lowerType = contentType.toLowerCase();
  const lowerUrl = url.toLowerCase();

  if (lowerType.includes("application/n-triples") || lowerUrl.endsWith(".nt")) {
    return "n-triples";
  }
  if (lowerType.includes("application/n-quads") || lowerUrl.endsWith(".nq")) {
    return "n-quads";
  }
  if (lowerType.includes("application/trig") || lowerUrl.endsWith(".trig")) {
    return "trig";
  }
  if (
    lowerType.includes("application/ld+json") ||
    lowerType.includes("application/json") ||
    lowerUrl.endsWith(".jsonld") ||
    lowerUrl.endsWith(".json")
  ) {
    return "json-ld";
  }

  return "turtle";
}
