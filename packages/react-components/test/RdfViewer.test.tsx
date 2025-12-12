import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { createRoot } from "react-dom/client";
import { RdfViewer } from "../src";

const sampleData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .

ex:alice a foaf:Person ;
    foaf:name "Alice"@en ;
    foaf:mbox <mailto:alice@example.org> .
`;

describe("RdfViewer", () => {
  test("renders plain jsx", () => {
    render(<div>ok</div>);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  test("manual ReactDOM render works", () => {
    const div = document.createElement("div");
    const root = createRoot(div);
    root.render(<span>hello</span>);
    expect(div.textContent).toContain("hello");
    root.unmount();
  });

  test("renders namespace cards when enabled", () => {
    render(<RdfViewer data={sampleData} showNamespaces />);
    expect(screen.getByText("foaf")).toBeInTheDocument();
    expect(screen.getByText("ex")).toBeInTheDocument();
  });

  test("renders table rows with predicate labels", () => {
    render(<RdfViewer data={sampleData} />);
    expect(screen.getByText("foaf:name")).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  test("renders turtle layout", () => {
    render(<RdfViewer data={sampleData} layout="turtle" />);
    expect(screen.getByText(/@prefix foaf:/i)).toBeInTheDocument();
    expect(screen.getByText(/ex:alice foaf:name/)).toBeInTheDocument();
  });
});
