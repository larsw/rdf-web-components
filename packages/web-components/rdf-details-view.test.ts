import { expect, test } from "bun:test";
import "./test/setup";

const { RDFDetailsView } = await import("./rdf-details-view.ts");

const sampleTurtle = `
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice a foaf:Person ;
  foaf:name "Alice"@en ;
  ex:score 42 .
`;

test("defines the custom element", () => {
  expect(customElements.get("rdf-details-view")).toBeDefined();
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
