import { test, expect } from "bun:test";

// Mock DOM environment for testing
class MockElement {
  attributes: Map<string, string> = new Map();
  shadowRoot: any = { innerHTML: '' };

  getAttribute(name: string) { 
    return this.attributes.get(name) || null; 
  }
  
  setAttribute(name: string, value: string) { 
    this.attributes.set(name, value);
  }
  
  attachShadow() { 
    return this.shadowRoot;
  }
  
  static observedAttributes = ['data', 'format', 'show-namespaces', 'expand-uris', 'theme', 'layout', 'preferred-languages', 'vocabularies', 'show-images-inline', 'enable-navigation'];
}

class MockHTMLElement extends MockElement {
  connectedCallback() {}
  attributeChangedCallback() {}
}

const mockDocument = {
  createElement: (tag: string) => ({
    innerHTML: '',
    textContent: '',
    attachShadow: () => ({ innerHTML: '' })
  })
};

const mockCustomElements = {
  define: (name: string, constructor: any) => {
    // Mock implementation
  },
  get: (name: string) => {
    // Mock implementation - return null to allow registration
    return null;
  }
};

// Set up globals for testing
(global as any).document = mockDocument;
(global as any).customElements = mockCustomElements;
(global as any).HTMLElement = MockHTMLElement;
(global as any).ShadowRoot = class {};

// Import after setting up mocks
const { RDFViewer } = await import("./rdf-viewer.ts");

test("RDFViewer can be instantiated", () => {
  const viewer = new RDFViewer();
  expect(viewer).toBeDefined();
  expect(viewer instanceof RDFViewer).toBe(true);
});

test("RDFViewer has correct observed attributes", () => {
  const attributes = RDFViewer.observedAttributes;
  expect(attributes).toContain('data');
  expect(attributes).toContain('format');
  expect(attributes).toContain('show-namespaces');
  expect(attributes).toContain('expand-uris');
  expect(attributes).toContain('theme');
  expect(attributes).toContain('layout');
  expect(attributes).toContain('preferred-languages');
  expect(attributes).toContain('vocabularies');
  expect(attributes).toContain('show-images-inline');
  expect(attributes).toContain('enable-navigation');
});

test("RDFViewer setData method works", () => {
  const viewer = new RDFViewer();
  const testData = '@prefix ex: <http://example.org/> . ex:test ex:property "value" .';
  
  // This should not throw
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
});

test("RDFViewer clear method works", () => {
  const viewer = new RDFViewer();
  
  // This should not throw
  expect(() => {
    viewer.clear();
  }).not.toThrow();
});

test("RDFViewer getQuads method returns array", () => {
  const viewer = new RDFViewer();
  const quads = viewer.getQuads();
  expect(Array.isArray(quads)).toBe(true);
});

test("RDFViewer attribute changes work correctly", () => {
  const viewer = new RDFViewer();
  
  // Test setting various attributes
  viewer.setAttribute('show-namespaces', 'true');
  viewer.setAttribute('expand-uris', 'false');
  viewer.setAttribute('theme', 'dark');
  viewer.setAttribute('layout', 'table');
  viewer.setAttribute('show-images-inline', 'true');
  
  expect(viewer.getAttribute('show-namespaces')).toBe('true');
  expect(viewer.getAttribute('expand-uris')).toBe('false');
  expect(viewer.getAttribute('theme')).toBe('dark');
  expect(viewer.getAttribute('layout')).toBe('table');
  expect(viewer.getAttribute('show-images-inline')).toBe('true');
});

test("RDFViewer handles empty data gracefully", () => {
  const viewer = new RDFViewer();
  
  // Empty data should not throw
  expect(() => {
    viewer.setData('', 'turtle');
  }).not.toThrow();
  
  // After empty data, getQuads should return empty array
  const quads = viewer.getQuads();
  expect(Array.isArray(quads)).toBe(true);
});

test("RDFViewer setConfig method works", () => {
  const viewer = new RDFViewer();
  
  expect(() => {
    viewer.setConfig({
      showNamespaces: false,
      expandURIs: true,
      theme: 'dark',
      layout: 'turtle',
      showImagesInline: false
    });
  }).not.toThrow();
  
  // Check that attributes were updated
  expect(viewer.getAttribute('show-namespaces')).toBe('false');
  expect(viewer.getAttribute('expand-uris')).toBe('true');
  expect(viewer.getAttribute('theme')).toBe('dark');
  expect(viewer.getAttribute('layout')).toBe('turtle');
  expect(viewer.getAttribute('show-images-inline')).toBe('false');
});

