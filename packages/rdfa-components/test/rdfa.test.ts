import { describe, expect, test } from "bun:test";
import { DOMParser } from "linkedom";
import {
  extractRdfaQuadsFromDom,
  extractRdfaSubjectsFromDom,
  parseRdfToQuads,
  quadsToRdfaSubjects,
  rdfaSubjectsToQuads,
  renderRdfa,
  renderRdfaDocument,
  rdfToRdfaHtml,
} from "../src";

const turtleSample = `
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:alice ex:name "Alice"@en ;
  ex:age "30"^^xsd:integer ;
  ex:friend ex:bob .
`;

const escapingSample = `
@prefix ex: <http://example.org/> .
ex:alice ex:note "Bob & <Bob>" .
`;

const trigSample = `
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Foo {
ex:alice ex:name "Alice"@en ;
  ex:age "30"^^xsd:integer ;
  ex:friend ex:bob .
}
`;

describe("rdfa conversion", () => {
  test("parses quads and groups to RDFa subjects", () => {
    const quads = parseRdfToQuads(turtleSample, "turtle");
    const subjects = quadsToRdfaSubjects(quads);
    expect(subjects).toHaveLength(1);
    const alice = subjects[0];
    expect(alice.subject).toBe("http://example.org/alice");
    expect(alice.properties.some((p) => p.predicate === "http://example.org/name" && p.lang === "en" && p.value === "Alice")).toBeTrue();
    expect(alice.properties.some((p) => p.predicate === "http://example.org/age" && p.datatype === "http://www.w3.org/2001/XMLSchema#integer" && p.value === "30")).toBeTrue();
    expect(alice.properties.some((p) => p.predicate === "http://example.org/friend" && p.value === "http://example.org/bob")).toBeTrue();
  });

  test("renders a single subject to RDFa html", () => {
    const quads = parseRdfToQuads(turtleSample, "turtle");
    const subjects = quadsToRdfaSubjects(quads);
    const html = renderRdfa(subjects[0]);
    expect(html).toContain('resource="http://example.org/alice"');
    expect(html).toContain('property="http://example.org/name"');
    expect(html).toContain('lang="en"');
    expect(html).toContain('datatype="http://www.w3.org/2001/XMLSchema#integer"');
    expect(html).toContain("Alice");
  });

  test("renders multiple subjects via renderRdfaDocument", () => {
    const doc = renderRdfaDocument([
      {
        subject: "http://example.org/a",
        properties: [{ predicate: "p", value: "v" }],
      },
      {
        subject: "http://example.org/b",
        properties: [{ predicate: "q", value: "w" }],
      },
    ]);
    expect(doc).toContain("http://example.org/a");
    expect(doc).toContain("http://example.org/b");
    expect(doc).toContain("property=\"p\"");
    expect(doc).toContain("property=\"q\"");
  });

  test("end-to-end conversion via rdfToRdfaHtml", () => {
    const html = rdfToRdfaHtml(turtleSample, "turtle");
    expect(html).toContain('resource="http://example.org/alice"');
    expect(html).toContain('property="http://example.org/age"');
  });

  test("escapes literal values for safety", () => {
    const html = rdfToRdfaHtml(escapingSample, "turtle");
    expect(html).toContain("Bob &amp; &lt;Bob&gt;");
    expect(html).not.toContain("<Bob>");
  });

  test("preserves named graphs via data-graph attribute", () => {
    const quads = parseRdfToQuads(trigSample, "trig");
    const subjects = quadsToRdfaSubjects(quads);
    expect(subjects).toHaveLength(1);
    expect(subjects[0].graph).toBe("http://example.org/Foo");

    const html = renderRdfa(subjects[0]);
    expect(html).toContain('data-graph="http://example.org/Foo"');

    const roundTripQuads = rdfaSubjectsToQuads(subjects);
    expect(roundTripQuads[0].graph.termType).toBe("NamedNode");
    expect(roundTripQuads[0].graph.value).toBe("http://example.org/Foo");
  });

  test("parseRdfToQuads can assign a default graph", () => {
    const quads = parseRdfToQuads(turtleSample, "turtle", { graph: "http://example.org/Graph" });
    expect(quads.every((q) => q.graph.termType === "NamedNode")).toBeTrue();
    expect(quads[0].graph.value).toBe("http://example.org/Graph");
  });

  test("extracts RDFa subjects from DOM", () => {
    const dom = new DOMParser().parseFromString(
      `
      <div resource="http://example.org/alice">
        <span property="http://example.org/name" lang="en">Alice</span>
        <a property="http://example.org/friend" href="http://example.org/bob"></a>
      </div>
      `,
      "text/html"
    );

    const subjects = extractRdfaSubjectsFromDom(dom);
    expect(subjects).toHaveLength(1);
    const alice = subjects[0];
    expect(alice.subject).toBe("http://example.org/alice");
    expect(alice.properties).toHaveLength(2);
    const nameProp = alice.properties.find((p) => p.predicate === "http://example.org/name");
    const friendProp = alice.properties.find((p) => p.predicate === "http://example.org/friend");
    expect(nameProp?.value).toBe("Alice");
    expect(nameProp?.lang).toBe("en");
    expect(friendProp?.value).toBe("http://example.org/bob");
    expect(friendProp?.resource).toBeTrue();
  });

  test("converts extracted RDFa to quads", () => {
    const dom = new DOMParser().parseFromString(
      `
      <div resource="http://example.org/alice">
        <span property="http://example.org/name" lang="en">Alice</span>
        <span property="http://example.org/age" datatype="http://www.w3.org/2001/XMLSchema#integer">30</span>
        <a property="http://example.org/friend" href="http://example.org/bob"></a>
      </div>
      `,
      "text/html"
    );

    const quads = extractRdfaQuadsFromDom(dom);
    expect(quads).toHaveLength(3);

    const names = quads.filter((q) => q.predicate.value === "http://example.org/name");
    expect(names[0].object.termType).toBe("Literal");
    expect((names[0].object as any).language).toBe("en");

    const ages = quads.filter((q) => q.predicate.value === "http://example.org/age");
    expect((ages[0].object as any).datatype.value).toBe("http://www.w3.org/2001/XMLSchema#integer");

    const friends = quads.filter((q) => q.predicate.value === "http://example.org/friend");
    expect(friends[0].object.termType).toBe("NamedNode");
    expect(friends[0].object.value).toBe("http://example.org/bob");
  });
});
