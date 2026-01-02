import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Switch,
} from "@digdir/designsystemet-react";
import type { RdfViewerProps } from "../src";
import { RdfViewer } from "../src";
import "@digdir/designsystemet-css";
import "@digdir/designsystemet-css/theme";

const globalScope = globalThis as typeof globalThis & {
  global?: typeof globalThis;
};
if (!globalScope.global) {
  globalScope.global = globalScope;
}

const foafPersonData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:alice a foaf:Person ;
    foaf:name "Alice Smith"@en ;
    foaf:name "Alice Schmidt"@de ;
    foaf:name "Alicia Martinez"@es ;
    foaf:nick "alice" ;
    foaf:nick "ali" ;
    foaf:age 28 ;
    foaf:birthday "1996-05-20"^^xsd:date ;
    foaf:mbox <mailto:alice@example.org> ;
    foaf:mbox <mailto:alice.smith@company.com> ;
    foaf:mbox <mailto:a.schmidt@university.edu> ;
    foaf:homepage <https://alice.example.org> ;
    foaf:homepage <https://alicesmith.blog> ;
    foaf:phone <tel:+12345678901> ;
    foaf:phone <tel:+19876543210> ;
    foaf:knows ex:bob ;
    foaf:knows ex:charlie ;
    foaf:knows ex:diana ;
    foaf:depiction <https://picsum.photos/200/200?random=1> ;
    foaf:depiction <https://picsum.photos/150/150?random=alice> ;
    foaf:workplaceHomepage <https://company.example.org> ;
    foaf:workplaceHomepage <https://startup.io> ;
    ex:score 87.5 ;
    ex:verified true ;
    ex:languages "English", "German", "Spanish" ;
    ex:skills "Programming", "Design", "Project Management" .

ex:bob a foaf:Person ;
    foaf:name "Bob Johnson"@en ;
    foaf:name "Robert Johnson"@en ;
    foaf:name "Roberto Johnson"@es ;
    foaf:nick "bobby" ;
    foaf:nick "bob" ;
    foaf:nick "rob" ;
    foaf:age 32 ;
    foaf:birthday "1992-11-03"^^xsd:date ;
    foaf:mbox <mailto:bob@example.org> ;
    foaf:mbox <mailto:robert.johnson@corp.com> ;
    foaf:mbox <mailto:bob.personal@gmail.com> ;
    foaf:homepage <https://bobjohnson.dev> ;
    foaf:knows ex:alice ;
    foaf:knows ex:charlie ;
    foaf:knows ex:eve ;
    foaf:workplaceHomepage <https://company.example.org/> ;
    foaf:depiction <https://picsum.photos/200/200?random=2> ;
    foaf:phone <tel:+15551234567> ;
    ex:score 92.3 ;
    ex:verified false ;
    ex:languages "English", "Spanish" ;
    ex:skills "Backend Development", "DevOps", "Architecture" .

ex:charlie a foaf:Person ;
    foaf:name "Charlie Brown"@en ;
    foaf:name "Carlos Brown"@es ;
    foaf:nick "charlie" ;
    foaf:nick "chuck" ;
    foaf:age 29 ;
    foaf:birthday "1995-08-15"^^xsd:date ;
    foaf:mbox <mailto:charlie@example.org> ;
    foaf:mbox <mailto:c.brown@freelancer.com> ;
    foaf:homepage <https://charliebrown.portfolio> ;
    foaf:knows ex:alice ;
    foaf:knows ex:bob ;
    foaf:knows ex:diana ;
    foaf:depiction <https://picsum.photos/200/200?random=3> ;
    foaf:phone <tel:+14445556666> ;
    ex:score 94.1 ;
    ex:verified true ;
    ex:languages "English", "Spanish", "Portuguese" ;
    ex:skills "Frontend Development", "UI/UX Design", "Mobile Development" .

ex:diana a foaf:Person ;
    foaf:name "Diana Prince"@en ;
    foaf:name "Diana Principe"@es ;
    foaf:nick "di" ;
    foaf:nick "wonder" ;
    foaf:age 30 ;
    foaf:birthday "1994-12-03"^^xsd:date ;
    foaf:mbox <mailto:diana@example.org> ;
    foaf:mbox <mailto:d.prince@consulting.com> ;
    foaf:mbox <mailto:diana.personal@proton.me> ;
    foaf:homepage <https://dianaprince.consulting> ;
    foaf:knows ex:alice ;
    foaf:knows ex:charlie ;
    foaf:knows ex:eve ;
    foaf:depiction <https://picsum.photos/200/200?random=4> ;
    foaf:phone <tel:+17778889999> ;
    foaf:phone <tel:+12223334444> ;
    ex:score 96.8 ;
    ex:verified true ;
    ex:languages "English", "Spanish", "French", "Italian" ;
    ex:skills "Data Science", "Machine Learning", "Consulting", "Strategy" .

ex:eve a foaf:Person ;
    foaf:name "Eve Adams"@en ;
    foaf:name "Eva Adams"@es ;
    foaf:nick "eve" ;
    foaf:nick "eva" ;
    foaf:age 26 ;
    foaf:birthday "1998-04-22"^^xsd:date ;
    foaf:mbox <mailto:eve@example.org> ;
    foaf:mbox <mailto:e.adams@startup.io> ;
    foaf:homepage <https://eveadams.tech> ;
    foaf:knows ex:bob ;
    foaf:knows ex:diana ;
    foaf:depiction <https://picsum.photos/200/200?random=5> ;
    foaf:phone <tel:+16667778888> ;
    ex:score 88.9 ;
    ex:verified true ;
    ex:languages "English", "French" ;
    ex:skills "Product Management", "Growth Hacking", "Analytics" .
