import React from "react";
import { createRoot } from "react-dom/client";
import { RdfViewer } from "../src";

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

const root = createRoot(document.getElementById("app")!);

root.render(
  <React.StrictMode>
    <RdfViewer data={sampleData} preferredLanguages={["en"]} />
  </React.StrictMode>
);