test("RDFViewer handles different formats", () => {
  const viewer = new RDFViewer();
  
  // Test different format attributes
  expect(() => {
    viewer.setData('some data', 'turtle');
    expect(viewer.getAttribute('format')).toBe('turtle');
    
    viewer.setData('some data', 'ntriples');
    expect(viewer.getAttribute('format')).toBe('ntriples');
    
    viewer.setData('some data', 'jsonld');
    expect(viewer.getAttribute('format')).toBe('jsonld');
  }).not.toThrow();
});

test("RDFViewer vocabulary management works", () => {
  const viewer = new RDFViewer();
  
  expect(() => {
    viewer.setAttribute('vocabularies', 'foaf,dcterms,schema');
    expect(viewer.getAttribute('vocabularies')).toBe('foaf,dcterms,schema');
  }).not.toThrow();
});

test("RDFViewer preferred languages configuration", () => {
  const viewer = new RDFViewer();
  
  expect(() => {
    viewer.setAttribute('preferred-languages', 'en,fr,de');
    expect(viewer.getAttribute('preferred-languages')).toBe('en,fr,de');
  }).not.toThrow();
});

test("RDFViewer navigation configuration", () => {
  const viewer = new RDFViewer();
  
  expect(() => {
    viewer.setAttribute('enable-navigation', 'false');
    expect(viewer.getAttribute('enable-navigation')).toBe('false');
    
    viewer.setAttribute('enable-navigation', 'true');
    expect(viewer.getAttribute('enable-navigation')).toBe('true');
  }).not.toThrow();
});

// Integration test to verify basic functionality without complex parsing
test("RDFViewer integration - basic functionality", () => {
  const viewer = new RDFViewer();
  
  // Test full workflow
  expect(() => {
    // Set configuration
    viewer.setConfig({
      format: 'turtle',
      showNamespaces: true,
      layout: 'table',
      theme: 'light'
    });
    
    // Set some data (even if parsing fails, should not throw)
    viewer.setData('@prefix ex: <http://example.org/> . ex:test ex:property "value" .', 'turtle');
    
    // Clear data
    viewer.clear();
    
    // Get quads (should return empty array after clear)
    const quads = viewer.getQuads();
    expect(Array.isArray(quads)).toBe(true);
  }).not.toThrow();
});

// Test for handling malformed data
test("RDFViewer handles malformed data gracefully", () => {
  const viewer = new RDFViewer();
  
  expect(() => {
    // These should not crash the component
    viewer.setData('malformed turtle data', 'turtle');
    viewer.setData('{"invalid": json}', 'jsonld');
    viewer.setData('<incomplete ntriples', 'ntriples');
  }).not.toThrow();
});

// Test shadow DOM creation
test("RDFViewer creates shadow DOM", () => {
  const viewer = new RDFViewer();
  expect(viewer.shadowRoot).toBeDefined();
  expect(viewer.shadowRoot.innerHTML).toBeDefined();
});
class MockElement {
  attributes: Map<string, string> = new Map();
  shadowRoot: any = { innerHTML: '' };

  getAttribute(name: string) { 
    return this.attributes.get(name) || null; 
  }
  
  setAttribute(name: string, value: string) { 
    this.attributes.set(name, value);
  }
  
  attachShadow() { 
    return this.shadowRoot;
  }
  
  static observedAttributes = ['data', 'format', 'show-namespaces', 'expand-uris', 'theme', 'layout', 'preferred-languages', 'vocabularies', 'show-images-inline', 'enable-navigation'];
}

class MockHTMLElement extends MockElement {
  connectedCallback() {}
  attributeChangedCallback() {}
}

const mockDocument = {
  createElement: (tag: string) => ({
    innerHTML: '',
    textContent: '',
    attachShadow: () => ({ innerHTML: '' })
  })
};

const mockCustomElements = {
  define: (name: string, constructor: any) => {
    // Mock implementation
  },
  get: (name: string) => {
    // Mock implementation - return null to allow registration
    return null;
  }
};

// Set up globals for testing
(global as any).document = mockDocument;
(global as any).customElements = mockCustomElements;
(global as any).HTMLElement = MockHTMLElement;
(global as any).ShadowRoot = class {};

// Import after setting up mocks
const { RDFViewer } = await import("./rdf-viewer.ts");

test("RDFViewer can be instantiated", () => {
  const viewer = new RDFViewer();
  expect(viewer).toBeDefined();
  expect(viewer instanceof RDFViewer).toBe(true);
});

