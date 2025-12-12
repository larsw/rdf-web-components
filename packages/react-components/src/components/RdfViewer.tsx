import { useEffect, useMemo, useState } from "react";
import { Literal, type Quad } from "n3";
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
  className?: string;
  }

  const styles = `
  .rdf-viewer {
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    border: 1px solid #dfe3e8;
    border-radius: 12px;
    padding: 1.25rem;
    background: #fff;
    color: #1f2a37;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  }

  .rdf-viewer.dark {
    background: #0f172a;
    color: #f1f5f9;
    border-color: #1e293b;
    box-shadow: 0 20px 45px rgba(15, 23, 42, 0.6);
  }

  .rdf-viewer .namespace-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }

  .rdf-viewer .namespace-card {
    padding: 0.65rem 0.75rem;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: rgba(148, 163, 184, 0.08);
    font-family: "JetBrains Mono", "Monaco", monospace;
  }

  .rdf-viewer.dark .namespace-card {
    border-color: rgba(148, 163, 184, 0.3);
    background: rgba(15, 23, 42, 0.65);
  }

  .rdf-viewer .subject-block {
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 10px;
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .rdf-viewer .subject-header {
    padding: 0.85rem 1rem;
    font-weight: 600;
    background: rgba(15, 23, 42, 0.04);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rdf-viewer.dark .subject-header {
    background: rgba(255, 255, 255, 0.04);
  }

  .rdf-viewer .properties-table {
    width: 100%;
    border-collapse: collapse;
  }

  .rdf-viewer .properties-table th,
  .rdf-viewer .properties-table td {
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.35);
    vertical-align: top;
  }

  .rdf-viewer .properties-table th {
    width: 220px;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .rdf-viewer .literal {
    color: #0f172a;
  }

  .rdf-viewer .literal .lang,
  .rdf-viewer .literal .datatype {
    font-size: 0.85rem;
    margin-left: 0.35rem;
    color: #475569;
  }

  .rdf-viewer.dark .literal {
    color: #e2e8f0;
  }

  .rdf-viewer.dark .literal .lang,
  .rdf-viewer.dark .literal .datatype {
    color: #94a3b8;
  }

  .rdf-viewer .literal.preferred {
    background: rgba(59, 130, 246, 0.12);
    padding: 0.15rem 0.35rem;
    border-radius: 4px;
  }

  .rdf-viewer .resource a {
    color: #2563eb;
    text-decoration: none;
  }

  .rdf-viewer .resource-image {
    display: block;
    margin-top: 0.5rem;
    border-radius: 8px;
    max-width: 200px;
    max-height: 150px;
    object-fit: cover;
  }

  .rdf-viewer.images-disabled .resource-image {
    display: none;
  }

  .rdf-viewer .turtle-view {
    font-family: "JetBrains Mono", "Monaco", monospace;
    font-size: 0.9rem;
    background: rgba(15, 23, 42, 0.04);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
  }

  .rdf-viewer.dark .turtle-view {
    background: rgba(15, 23, 42, 0.65);
  }
`;

const STYLE_ID = "rdf-viewer-styles";

export function RdfViewer({
  data,
  format = "turtle",
  layout = "table",
  showNamespaces = false,
  expandUris = false,
  preferredLanguages,
  theme = "light",
  showImagesInline = true,
  className
}: RdfViewerProps) {
  const [error, setError] = useState<Error | null>(null);

  useStyleInjection();

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

  if (error) {
    return (
      <div className={`rdf-viewer ${theme} ${className ?? ""}`.trim()}>
        <strong>Failed to parse RDF data:</strong>
        <pre>{error.message}</pre>
      </div>
    );
  }

  if (quads.length === 0) {
    return (
      <div className={`rdf-viewer ${theme} ${className ?? ""}`.trim()}>
        <em>No RDF data to display.</em>
      </div>
    );
  }

  const groupedSubjects = useMemo(() => groupQuadsBySubject(quads), [quads]);
  const viewerClass = [
    "rdf-viewer",
    theme,
    showImagesInline ? undefined : "images-disabled",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={viewerClass}>
      {showNamespaces && renderNamespaceList(namespaces)}
      {layout === "turtle"
        ? renderTurtleLayout(quads, namespaces, expandUris)
        : renderTableLayout(groupedSubjects, namespaces, {
            expandUris,
            preferredLanguages: normalizedPreferred,
            showImagesInline
          })}
    </div>
  );
}

function renderNamespaceList(namespaces: NamespaceMap) {
  if (namespaces.size === 0) {
    return null;
  }

  return (
    <div className="namespace-list">
      {Array.from(namespaces.entries() as IterableIterator<[string, string]>).map(([prefix, namespace]) => (
        <div key={prefix} className="namespace-card">
          <strong>{prefix}</strong>
          <div>&lt;{namespace}&gt;</div>
        </div>
      ))}
    </div>
  );
}

function renderTableLayout(
  subjects: Map<string, Map<string, Quad[]>>,
  namespaces: NamespaceMap,
  options: { expandUris: boolean; preferredLanguages: string[]; showImagesInline: boolean }
) {
  return Array.from(subjects.entries()).map(([subject, predicates]) => (
    <section className="subject-block" key={subject}>
      <div className="subject-header">{formatTerm(subject, namespaces, options.expandUris)}</div>
      <table className="properties-table">
        <tbody>
          {Array.from(predicates.entries()).map(([predicate, predicateQuads]) => (
            <tr key={`${subject}-${predicate}`}>
              <th>{formatTerm(predicate, namespaces, options.expandUris)}</th>
              <td>
                {predicateQuads.map((quad, idx) => (
                  <div key={`${quad.subject.value}-${quad.predicate.value}-${idx}`}>
                    {renderObjectValue(quad, namespaces, options)}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ));
}

function renderObjectValue(
  quad: Quad,
  namespaces: NamespaceMap,
  options: { expandUris: boolean; preferredLanguages: string[]; showImagesInline: boolean }
) {
  const object = quad.object;

  if (object.termType === "Literal") {
    const lang = object.language?.toLowerCase();
    const datatype = object.datatype?.value;
    const preferred = lang && options.preferredLanguages.includes(lang);

    return (
      <span className={`literal${preferred ? " preferred" : ""}`}>
        &ldquo;{object.value}&rdquo;
        {lang ? <span className="lang">@{lang}</span> : null}
        {!lang && datatype && datatype !== "http://www.w3.org/2001/XMLSchema#string" ? (
          <span className="datatype">^^{formatTerm(datatype, namespaces, options.expandUris)}</span>
        ) : null}
      </span>
    );
  }

  if (object.termType === "NamedNode") {
    const displayValue = formatTerm(object.value, namespaces, options.expandUris);
    const isImage = options.showImagesInline && /\.(png|jpe?g|gif|webp|svg)$/i.test(object.value);
    return (
      <span className="resource">
        <a href={object.value} target="_blank" rel="noreferrer">
          {displayValue}
        </a>
        {isImage ? <img src={object.value} alt={displayValue} className="resource-image" /> : null}
      </span>
    );
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
    <pre className="turtle-view">
      {namespaceLines}
      {"\n\n"}
      {statements.join("\n")}
    </pre>
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

function useStyleInjection() {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const tag = document.createElement("style");
    tag.id = STYLE_ID;
    tag.textContent = styles;
    document.head.appendChild(tag);
  }, []);
}