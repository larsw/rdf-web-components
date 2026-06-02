import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type JSX,
  type ReactNode,
} from 'react'
import { Literal, type Quad } from 'n3'
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
} from '@digdir/designsystemet-react'
import './rdf-details-view.css'
import {
  extractNamespacesFromQuads,
  parseRdf,
  shortenUri,
  type NamespaceMap,
  type RDFFormat,
} from '@sral/rdf-components-shared'

export interface LiteralRendererOptions {
  namespaces: NamespaceMap
  expandUris: boolean
  preferredLanguages: string[]
  showDatatypes: boolean
  showLanguageTags: boolean
}

/** Custom literal renderer keyed by datatype IRI. */
export type LiteralRenderer = (
  literal: Literal,
  quad: Quad,
  opts: LiteralRendererOptions,
) => JSX.Element

export interface PredicateRendererOptions {
  namespaces: NamespaceMap
  expandUris: boolean
  preferredLanguages: string[]
  showDatatypes: boolean
  showLanguageTags: boolean
  showImagesInline: boolean
  enableNavigation: boolean
  onNavigate: (subject: string | null) => void
  subjects: string[]
  contentTypeCache: Map<string, ContentTypeHint>
  defaultRender: () => JSX.Element
}

/** Custom predicate renderer keyed by predicate IRI. */
export type PredicateRenderer = (
  quad: Quad,
  opts: PredicateRendererOptions,
) => JSX.Element

/** Props for the RdfDetailsView component. */
export interface RdfDetailsViewProps {
  /**
   * RDF data as a string.
   */
  data: string
  /**
   * Format of the RDF data. The default is "turtle".
   */
  format?: RDFFormat
  /**
   * Whether to show the list of namespaces used in the data.
   */
  showNamespaces?: boolean
  /**
   * Whether to expand URIs instead of shortening them.
   */
  expandUris?: boolean
  /**
   * Preferred languages for literals (in order of preference).
   */
  preferredLanguages?: string[]
  /**
   * Whether to show datatypes for literals.
   */
  showDatatypes?: boolean
  /**
   * Whether to show language tags for literals.
   */
  showLanguageTags?: boolean
  /**
   * Theme for the component (light or dark).
   */
  theme?: 'light' | 'dark'
  /**
   * Whether to show images inline for image URIs.
   */
  showImagesInline?: boolean
  /**
   * Whether to show image URLs below images.
   */
  showImageUrls?: boolean
  /**
   * Custom predicates to treat as image predicates.
   * Defaults to common image predicates if not provided.
   */
  imagePredicates?: string[]
  /**
   * Order of predicates to display (by IRI).
   * Predicates not listed will be shown after the ordered ones.
   * The default is to show predicates in the order they appear in the data.
   */
  predicateOrder?: string[]
  /**
   * Vocabularies (URLs) to fetch and include in the rendering.
   * The default is none.
   */
  vocabularies?: string[]
  /**
   * Whether to enable navigation between subjects.
   * The default is true.
   */
  enableNavigation?: boolean
  /**
   * Whether to enable content negotiation for URIs.
   * The default is false.
   */
  enableContentNegotiation?: boolean
  /**
   * Whether to annotate the rendered markup with RDFa attributes
   * (`about`, `property`, `rel`, `resource`, `content`, `datatype`, `lang`)
   * so the view is machine-readable as RDFa. Named graphs are flattened to
   * triples. The default is false.
   */
  emitRdfa?: boolean
  /**
   * Custom literal renderers keyed by datatype IRI.
   */
  literalRenderers?: Record<string, LiteralRenderer>
  /**
   * Custom predicate renderers keyed by predicate IRI.
   */
  predicateRenderers?: Record<string, PredicateRenderer>
  /**
   * Optional additional CSS class name for the component.
   */
  className?: string
}

type TableRenderOptions = {
  expandUris: boolean
  preferredLanguages: string[]
  showImagesInline: boolean
  showImageUrls: boolean
  labelMap: Map<string, string>
  enableNavigation: boolean
  selectedSubject: string | null
  onNavigate: (subject: string | null) => void
  subjects: string[]
  contentTypeCache: Map<string, ContentTypeHint>
  metaMap: Map<string, string>
  showDatatypes: boolean
  showLanguageTags: boolean
  literalRenderers?: Record<string, LiteralRenderer>
  predicateRenderers?: Record<string, PredicateRenderer>
  imagePredicateSet: Set<string>
  predicateOrder: string[]
  emitRdfa: boolean
}