`;

const dublinCoreData = `
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:document1 dc:title "Introduction to RDF"@en ;
    dc:title "Einführung in RDF"@de ;
    dc:title "Introduction au RDF"@fr ;
    dc:creator "Jane Doe" ;
    dc:creator "Dr. Jane Smith" ;
    dc:creator "J. Doe, PhD" ;
    dc:subject "RDF, Semantic Web, Linked Data" ;
    dc:subject "Knowledge Graphs" ;
    dc:subject "Data Integration" ;
    dc:description "A comprehensive guide to Resource Description Framework"@en ;
    dc:description "Ein umfassender Leitfaden zum Resource Description Framework"@de ;
    dc:description "Un guide complet du Framework de Description des Ressources"@fr ;
    dc:publisher "Example Publishing" ;
    dc:publisher "Academic Press" ;
    dc:date "2024-01-15"^^xsd:date ;
    dc:date "2024-01-20"^^xsd:date ;
    dc:type "Book" ;
    dc:type "Reference" ;
    dc:type "Academic" ;
    dc:format "application/pdf" ;
    dc:format "text/html" ;
    dc:format "application/epub+zip" ;
    dc:language "en" ;
    dc:language "de" ;
    dc:language "fr" ;
    dc:rights "Copyright 2024 Example Publishing" ;
    dc:rights "Creative Commons BY-SA 4.0" ;
    ex:pages 256 ;
    ex:cover <https://picsum.photos/300/400?random=book1> ;
    ex:cover <https://picsum.photos/250/350?random=book1alt> ;
    ex:price 29.99 ;
    ex:price 24.99 ;
    ex:isbn "978-0-123456-78-9" ;
    ex:isbn "978-0-987654-32-1" .

ex:document2 dc:title "Advanced SPARQL Queries"@en ;
    dc:title "Consultas SPARQL Avanzadas"@es ;
    dc:creator "John Smith" ;
    dc:creator "Prof. John A. Smith" ;
    dc:creator "Maria Garcia" ;
    dc:subject "SPARQL, Query Language, RDF" ;
    dc:subject "Database Queries" ;
    dc:subject "Semantic Search" ;
    dc:description "Learn advanced techniques for querying RDF data"@en ;
    dc:description "Aprende técnicas avanzadas para consultar datos RDF"@es ;
    dc:publisher "Tech Books Inc." ;
    dc:publisher "Digital Learning Press" ;
    dc:date "2024-02-20"^^xsd:date ;
    dc:type "Tutorial" ;
    dc:type "Educational" ;
    dc:format "text/html" ;
    dc:format "application/pdf" ;
    dc:language "en" ;
    dc:language "es" ;
    ex:pages 180 ;
    ex:cover <https://picsum.photos/300/400?random=book2> ;
    ex:price 19.99 ;
    ex:isbn "978-0-555666-77-8" .

ex:document3 dc:title "Linked Data Patterns"@en ;
    dc:title "Patrones de Datos Enlazados"@es ;
    dc:title "Modèles de Données Liées"@fr ;
    dc:creator "Alice Johnson" ;
    dc:creator "Bob Smith" ;
    dc:creator "Charlie Brown" ;
    dc:subject "Linked Data" ;
    dc:subject "Design Patterns" ;
    dc:subject "Best Practices" ;
    dc:subject "Data Architecture" ;
    dc:description "Common patterns and best practices for Linked Data"@en ;
    dc:description "Patrones comunes y mejores prácticas para Datos Enlazados"@es ;
    dc:publisher "Data Press" ;
    dc:date "2024-03-10"^^xsd:date ;
    dc:type "Handbook" ;
    dc:type "Reference" ;
    dc:format "application/pdf" ;
    dc:format "text/html" ;
    dc:language "en" ;
    dc:language "es" ;
    dc:language "fr" ;
    ex:pages 320 ;
    ex:cover <https://picsum.photos/300/400?random=book3> ;
    ex:price 34.99 ;
    ex:isbn "978-0-111222-33-4" .
`;

const sampleData = `${foafPersonData}\n${dublinCoreData}`;

function App() {
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.setAttribute("data-color-scheme", colorScheme);
    document.body.setAttribute("data-color-scheme", colorScheme);
  }, [colorScheme]);

  return (
    <div
      style={{
        margin: "var(--ds-size-7) auto",
        maxWidth: "52rem",
        paddingInline: "var(--ds-size-5)",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--ds-size-4)",
        }}
      >
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
          onChange={(event) => {
            setColorScheme(event.currentTarget.checked ? "dark" : "light");
          }}
          position="end"
        />
      </div>
      <Card style={{ marginTop: "var(--ds-size-6)" }}>
        <CardBlock>
          <RdfViewer {...viewerProps} theme={colorScheme} />
        </CardBlock>
      </Card>
    </div>
  );
}

const viewerProps: RdfViewerProps = {
  data: sampleData,
  preferredLanguages: ["en"],
  vocabularies: ["/vocab"],
  enableNavigation: true,
};

const root = createRoot(document.getElementById("app")!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