test("RDFViewer has correct observed attributes", () => {
  const attributes = RDFViewer.observedAttributes;
  expect(attributes).toContain('data');
  expect(attributes).toContain('format');
  expect(attributes).toContain('show-namespaces');
  expect(attributes).toContain('expand-uris');
  expect(attributes).toContain('theme');
  expect(attributes).toContain('layout');
  expect(attributes).toContain('preferred-languages');
  expect(attributes).toContain('vocabularies');
  expect(attributes).toContain('show-images-inline');
  expect(attributes).toContain('enable-navigation');
});

test("RDFViewer setData method works", () => {
  const viewer = new RDFViewer();
  const testData = '@prefix ex: <http://example.org/> . ex:test ex:property "value" .';
  
  // This should not throw
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
});

test("RDFViewer clear method works", () => {
  const viewer = new RDFViewer();
  
  // This should not throw
  expect(() => {
    viewer.clear();
  }).not.toThrow();
});

test("RDFViewer getQuads method returns array", () => {
  const viewer = new RDFViewer();
  const quads = viewer.getQuads();
  expect(Array.isArray(quads)).toBe(true);
});

test("RDFViewer handles multiple values for same property", () => {
  const viewer = new RDFViewer();
  const testData = `
    @prefix foaf: <http://xmlns.com/foaf/0.1/> .
    @prefix ex: <http://example.org/> .
    
    ex:person foaf:knows ex:friend1, ex:friend2, ex:friend3 ;
              foaf:mbox <mailto:test1@example.org>, <mailto:test2@example.org> ;
              foaf:name "John Doe" .
  `;
  
  // Should not throw when parsing multiple values
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
  
  const quads = viewer.getQuads();
  expect(quads.length).toBeGreaterThan(0);
  
  // Should have multiple quads for foaf:knows
  const knowsQuads = quads.filter(q => q.predicate.value === 'http://xmlns.com/foaf/0.1/knows');
  expect(knowsQuads.length).toBe(3);
  
  // Should have multiple quads for foaf:mbox
  const mboxQuads = quads.filter(q => q.predicate.value === 'http://xmlns.com/foaf/0.1/mbox');
  expect(mboxQuads.length).toBe(2);
});

test("RDFViewer handles string literals without double quotes", () => {
  const viewer = new RDFViewer();
  const testData = `
    @prefix ex: <http://example.org/> .
    ex:person ex:name "John Doe" ;
              ex:description "A person with \"quotes\" in description" .
  `;
  
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
  
  const quads = viewer.getQuads();
  const nameQuad = quads.find(q => q.predicate.value === 'http://example.org/name');
  expect(nameQuad).toBeDefined();
  expect(nameQuad?.object.value).toBe('John Doe');
});

test("RDFViewer handles image URIs", () => {
  const viewer = new RDFViewer();
  const testData = `
    @prefix foaf: <http://xmlns.com/foaf/0.1/> .
    @prefix ex: <http://example.org/> .
    
    ex:person foaf:img <https://example.org/photo.jpg> ;
              foaf:depiction <https://example.org/avatar.png> .
  `;
  
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
  
  const quads = viewer.getQuads();
  const imgQuads = quads.filter(q => 
    q.predicate.value === 'http://xmlns.com/foaf/0.1/img' ||
    q.predicate.value === 'http://xmlns.com/foaf/0.1/depiction'
  );
  expect(imgQuads.length).toBe(2);
});

test("RDFViewer generates proper prefixes", () => {
  const viewer = new RDFViewer();
  const testData = `
    @prefix foaf: <http://xmlns.com/foaf/0.1/> .
    @prefix dcterms: <http://purl.org/dc/terms/> .
    @prefix schema: <https://schema.org/> .
    @prefix ex: <http://example.org/> .
    
    ex:person foaf:name "John" ;
              dcterms:title "Mr." ;
              schema:email "john@example.org" .
  `;
  
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
  
  // Should extract namespaces properly
  const quads = viewer.getQuads();
  expect(quads.length).toBeGreaterThan(0);
  
  // Check that we have quads from different namespaces
  const namespaces = new Set(quads.map(q => {
    const uri = q.predicate.value;
    const lastSlash = uri.lastIndexOf('/');
    const lastHash = uri.lastIndexOf('#');
    const splitIndex = Math.max(lastSlash, lastHash);
    return splitIndex > 0 ? uri.substring(0, splitIndex + 1) : uri;
  }));
  
  expect(namespaces.size).toBeGreaterThan(1);
});

