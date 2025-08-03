import { Parser, Store, DataFactory, Quad } from 'n3';

const { namedNode, literal, defaultGraph } = DataFactory;

export interface RDFViewerConfig {
  format?: 'turtle' | 'n-triples' | 'n-quads' | 'trig' | 'json-ld';
  showNamespaces?: boolean;
  expandURIs?: boolean;
  theme?: 'light' | 'dark';
  layout?: 'turtle' | 'table';
  preferredLanguages?: string[];
  vocabularies?: string[];
}

/**
 * A Web Component for displaying RDF data in a structured, readable format
 */
export class RDFViewer extends HTMLElement {
  private store: Store;
  private vocabularyStore: Store;
  private parser: Parser;
  private config: RDFViewerConfig;
  declare shadowRoot: ShadowRoot;

  static get observedAttributes() {
    return ['data', 'format', 'show-namespaces', 'expand-uris', 'theme', 'layout', 'preferred-languages', 'vocabularies'];
  }

  constructor() {
    super();
    this.store = new Store();
    this.vocabularyStore = new Store();
    this.parser = new Parser();
    this.config = {
      format: 'turtle',
      showNamespaces: true,
      expandURIs: false,
      theme: 'light',
      layout: 'table',
      preferredLanguages: ['en', 'en-US', 'en-GB'],
      vocabularies: []
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

    const layout = this.getAttribute('layout') as RDFViewerConfig['layout'];
    if (layout) this.config.layout = layout;

    const preferredLanguages = this.getAttribute('preferred-languages');
    if (preferredLanguages) {
      this.config.preferredLanguages = preferredLanguages.split(',').map(lang => lang.trim());
    }

    const vocabularies = this.getAttribute('vocabularies');
    if (vocabularies) {
      this.config.vocabularies = vocabularies.split(',').map(vocab => vocab.trim());
      this.loadVocabularies();
    }
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

    let html = '<div class="rdf-content">';
    
    if (this.config.showNamespaces) {
      html += this.renderNamespaces();
    }

    if (this.config.layout === 'table') {
      html += this.renderTableLayout(quads);
    } else {
      html += this.renderTurtleLayout(quads);
    }

    html += '</div>';
    return html;
  }

  private renderTableLayout(quads: Quad[]): string {
    // Group quads by subject
    const subjects = new Map<string, Quad[]>();
    quads.forEach((quad: Quad) => {
      const subjectValue = quad.subject.value;
      if (!subjects.has(subjectValue)) {
        subjects.set(subjectValue, []);
      }
      subjects.get(subjectValue)!.push(quad);
    });

    let html = '<div class="table-layout">';
    
    subjects.forEach((subjectQuads, subjectValue) => {
      html += this.renderSubjectTable(subjectValue, subjectQuads);
    });

    html += '</div>';
    return html;
  }

  private renderSubjectTable(subjectValue: string, quads: Quad[]): string {
    const displaySubject = this.formatTerm(subjectValue, 'subject');
    
    let html = `<div class="subject-table">
      <div class="subject-header">${displaySubject}</div>
      <table class="properties-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>`;

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
      const displayPredicate = this.getDisplayLabel(predicateValue);
      
      predQuads.forEach((quad, index) => {
        const displayObject = this.renderObjectValue(quad.object.value, quad.object.termType);
        
        html += `<tr>
          <td class="property-cell">
            ${index === 0 ? `<span class="predicate" title="${this.escapeHtml(predicateValue)}">${this.escapeHtml(displayPredicate)}</span>` : ''}
          </td>
          <td class="value-cell">${displayObject}</td>
        </tr>`;
      });
    });