type GraphGrouping = {
  graphKey: string
  graphTerm: Quad['graph']
  subjects: Map<string, Map<string, Quad[]>>
}

/**
 * Default image predicates to recognize when rendering images.
 */
const DEFAULT_IMAGE_PREDICATES = [
  'http://schema.org/image',
  'http://schema.org/thumbnailUrl',
  'http://schema.org/contentUrl',
  'http://schema.org/logo',
  'http://schema.org/photo',
  'http://xmlns.com/foaf/0.1/depiction',
  'http://xmlns.com/foaf/0.1/img',
  'http://xmlns.com/foaf/0.1/thumbnail',
]

/**
 * Render RDF data in a structured details view.
 */
export const RdfDetailsView = ({
  data,
  format = 'turtle',
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
  emitRdfa = false,
  literalRenderers,
  predicateRenderers,
  className,
}: RdfDetailsViewProps) => {
  const [error, setError] = useState<Error | null>(null)
  const [vocabularyQuads, setVocabularyQuads] = useState<Quad[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [contentTypeCache, setContentTypeCache] = useState(
    new Map<string, ContentTypeHint>(),
  )
  const contentRequests = useRef<Set<string>>(new Set())

  const quads = useMemo(() => {
    try {
      const parsed = parseRdf(data, format)
      setError(null)
      return parsed
    } catch (err) {
      setError(err as Error)
      return []
    }
  }, [data, format])

  const namespaces = useMemo(() => extractNamespacesFromQuads(quads), [quads])
  const normalizedPreferred = useMemo(
    () =>
      preferredLanguages
        ?.map((lang) => lang.trim().toLowerCase())
        .filter(Boolean) ?? [],
    [preferredLanguages],
  )
  const normalizedVocabularies = useMemo(
    () => vocabularies?.map((vocab) => vocab.trim()).filter(Boolean) ?? [],
    [vocabularies],
  )
  const imagePredicateSet = useMemo(() => {
    const values =
      imagePredicates?.map((predicate) => predicate.trim()).filter(Boolean) ??
      DEFAULT_IMAGE_PREDICATES
    return new Set(values)
  }, [imagePredicates])
  const normalizedPredicateOrder = useMemo(
    () =>
      predicateOrder?.map((predicate) => predicate.trim()).filter(Boolean) ??
      [],
    [predicateOrder],
  )

  useEffect(() => {
    let cancelled = false

    const loadVocabularies = async () => {
      if (!normalizedVocabularies.length || typeof fetch !== 'function') {
        setVocabularyQuads([])
        return
      }

      const loaded = await Promise.all(
        normalizedVocabularies.map(async (url) => {
          try {
            const response = await fetch(url)
            if (!response.ok) {
              return [] as Quad[]
            }
            const contentType = response.headers.get('content-type') ?? ''
            const format = resolveRdfFormat(url, contentType)
            const text = await response.text()
            return parseRdf(text, format)
          } catch {
            return [] as Quad[]
          }
        }),
      )

      if (!cancelled) {
        setVocabularyQuads(loaded.flat())
      }
    }

    loadVocabularies()

    return () => {
      cancelled = true
    }
  }, [normalizedVocabularies.join('|')])
  const groupedGraphs = useMemo(() => groupQuadsByGraph(quads), [quads])
  const labelMap = useMemo(
    () => buildLabelMap([...vocabularyQuads, ...quads], normalizedPreferred),
    [vocabularyQuads, quads, normalizedPreferred],
  )
  const metaMap = useMemo(
    () => buildMetaMap([...vocabularyQuads, ...quads], normalizedPreferred),
    [vocabularyQuads, quads, normalizedPreferred],
  )
  const subjects = useMemo(
    () => collectSubjects(groupedGraphs),
    [groupedGraphs],
  )
  const selectedSubjectLabel = selectedSubject
    ? formatTerm(selectedSubject, namespaces, expandUris)
    : null

  useEffect(() => {
    if (!enableContentNegotiation) {
      return
    }
    const uris = collectUriCandidates(quads)
    for (const uri of uris) {
      if (contentRequests.current.has(uri) || contentTypeCache.has(uri)) {
        continue
      }
      contentRequests.current.add(uri)
      void negotiateContentType(uri)
        .then((result) => {
          if (!result) {
            return
          }
          setContentTypeCache((prev) => {
            const next = new Map(prev)
            next.set(uri, result)
            return next
          })
        })
        .catch(() => {
          contentRequests.current.delete(uri)
        })
    }
  }, [enableContentNegotiation, quads, contentTypeCache])

  if (error) {
    return (
      <div
        className={`rdf-details-view ${className ?? ''}`.trim()}
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
    )
  }

  if (quads.length === 0) {
    return (
      <div
        className={`rdf-details-view ${className ?? ''}`.trim()}
        data-theme={theme}
        data-color-scheme={theme}
      >
        <Alert>
          <Paragraph data-size="sm">No RDF data to display.</Paragraph>
        </Alert>
      </div>
    )
  }

  const viewerClass = ['rdf-details-view', className].filter(Boolean).join(' ')
  const showGraphInfo =
    isQuadBasedFormat(format) ||
    quads.some((quad) => quad.graph.termType !== 'DefaultGraph')

  return (
    <div
      className={viewerClass}
      data-theme={theme}
      data-color-scheme={theme}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {showNamespaces && renderNamespaceList(namespaces)}
      {enableNavigation ? (
        <NavigationControls
          selectedSubject={selectedSubject}
          selectedLabel={selectedSubjectLabel}
          onShowAll={() => setSelectedSubject(null)}
        />
      ) : null}
      {renderGraphSections(groupedGraphs, namespaces, {
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
        emitRdfa,
        showGraphInfo,
      })}
    </div>
  )
}

const renderNamespaceList = (namespaces: NamespaceMap) => {
  if (namespaces.size === 0) {
    return null
  }

  return (
    <Card>
      <CardBlock>
        <Heading level={3} data-size="sm">
          Namespaces
        </Heading>
        <List.Unordered className="namespace-list">
          {Array.from(
            namespaces.entries() as IterableIterator<[string, string]>,
          ).map(([prefix, namespace]) => (
            <List.Item key={prefix} className="namespace-item">
              <span className="namespace-prefix">{prefix}</span>
              <span className="namespace-separator" aria-hidden="true">
                {' '}
                →{' '}
              </span>
              <code>&lt;{namespace}&gt;</code>
            </List.Item>
          ))}
        </List.Unordered>
      </CardBlock>
    </Card>
  )
}

const renderGraphSections = (
  graphs: GraphGrouping[],
  namespaces: NamespaceMap,
  options: TableRenderOptions & { showGraphInfo: boolean },
) => {
  return graphs
    .map(({ graphKey, graphTerm, subjects }) => {
      const filteredSubjects = options.selectedSubject
        ? new Map(
            Array.from(subjects.entries()).filter(
              ([subject]) => subject === options.selectedSubject,
            ),
          )
        : subjects

      if (filteredSubjects.size === 0) {
        return null
      }

      const { showGraphInfo, ...tableOptions } = options
      const graphLabel = formatGraphLabel(
        graphTerm,
        namespaces,
        tableOptions.expandUris,
      )

      return (
        <div
          key={`graph-${graphKey}`}
          className="graph-section"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          {showGraphInfo ? (
            <Paragraph
              data-size="sm"
              className="graph-label"
              aria-label={`Graph: ${graphLabel}`}
              style={{ margin: 0 }}
            >
              Graph: <strong>{graphLabel}</strong>
            </Paragraph>
          ) : null}
          {renderTableLayout(filteredSubjects, namespaces, tableOptions)}
        </div>
      )
    })
    .filter(Boolean)
}

const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string'
const RDF_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString'

type RdfaObjectAttributes = {
  property?: string
  rel?: string
  resource?: string
  content?: string
  datatype?: string
  lang?: string
}

/**
 * Represent a term as an RDFa `resource` value (IRI for named nodes,
 * `_:label` for blank nodes). Returns null for terms with no resource form.
 */
const toRdfaResource = (
  term: Quad['subject'] | Quad['object'],
): string | null => {
  if (term.termType === 'NamedNode') {
    return term.value
  }
  if (term.termType === 'BlankNode') {
    return term.value.startsWith('_:') ? term.value : `_:${term.value}`
  }
  return null
}

/**
 * Build the RDFa attributes describing a single object quad. Literals use
 * `property` + `content` (plus `datatype`/`lang`); resources use `rel` +
 * `resource` so the inner visual markup never affects the emitted triple.
 */
const buildObjectRdfaAttributes = (quad: Quad): RdfaObjectAttributes => {
  const predicate = quad.predicate.value
  const object = quad.object

  if (object.termType === 'Literal') {
    const attributes: RdfaObjectAttributes = {
      property: predicate,
      content: object.value,
    }
    const language = object.language
    const datatype = object.datatype?.value
    if (language) {
      attributes.lang = language
    } else if (
      datatype &&
      datatype !== XSD_STRING &&
      datatype !== RDF_LANG_STRING
    ) {
      attributes.datatype = datatype
    }
    return attributes
  }

  const resource = toRdfaResource(object)
  return resource ? { rel: predicate, resource } : { property: predicate }
}

/** RDFa subject attributes (`about`) for a subject section. */
const buildSubjectRdfaAttributes = (
  subjectTerm: Quad['subject'],
): { about: string } | undefined => {
  const about = toRdfaResource(subjectTerm)
  return about ? { about } : undefined
}

/** Pick any quad's subject term from a subject's predicate map. */
const getSubjectTerm = (
  predicates: Map<string, Quad[]>,
): Quad['subject'] | null => {
  for (const quads of predicates.values()) {
    const first = quads[0]
    if (first) {
      return first.subject
    }
  }
  return null
}

const renderTableLayout = (
  subjects: Map<string, Map<string, Quad[]>>,
  namespaces: NamespaceMap,
  options: TableRenderOptions,
) => {
  const visibleSubjects = options.selectedSubject
    ? Array.from(subjects.entries()).filter(
        ([subject]) => subject === options.selectedSubject,
      )
    : Array.from(subjects.entries())
  const predicateColumnWidth = computePredicateColumnWidth(
    visibleSubjects,
    namespaces,
    options,
  )
  const tableStyle = {
    '--rdf-details-view-predicate-width': predicateColumnWidth,
  } as CSSProperties
  const predicateOrderMap = new Map(
    options.predicateOrder.map((predicate, index) => [predicate, index]),
  )

  return visibleSubjects.map(([subject, predicates]) => {
    const card = (
      <Card>
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
                  const aExplicit = a.orderIndex != null
                  const bExplicit = b.orderIndex != null
                  if (aExplicit && bExplicit) {
                    return a.orderIndex! - b.orderIndex!
                  }
                  if (aExplicit) {
                    return -1
                  }
                  if (bExplicit) {
                    return 1
                  }
                  return a.originalIndex - b.originalIndex
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
                      {renderPredicateObjects(
                        predicateQuads,
                        namespaces,
                        options,
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
            </Table.Body>
          </Table>
        </CardBlock>
      </Card>
    )

    if (!options.emitRdfa) {
      return (
        <div key={subject} style={{ display: 'contents' }}>
          {card}
        </div>
      )
    }

    const subjectTerm = getSubjectTerm(predicates)
    const subjectAttributes = subjectTerm
      ? buildSubjectRdfaAttributes(subjectTerm)
      : undefined
    return (
      <div
        key={subject}
        className="rdfa-subject"
        style={{ display: 'contents' }}
        {...subjectAttributes}
      >
        {card}
      </div>
    )
  })
}

const computePredicateColumnWidth = (
  subjects: [string, Map<string, Quad[]>][],
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean
    labelMap: Map<string, string>
  },
) => {
  const predicateLengths = subjects.flatMap(([, predicates]) =>
    Array.from(predicates.keys()).map(
      (predicate) =>
        formatPredicate(
          predicate,
          namespaces,
          options.expandUris,
          options.labelMap,
        ).length,
    ),
  )

  const maxLength = predicateLengths.reduce(
    (max, length) => Math.max(max, length),
    0,
  )
  const minWidth = 14
  const maxWidth = 28
  const clamped = Math.min(Math.max(maxLength, minWidth), maxWidth)
  return `${clamped}ch`
}

const renderPredicateObjects = (
  predicateQuads: Quad[],
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean
    preferredLanguages: string[]
    showDatatypes: boolean
    showLanguageTags: boolean
    showImagesInline: boolean
    showImageUrls: boolean
    enableNavigation: boolean
    onNavigate: (subject: string | null) => void
    subjects: string[]
    contentTypeCache: Map<string, ContentTypeHint>
    literalRenderers?: Record<string, LiteralRenderer>
    predicateRenderers?: Record<string, PredicateRenderer>
    imagePredicateSet: Set<string>
    emitRdfa: boolean
  },
) => {
  const imageQuads = predicateQuads.filter((quad) => isImageQuad(quad, options))
  const otherQuads = predicateQuads.filter(
    (quad) => !isImageQuad(quad, options),
  )

  const imageContent =
    options.showImagesInline && imageQuads.length > 1
      ? (() => {
          const imageUris = imageQuads
            .map((quad) =>
              quad.object.termType === 'NamedNode' ? quad.object.value : null,
            )
            .filter((uri): uri is string => Boolean(uri))

          return imageUris.length
            ? [
                <ImageCarousel
                  key={`carousel-${imageUris.join('|')}`}
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
              ]
            : []
        })()
      : imageQuads.map((quad, idx) => (
          <div
            key={`${quad.subject.value}-${quad.predicate.value}-img-${idx}`}
            {...(options.emitRdfa ? buildObjectRdfaAttributes(quad) : {})}
          >
            {renderObjectValue(quad, namespaces, options)}
          </div>
        ))

  // The carousel collapses several image quads into one widget, so emit
  // hidden RDFa markers to preserve those triples when RDFa is enabled.
  const rdfaImageMarkers =
    options.emitRdfa && options.showImagesInline && imageQuads.length > 1
      ? imageQuads.map((quad, idx) => (
          <span
            key={`rdfa-img-${quad.predicate.value}-${idx}`}
            hidden
            {...buildObjectRdfaAttributes(quad)}
          />
        ))
      : []

  const otherContent = otherQuads.map((quad, idx) => (
    <div
      key={`${quad.subject.value}-${quad.predicate.value}-other-${idx}`}
      {...(options.emitRdfa ? buildObjectRdfaAttributes(quad) : {})}
    >
      {renderObjectValue(quad, namespaces, options)}
    </div>
  ))

  const combined = [...imageContent, ...otherContent, ...rdfaImageMarkers]
  return combined.length ? combined : null
}

const isImageQuad = (
  quad: Quad,
  options: {
    showImagesInline: boolean
    imagePredicateSet: Set<string>
    contentTypeCache: Map<string, ContentTypeHint>
  },
): boolean => {
  if (!options.showImagesInline) {
    return false
  }
  if (quad.object.termType !== 'NamedNode') {
    return false
  }
  const uri = quad.object.value
  const predicateMatch = options.imagePredicateSet.has(quad.predicate.value)
  const contentHint = options.contentTypeCache.get(uri)
  const extensionMatch = /\.(png|jpe?g|gif|webp|svg)$/i.test(uri)
  return predicateMatch || (contentHint?.isImage ?? false) || extensionMatch
}

const renderObjectValue = (
  quad: Quad,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean
    preferredLanguages: string[]
    showDatatypes: boolean
    showLanguageTags: boolean
    showImagesInline: boolean
    enableNavigation: boolean
    onNavigate: (subject: string | null) => void
    subjects: string[]
    contentTypeCache: Map<string, ContentTypeHint>
    literalRenderers?: Record<string, LiteralRenderer>
    predicateRenderers?: Record<string, PredicateRenderer>
    imagePredicateSet: Set<string>
    showImageUrls: boolean
  },
): JSX.Element => {
  const defaultRender = () => {
    const object = quad.object

    if (object.termType === 'Literal') {
      return renderLiteralValue(object, namespaces, options, quad)
    }

    if (object.termType === 'NamedNode') {
      return renderUriValue(object.value, namespaces, options)
    }

    return <span className="term">{object.value}</span>
  }

  const predicateRenderer = options.predicateRenderers?.[quad.predicate.value]
  if (predicateRenderer) {
    const rendererOptions: PredicateRendererOptions & {
      defaultRender: () => JSX.Element
    } = {
      namespaces: namespaces,
      expandUris: options.expandUris,
      preferredLanguages: options.preferredLanguages,
      showDatatypes: options.showDatatypes,
      showLanguageTags: options.showLanguageTags,
      showImagesInline: options.showImagesInline,
      enableNavigation: options.enableNavigation,
      onNavigate: options.onNavigate,
      subjects: options.subjects,
      contentTypeCache: options.contentTypeCache,
      defaultRender: defaultRender,
    }

    if (predicateRenderer.length <= 1) {
      return (predicateRenderer as any)({
        quad,
        ...rendererOptions,
      })
    }

    return predicateRenderer(quad, rendererOptions)
  }

  return defaultRender()
}

