import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
  Table,
} from "@digdir/designsystemet-react";
import "./rdf-details-view.css";
import {
  extractNamespacesFromQuads,
  parseRdf,
  shortenUri,
  type NamespaceMap,
  type RDFFormat,
} from "@rdf-web-components/shared";

export type LiteralRenderer = (args: {
  quad: Quad;
  literal: Literal;
  namespaces: NamespaceMap;
  options: {
    expandUris: boolean;
    preferredLanguages: string[];
    showDatatypes: boolean;
    showLanguageTags: boolean;
  };
}) => ReactNode;

export type PredicateRenderer = (args: {
  quad: Quad;
  predicate: string;
  namespaces: NamespaceMap;
  options: {
    expandUris: boolean;
    preferredLanguages: string[];
    showDatatypes: boolean;
    showLanguageTags: boolean;
    showImagesInline: boolean;
    enableNavigation: boolean;
    onNavigate: (subject: string | null) => void;
    subjects: string[];
    contentTypeCache: Map<string, ContentTypeHint>;
  };
  defaultRender: () => ReactNode;
}) => ReactNode;

export interface RdfDetailsViewProps {
  data: string;
  format?: RDFFormat;
  layout?: "table";
  showNamespaces?: boolean;
  expandUris?: boolean;
  preferredLanguages?: string[];
  showDatatypes?: boolean;
  showLanguageTags?: boolean;
  theme?: "light" | "dark";
  showImagesInline?: boolean;
  showImageUrls?: boolean;
  imagePredicates?: string[];
  predicateOrder?: string[];
  vocabularies?: string[];
  enableNavigation?: boolean;
  enableContentNegotiation?: boolean;
  literalRenderers?: Record<string, LiteralRenderer>;
  predicateRenderers?: Record<string, PredicateRenderer>;
  className?: string;
}

const DEFAULT_IMAGE_PREDICATES = [
  "http://schema.org/image",
  "http://schema.org/thumbnailUrl",
  "http://schema.org/contentUrl",
  "http://schema.org/logo",
  "http://schema.org/photo",
  "http://xmlns.com/foaf/0.1/depiction",
  "http://xmlns.com/foaf/0.1/img",
  "http://xmlns.com/foaf/0.1/thumbnail",
];