test("RDFViewer handles malformed URIs gracefully", () => {
  const viewer = new RDFViewer();
  // Test with incomplete/malformed URIs that might cause the ns: <https://> bug
  const testData = `
    @prefix ex: <http://example.org/> .
    ex:person ex:property <https://> ;
              ex:another <http://> ;
              ex:valid <http://example.org/valid> .
  `;
  
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
  
  const quads = viewer.getQuads();
  expect(quads.length).toBe(3);
});

test("RDFViewer handles different RDF formats", () => {
  const viewer = new RDFViewer();
  
  // Test Turtle format
  const turtleData = `
    @prefix ex: <http://example.org/> .
    ex:person ex:name "John" .
  `;
  
  expect(() => {
    viewer.setData(turtleData, 'turtle');
  }).not.toThrow();
  
  // Test N-Triples format
  const ntriplesData = `<http://example.org/person> <http://example.org/name> "Jane" .`;
  
  expect(() => {
    viewer.setData(ntriplesData, 'ntriples');
  }).not.toThrow();
  
  // Test JSON-LD format
  const jsonldData = JSON.stringify({
    "@context": {
      "ex": "http://example.org/"
    },
    "@id": "ex:person",
    "ex:name": "Bob"
  });
  
  expect(() => {
    viewer.setData(jsonldData, 'jsonld');
  }).not.toThrow();
});

test("RDFViewer handles empty and invalid data", () => {
  const viewer = new RDFViewer();
  
  // Empty data should not throw
  expect(() => {
    viewer.setData('', 'turtle');
  }).not.toThrow();
  
  // Invalid syntax should be handled gracefully
  expect(() => {
    viewer.setData('invalid turtle syntax', 'turtle');
  }).not.toThrow();
  
  // After invalid data, quads should be empty or previous state
  const quads = viewer.getQuads();
  expect(Array.isArray(quads)).toBe(true);
});

test("RDFViewer attribute changes work correctly", () => {
  const viewer = new RDFViewer();
  
  // Test setting various attributes
  viewer.setAttribute('show-namespaces', 'true');
  viewer.setAttribute('expand-uris', 'false');
  viewer.setAttribute('theme', 'dark');
  viewer.setAttribute('layout', 'table');
  viewer.setAttribute('show-images-inline', 'true');
  
  expect(viewer.getAttribute('show-namespaces')).toBe('true');
  expect(viewer.getAttribute('expand-uris')).toBe('false');
  expect(viewer.getAttribute('theme')).toBe('dark');
  expect(viewer.getAttribute('layout')).toBe('table');
  expect(viewer.getAttribute('show-images-inline')).toBe('true');
});

test("RDFViewer handles complex RDF with various data types", () => {
  const viewer = new RDFViewer();
  const testData = `
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    @prefix ex: <http://example.org/> .
    
    ex:person ex:age "30"^^xsd:integer ;
              ex:height "5.9"^^xsd:float ;
              ex:birthDate "1990-01-01"^^xsd:date ;
              ex:isActive true ;
              ex:description "A person"@en ;
              ex:nom "Une personne"@fr .
  `;
  
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
  
  const quads = viewer.getQuads();
  expect(quads.length).toBe(6);
  
  // Check that different data types are preserved
  const ageQuad = quads.find(q => q.predicate.value === 'http://example.org/age');
  expect(ageQuad?.object.datatype.value).toBe('http://www.w3.org/2001/XMLSchema#integer');
  
  const descQuad = quads.find(q => q.predicate.value === 'http://example.org/description');
  expect(descQuad?.object.language).toBe('en');
});

test("RDFViewer handles Dublin Core metadata", () => {
  const viewer = new RDFViewer();
  const testData = `
    @prefix dcterms: <http://purl.org/dc/terms/> .
    @prefix dc: <http://purl.org/dc/elements/1.1/> .
    @prefix ex: <http://example.org/> .
    
    ex:document dc:title "Test Document" ;
                dc:creator "John Doe", "Jane Smith" ;
                dcterms:created "2023-01-01" ;
                dcterms:subject "Testing", "RDF", "Web Components" .
  `;
  
  expect(() => {
    viewer.setData(testData, 'turtle');
  }).not.toThrow();
  
  const quads = viewer.getQuads();
  expect(quads.length).toBe(6); // 1 title + 2 creators + 1 created + 3 subjects
  
  // Check multiple creators
  const creatorQuads = quads.filter(q => q.predicate.value === 'http://purl.org/dc/elements/1.1/creator');
  expect(creatorQuads.length).toBe(2);
  
  // Check multiple subjects
  const subjectQuads = quads.filter(q => q.predicate.value === 'http://purl.org/dc/terms/subject');
  expect(subjectQuads.length).toBe(3);
});