const groupQuadsByGraph = (quads: Quad[]): GraphGrouping[] => {
  const graphMap = quads.reduce((acc, quad) => {
    const graphKey = getGraphKey(quad.graph)
    const existing = acc.get(graphKey) ?? {
      graphTerm: quad.graph,
      subjects: new Map<string, Map<string, Quad[]>>(),
    }

    const subjectKey = quad.subject.value
    const predicateKey = quad.predicate.value
    const predicateMap =
      existing.subjects.get(subjectKey) ?? new Map<string, Quad[]>()
    const predicateQuads = predicateMap.get(predicateKey) ?? []

    predicateMap.set(predicateKey, [...predicateQuads, quad])
    existing.subjects.set(subjectKey, predicateMap)
    acc.set(graphKey, existing)
    return acc
  }, new Map<string, { graphTerm: Quad['graph']; subjects: Map<string, Map<string, Quad[]>> }>())

  return Array.from(graphMap.entries()).map(
    ([graphKey, { graphTerm, subjects }]) => ({
      graphKey,
      graphTerm,
      subjects,
    }),
  )
}

const collectSubjects = (graphs: GraphGrouping[]): string[] => {
  const subjectSet = new Set<string>()
  graphs.forEach(({ subjects }) => {
    subjects.forEach((_, subject) => subjectSet.add(subject))
  })
  return Array.from(subjectSet)
}

