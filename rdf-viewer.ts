import { Parser, Store, DataFactory, Quad } from 'n3';

const { namedNode, literal, defaultGraph } = DataFactory;

export interface RDFViewerConfig {
  format?: 'turtle' | 'n-triples' | 'n-quads' | 'trig' | 'json-ld';
  showNamespaces?: boolean;
  expandURIs?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * A Web Component for displaying RDF data in a structured, readable format
 */
export class RDFViewer extends HTMLElement {
  private store: Store;
  private parser: Parser;
  private config: RDFViewerConfig;
  declare shadowRoot: ShadowRoot;

  static get observedAttributes() {
    return ['data', 'format', 'show-namespaces', 'expand-uris', 'theme'];
  }

  constructor() {
    super();
    this.store = new Store();
    this.parser = new Parser();
    this.config = {
      format: 'turtle',
      showNamespaces: true,
      expandURIs: false,
      theme: 'light'
    };

    // Create shadow DOM
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  connectedCallback() {
    this.updateFromAttributes();
    this.loadData();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.updateFromAttributes();
      if (name === 'data') {
        this.loadData();
      } else {
        this.render();
      }
    }
  }

  private updateFromAttributes() {
    const format = this.getAttribute('format') as RDFViewerConfig['format'];
    if (format) this.config.format = format;

    const showNamespaces = this.getAttribute('show-namespaces');
    if (showNamespaces !== null) this.config.showNamespaces = showNamespaces !== 'false';

    const expandURIs = this.getAttribute('expand-uris');
    if (expandURIs !== null) this.config.expandURIs = expandURIs === 'true';

    const theme = this.getAttribute('theme') as RDFViewerConfig['theme'];
    if (theme) this.config.theme = theme;
  }

  private async loadData() {
    const data = this.getAttribute('data');
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

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="rdf-viewer ${this.config.theme}">
        ${content}
      </div>
    `;
  }

  private renderError(error: Error) {
    const styles = this.getStyles();
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="rdf-viewer ${this.config.theme}">
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

    // Group quads by subject
    const subjects = new Map<string, Quad[]>();
    quads.forEach((quad: Quad) => {
      const subjectValue = quad.subject.value;
      if (!subjects.has(subjectValue)) {
        subjects.set(subjectValue, []);
      }
      subjects.get(subjectValue)!.push(quad);
    });

    let html = '<div class="rdf-content">';
    
    if (this.config.showNamespaces) {
      html += this.renderNamespaces();
    }

    html += '<div class="subjects">';
    subjects.forEach((subjectQuads, subjectValue) => {
      html += this.renderSubject(subjectValue, subjectQuads);
    });
    html += '</div>';

    html += '</div>';
    return html;
  }

  private renderNamespaces(): string {
    const namespaces = this.extractNamespaces();
    if (namespaces.size === 0) return '';

    let html = '<div class="namespaces"><h3>Namespaces:</h3><ul>';
    namespaces.forEach((uri, prefix) => {
      html += `<li><span class="prefix">${prefix}:</span> <span class="uri">&lt;${uri}&gt;</span></li>`;
    });
    html += '</ul></div>';
    return html;
  }

  private renderSubject(subjectValue: string, quads: Quad[]): string {
    const displaySubject = this.formatTerm(subjectValue, 'subject');
    
    let html = `<div class="subject-block">
      <div class="subject">${displaySubject}</div>
      <div class="predicates">`;

    // Group by predicate
    const predicates = new Map<string, Quad[]>();
    quads.forEach(quad => {
      const predicateValue = quad.predicate.value;
      if (!predicates.has(predicateValue)) {
        predicates.set(predicateValue, []);
      }
      predicates.get(predicateValue)!.push(quad);
    });

    predicates.forEach((predQuads, predicateValue) => {
      const displayPredicate = this.formatTerm(predicateValue, 'predicate');
      html += `<div class="predicate-block">
        <span class="predicate">${displayPredicate}</span>
        <div class="objects">`;
      
      predQuads.forEach((quad, index) => {
        const displayObject = this.formatTerm(quad.object.value, 'object', quad.object.termType);
        html += `<span class="object">${displayObject}</span>`;
        if (index < predQuads.length - 1) html += ', ';
      });
      
      html += '</div></div>';
    });

    html += '</div></div>';
    return html;
  }

  private formatTerm(value: string, role: 'subject' | 'predicate' | 'object', termType?: string): string {
    if (termType === 'Literal') {
      return `<span class="literal">"${this.escapeHtml(value)}"</span>`;
    }

    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('urn:')) {
      if (this.config.expandURIs) {
        return `<span class="uri">&lt;${this.escapeHtml(value)}&gt;</span>`;
      } else {
        const shortened = this.shortenURI(value);
        return `<span class="uri" title="${this.escapeHtml(value)}">${this.escapeHtml(shortened)}</span>`;
      }
    }

    return `<span class="term">${this.escapeHtml(value)}</span>`;
  }

  private shortenURI(uri: string): string {
    const namespaces = this.extractNamespaces();
    for (const [prefix, namespace] of namespaces) {
      if (uri.startsWith(namespace)) {
        return `${prefix}:${uri.substring(namespace.length)}`;
      }
    }
    
    // Common namespace shortcuts
    const commonNamespaces = {
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
      'http://www.w3.org/2000/01/rdf-schema#': 'rdfs',
      'http://www.w3.org/2002/07/owl#': 'owl',
      'http://purl.org/dc/elements/1.1/': 'dc',
      'http://xmlns.com/foaf/0.1/': 'foaf',
      'http://www.w3.org/2004/02/skos/core#': 'skos'
    };

    for (const [namespace, prefix] of Object.entries(commonNamespaces)) {
      if (uri.startsWith(namespace)) {
        return `${prefix}:${uri.substring(namespace.length)}`;
      }
    }

    return uri;
  }

  private extractNamespaces(): Map<string, string> {
    const namespaces = new Map<string, string>();
    const quads = this.store.getQuads(null, null, null, null);
    
    quads.forEach((quad: Quad) => {
      [quad.subject.value, quad.predicate.value, quad.object.value].forEach(value => {
        if (value.startsWith('http://') || value.startsWith('https://')) {
          const lastSlash = Math.max(value.lastIndexOf('/'), value.lastIndexOf('#'));
          if (lastSlash > 0) {
            const namespace = value.substring(0, lastSlash + 1);
            const prefix = this.generatePrefix(namespace);
            if (!namespaces.has(prefix)) {
              namespaces.set(prefix, namespace);
            }
          }
        }
      });
    });

    return namespaces;
  }

  private generatePrefix(namespace: string): string {
    const commonPrefixes: { [key: string]: string } = {
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
      'http://www.w3.org/2000/01/rdf-schema#': 'rdfs',
      'http://www.w3.org/2002/07/owl#': 'owl',
      'http://purl.org/dc/elements/1.1/': 'dc',
      'http://xmlns.com/foaf/0.1/': 'foaf',
      'http://www.w3.org/2004/02/skos/core#': 'skos'
    };

    if (commonPrefixes[namespace]) {
      return commonPrefixes[namespace];
    }

    // Generate a simple prefix from the domain
    const match = namespace.match(/https?:\/\/([^\/]+)/);
    if (match && match[1]) {
      const domain = match[1].replace(/^www\./, '');
      const parts = domain.split('.');
      if (parts[0]) {
        return parts[0].substring(0, 3);
      }
    }

    return 'ns';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getStyles(): string {
    return `
      .rdf-viewer {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        line-height: 1.4;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #fff;
        color: #333;
        overflow-x: auto;
      }

      .rdf-viewer.dark {
        background: #1e1e1e;
        color: #d4d4d4;
        border-color: #404040;
      }

      .error {
        background: #fee;
        border: 1px solid #fcc;
        padding: 1rem;
        border-radius: 4px;
        color: #c33;
      }

      .error h3 {
        margin: 0 0 0.5rem 0;
        color: #a00;
      }

      .error pre {
        margin: 0;
        font-family: inherit;
        white-space: pre-wrap;
      }

      .empty {
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 2rem;
      }

      .namespaces {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #eee;
      }

      .dark .namespaces {
        border-bottom-color: #404040;
      }

      .namespaces h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        color: #666;
      }

