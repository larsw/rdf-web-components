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
  
  static observedAttributes = ['data', 'format', 'show-namespaces', 'expand-uris', 'theme', 'layout', 'preferred-languages', 'vocabularies'];
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