export function RdfDetailsView({
  data,
  format = "turtle",
  layout = "table",
  showNamespaces = false,
  expandUris = false,
  preferredLanguages,
  showDatatypes = false,
  showLanguageTags = true,
  theme,
  showImagesInline = true,
  showImageUrls = false,
  imagePredicates,
  predicateOrder,
  vocabularies,
  enableNavigation = true,
  enableContentNegotiation = false,
  literalRenderers,
  predicateRenderers,
  className,
}: RdfDetailsViewProps) {
  const [error, setError] = useState<Error | null>(null);
  const [vocabularyQuads, setVocabularyQuads] = useState<Quad[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [contentTypeCache, setContentTypeCache] = useState(
    new Map<string, ContentTypeHint>(),
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
    () =>
      preferredLanguages
        ?.map((lang) => lang.trim().toLowerCase())
        .filter(Boolean) ?? [],
    [preferredLanguages],
  );
  const normalizedVocabularies = useMemo(
    () => vocabularies?.map((vocab) => vocab.trim()).filter(Boolean) ?? [],
    [vocabularies],
  );
  const imagePredicateSet = useMemo(() => {
    const values =
      imagePredicates?.map((predicate) => predicate.trim()).filter(Boolean) ??
      DEFAULT_IMAGE_PREDICATES;
    return new Set(values);
  }, [imagePredicates]);
  const normalizedPredicateOrder = useMemo(
    () => predicateOrder?.map((predicate) => predicate.trim()).filter(Boolean) ?? [],
    [predicateOrder],
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
    [vocabularyQuads, quads, normalizedPreferred],
  );
  const metaMap = useMemo(
    () => buildMetaMap([...vocabularyQuads, ...quads], normalizedPreferred),
    [vocabularyQuads, quads, normalizedPreferred],
  );
  const subjects = useMemo(
    () => Array.from(groupedSubjects.keys()),
    [groupedSubjects],
  );
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
        .then((result) => {
          if (!result) {
            return;
          }
          setContentTypeCache((prev) => {
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
      <div
        className={`rdf-details-view ${className ?? ""}`.trim()}
        data-theme={theme}
        data-color-scheme={theme}
      >
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
      <div
        className={`rdf-details-view ${className ?? ""}`.trim()}
        data-theme={theme}
        data-color-scheme={theme}
      >
        <Alert>
          <Paragraph data-size="sm">No RDF data to display.</Paragraph>
        </Alert>
      </div>
    );
  }

  const viewerClass = ["rdf-details-view", className].filter(Boolean).join(" ");

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
      {renderTableLayout(groupedSubjects, namespaces, {
        expandUris,
        preferredLanguages: normalizedPreferred,
        showDatatypes,
        showLanguageTags,
        showImagesInline,
        showImageUrls,
        imagePredicateSet,
        predicateOrder: normalizedPredicateOrder,
        labelMap,
        enableNavigation,
        selectedSubject,
        onNavigate: setSelectedSubject,
        subjects,
        contentTypeCache,
        metaMap,
        literalRenderers,
        predicateRenderers,
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
        >
          {Array.from(
            namespaces.entries() as IterableIterator<[string, string]>,
          ).map(([prefix, namespace]) => (
            <List.Item key={prefix} className="namespace-item">
              <span className="namespace-prefix">{prefix}</span>
              <span className="namespace-separator" aria-hidden="true">
                {" "}
                →{" "}
              </span>
              <code>&lt;{namespace}&gt;</code>
            </List.Item>
          ))}
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
    showImageUrls: boolean;
    labelMap: Map<string, string>;
    enableNavigation: boolean;
    selectedSubject: string | null;
    onNavigate: (subject: string | null) => void;
    subjects: string[];
    contentTypeCache: Map<string, ContentTypeHint>;
    metaMap: Map<string, string>;
    showDatatypes: boolean;
    showLanguageTags: boolean;
    literalRenderers?: Record<string, LiteralRenderer>;
    predicateRenderers?: Record<string, PredicateRenderer>;
    imagePredicateSet: Set<string>;
    predicateOrder: string[];
  },
) {
  const visibleSubjects = options.selectedSubject
    ? Array.from(subjects.entries()).filter(
        ([subject]) => subject === options.selectedSubject,
      )
    : Array.from(subjects.entries());
  const predicateColumnWidth = computePredicateColumnWidth(
    visibleSubjects,
    namespaces,
    options,
  );
  const tableStyle = {
    "--rdf-details-view-predicate-width": predicateColumnWidth,
  } as CSSProperties;
  const predicateOrderMap = new Map(
    options.predicateOrder.map((predicate, index) => [predicate, index]),
  );

  return visibleSubjects.map(([subject, predicates]) => (
    <Card key={subject}>
      <CardBlock>
        <Heading level={3} data-size="sm">
          {formatTerm(subject, namespaces, options.expandUris)}
        </Heading>
        <Table border zebra className="properties-table" style={tableStyle}>
          <Table.Body>
            {Array.from(predicates.entries())
              .map(([predicate, predicateQuads], originalIndex) => ({
                predicate,
                predicateQuads,
                originalIndex,
                orderIndex: predicateOrderMap.get(predicate),
              }))
              .sort((a, b) => {
                const aExplicit = a.orderIndex != null;
                const bExplicit = b.orderIndex != null;
                if (aExplicit && bExplicit) {
                  return a.orderIndex! - b.orderIndex!;
                }
                if (aExplicit) {
                  return -1;
                }
                if (bExplicit) {
                  return 1;
                }
                return a.originalIndex - b.originalIndex;
              })
              .map(({ predicate, predicateQuads }) => (
                <Table.Row key={`${subject}-${predicate}`}>
                  <Table.HeaderCell className="predicate-cell">
                    {renderPredicateLabel(
                      predicate,
                      namespaces,
                      options.expandUris,
                      options.labelMap,
                      options.metaMap,
                    )}
                  </Table.HeaderCell>
                  <Table.Cell>
                    {renderPredicateObjects(predicateQuads, namespaces, options)}
                  </Table.Cell>
                </Table.Row>
              ))}
          </Table.Body>
        </Table>
      </CardBlock>
    </Card>
  ));
}

function computePredicateColumnWidth(
  subjects: [string, Map<string, Quad[]>][],
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean;
    labelMap: Map<string, string>;
  },
) {
  let maxLength = 0;
  for (const [, predicates] of subjects) {
    for (const predicate of predicates.keys()) {
      const display = formatPredicate(
        predicate,
        namespaces,
        options.expandUris,
        options.labelMap,
      );
      maxLength = Math.max(maxLength, display.length);
    }
  }

  const minWidth = 14;
  const maxWidth = 28;
  const clamped = Math.min(Math.max(maxLength, minWidth), maxWidth);
  return `${clamped}ch`;
}

function renderPredicateObjects(
  predicateQuads: Quad[],
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean;
    preferredLanguages: string[];
    showDatatypes: boolean;
    showLanguageTags: boolean;
    showImagesInline: boolean;
    showImageUrls: boolean;
    enableNavigation: boolean;
    onNavigate: (subject: string | null) => void;
    subjects: string[];
    contentTypeCache: Map<string, ContentTypeHint>;
    literalRenderers?: Record<string, LiteralRenderer>;
    predicateRenderers?: Record<string, PredicateRenderer>;
    imagePredicateSet: Set<string>;
  },
) {
  const imageQuads = predicateQuads.filter((quad) =>
    isImageQuad(quad, options),
  );
  const otherQuads = predicateQuads.filter((quad) => !isImageQuad(quad, options));

  const content: ReactNode[] = [];

  if (options.showImagesInline && imageQuads.length > 1) {
    const imageUris = imageQuads
      .map((quad) =>
        quad.object.termType === "NamedNode" ? quad.object.value : null,
      )
      .filter((uri): uri is string => Boolean(uri));

    if (imageUris.length) {
      content.push(
        <ImageCarousel
          key={`carousel-${imageUris.join("|")}`}
          images={imageUris}
          renderLink={(uri) =>
            renderUriLink(uri, namespaces, {
              expandUris: options.expandUris,
              enableNavigation: options.enableNavigation,
              onNavigate: options.onNavigate,
              subjects: options.subjects,
              contentTypeCache: options.contentTypeCache,
            })
          }
          showImageUrls={options.showImageUrls}
        />,
      );
    }
  } else {
    imageQuads.forEach((quad, idx) => {
      content.push(
        <div key={`${quad.subject.value}-${quad.predicate.value}-img-${idx}`}>
          {renderObjectValue(quad, namespaces, options)}
        </div>,
      );
    });
  }

  otherQuads.forEach((quad, idx) => {
    content.push(
      <div key={`${quad.subject.value}-${quad.predicate.value}-other-${idx}`}>
        {renderObjectValue(quad, namespaces, options)}
      </div>,
    );
  });

  return content.length ? content : null;
}

function isImageQuad(
  quad: Quad,
  options: {
    showImagesInline: boolean;
    imagePredicateSet: Set<string>;
    contentTypeCache: Map<string, ContentTypeHint>;
  },
) {
  if (!options.showImagesInline) {
    return false;
  }
  if (quad.object.termType !== "NamedNode") {
    return false;
  }
  const uri = quad.object.value;
  const predicateMatch = options.imagePredicateSet.has(quad.predicate.value);
  const contentHint = options.contentTypeCache.get(uri);
  const extensionMatch = /\.(png|jpe?g|gif|webp|svg)$/i.test(uri);
  return predicateMatch || (contentHint?.isImage ?? false) || extensionMatch;
}

function renderObjectValue(
  quad: Quad,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean;
    preferredLanguages: string[];
    showDatatypes: boolean;
    showLanguageTags: boolean;
    showImagesInline: boolean;
    enableNavigation: boolean;
    onNavigate: (subject: string | null) => void;
    subjects: string[];
    contentTypeCache: Map<string, ContentTypeHint>;
    literalRenderers?: Record<string, LiteralRenderer>;
    predicateRenderers?: Record<string, PredicateRenderer>;
    imagePredicateSet: Set<string>;
    showImageUrls: boolean;
  },
) {
  const defaultRender = () => {
    const object = quad.object;

    if (object.termType === "Literal") {
      return renderLiteralValue(object, namespaces, options, quad);
    }

    if (object.termType === "NamedNode") {
      return renderUriValue(object.value, namespaces, options);
    }

    return <span className="term">{object.value}</span>;
  };

  const predicateRenderer = options.predicateRenderers?.[quad.predicate.value];
  if (predicateRenderer) {
    return predicateRenderer({
      quad,
      predicate: quad.predicate.value,
      namespaces,
      options,
      defaultRender,
    });
  }

  return defaultRender();
}


function groupQuadsBySubject(quads: Quad[]): Map<string, Map<string, Quad[]>> {
  const subjects = new Map<string, Map<string, Quad[]>>();

  quads.forEach((quad) => {
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

function formatTerm(
  value: string,
  namespaces: NamespaceMap,
  expandUris: boolean,
) {
  if (value.startsWith("_:")) {
    return value;
  }

  if (
    expandUris &&
    (value.startsWith("http://") || value.startsWith("https://"))
  ) {
    return `<${value}>`;
  }

  return shortenUri(value, namespaces);
}

function NavigationControls({
  selectedSubject,
  selectedLabel,
  onShowAll,
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
          gap: "1rem",
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

async function negotiateContentType(
  uri: string,
): Promise<ContentTypeHint | null> {
  try {
    const response = await fetch(uri, {
      method: "HEAD",
      headers: {
        Accept:
          "image/*, application/rdf+xml, text/turtle, application/n-triples, text/html, */*",
      },
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
      contentType: contentType || undefined,
    };
  } catch {
    return null;
  }
}

function renderLiteralValue(
  literal: Literal,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean;
    preferredLanguages: string[];
    showDatatypes: boolean;
    showLanguageTags: boolean;
    literalRenderers?: Record<string, LiteralRenderer>;
  },
  quad: Quad,
) {
  const datatypeKey =
    literal.datatype?.value ?? "http://www.w3.org/2001/XMLSchema#string";
  const customRenderer = options.literalRenderers?.[datatypeKey];
  if (customRenderer) {
    return customRenderer({
      quad,
      literal,
      namespaces,
      options,
    });
  }

  const lang = literal.language?.toLowerCase();
  const datatype = literal.datatype?.value;
  const preferred = lang && options.preferredLanguages.includes(lang);
  const value = literal.value;
  const classification = classifyLiteral(value, datatype);
  const isPlainString =
    !datatype || datatype === "http://www.w3.org/2001/XMLSchema#string";

  if (classification.kind === "email") {
    return (
      <Link href={`mailto:${value}`} className="literal email">
        {value}
      </Link>
    );
  }

  if (isPlainString) {
    return (
      <span className={`literal text${preferred ? " preferred" : ""}`.trim()}>
        <em>{value}</em>
        {options.showLanguageTags && lang ? (
          <span className="lang-tag" aria-label={`Language ${lang}`}>
            {lang.toUpperCase()}
          </span>
        ) : null}
        {options.showDatatypes && datatype ? (
          <span className="datatype">
            ^^{formatTerm(datatype, namespaces, options.expandUris)}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={`literal ${classification.kind}${preferred ? " preferred" : ""}`.trim()}
    >
      <span className="literal-value">{value}</span>
      {options.showLanguageTags && lang ? (
        <span className="lang-tag" aria-label={`Language ${lang}`}>
          {lang.toUpperCase()}
        </span>
      ) : null}
      {options.showDatatypes && datatype ? (
        <span className="datatype">
          ^^{formatTerm(datatype, namespaces, options.expandUris)}
        </span>
      ) : null}
    </span>
  );
}

function classifyLiteral(value: string, datatype?: string) {
  const normalized = value.trim().toLowerCase();
  if (datatype === "http://www.w3.org/2001/XMLSchema#boolean") {
    return { kind: "boolean" };
  }
  if (
    datatype === "http://www.w3.org/2001/XMLSchema#date" ||
    datatype === "http://www.w3.org/2001/XMLSchema#dateTime"
  ) {
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

function renderUriLink(
  uri: string,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean;
    enableNavigation: boolean;
    onNavigate: (subject: string | null) => void;
    subjects: string[];
    contentTypeCache: Map<string, ContentTypeHint>;
  },
) {
  const displayValue = formatTerm(uri, namespaces, options.expandUris);
  const contentHint = options.contentTypeCache.get(uri);
  const isNavigable =
    options.enableNavigation && options.subjects.includes(uri);

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
      {isNavigable ? (
        <span className="navigation-indicator" aria-hidden="true">
          {" "}
          »
        </span>
      ) : null}
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

  return link;
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
  },
) {
  const contentHint = options.contentTypeCache.get(uri);
  const isImage =
    (contentHint?.isImage ?? false) ||
    (options.showImagesInline && /\.(png|jpe?g|gif|webp|svg)$/i.test(uri));
  const link = renderUriLink(uri, namespaces, options);
  const displayValue = formatTerm(uri, namespaces, options.expandUris);

  return (
    <span className="resource">
      {isImage ? (
        <>
          <Link href={uri} target="_blank" rel="noreferrer">
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
                objectFit: "cover",
              }}
            />
          </Link>
          {options.showImageUrls ? (
            <div className="image-carousel-link">{link}</div>
          ) : null}
        </>
      ) : (
        link
      )}
    </span>
  );
}

function ImageCarousel({
  images,
  renderLink,
  showImageUrls,
}: {
  images: string[];
  renderLink: (uri: string) => ReactNode;
  showImageUrls: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = images.length;
  const currentIndex = total ? activeIndex % total : 0;
  const current = images[currentIndex] ?? images[0];

  if (!current) {
    return null;
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  return (
    <div className="image-carousel">
      <a href={current} target="_blank" rel="noreferrer">
        <img
          src={current}
          alt=""
          className="resource-image image-carousel-image"
        />
      </a>
      <div className="image-carousel-controls">
        <Button
          variant="tertiary"
          onClick={goPrev}
          disabled={total <= 1}
          aria-label="Previous image"
        >
          Prev
        </Button>
        <span className="image-carousel-count">
          {currentIndex + 1} / {total}
        </span>
        <Button
          variant="tertiary"
          onClick={goNext}
          disabled={total <= 1}
          aria-label="Next image"
        >
          Next
        </Button>
        {showImageUrls ? (
          <div className="image-carousel-link">{renderLink(current)}</div>
        ) : null}
      </div>
    </div>
  );
}

const LABEL_PREDICATES = [
  "http://www.w3.org/2004/02/skos/core#prefLabel",
  "http://www.w3.org/2000/01/rdf-schema#label",
  "http://schema.org/name",
  "http://xmlns.com/foaf/0.1/name",
  "http://purl.org/dc/terms/title",
  "http://purl.org/dc/elements/1.1/title",
  "http://www.w3.org/2004/02/skos/core#altLabel",
];

function buildLabelMap(quads: Quad[], preferredLanguages: string[]) {
  const candidates = new Map<
    string,
    Map<string, { value: string; lang?: string }[]>
  >();

  quads.forEach((quad) => {
    if (!LABEL_PREDICATES.includes(quad.predicate.value)) {
      return;
    }
    if (
      quad.subject.termType !== "NamedNode" ||
      quad.object.termType !== "Literal"
    ) {
      return;
    }
    const subjectMap = candidates.get(quad.subject.value) ?? new Map();
    const predicateList = subjectMap.get(quad.predicate.value) ?? [];
    predicateList.push({
      value: quad.object.value,
      lang: quad.object.language?.toLowerCase() || undefined,
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
  preferredLanguages: string[],
) {
  if (labels.length === 0) {
    return undefined;
  }

  for (const lang of preferredLanguages) {
    const match = labels.find((label) => label.lang === lang);
    if (match) {
      return match.value;
    }
  }

  const noLang = labels.find((label) => !label.lang);
  const first = labels[0];
  if (!first) {
    return undefined;
  }
  return noLang?.value ?? first.value;
}

function formatPredicate(
  value: string,
  namespaces: NamespaceMap,
  expandUris: boolean,
  labelMap: Map<string, string>,
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
  "http://purl.org/dc/elements/1.1/description",
];

function buildMetaMap(quads: Quad[], preferredLanguages: string[]) {
  const candidates = new Map<string, { value: string; lang?: string }[]>();

  quads.forEach((quad) => {
    if (!META_PREDICATES.includes(quad.predicate.value)) {
      return;
    }
    if (
      quad.subject.termType !== "NamedNode" ||
      quad.object.termType !== "Literal"
    ) {
      return;
    }
    const list = candidates.get(quad.subject.value) ?? [];
    list.push({
      value: quad.object.value,
      lang: quad.object.language?.toLowerCase() || undefined,
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
  metaMap: Map<string, string>,
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
