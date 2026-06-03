import { Parser, Store, DataFactory, Quad } from "n3";
import {
  extractNamespacesFromQuads,
  shortenUri,
} from "@sral/rdf-components-shared";

const { namedNode } = DataFactory;

/** Configuration options for the RDFDetailsView web component. */
export interface RDFDetailsViewConfig {
  format?: "turtle" | "n-triples" | "n-quads" | "trig" | "json-ld";
  showNamespaces?: boolean;
  expandURIs?: boolean;
  theme?: "light" | "dark";
  layout?: "table";
  preferredLanguages?: string[];
  vocabularies?: string[];
  showImagesInline?: boolean;
  enableNavigation?: boolean;
  enableContentNegotiation?: boolean; // when true, perform HEAD requests to detect content types
}

/**
 * A Web Component for displaying RDF data in a structured, readable format
 */
/**
 * Web component for rendering RDF data in a structured details view.
 */
export class RDFDetailsView extends HTMLElement {
  private store: Store;
  private vocabularyStore: Store;
  private parser: Parser;
  private config: RDFDetailsViewConfig;
  private currentSubject: string | null = null;
  // Progressive disclosure for large graphs (mirrors the React component).
  private subjectFilter = "";
  private filterFocused = false;
  private subjectExpanded = new Map<string, boolean>();
  private static readonly COLLAPSE_THRESHOLD = 6;
  // Async label/content resolution in flight (drives the status indicator).
  private vocabResolving = false;
  private pendingContent = 0;
  private loadedVocabularies: Set<string> = new Set();
  private contentTypeCache: Map<
    string,
    { isImage: boolean; isRDF: boolean; isHTML: boolean; contentType?: string }
  > = new Map();
  private renderFrame: number | null = null;
  declare shadowRoot: ShadowRoot;

  static get observedAttributes() {
    return [
      "data",
      "format",
      "show-namespaces",
      "expand-uris",
      "theme",
      "layout",
      "preferred-languages",
      "vocabularies",
      "show-images-inline",
      "enable-navigation",
      "enable-content-negotiation",
    ];
  }

  constructor() {
    super();
    this.store = new Store();
    this.vocabularyStore = new Store();
    this.parser = new Parser();
    this.config = {
      format: "turtle",
      showNamespaces: true,
      expandURIs: false,
      theme: "dark",
      layout: "table",
      preferredLanguages: ["en", "en-US", "en-GB"],
      vocabularies: [],
      showImagesInline: true,
      enableNavigation: true,
      enableContentNegotiation: false,
    };

    // Create shadow DOM
    this.attachShadow({ mode: "open" });
    this.render();
  }