const getGraphKey = (graph: Quad['graph']): string => {
  if (graph.termType === 'DefaultGraph') {
    return '@default'
  }
  return graph.value
}

const formatGraphLabel = (
  graph: Quad['graph'],
  namespaces: NamespaceMap,
  expandUris: boolean,
): string => {
  if (graph.termType === 'DefaultGraph') {
    return 'Default graph'
  }
  if (graph.termType === 'NamedNode') {
    return formatTerm(graph.value, namespaces, expandUris)
  }
  return graph.value
}

const formatTerm = (
  value: string,
  namespaces: NamespaceMap,
  expandUris: boolean,
): string => {
  if (value.startsWith('_:')) {
    return value
  }

  if (
    expandUris &&
    (value.startsWith('http://') || value.startsWith('https://'))
  ) {
    return `<${value}>`
  }

  return shortenUri(value, namespaces)
}

const NavigationControls = ({
  selectedSubject,
  selectedLabel,
  onShowAll,
}: {
  selectedSubject: string | null
  selectedLabel: string | null
  onShowAll: () => void
}) => {
  if (!selectedSubject) {
    return null
  }

  return (
    <Card>
      <CardBlock
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
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
  )
}

type ContentTypeHint = {
  isImage: boolean
  isRdf: boolean
  isHtml: boolean
  contentType?: string
}

