import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Switch
} from "@digdir/designsystemet-react";
import type { RdfViewerProps } from "../src";
import { RdfViewer } from "../src";
import "@digdir/designsystemet-css";
import "@digdir/designsystemet-css/theme";

const globalScope = globalThis as typeof globalThis & { global?: typeof globalThis };
if (!globalScope.global) {
  globalScope.global = globalScope;
}

const sampleData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .

ex:alice a foaf:Person ;
  foaf:name "Alice"@en ;
  foaf:mbox <mailto:alice@example.org> ;
  foaf:knows ex:bob .

ex:bob a foaf:Person ;
  foaf:name "Bob"@en ;
  foaf:mbox <mailto:bob@example.org> .
`;

function App() {
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-color-scheme", colorScheme);
    document.body.setAttribute("data-color-scheme", colorScheme);
  }, [colorScheme]);

  return (
    <div style={{ margin: "2rem auto", maxWidth: "960px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <Heading level={1} data-size="lg">
            RDF React Components
          </Heading>
          <Paragraph data-size="md" style={{ marginTop: "0.5rem" }}>
            Playground for the RdfViewer component using Designsystemet styles.
          </Paragraph>
        </div>
        <Switch
          label="Dark mode"
          checked={colorScheme === "dark"}
          onChange={event => {
            setColorScheme(event.currentTarget.checked ? "dark" : "light");
          }}
          position="end"
        />
      </div>
      <Card style={{ marginTop: "1.5rem" }}>
        <CardBlock>
          <RdfViewer {...viewerProps} />
        </CardBlock>
      </Card>
    </div>
  );
}

const viewerProps: RdfViewerProps = {
  data: sampleData,
  preferredLanguages: ["en"],
  vocabularies: ["/vocab"]
};

const root = createRoot(document.getElementById("app")!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