    html += '</tbody></table></div>';
    return html;
  }

  private renderTurtleLayout(quads: Quad[]): string {
    // Group quads by subject
    const subjects = new Map<string, Quad[]>();
    quads.forEach((quad: Quad) => {
      const subjectValue = quad.subject.value;
      if (!subjects.has(subjectValue)) {
        subjects.set(subjectValue, []);
      }
      subjects.get(subjectValue)!.push(quad);
    });

    let html = '<div class="turtle-layout">';
    subjects.forEach((subjectQuads, subjectValue) => {
      html += this.renderSubject(subjectValue, subjectQuads);
    });
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
    });      predicates.forEach((predQuads, predicateValue) => {
        const displayPredicate = this.getDisplayLabel(predicateValue);
        html += `<div class="predicate-block">
          <span class="predicate" title="${this.escapeHtml(predicateValue)}">${this.escapeHtml(displayPredicate)}</span>
          <div class="objects">`;
        
        predQuads.forEach((quad, index) => {
          const displayObject = this.renderObjectValue(quad.object.value, quad.object.termType);
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
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 8px;
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
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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

      /* Table Layout Styles */
      .table-layout {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .subject-table {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
      }

      .dark .subject-table {
        border-color: #404040;
      }

      .subject-header {
        background: #f5f5f5;
        padding: 1rem;
        font-weight: bold;
        color: #0066cc;
        border-bottom: 1px solid #e0e0e0;
      }

      .dark .subject-header {
        background: #2a2a2a;
        color: #4fc3f7;
        border-bottom-color: #404040;
      }

      .properties-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
      }

      .properties-table th {
        background: #fafafa;
        padding: 0.75rem 1rem;
        text-align: left;
        font-weight: 600;
        color: #666;
        border-bottom: 2px solid #e0e0e0;
      }

      .dark .properties-table th {
        background: #2a2a2a;
        color: #999;
        border-bottom-color: #404040;
      }

      .properties-table td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f0f0f0;
        vertical-align: top;
      }

      .dark .properties-table td {
        border-bottom-color: #333;
      }

      .property-cell {
        width: 200px;
        min-width: 200px;
        font-weight: 500;
      }

      .value-cell {
        word-break: break-word;
      }

      /* Turtle Layout Styles */
      .turtle-layout .subject-block {
        margin-bottom: 1.5rem;
        padding-left: 0;
      }

      .turtle-layout .subject {
        font-weight: bold;
        color: #0066cc;
        margin-bottom: 0.5rem;
      }

      .dark .turtle-layout .subject {
        color: #4fc3f7;
      }

      .turtle-layout .predicates {
        margin-left: 2rem;
      }

      .turtle-layout .predicate-block {
        margin-bottom: 0.5rem;
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
      }

      .turtle-layout .predicate {
        color: #cc6600;
        font-weight: 500;
        min-width: 200px;
        flex-shrink: 0;
      }

      .dark .turtle-layout .predicate {
        color: #ffb74d;
      }

      .turtle-layout .objects {
        flex: 1;
      }

      /* Value type specific styles */
      .uri {
        color: #0066cc;
        text-decoration: none;
      }

      .uri:hover {
        text-decoration: underline;
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

      .literal.numeric {
        color: #e91e63;
        font-weight: 500;
      }

      .dark .literal.numeric {
        color: #f48fb1;
      }

      .literal.date {
        color: #9c27b0;
        font-weight: 500;
      }

      .dark .literal.date {
        color: #ce93d8;
      }

      .literal.boolean {
        color: #ff9800;
        font-weight: 600;
      }

      .dark .literal.boolean {
        color: #ffcc02;
      }

      .literal.email, .uri.email {
        color: #2196f3;
      }

      .dark .literal.email, .dark .uri.email {
        color: #64b5f6;
      }

      .uri.phone {
        color: #4caf50;
      }

      .dark .uri.phone {
        color: #81c784;
      }

      .term {
        color: #333;
      }

      .dark .term {
        color: #d4d4d4;
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
        border: 1px solid #ddd;
        object-fit: cover;
      }

      .dark .resource-image {
        border-color: #404040;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .turtle-layout .predicate-block {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }

        .turtle-layout .predicate {
          min-width: auto;
        }

        .turtle-layout .predicates {
          margin-left: 1rem;
        }

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
  public setData(data: string, format?: RDFViewerConfig['format']) {
    this.setAttribute('data', data);
    if (format) {
      this.setAttribute('format', format);
    }
  }

  public setConfig(config: Partial<RDFViewerConfig>) {
    Object.assign(this.config, config);
    
    // Update attributes to reflect config changes
    if (config.format) this.setAttribute('format', config.format);
    if (config.showNamespaces !== undefined) this.setAttribute('show-namespaces', config.showNamespaces.toString());
    if (config.expandURIs !== undefined) this.setAttribute('expand-uris', config.expandURIs.toString());
    if (config.theme) this.setAttribute('theme', config.theme);
    if (config.layout) this.setAttribute('layout', config.layout);
    if (config.preferredLanguages) this.setAttribute('preferred-languages', config.preferredLanguages.join(','));
    if (config.vocabularies) this.setAttribute('vocabularies', config.vocabularies.join(','));
    
    this.render();
  }

  public getQuads(): Quad[] {
    return this.store.getQuads(null, null, null, null);
  }

  public clear() {
    this.store = new Store();
    this.render();
  }

  public async addVocabulary(url: string) {
    if (!this.config.vocabularies) {
      this.config.vocabularies = [];
    }
    if (!this.config.vocabularies.includes(url)) {
      this.config.vocabularies.push(url);
      await this.loadVocabulary(url);
      this.setAttribute('vocabularies', this.config.vocabularies.join(','));
      this.render();
    }
  }

  public removeVocabulary(url: string) {
    if (this.config.vocabularies) {
      this.config.vocabularies = this.config.vocabularies.filter(v => v !== url);
      this.setAttribute('vocabularies', this.config.vocabularies.join(','));
      // Note: This doesn't remove the vocabulary data from the store
      // For full removal, we'd need to reload all vocabularies
      this.render();
    }
  }

  private async loadVocabularies() {
    if (!this.config.vocabularies || this.config.vocabularies.length === 0) return;

    try {
      // Clear existing vocabulary data
      this.vocabularyStore = new Store();

      // Load each vocabulary
      for (const vocabUrl of this.config.vocabularies) {
        if (vocabUrl.trim()) {
          await this.loadVocabulary(vocabUrl.trim());
        }
      }
    } catch (error) {
      console.warn('Error loading vocabularies:', error);
    }
  }

  private async loadVocabulary(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to load vocabulary from ${url}: ${response.statusText}`);
        return;
      }

      const vocabData = await response.text();
      const contentType = response.headers.get('content-type') || '';
      
      // Determine format from content type or URL
      let format = 'turtle';
      if (contentType.includes('application/rdf+xml') || url.endsWith('.rdf') || url.endsWith('.owl')) {
        format = 'rdf/xml';
      } else if (contentType.includes('application/n-triples') || url.endsWith('.nt')) {
        format = 'n-triples';
      } else if (contentType.includes('application/n-quads') || url.endsWith('.nq')) {
        format = 'n-quads';
      }

      const vocabParser = new Parser({ format: format as any });
      const quads = vocabParser.parse(vocabData);
      this.vocabularyStore.addQuads(quads);
      
      console.log(`Loaded vocabulary from ${url}: ${quads.length} triples`);
    } catch (error) {
      console.warn(`Error loading vocabulary from ${url}:`, error);
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
      namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
      namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'),
      namedNode('http://www.w3.org/2004/02/skos/core#altLabel'),
      namedNode('http://purl.org/dc/terms/title'),
      namedNode('http://purl.org/dc/elements/1.1/title')
    ];

    for (const predicate of labelPredicates) {
      // First try to find labels in preferred languages
      for (const lang of this.config.preferredLanguages || ['en']) {
        const langQuads = this.vocabularyStore.getQuads(subject, predicate, null, null)
          .filter(quad => quad.object.termType === 'Literal' && 
                  (quad.object as any).language === lang);
        
        if (langQuads.length > 0 && langQuads[0]) {
          return langQuads[0].object.value;
        }
      }

      // Then try language-neutral labels
      const neutralQuads = this.vocabularyStore.getQuads(subject, predicate, null, null)
        .filter(quad => quad.object.termType === 'Literal' && 
                !(quad.object as any).language);
      
      if (neutralQuads.length > 0 && neutralQuads[0]) {
        return neutralQuads[0].object.value;
      }

      // Finally any label regardless of language
      const anyQuads = this.vocabularyStore.getQuads(subject, predicate, null, null)
        .filter(quad => quad.object.termType === 'Literal');
      
      if (anyQuads.length > 0 && anyQuads[0]) {
        return anyQuads[0].object.value;
      }
    }

    return null;
  }

  private renderObjectValue(value: string, termType: string): string {
    if (termType === 'Literal') {
      return this.renderLiteralValue(value);
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      return this.renderURIValue(value);
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
    if (value === 'true' || value === 'false') {
      return `<span class="literal boolean">${this.escapeHtml(value)}</span>`;
    }

    // Check if it's an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
      return `<a href="mailto:${this.escapeHtml(value)}" class="literal email">${this.escapeHtml(value)}</a>`;
    }

    // Default literal
    return `<span class="literal">"${this.escapeHtml(value)}"</span>`;
  }

  private renderURIValue(uri: string): string {
    // Check if it's an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const isImage = imageExtensions.some(ext => uri.toLowerCase().includes(ext));
    
    if (isImage) {
      const displayUri = this.config.expandURIs ? uri : this.shortenURI(uri);
      return `<div class="uri-value image-container">
        <a href="${this.escapeHtml(uri)}" target="_blank" class="uri" title="${this.escapeHtml(uri)}">
          ${this.escapeHtml(displayUri)}
        </a>
        <img src="${this.escapeHtml(uri)}" alt="Resource image" class="resource-image" 
             onerror="this.style.display='none';" loading="lazy">
      </div>`;
    }

    // Check if it's an email URI
    if (uri.startsWith('mailto:')) {
      const email = uri.substring(7);
      return `<a href="${this.escapeHtml(uri)}" class="uri email">${this.escapeHtml(email)}</a>`;
    }

    // Check if it's a phone URI
    if (uri.startsWith('tel:')) {
      const phone = uri.substring(4);
      return `<a href="${this.escapeHtml(uri)}" class="uri phone">${this.escapeHtml(phone)}</a>`;
    }

    // Regular URI
    const displayUri = this.config.expandURIs ? uri : this.shortenURI(uri);
    return `<a href="${this.escapeHtml(uri)}" target="_blank" class="uri" title="${this.escapeHtml(uri)}">${this.escapeHtml(displayUri)}</a>`;
  }
}

// Register the custom element
if (!customElements.get('rdf-viewer')) {
  customElements.define('rdf-viewer', RDFViewer);
}