const collectUriCandidates = (quads: Quad[]) => {
  const uriList = quads.flatMap((quad) =>
    [quad.subject, quad.predicate, quad.object]
      .filter((term) => term.termType === 'NamedNode')
      .map((term) => term.value),
  )
  return new Set(uriList)
}

const negotiateContentType = async (
  uri: string,
): Promise<ContentTypeHint | null> => {
  try {
    const response = await fetch(uri, {
      method: 'HEAD',
      headers: {
        Accept:
          'image/*, application/rdf+xml, text/turtle, application/n-triples, text/html, */*',
      },
    })
    const contentType = response.headers.get('content-type') ?? ''
    return {
      isImage: contentType.startsWith('image/'),
      isRdf:
        contentType.includes('application/rdf+xml') ||
        contentType.includes('text/turtle') ||
        contentType.includes('application/n-triples') ||
        contentType.includes('application/n-quads') ||
        contentType.includes('application/ld+json'),
      isHtml: contentType.includes('text/html'),
      contentType: contentType || undefined,
    }
  } catch {
    return null
  }
}

const renderLiteralValue = (
  literal: Literal,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean
    preferredLanguages: string[]
    showDatatypes: boolean
    showLanguageTags: boolean
    literalRenderers?: Record<string, LiteralRenderer>
  },
  quad: Quad,
): JSX.Element => {
  const datatypeKey =
    literal.datatype?.value ?? 'http://www.w3.org/2001/XMLSchema#string'
  const literalRenderer = options.literalRenderers?.[datatypeKey]
  if (literalRenderer) {
    const rendererOptions: LiteralRendererOptions = {
      namespaces,
      expandUris: options.expandUris,
      preferredLanguages: options.preferredLanguages,
      showDatatypes: options.showDatatypes,
      showLanguageTags: options.showLanguageTags,
    }

    if (literalRenderer.length <= 1) {
      return (literalRenderer as any)({
        literal,
        quad,
        ...rendererOptions,
      })
    }

    return literalRenderer(literal, quad, rendererOptions)
  }

  const lang = literal.language?.toLowerCase()
  const datatype = literal.datatype?.value
  const preferred = lang && options.preferredLanguages.includes(lang)
  const value = literal.value
  const classification = classifyLiteral(value, datatype)
  const isPlainString =
    !datatype || datatype === 'http://www.w3.org/2001/XMLSchema#string'

  if (classification.kind === 'email') {
    return (
      <Link href={`mailto:${value}`} className="literal email">
        {value}
      </Link>
    )
  }

  if (isPlainString) {
    return (
      <span className={`literal text${preferred ? ' preferred' : ''}`.trim()}>
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
    )
  }

  return (
    <span
      className={`literal ${classification.kind}${preferred ? ' preferred' : ''}`.trim()}
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
  )
}