  connectedCallback() {
    this.updateFromAttributes();
    this.loadData();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.updateFromAttributes();
      if (name === "data") {
        this.loadData();
      } else {
        this.scheduleRender();
      }
    }
  }

  private updateFromAttributes() {
    const format = this.getAttribute("format") as RDFDetailsViewConfig["format"];
    if (format) this.config.format = format;

    const showNamespaces = this.getAttribute("show-namespaces");
    if (showNamespaces !== null)
      this.config.showNamespaces = showNamespaces !== "false";

    const expandURIs = this.getAttribute("expand-uris");
    if (expandURIs !== null) this.config.expandURIs = expandURIs === "true";

    const theme = this.getAttribute("theme") as RDFDetailsViewConfig["theme"];
    if (theme) this.config.theme = theme;

    const layout = this.getAttribute("layout");
    if (layout === "table") {
      this.config.layout = "table";
    }

    const preferredLanguages = this.getAttribute("preferred-languages");
    if (preferredLanguages) {
      this.config.preferredLanguages = preferredLanguages
        .split(",")
        .map((lang) => lang.trim());
    }

    const vocabularies = this.getAttribute("vocabularies");
    if (vocabularies) {
      const newVocabularies = vocabularies
        .split(",")
        .map((vocab) => vocab.trim());
      const vocabulariesChanged =
        !this.config.vocabularies ||
        this.config.vocabularies.length !== newVocabularies.length ||
        !this.config.vocabularies.every((v) => newVocabularies.includes(v));

      this.config.vocabularies = newVocabularies;

      if (vocabulariesChanged) {
        this.loadVocabularies();
      }
    }

    const showImagesInline = this.getAttribute("show-images-inline");
    if (showImagesInline !== null)
      this.config.showImagesInline = showImagesInline !== "false";

    const enableNavigation = this.getAttribute("enable-navigation");
    if (enableNavigation !== null)
      this.config.enableNavigation = enableNavigation !== "false";

    const enableContentNegotiation = this.getAttribute(
      "enable-content-negotiation",
    );
    if (enableContentNegotiation !== null)
      this.config.enableContentNegotiation =
        enableContentNegotiation !== "false";
  }

  private async loadData() {
    const data = this.getAttribute("data");
    if (!data) return;

    try {
      // Clear existing store
      this.store = new Store();

      // Parse the RDF data
      const quads = this.parser.parse(data);
      this.store.addQuads(quads);

      this.render();
    } catch (error) {
      this.renderError(error as Error);
    }
  }

  private render() {
    const styles = this.getStyles();
    const content = this.renderContent();

    const imageClass = this.config.showImagesInline ? "" : " images-disabled";

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="rdf-details-view ${this.config.theme}${imageClass}">
        ${content}
      </div>
    `;

    // A full innerHTML swap blurs the filter input, so re-focus it after a
    // filter-driven render and drop the caret at the end.
    if (this.filterFocused) {
      this.filterFocused = false;
      const input = this.shadowRoot.querySelector(
        ".subject-filter",
      ) as HTMLInputElement | null;
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    }
  }

  private scheduleRender() {
    if (this.renderFrame != null) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      this.render();
    });
  }

  private renderError(error: Error) {
    const styles = this.getStyles();
    const imageClass = this.config.showImagesInline ? "" : " images-disabled";
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="rdf-details-view ${this.config.theme}${imageClass}">
        <div class="error">
          <h3>Error parsing RDF data:</h3>
          <pre>${error.message}</pre>
        </div>
      </div>
    `;
  }

  private renderContent(): string {
    const quads = this.store.getQuads(null, null, null, null);

    if (quads.length === 0) {
      return '<div class="empty">No RDF data to display</div>';
    }

    let html = '<div class="rdf-content">';

    if (this.vocabResolving || this.pendingContent > 0) {
      html += `<div class="rdf-status" role="status" aria-live="polite"><span class="rdf-spinner" aria-hidden="true"></span> Resolving labels…</div>`;
    }

    if (this.config.showNamespaces) {
      html += this.renderNamespaces();
    }

    // Add navigation controls if enabled
    if (this.config.enableNavigation && this.currentSubject) {
      html += this.renderNavigationControls();
    }

    html += this.renderTableLayout(quads);

    html += "</div>";
    return html;
  }

  private renderNavigationControls(): string {
    const currentSubjectLabel = this.getDisplayLabel(this.currentSubject!);
    return `
      <div class="navigation-controls">
        <button class="nav-button show-all" onclick="this.getRootNode().host.showAllSubjects()">
          ← Show All Subjects
        </button>
        <span class="current-subject">Viewing: ${this.escapeHtml(currentSubjectLabel)}</span>
      </div>
    `;
  }

  private renderTableLayout(quads: Quad[]): string {
    const subjects = quads.reduce((acc, quad) => {
      const subjectValue = quad.subject.value;
      const existing = acc.get(subjectValue) ?? [];
      acc.set(subjectValue, [...existing, quad]);
      return acc;
    }, new Map<string, Quad[]>());

    const total = subjects.size;
    const collapsible = !this.currentSubject && total > 1;
    const many = collapsible && total > RDFDetailsView.COLLAPSE_THRESHOLD;
    const defaultExpanded = !many;

    let entries = Array.from(subjects.entries());
    const query = this.subjectFilter.trim().toLowerCase();
    if (this.currentSubject && subjects.has(this.currentSubject)) {
      entries = [[this.currentSubject, subjects.get(this.currentSubject)!]];
    } else if (query) {
      entries = entries.filter(([subjectValue]) => {
        const label = this.getDisplayLabel(subjectValue).toLowerCase();
        return (
          subjectValue.toLowerCase().includes(query) || label.includes(query)
        );
      });
    }

    const toolbar = many
      ? this.renderSubjectToolbar(total, entries.length, query)
      : "";

    if (query && entries.length === 0) {
      return `${toolbar}<div class="empty">No subjects match "${this.escapeHtml(
        this.subjectFilter.trim(),
      )}"</div>`;
    }

    const tables = entries
      .map(([subjectValue, subjectQuads]) =>
        this.renderSubjectTable(
          subjectValue,
          subjectQuads,
          collapsible,
          this.isSubjectExpanded(subjectValue, defaultExpanded),
        ),
      )
      .join("");

    return `${toolbar}<div class="table-layout">${tables}</div>`;
  }

  private renderSubjectToolbar(
    total: number,
    matched: number,
    query: string,
  ): string {
    const count = query ? `${matched} of ${total}` : `${total} subjects`;
    return `
      <div class="subject-toolbar">
        <input
          type="search"
          class="subject-filter"
          placeholder="Filter subjects…"
          aria-label="Filter subjects"
          value="${this.escapeHtml(this.subjectFilter)}"
          oninput="this.getRootNode().host.setSubjectFilter(this.value)" />
        <span class="subject-count">${count}</span>
        <span class="subject-toolbar-actions">
          <button class="nav-button" onclick="this.getRootNode().host.expandAllSubjects()">Expand all</button>
          <button class="nav-button" onclick="this.getRootNode().host.collapseAllSubjects()">Collapse all</button>
        </span>
      </div>`;
  }

  private renderSubjectTable(
    subjectValue: string,
    quads: Quad[],
    collapsible: boolean,
    expanded: boolean,
  ): string {
    const displaySubject = this.getDisplayLabel(subjectValue);
    const predicateCount = new Set(quads.map((quad) => quad.predicate.value))
      .size;

    let header: string;
    if (collapsible) {
      const meta = expanded
        ? ""
        : `<span class="subject-meta">${predicateCount} ${
            predicateCount === 1 ? "property" : "properties"
          }</span>`;
      header = `<button class="subject-toggle" aria-expanded="${expanded}" onclick="this.getRootNode().host.toggleSubject('${this.jsArg(
        subjectValue,
      )}')">
        <span class="subject-chevron" aria-hidden="true">${expanded ? "▾" : "▸"}</span>
        <span class="subject-title">${this.escapeHtml(displaySubject)}</span>
        ${meta}
      </button>`;
    } else {
      header = `<div class="subject-header">${this.escapeHtml(displaySubject)}</div>`;
    }

    if (!expanded) {
      return `<div class="subject-table">${header}</div>`;
    }

    let html = `<div class="subject-table">
      ${header}
      <table class="properties-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>`;

    const predicates = quads.reduce((acc, quad) => {
      const predicateValue = quad.predicate.value;
      const existing = acc.get(predicateValue) ?? [];
      acc.set(predicateValue, [...existing, quad]);
      return acc;
    }, new Map<string, Quad[]>());

    const rows = Array.from(predicates.entries())
      .map(([predicateValue, predQuads]) => {
        const displayPredicate = this.getDisplayLabel(predicateValue);
        return predQuads
          .map((quad, index) => {
            const displayObject = this.renderObjectValue(
              quad.object.value,
              quad.object.termType,
              true,
            );

            const predicateCell =
              index === 0
                ? `<span class="predicate" title="${this.escapeHtml(predicateValue)}">${this.escapeHtml(displayPredicate)}</span>`
                : "";

            return `<tr>
              <td class="property-cell">${predicateCell}</td>
              <td class="value-cell">${displayObject}</td>
            </tr>`;
          })
          .join("");
      })
      .join("");

    html += `${rows}</tbody></table></div>`;
    return html;
  }


  private renderNamespaces(): string {
    const namespaces = this.extractNamespaces();
    if (namespaces.size === 0) {
      return "";
    }

    const items = Array.from(namespaces.entries())
      .map(
        ([prefix, namespace]) =>
          `<li><strong>${this.escapeHtml(prefix)}</strong>: ${this.escapeHtml(namespace)}</li>`,
      )
      .join("");

    return `<div class="namespaces"><h3>Namespaces:</h3><ul>${items}</ul></div>`;
  }

  private shortenURI(uri: string): string {
    const namespaces = this.extractNamespaces();
    return shortenUri(uri, namespaces);
  }

  private extractNamespaces(): Map<string, string> {
    const quads = this.store.getQuads(null, null, null, null);
    return extractNamespacesFromQuads(quads);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /** Escape a value for use inside a single-quoted inline-handler argument. */
  private jsArg(value: string): string {
    return this.escapeHtml(value.replace(/\\/g, "\\\\").replace(/'/g, "\\'"));
  }

  private subjectIds(): string[] {
    const subjects = new Set<string>();
    for (const quad of this.store.getQuads(null, null, null, null)) {
      subjects.add(quad.subject.value);
    }
    return Array.from(subjects);
  }

  private isLargeGraph(): boolean {
    const total = this.subjectIds().length;
    return (
      !this.currentSubject && total > 1 && total > RDFDetailsView.COLLAPSE_THRESHOLD
    );
  }

  private isSubjectExpanded(subject: string, defaultExpanded: boolean): boolean {
    if (this.currentSubject === subject) return true;
    const explicit = this.subjectExpanded.get(subject);
    return explicit === undefined ? defaultExpanded : explicit;
  }

  /** Toggle a single subject's expanded state (inline-handler entry point). */
  public toggleSubject(subject: string) {
    const defaultExpanded = !this.isLargeGraph();
    const current = this.subjectExpanded.get(subject) ?? defaultExpanded;
    this.subjectExpanded.set(subject, !current);
    this.scheduleRender();
  }

  /** Set the subject filter text (inline-handler entry point). */
  public setSubjectFilter(value: string) {
    this.subjectFilter = value;
    this.filterFocused = true;
    this.scheduleRender();
  }

  /** Expand every subject in the current dataset. */
  public expandAllSubjects() {
    for (const subject of this.subjectIds()) {
      this.subjectExpanded.set(subject, true);
    }
    this.scheduleRender();
  }

  /** Collapse every subject in the current dataset. */
  public collapseAllSubjects() {
    for (const subject of this.subjectIds()) {
      this.subjectExpanded.set(subject, false);
    }
    this.scheduleRender();
  }

  private getStyles(): string {
    return `
      /*
       * Theme tokens mirror @sral/react-rdf-components (Blueprint v6 palette;
       * see DESIGN.md). Dark is the default; the host's "theme" attribute
       * switches to light. Values trace back to Blueprint's own palette so the
       * two renderings match.
       */
      :host {
        --rdf-bg: #1c2127;           /* dark-gray1 */
        --rdf-surface: #2f343c;      /* dark-gray3 */
        --rdf-border: #404854;       /* dark-gray5 */
        --rdf-text: #f6f7f9;         /* light-gray5 */
        --rdf-text-muted: #abb3bf;   /* gray4 */
        --rdf-accent: #8abbff;       /* blue5 */
        --rdf-numeric: #68c1ee;      /* cerulean5 */
        --rdf-date: #d69fd6;         /* violet5 */
        --rdf-boolean: #fbb360;      /* orange5 */
        --rdf-badge-surface: #2f343c;
        --rdf-error-bg: rgba(205, 66, 70, 0.15);
        --rdf-error-border: rgba(205, 66, 70, 0.5);
        --rdf-error-text: #fa999c;   /* red5 */
      }

      :host([theme="light"]) {
        --rdf-bg: #ffffff;
        --rdf-surface: #f6f7f9;      /* light-gray5 */
        --rdf-border: #d3d8de;       /* light-gray1 */
        --rdf-text: #1c2127;         /* dark-gray1 */
        --rdf-text-muted: #5f6b7c;   /* gray1 */
        --rdf-accent: #215db0;       /* blue2 */
        --rdf-numeric: #0f6894;      /* cerulean2 */
        --rdf-date: #7c327c;         /* violet2 */
        --rdf-boolean: #935610;      /* orange2 */
        --rdf-badge-surface: #edeff2; /* light-gray4 */
        --rdf-error-bg: rgba(205, 66, 70, 0.08);
        --rdf-error-border: rgba(205, 66, 70, 0.35);
        --rdf-error-text: #cd4246;   /* red3 */
      }

      .rdf-details-view {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        padding: 1rem;
        border: 1px solid var(--rdf-border);
        border-radius: 8px;
        background: var(--rdf-bg);
        color: var(--rdf-text);
        overflow-x: auto;
      }

      .error {
        background: var(--rdf-error-bg);
        border: 1px solid var(--rdf-error-border);
        padding: 1rem;
        border-radius: 4px;
        color: var(--rdf-error-text);
      }

      .error h3 {
        margin: 0 0 0.5rem 0;
        color: var(--rdf-error-text);
      }

      .error pre {
        margin: 0;
        font-family: 'SF Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        white-space: pre-wrap;
      }

      .empty {
        text-align: center;
        color: var(--rdf-text-muted);
        font-style: italic;
        padding: 2rem;
      }

      .namespaces {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--rdf-border);
      }

      .namespaces h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        color: var(--rdf-text-muted);
      }

      .namespaces ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .namespaces li {
        margin: 0.25rem 0;
      }

      .prefix {
        font-weight: bold;
        color: var(--rdf-accent);
      }

      /* Navigation Controls */
      .navigation-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding: 0.75rem 1rem;
        background: var(--rdf-surface);
        border-radius: 6px;
        border: 1px solid var(--rdf-border);
      }

      .nav-button {
        background: transparent;
        color: var(--rdf-accent);
        border: 1px solid var(--rdf-border);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }

      .nav-button:hover {
        background: var(--rdf-badge-surface);
      }

      .current-subject {
        font-weight: 500;
        color: var(--rdf-text-muted);
      }

      /* Table Layout Styles */
      .table-layout {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .subject-table {
        border: 1px solid var(--rdf-border);
        border-radius: 8px;
        overflow: hidden;
      }

      .subject-header {
        background: var(--rdf-surface);
        padding: 1rem;
        font-weight: bold;
        color: var(--rdf-accent);
        border-bottom: 1px solid var(--rdf-border);
      }

      /* Async resolution status */
      .rdf-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: var(--rdf-text-muted);
        font-size: 0.85rem;
      }

      .rdf-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid var(--rdf-border);
        border-top-color: var(--rdf-accent);
        border-radius: 50%;
        animation: rdf-spin 0.7s linear infinite;
      }

      @keyframes rdf-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .rdf-spinner {
          animation: none;
          border-top-color: var(--rdf-border);
          opacity: 0.6;
        }
      }

      /* Large-graph controls */
      .subject-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .subject-filter {
        flex: 1 1 16rem;
        min-width: 12rem;
        padding: 0.4rem 0.6rem;
        font: inherit;
        color: var(--rdf-text);
        background: var(--rdf-bg);
        border: 1px solid var(--rdf-border);
        border-radius: 4px;
      }

      .subject-filter:focus {
        outline: 2px solid var(--rdf-accent);
        outline-offset: 1px;
      }

      .subject-count {
        color: var(--rdf-text-muted);
        font-size: 0.85rem;
        font-variant-numeric: tabular-nums;
      }

      .subject-toolbar-actions {
        display: flex;
        gap: 0.25rem;
        margin-left: auto;
      }

      /* Collapsible subject header (replaces the static header when many) */
      .subject-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 1rem;
        background: var(--rdf-surface);
        border: none;
        border-bottom: 1px solid var(--rdf-border);
        cursor: pointer;
        color: var(--rdf-accent);
        font: inherit;
        font-weight: bold;
        text-align: left;
      }

      .subject-toggle[aria-expanded="false"] {
        border-bottom: none;
      }

      .subject-toggle:hover {
        /* Theme-neutral tint that reads on both light and dark surfaces. */
        box-shadow: inset 0 0 0 100px rgba(128, 128, 128, 0.12);
      }

      .subject-toggle:focus-visible {
        outline: 2px solid var(--rdf-accent);
        outline-offset: -2px;
      }

      .subject-chevron {
        color: var(--rdf-text-muted);
        flex: none;
        font-size: 0.8em;
      }

      .subject-title {
        word-break: break-word;
      }

      .subject-meta {
        margin-left: auto;
        font-weight: 400;
        font-size: 0.8rem;
        color: var(--rdf-text-muted);
      }

      .properties-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
      }

      .properties-table th {
        background: var(--rdf-surface);
        padding: 0.75rem 1rem;
        text-align: left;
        font-weight: 600;
        color: var(--rdf-text-muted);
        border-bottom: 2px solid var(--rdf-border);
      }

      .properties-table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--rdf-border);
        vertical-align: top;
      }

      .property-cell {
        width: 200px;
        min-width: 200px;
        font-weight: 500;
      }

      .value-cell {
        word-break: break-word;
      }

      /* Value type specific styles */
      .uri {
        color: var(--rdf-accent);
        text-decoration: none;
      }

      .uri:hover {
        text-decoration: underline;
      }

      .uri-link {
        background: none;
        border: none;
        color: var(--rdf-accent);
        text-decoration: none;
        cursor: pointer;
        padding: 0;
        font: inherit;
        display: inline;
      }

      .uri-link:hover {
        text-decoration: underline;
      }

      .uri-link.navigable {
        font-weight: 500;
      }

      .uri-link.navigable::after {
        content: " →";
        font-size: 0.8em;
        opacity: 0.7;
      }

      .literal {
        color: var(--rdf-text);
      }

      .literal.numeric {
        color: var(--rdf-numeric);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      .literal.date {
        color: var(--rdf-date);
        font-weight: 500;
      }

      .literal.boolean {
        color: var(--rdf-boolean);
        font-weight: 600;
      }

      .literal.email, .uri.email {
        color: var(--rdf-accent);
      }

      .uri.phone {
        color: var(--rdf-accent);
      }

      .term {
        color: var(--rdf-text);
      }

      /* Image display */
      .image-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }

      .resource-image {
        max-width: 200px;
        max-height: 150px;
        border-radius: 4px;
        border: 1px solid var(--rdf-border);
        object-fit: cover;
        transition: transform 0.2s ease;
      }

      .resource-image:hover {
        transform: scale(1.05);
        cursor: pointer;
      }

      /* When images are disabled inline */
      .rdf-details-view.images-disabled .resource-image {
        display: none;
      }

      /* Content type hints */
      .content-type-hint {
        font-size: 0.8em;
        opacity: 0.7;
        font-style: italic;
      }

      /* Content-type chips: full thin tinted border (no side-stripe). */
      .rdf-resource {
        border: 1px solid var(--rdf-accent);
        border-radius: 4px;
        padding: 0 0.35rem;
      }

      .html-resource {
        border: 1px solid var(--rdf-boolean);
        border-radius: 4px;
        padding: 0 0.35rem;
      }

      @media (prefers-reduced-motion: reduce) {
        .resource-image,
        .nav-button {
          transition: none;
        }
        .resource-image:hover {
          transform: none;
        }
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .property-cell {
          width: auto;
          min-width: auto;
        }

        .properties-table th,
        .properties-table td {
          padding: 0.5rem;
        }

        .subject-header {
          padding: 0.75rem;
        }
      }

      @media (max-width: 480px) {
        .properties-table {
          font-size: 12px;
        }

        .resource-image {
          max-width: 150px;
          max-height: 100px;
        }
      }
    `;
  }

  // Public API methods
  /**
   * Set RDF data and optional format on the component.
   */
  public setData(data: string, format?: RDFDetailsViewConfig["format"]) {
    this.setAttribute("data", data);
    if (format) {
      this.setAttribute("format", format);
    }
  }

  /**
   * Update component configuration.
   */
  public setConfig(config: Partial<RDFDetailsViewConfig>) {
    Object.assign(this.config, config);

    // Update attributes to reflect config changes
    if (config.format) this.setAttribute("format", config.format);
    if (config.showNamespaces !== undefined)
      this.setAttribute("show-namespaces", config.showNamespaces.toString());
    if (config.expandURIs !== undefined)
      this.setAttribute("expand-uris", config.expandURIs.toString());
    if (config.theme) this.setAttribute("theme", config.theme);
    if (config.layout) this.setAttribute("layout", config.layout);
    if (config.preferredLanguages)
      this.setAttribute(
        "preferred-languages",
        config.preferredLanguages.join(","),
      );
    if (config.vocabularies)
      this.setAttribute("vocabularies", config.vocabularies.join(","));
    if (config.showImagesInline !== undefined)
      this.setAttribute(
        "show-images-inline",
        config.showImagesInline.toString(),
      );
    if (config.enableNavigation !== undefined)
      this.setAttribute(
        "enable-navigation",
        config.enableNavigation.toString(),
      );

    this.render();
  }

  /**
   * Return parsed RDF quads for the current dataset.
   */
  public getQuads(): Quad[] {
    return this.store.getQuads(null, null, null, null);
  }

  /**
   * Clear the current dataset.
   */
  public clear() {
    this.store = new Store();
    this.render();
  }

  /**
   * Add a vocabulary URL and load it.
   */
  public async addVocabulary(url: string) {
    if (!this.config.vocabularies) {
      this.config.vocabularies = [];
    }
    if (
      !this.config.vocabularies.includes(url) &&
      !this.loadedVocabularies.has(url)
    ) {
      this.config.vocabularies.push(url);
      await this.loadVocabulary(url);
      this.setAttribute("vocabularies", this.config.vocabularies.join(","));
      this.render();
    }
  }

  /**
   * Remove a vocabulary URL from the active list.
   */
  public removeVocabulary(url: string) {
    if (this.config.vocabularies) {
      this.config.vocabularies = this.config.vocabularies.filter(
        (v) => v !== url,
      );
      this.loadedVocabularies.delete(url);
      this.setAttribute("vocabularies", this.config.vocabularies.join(","));
      // Note: This doesn't remove the vocabulary data from the store
      // For full removal, we'd need to reload all vocabularies
      this.render();
    }
  }

  private async loadVocabularies() {
    if (!this.config.vocabularies || this.config.vocabularies.length === 0)
      return;

    // Only load vocabularies that haven't been loaded yet
    const vocabulariesToLoad = this.config.vocabularies.filter(
      (url) => url.trim() && !this.loadedVocabularies.has(url.trim()),
    );

    if (vocabulariesToLoad.length === 0) {
      return; // No new vocabularies to load
    }

    // Show the resolving indicator while labels load, then re-render so the
    // resolved labels replace the prefixed URIs (no silent reflow).
    this.vocabResolving = true;
    this.scheduleRender();
    try {
      for (const vocabUrl of vocabulariesToLoad) {
        await this.loadVocabulary(vocabUrl.trim());
      }
    } catch (error) {
      console.warn("Error loading vocabularies:", error);
    } finally {
      this.vocabResolving = false;
      this.scheduleRender();
    }
  }

  private async loadVocabulary(url: string) {
    try {
      const response = await fetch(url, {
        mode: "cors",
        headers: {
          Accept:
            "text/turtle, application/rdf+xml, application/n-triples, application/n-quads, */*",
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to load vocabulary from ${url}: ${response.statusText}`,
        );
        return;
      }

      let vocabData = await response.text();
      const contentType = response.headers.get("content-type") || "";

      // Determine format from content type or URL
      let format = "turtle";
      if (
        contentType.includes("application/n-triples") ||
        url.endsWith(".nt")
      ) {
        format = "n-triples";
      } else if (
        contentType.includes("application/n-quads") ||
        url.endsWith(".nq")
      ) {
        format = "n-quads";
      } else if (
        contentType.includes("application/trig") ||
        url.endsWith(".trig")
      ) {
        format = "trig";
      }
      // Note: N3.js doesn't support RDF/XML, so we serve all vocabularies as Turtle

      const vocabParser = new Parser({ format: format as any });
      const quads = vocabParser.parse(vocabData);
      this.vocabularyStore.addQuads(quads);

      // Mark this vocabulary as loaded
      this.loadedVocabularies.add(url);
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        console.warn(
          `CORS blocked or network error loading vocabulary from ${url}. This is expected for many external vocabulary URLs when developing locally. The component will still work but won't have enhanced labels from this vocabulary.`,
        );
      } else {
        console.warn(`Error loading vocabulary from ${url}:`, error);
      }
    }
  }

  private getDisplayLabel(uri: string): string {
    // First check for labels in vocabulary store
    const label = this.findLabel(uri);
    if (label) return label;

    // Fall back to shortened URI
    return this.shortenURI(uri);
  }

  private findLabel(uri: string): string | null {
    const subject = namedNode(uri);

    // Look for rdfs:label and skos:prefLabel in preferred languages
    const labelPredicates = [
      namedNode("http://www.w3.org/2000/01/rdf-schema#label"),
      namedNode("http://www.w3.org/2004/02/skos/core#prefLabel"),
      namedNode("http://www.w3.org/2004/02/skos/core#altLabel"),
      namedNode("http://purl.org/dc/terms/title"),
      namedNode("http://purl.org/dc/elements/1.1/title"),
    ];

    for (const predicate of labelPredicates) {
      // First try to find labels in preferred languages
      for (const lang of this.config.preferredLanguages || ["en"]) {
        const langQuads = this.vocabularyStore
          .getQuads(subject, predicate, null, null)
          .filter(
            (quad) =>
              quad.object.termType === "Literal" &&
              (quad.object as any).language === lang,
          );

        if (langQuads.length > 0 && langQuads[0]) {
          return langQuads[0].object.value;
        }
      }

      // Then try language-neutral labels
      const neutralQuads = this.vocabularyStore
        .getQuads(subject, predicate, null, null)
        .filter(
          (quad) =>
            quad.object.termType === "Literal" &&
            !(quad.object as any).language,
        );

      if (neutralQuads.length > 0 && neutralQuads[0]) {
        return neutralQuads[0].object.value;
      }

      // Finally any label regardless of language
      const anyQuads = this.vocabularyStore
        .getQuads(subject, predicate, null, null)
        .filter((quad) => quad.object.termType === "Literal");

      if (anyQuads.length > 0 && anyQuads[0]) {
        return anyQuads[0].object.value;
      }
    }

    return null;
  }

  private renderObjectValue(
    value: string,
    termType: string,
    enableNavigation: boolean = false,
  ): string {
    if (termType === "Literal") {
      return this.renderLiteralValue(value);
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return this.renderURIValue(value, enableNavigation);
    }

    return `<span class="term">${this.escapeHtml(value)}</span>`;
  }

  private renderLiteralValue(value: string): string {
    // Check if it's a number
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && isFinite(numericValue)) {
      return `<span class="literal numeric" title="Numeric value">${this.escapeHtml(value)}</span>`;
    }

    // Check if it's a date
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
    if (dateRegex.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return `<span class="literal date" title="Date: ${date.toLocaleString()}">${this.escapeHtml(value)}</span>`;
      }
    }

    // Check if it's a boolean
    if (value === "true" || value === "false") {
      return `<span class="literal boolean">${this.escapeHtml(value)}</span>`;
    }

    // Check if it's an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
      return `<a href="mailto:${this.escapeHtml(value)}" class="literal email">${this.escapeHtml(value)}</a>`;
    }

    // Default literal
    return `<span class="literal">${this.escapeHtml(value)}</span>`;
  }

  private renderURIValue(
    uri: string,
    enableNavigation: boolean = false,
  ): string {
    // Check cache first, then fall back to extension-based detection
    let isImage = false;
    let isRDF = false;
    let isHTML = false;

    const cached = this.contentTypeCache.get(uri);
    if (cached) {
      isImage = cached.isImage;
      isRDF = cached.isRDF;
      isHTML = cached.isHTML;
    } else {
      // Fallback to extension-based detection
      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".bmp",
      ];
      const rdfExtensions = [".rdf", ".ttl", ".nt", ".nq", ".jsonld"];
      const htmlExtensions = [".html", ".htm"];

      const lowerUri = uri.toLowerCase();
      isImage = imageExtensions.some((ext) => lowerUri.includes(ext));
      isRDF = rdfExtensions.some((ext) => lowerUri.includes(ext));
      isHTML = htmlExtensions.some((ext) => lowerUri.includes(ext));

      // Also check for common image hosting services that don't use extensions
      const imageServices = [
        "picsum.photos",
        "via.placeholder.com",
        "placehold.it",
        "unsplash.com/photos",
        "images.unsplash.com",
      ];
      if (!isImage) {
        isImage = imageServices.some((service) => lowerUri.includes(service));
      }

      // Start background content negotiation only if enabled
      if (this.config.enableContentNegotiation) {
        this.checkContentTypesAsync(uri);
      }
    }

    if (isImage) {
      return this.renderImageURI(uri, enableNavigation);
    }

    if (isRDF) {
      return this.renderRDFURI(uri, enableNavigation);
    }

    if (isHTML) {
      return this.renderHTMLURI(uri, enableNavigation);
    }

    // Check if it's an email URI
    if (uri.startsWith("mailto:")) {
      const email = uri.substring(7);
      return `<a href="${this.escapeHtml(uri)}" class="uri email">${this.escapeHtml(email)}</a>`;
    }

    // Check if it's a phone URI
    if (uri.startsWith("tel:")) {
      const phone = uri.substring(4);
      return `<a href="${this.escapeHtml(uri)}" class="uri phone">${this.escapeHtml(phone)}</a>`;
    }

    // Regular URI - check if it can be navigated
    const displayUri = this.config.expandURIs ? uri : this.shortenURI(uri);

    if (
      enableNavigation &&
      this.config.enableNavigation &&
      this.hasSubjectData(uri)
    ) {
      return `<button class="uri-link navigable" onclick="this.getRootNode().host.navigateToSubject('${this.escapeHtml(uri)}')" title="Navigate to ${this.escapeHtml(uri)}">
        ${this.escapeHtml(displayUri)}
      </button>`;
    }

    return `<a href="${this.escapeHtml(uri)}" target="_blank" class="uri" title="${this.escapeHtml(uri)}">${this.escapeHtml(displayUri)}</a>`;
  }

  private renderImageURI(uri: string, enableNavigation: boolean): string {
    const displayUri = this.config.expandURIs ? uri : this.shortenURI(uri);
    let imageHtml = "";

    if (this.config.showImagesInline) {
      imageHtml = `<img src="${this.escapeHtml(uri)}" alt="Resource image" class="resource-image" 
                   onerror="this.style.display='none';" loading="lazy">`;
    }

    const linkHtml =
      enableNavigation &&
      this.config.enableNavigation &&
      this.hasSubjectData(uri)
        ? `<button class="uri-link navigable" onclick="this.getRootNode().host.navigateToSubject('${this.escapeHtml(uri)}')" title="Navigate to ${this.escapeHtml(uri)}">
           ${this.escapeHtml(displayUri)}
         </button>`
        : `<a href="${this.escapeHtml(uri)}" target="_blank" class="uri" title="${this.escapeHtml(uri)}">
           ${this.escapeHtml(displayUri)}
         </a>`;

    return `<div class="uri-value image-container">
      ${imageHtml}
      ${linkHtml}
    </div>`;
  }

  private renderRDFURI(uri: string, enableNavigation: boolean): string {
    const displayUri = this.config.expandURIs ? uri : this.shortenURI(uri);
    const cached = this.contentTypeCache.get(uri);
    const formatHint = cached?.contentType
      ? ` (${cached.contentType})`
      : " (RDF)";

    if (
      enableNavigation &&
      this.config.enableNavigation &&
      this.hasSubjectData(uri)
    ) {
      return `<button class="uri-link navigable rdf-resource" onclick="this.getRootNode().host.navigateToSubject('${this.escapeHtml(uri)}')" title="Navigate to ${this.escapeHtml(uri)}">
        ${this.escapeHtml(displayUri)}<span class="content-type-hint">${formatHint}</span>
      </button>`;
    }

    return `<a href="${this.escapeHtml(uri)}" target="_blank" class="uri rdf-resource" title="${this.escapeHtml(uri)}">
      ${this.escapeHtml(displayUri)}<span class="content-type-hint">${formatHint}</span>
    </a>`;
  }

  private renderHTMLURI(uri: string, enableNavigation: boolean): string {
    const displayUri = this.config.expandURIs ? uri : this.shortenURI(uri);

    if (
      enableNavigation &&
      this.config.enableNavigation &&
      this.hasSubjectData(uri)
    ) {
      return `<button class="uri-link navigable html-resource" onclick="this.getRootNode().host.navigateToSubject('${this.escapeHtml(uri)}')" title="Navigate to ${this.escapeHtml(uri)}">
        ${this.escapeHtml(displayUri)}<span class="content-type-hint"> (HTML)</span>
      </button>`;
    }

    return `<a href="${this.escapeHtml(uri)}" target="_blank" class="uri html-resource" title="${this.escapeHtml(uri)}">
      ${this.escapeHtml(displayUri)}<span class="content-type-hint"> (HTML)</span>
    </a>`;
  }

  // Async content negotiation that updates the cache and re-renders
  private async checkContentTypesAsync(uri: string): Promise<void> {
    if (this.contentTypeCache.has(uri)) {
      return; // Already checked
    }
    if (!this.config.enableContentNegotiation) return;

    this.pendingContent++;
    this.scheduleRender();
    try {
      const result = await this.checkContentTypes(uri);
      this.contentTypeCache.set(uri, result);
    } catch (error) {
      // Silently fail for content negotiation
    } finally {
      this.pendingContent = Math.max(0, this.pendingContent - 1);
      this.scheduleRender();
    }
  }

  private hasSubjectData(uri: string): boolean {
    const quads = this.store.getQuads(namedNode(uri), null, null, null);
    return quads.length > 0;
  }

  // Content negotiation to check what content types are available for a URI
  private async checkContentTypes(uri: string): Promise<{
    isImage: boolean;
    isRDF: boolean;
    isHTML: boolean;
    contentType?: string;
  }> {
    try {
      const response = await fetch(uri, {
        method: "HEAD",
        headers: {
          Accept:
            "image/*, application/rdf+xml, text/turtle, application/n-triples, text/html, */*",
        },
      });

      const contentType = response.headers.get("content-type") || "";

      return {
        isImage: contentType.startsWith("image/"),
        isRDF:
          contentType.includes("application/rdf+xml") ||
          contentType.includes("text/turtle") ||
          contentType.includes("application/n-triples") ||
          contentType.includes("application/n-quads") ||
          contentType.includes("application/ld+json"),
        isHTML: contentType.includes("text/html"),
        contentType,
      };
    } catch (error) {
      // Fallback to extension-based detection if HEAD request fails
      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".bmp",
      ];
      const rdfExtensions = [".rdf", ".ttl", ".nt", ".nq", ".jsonld"];
      const htmlExtensions = [".html", ".htm"];

      const lowerUri = uri.toLowerCase();

      let isImage = imageExtensions.some((ext) => lowerUri.includes(ext));

      // Also check for common image hosting services
      if (!isImage) {
        const imageServices = [
          "picsum.photos",
          "via.placeholder.com",
          "placehold.it",
          "unsplash.com/photos",
          "images.unsplash.com",
        ];
        isImage = imageServices.some((service) => lowerUri.includes(service));
      }

      return {
        isImage,
        isRDF: rdfExtensions.some((ext) => lowerUri.includes(ext)),
        isHTML: htmlExtensions.some((ext) => lowerUri.includes(ext)),
      };
    }
  }

  // Navigation methods
  /**
   * Navigate to a specific subject if it exists in the dataset.
   */
  public navigateToSubject(subjectUri: string) {
    if (this.hasSubjectData(subjectUri)) {
      this.currentSubject = subjectUri;
      this.render();
    }
  }

  /**
   * Reset navigation to show all subjects.
   */
  public showAllSubjects() {
    this.currentSubject = null;
    this.render();
  }
}

// Register the custom element
if (!customElements.get("rdf-details-view")) {
  customElements.define("rdf-details-view", RDFDetailsView);
}
