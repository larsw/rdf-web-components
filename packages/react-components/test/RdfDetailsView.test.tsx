import "./setup";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { createRoot } from "react-dom/client";
import { RdfDetailsView } from "../src";

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

const orderedData = `
@prefix ex: <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

ex:alice foaf:name "Alice" ;
  ex:score 42 ;
  ex:role "Owner" .
`;

const imageData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .

ex:alice foaf:depiction <https://picsum.photos/200/200?random=1> ;
  foaf:depiction <https://picsum.photos/200/200?random=2> .
`;

describe("RdfDetailsView", () => {
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
    render(<RdfDetailsView data={sampleData} showNamespaces />);
    expect(screen.getByText("foaf")).toBeInTheDocument();
    expect(screen.getByText("exa")).toBeInTheDocument();
  });

  test("renders table rows with predicate labels", () => {
    render(<RdfDetailsView data={sampleData} />);
    expect(screen.getAllByText("name").length).toBeGreaterThan(0);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  test("uses vocabulary labels when provided", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
foaf:mbox rdfs:label "email"@en .
        `.trim(),
      );

    render(
      <RdfDetailsView
        data={sampleData}
        vocabularies={["http://example.org/foaf.ttl"]}
      />,
    );
    expect(await screen.findByText("email")).toBeInTheDocument();

    globalThis.fetch = originalFetch;
  });

  test("navigates to a referenced subject", () => {
    render(<RdfDetailsView data={navigationData} enableNavigation />);
    const navigateButton = screen.getByRole("button", {
      name: /Navigate to exa:bob/i,
    });
    fireEvent.click(navigateButton);
    expect(screen.getByText(/Viewing:/)).toBeInTheDocument();
    expect(screen.getAllByText(/exa:bob/i).length).toBeGreaterThan(0);
  });

  test("renders an image carousel for multiple image objects", () => {
    render(<RdfDetailsView data={imageData} />);
    expect(
      screen.getByRole("button", { name: "Previous image" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next image" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  test("orders predicates based on predicateOrder", () => {
    render(
      <RdfDetailsView
        data={orderedData}
        predicateOrder={["http://example.org/role", "http://example.org/score"]}
      />,
    );
    const headers = screen
      .getAllByRole("columnheader")
      .map((node) => node.textContent);
    expect(headers[0]).toBe("exa:role");
    expect(headers[1]).toBe("exa:score");
  });

  test("shows error state for invalid data", () => {
    render(<RdfDetailsView data="<bad" />);
    expect(screen.getByText(/Failed to parse RDF data/i)).toBeInTheDocument();
  });

  test("shows empty state when there is no data", () => {
    render(<RdfDetailsView data="" />);
    expect(screen.getByText(/No RDF data to display/i)).toBeInTheDocument();
  });

  test("uses custom literal and predicate renderers", () => {
    const data = `@prefix ex: <http://example.org/> .
ex:alice ex:score "99"^^<http://example.org/custom> .`;

    const literalRenderers = {
      "http://example.org/custom": ({ literal }: any) => (
        <span data-testid="custom-literal">custom-{literal.value}</span>
      ),
    };

    const predicateRenderers = {
      "http://example.org/score": ({ defaultRender }: any) => (
        <div data-testid="custom-predicate">{defaultRender()}</div>
      ),
    };

    render(
      <RdfDetailsView
        data={data}
        literalRenderers={literalRenderers}
        predicateRenderers={predicateRenderers}
      />,
    );

    expect(screen.getByTestId("custom-literal").textContent).toBe("custom-99");
    expect(screen.getByTestId("custom-predicate")).toBeInTheDocument();
  });

  test("shows content negotiation hints when enabled", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: RequestInfo, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: { "content-type": "application/ld+json" },
        });
      }
      return new Response("", { status: 404 });
    };

    const data = `@prefix ex: <http://example.org/> .
ex:alice ex:pic <http://example.org/pic.jpg> .`;

    render(
      <RdfDetailsView
        data={data}
        enableContentNegotiation
        showNamespaces
        showImagesInline={false}
      />,
    );

    expect(await screen.findByText(/application\/ld\+json/i)).toBeInTheDocument();

    globalThis.fetch = originalFetch;
  });

  test("renders image carousel links when showImageUrls is enabled", () => {
    render(
      <RdfDetailsView
        data={imageData}
        showImageUrls
        showImagesInline
        enableNavigation={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Previous image" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next image" })).toBeEnabled();
    expect(screen.getByRole("link", { name: /pic:200\?random=1/i })).toBeInTheDocument();
  });
});