const classifyLiteral = (
  value: string,
  datatype?: string,
): { kind: string } => {
  const normalized = value.trim().toLowerCase()
  if (datatype === 'http://www.w3.org/2001/XMLSchema#boolean') {
    return { kind: 'boolean' }
  }
  if (
    datatype === 'http://www.w3.org/2001/XMLSchema#date' ||
    datatype === 'http://www.w3.org/2001/XMLSchema#dateTime'
  ) {
    return { kind: 'date' }
  }
  if (!Number.isNaN(Number(value)) && value !== '') {
    return { kind: 'numeric' }
  }
  if (normalized === 'true' || normalized === 'false') {
    return { kind: 'boolean' }
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { kind: 'email' }
  }
  return { kind: 'text' }
}

const renderUriLink = (
  uri: string,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean
    enableNavigation: boolean
    onNavigate: (subject: string | null) => void
    subjects: string[]
    contentTypeCache: Map<string, ContentTypeHint>
  },
): JSX.Element => {
  const displayValue = formatTerm(uri, namespaces, options.expandUris)
  const contentHint = options.contentTypeCache.get(uri)
  const isNavigable = options.enableNavigation && options.subjects.includes(uri)

  if (uri.startsWith('mailto:')) {
    return (
      <Link href={uri} className="uri email">
        {uri.replace('mailto:', '')}
      </Link>
    )
  }

  if (uri.startsWith('tel:')) {
    return (
      <Link href={uri} className="uri phone">
        {uri.replace('tel:', '')}
      </Link>
    )
  }

  const hint = contentHint?.contentType
    ? ` (${contentHint.contentType})`
    : contentHint?.isRdf
      ? ' (RDF)'
      : contentHint?.isHtml
        ? ' (HTML)'
        : null

  const label = (
    <>
      {displayValue}
      {hint ? <span className="content-type-hint">{hint}</span> : null}
      {isNavigable ? (
        <span className="navigation-indicator" aria-hidden="true">
          {' '}
          »
        </span>
      ) : null}
    </>
  )

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
  )

  return link
}

