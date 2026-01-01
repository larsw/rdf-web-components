import { describe, expect, test } from "bun:test";
import { act } from "react";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { createRoot } from "react-dom/client";
import { RdfViewer } from "../src";

const sampleData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

ex:alice a foaf:Person ;
    foaf:name "Alice"@en ;
    foaf:mbox <mailto:alice@example.org> .

foaf:name rdfs:label "name"@en ;
  skos:altLabel "display name"@en .
`;

const navigationData = `
@prefix ex: <http://example.org/> .

ex:alice ex:knows ex:bob .
ex:bob ex:name "Bob"@en .
`;

describe("RdfViewer", () => {
  test("renders plain jsx", () => {
    render(<div>ok</div>);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  test("manual ReactDOM render works", () => {
    const div = document.createElement("div");
    const root = createRoot(div);
    act(() => {
      root.render(<span>hello</span>);
    });
    expect(div.textContent).toContain("hello");
    act(() => {
      root.unmount();
    });
  });

  test("renders namespace cards when enabled", () => {
    render(<RdfViewer data={sampleData} showNamespaces />);
    expect(screen.getByText("foaf")).toBeInTheDocument();
    expect(screen.getByText("exa")).toBeInTheDocument();
  });

  test("renders table rows with predicate labels", () => {
    render(<RdfViewer data={sampleData} />);
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  test("renders turtle layout", () => {
    render(<RdfViewer data={sampleData} layout="turtle" />);
    expect(screen.getByText(/@prefix foaf:/i)).toBeInTheDocument();
    expect(screen.getByText(/exa:alice foaf:name/)).toBeInTheDocument();
  });

  test("uses vocabulary labels when provided", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
foaf:mbox rdfs:label "email"@en .
        `.trim()
      );

    render(<RdfViewer data={sampleData} vocabularies={["http://example.org/foaf.ttl"]} />);
    expect(await screen.findByText("email")).toBeInTheDocument();

    globalThis.fetch = originalFetch;
  });

  test("navigates to a referenced subject", () => {
    render(<RdfViewer data={navigationData} enableNavigation />);
    const navigateButton = screen.getByRole("button", { name: /Navigate to exa:bob/i });
    fireEvent.click(navigateButton);
    expect(screen.getByText(/Viewing:/)).toBeInTheDocument();
    expect(screen.getAllByText(/exa:bob/i).length).toBeGreaterThan(0);
  });
});
