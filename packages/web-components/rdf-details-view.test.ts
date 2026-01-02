import { expect, test } from "bun:test";

class MockHTMLElement {
  private attributes = new Map<string, string>();
  shadowRoot = { innerHTML: "" };

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

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    const oldValue = this.attributes.get(name) ?? null;
    this.attributes.set(name, value);
    if (typeof (this as any).attributeChangedCallback === "function") {
      (this as any).attributeChangedCallback(name, oldValue, value);
    }
  }

  attachShadow() {
    return this.shadowRoot;
  }

  connectedCallback() {}
  attributeChangedCallback() {}
}

const registry = new Map<string, any>();

(globalThis as any).HTMLElement = MockHTMLElement;

(globalThis as any).customElements = {
  define(name: string, ctor: any) {
    if (!registry.has(name)) {
      registry.set(name, ctor);
    }
  },
  get(name: string) {
    return registry.get(name) ?? null;
  },
};

(globalThis as any).document = {
  createElement() {
    return {
      innerHTML: "",
      textContent: "",
      attachShadow: () => ({ innerHTML: "" }),
    };
  },
};

(globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};

(globalThis as any).cancelAnimationFrame ??= () => {};

const { RDFDetailsView } = await import("./rdf-details-view.ts");

const sampleTurtle = `
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice a foaf:Person ;
  foaf:name "Alice"@en ;
  ex:score 42 .
`;

test("defines the custom element", () => {
  expect(registry.get("rdf-details-view")).toBeDefined();
});

test("instantiates and renders", () => {
  const viewer = new RDFDetailsView();
  expect(viewer.shadowRoot).toBeDefined();
});

test("observed attributes include vocabularies", () => {
  expect(RDFDetailsView.observedAttributes).toContain("vocabularies");
});

test("setData stores quads", () => {
  const viewer = new RDFDetailsView();
  viewer.setData(sampleTurtle, "turtle");
  expect(viewer.getQuads().length).toBeGreaterThan(0);
});

test("setConfig updates attributes", () => {
  const viewer = new RDFDetailsView();
  viewer.setConfig({ showNamespaces: false, theme: "dark" });
  expect(viewer.getAttribute("show-namespaces")).toBe("false");
  expect(viewer.getAttribute("theme")).toBe("dark");
});

test("clear empties store", () => {
  const viewer = new RDFDetailsView();
  viewer.setData(sampleTurtle, "turtle");
  viewer.clear();
  expect(viewer.getQuads().length).toBe(0);
});

test("handles malformed data", () => {
  const viewer = new RDFDetailsView();
  expect(() => viewer.setData("<bad turtle", "turtle")).not.toThrow();
});