const renderUriValue = (
  uri: string,
  namespaces: NamespaceMap,
  options: {
    expandUris: boolean
    showImageUrls: boolean
    showImagesInline: boolean
    enableNavigation: boolean
    onNavigate: (subject: string | null) => void
    subjects: string[]
    contentTypeCache: Map<string, ContentTypeHint>
  },
): JSX.Element => {
  const contentHint = options.contentTypeCache.get(uri)
  const isImage =
    (contentHint?.isImage ?? false) ||
    (options.showImagesInline && /\.(png|jpe?g|gif|webp|svg)$/i.test(uri))
  const link = renderUriLink(uri, namespaces, options)
  const displayValue = formatTerm(uri, namespaces, options.expandUris)

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
                display: 'block',
                marginTop: '0.5rem',
                borderRadius: '6px',
                maxWidth: '220px',
                maxHeight: '160px',
                objectFit: 'cover',
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
  )
}

const ImageCarousel = ({
  images,
  renderLink,
  showImageUrls,
}: {
  images: string[]
  renderLink: (uri: string) => ReactNode
  showImageUrls: boolean
}) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const total = images.length
  const currentIndex = total ? activeIndex % total : 0
  const current = images[currentIndex] ?? images[0]

  if (!current) {
    return null
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total)
  }

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % total)
  }

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
  )
}

const LABEL_PREDICATES = [
  'http://www.w3.org/2004/02/skos/core#prefLabel',
  'http://www.w3.org/2000/01/rdf-schema#label',
  'http://schema.org/name',
  'http://xmlns.com/foaf/0.1/name',
  'http://purl.org/dc/terms/title',
  'http://purl.org/dc/elements/1.1/title',
  'http://www.w3.org/2004/02/skos/core#altLabel',
]