      .dark .namespaces h3 {
        color: #999;
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
        color: #0066cc;
      }

      .dark .prefix {
        color: #4fc3f7;
      }

      .subject-block {
        margin-bottom: 1.5rem;
        padding-left: 0;
      }

      .subject {
        font-weight: bold;
        color: #0066cc;
        margin-bottom: 0.5rem;
      }

      .dark .subject {
        color: #4fc3f7;
      }

      .predicates {
        margin-left: 2rem;
      }

      .predicate-block {
        margin-bottom: 0.5rem;
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
      }

      .predicate {
        color: #cc6600;
        font-weight: 500;
        min-width: 200px;
        flex-shrink: 0;
      }

      .dark .predicate {
        color: #ffb74d;
      }

      .objects {
        flex: 1;
      }

      .object {
        display: inline;
      }

      .uri {
        color: #0066cc;
        cursor: help;
      }

      .dark .uri {
        color: #4fc3f7;
      }

      .literal {
        color: #009900;
      }

      .dark .literal {
        color: #81c784;
      }

      .term {
        color: #333;
      }

      .dark .term {
        color: #d4d4d4;
      }

      @media (max-width: 768px) {
        .predicate-block {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }

        .predicate {
          min-width: auto;
        }

        .predicates {
          margin-left: 1rem;
        }
      }
    `;
  }

  // Public API methods
  public setData(data: string, format?: RDFViewerConfig['format']) {
    this.setAttribute('data', data);
    if (format) {
      this.setAttribute('format', format);
    }
  }

  public setConfig(config: Partial<RDFViewerConfig>) {
    Object.assign(this.config, config);
    this.render();
  }

  public getQuads(): Quad[] {
    return this.store.getQuads(null, null, null, null);
  }

  public clear() {
    this.store = new Store();
    this.render();
  }
}

// Register the custom element
customElements.define('rdf-viewer', RDFViewer);