const buildLabelMap = (
  quads: Quad[],
  preferredLanguages: string[],
): Map<string, string> => {
  const candidates = quads.reduce((acc, quad) => {
    if (
      !LABEL_PREDICATES.includes(quad.predicate.value) ||
      quad.subject.termType !== 'NamedNode' ||
      quad.object.termType !== 'Literal'
    ) {
      return acc
    }

    const subjectMap = acc.get(quad.subject.value) ?? new Map()
    const predicateList = subjectMap.get(quad.predicate.value) ?? []
    const updatedList = [
      ...predicateList,
      {
        value: quad.object.value,
        lang: quad.object.language?.toLowerCase() || undefined,
      },
    ]
    subjectMap.set(quad.predicate.value, updatedList)
    acc.set(quad.subject.value, subjectMap)
    return acc
  }, new Map<string, Map<string, { value: string; lang?: string }[]>>())

  return Array.from(candidates.entries()).reduce(
    (labelMap, [subject, predicateMap]) => {
      const selected = LABEL_PREDICATES.reduce<string | undefined>(
        (match, predicate) => {
          if (match) return match
          const list = predicateMap.get(predicate)
          if (!list || list.length === 0) return match
          return selectPreferredLabel(list, preferredLanguages) ?? match
        },
        undefined,
      )

      if (selected) {
        labelMap.set(subject, selected)
      }
      return labelMap
    },
    new Map<string, string>(),
  )
}

const selectPreferredLabel = (
  labels: { value: string; lang?: string }[],
  preferredLanguages: string[],
): string | undefined => {
  if (labels.length === 0) {
    return undefined
  }

  for (const lang of preferredLanguages) {
    const match = labels.find((label) => label.lang === lang)
    if (match) {
      return match.value
    }
  }

  const noLang = labels.find((label) => !label.lang)
  const first = labels[0]
  if (!first) {
    return undefined
  }
  return noLang?.value ?? first.value
}

const formatPredicate = (
  value: string,
  namespaces: NamespaceMap,
  expandUris: boolean,
  labelMap: Map<string, string>,
): string => {
  const label = labelMap.get(value)
  if (label) {
    return label
  }
  return formatTerm(value, namespaces, expandUris)
}

const META_PREDICATES = [
  'http://www.w3.org/2004/02/skos/core#notation',
  'http://www.w3.org/2004/02/skos/core#definition',
  'http://www.w3.org/2004/02/skos/core#note',
  'http://www.w3.org/2000/01/rdf-schema#comment',
  'http://purl.org/dc/terms/description',
  'http://purl.org/dc/elements/1.1/description',
]

const buildMetaMap = (
  quads: Quad[],
  preferredLanguages: string[],
): Map<string, string> => {
  const candidates = quads.reduce((acc, quad) => {
    if (
      !META_PREDICATES.includes(quad.predicate.value) ||
      quad.subject.termType !== 'NamedNode' ||
      quad.object.termType !== 'Literal'
    ) {
      return acc
    }

    const list = acc.get(quad.subject.value) ?? []
    acc.set(quad.subject.value, [
      ...list,
      {
        value: quad.object.value,
        lang: quad.object.language?.toLowerCase() || undefined,
      },
    ])
    return acc
  }, new Map<string, { value: string; lang?: string }[]>())

  return Array.from(candidates.entries()).reduce((metaMap, [subject, list]) => {
    const selected = selectPreferredLabel(list, preferredLanguages)
    if (selected) {
      metaMap.set(subject, selected)
    }
    return metaMap
  }, new Map<string, string>())
}

const renderPredicateLabel = (
  value: string,
  namespaces: NamespaceMap,
  expandUris: boolean,
  labelMap: Map<string, string>,
  metaMap: Map<string, string>,
): JSX.Element => {
  const display = formatPredicate(value, namespaces, expandUris, labelMap)
  const meta = metaMap.get(value)
  const tooltip = meta ? `${value}\n${meta}` : value
  return <span title={tooltip}>{display}</span>
}

const isQuadBasedFormat = (format: RDFFormat): boolean => {
  return format === 'trig' || format === 'n-quads'
}

const resolveRdfFormat = (url: string, contentType: string): RDFFormat => {
  const lowerType = contentType.toLowerCase()
  const lowerUrl = url.toLowerCase()

  if (lowerType.includes('application/n-triples') || lowerUrl.endsWith('.nt')) {
    return 'n-triples'
  }
  if (lowerType.includes('application/n-quads') || lowerUrl.endsWith('.nq')) {
    return 'n-quads'
  }
  if (lowerType.includes('application/trig') || lowerUrl.endsWith('.trig')) {
    return 'trig'
  }
  if (
    lowerType.includes('application/ld+json') ||
    lowerType.includes('application/json') ||
    lowerUrl.endsWith('.jsonld') ||
    lowerUrl.endsWith('.json')
  ) {
    return 'json-ld'
  }

  return 'turtle'
}
