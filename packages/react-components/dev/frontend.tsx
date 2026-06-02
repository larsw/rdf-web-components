import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import * as RDF from "@rdfjs/types";
import { DataFactory, Writer, type Quad } from "n3";

import {
  Card,
  CardBlock,
  Heading,
  Paragraph,
  Switch,
} from "@digdir/designsystemet-react";
import "@digdir/designsystemet-css";
import "@digdir/designsystemet-css/theme";

import type { LiteralRenderer, LiteralRendererOptions, PredicateRenderer, PredicateRendererOptions, RdfDetailsViewProps } from "../src";
import { RdfDetailsView } from "../src";

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

<http://example.org/alice> {
<http://example.org/alice#data> a foaf:Person ;
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
}
{
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
}
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

const { namedNode, blankNode, literal, quad: makeQuad } = DataFactory;

const turtlePrefixes: Record<string, string> = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  foaf: "http://xmlns.com/foaf/0.1/",
  dc: "http://purl.org/dc/elements/1.1/",
  dcterms: "http://purl.org/dc/terms/",
  skos: "http://www.w3.org/2004/02/skos/core#",
  schema: "http://schema.org/",
  ex: "http://example.org/",
};

const toResource = (value: string) =>
  value.startsWith("_:") ? blankNode(value.slice(2)) : namedNode(value);

/**
 * Reconstruct quads from the RDFa attributes the component renders into the
 * DOM (`about` on subjects, `property`/`rel`/`resource`/`content`/`datatype`/
 * `lang` on objects). This reads back the emitted markup rather than the
 * source data, so it reflects exactly what is currently displayed.
 */
const extractRdfaQuads = (root: HTMLElement): Quad[] => {
  const quads: Quad[] = [];

  root.querySelectorAll<HTMLElement>("[property]").forEach((element) => {
    const subjectElement = element.closest<HTMLElement>("[about]");
    const about = subjectElement?.getAttribute("about");
    const predicate = element.getAttribute("property");
    if (!about || !predicate) {
      return;
    }
    const value = element.getAttribute("content") ?? element.textContent ?? "";
    const language = element.getAttribute("lang");
    const datatype = element.getAttribute("datatype");
    const object = language
      ? literal(value, language)
      : datatype
        ? literal(value, namedNode(datatype))
        : literal(value);
    quads.push(makeQuad(toResource(about), namedNode(predicate), object));
  });

  root
    .querySelectorAll<HTMLElement>("[rel][resource]")
    .forEach((element) => {
      const subjectElement = element.closest<HTMLElement>("[about]");
      const about = subjectElement?.getAttribute("about");
      const predicate = element.getAttribute("rel");
      const resource = element.getAttribute("resource");
      if (!about || !predicate || !resource) {
        return;
      }
      quads.push(
        makeQuad(
          toResource(about),
          namedNode(predicate),
          toResource(resource),
        ),
      );
    });

  return quads;
};

const serializeTurtle = (quads: Quad[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const writer = new Writer({ prefixes: turtlePrefixes });
    writer.addQuads(quads);
    writer.end((error, result) =>
      error ? reject(error) : resolve(result ?? ""),
    );
  });

function App() {
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("dark");
  const [emitRdfa, setEmitRdfa] = useState(false);
  const [turtle, setTurtle] = useState("");
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-color-scheme", colorScheme);
    document.body.setAttribute("data-color-scheme", colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    const element = viewerRef.current;
    if (!emitRdfa || !element) {
      setTurtle("");
      return;
    }

    let frame = 0;
    const extract = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        serializeTurtle(extractRdfaQuads(element))
          .then(setTurtle)
          .catch((error: unknown) =>
            setTurtle(`# Failed to serialize RDFa: ${String(error)}`),
          );
      });
    };

    extract();
    const observer = new MutationObserver(extract);
    observer.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [emitRdfa]);

  return (
    <div
      style={{
        margin: "var(--ds-size-7) auto",
        maxWidth: "52rem",
        paddingInline: "var(--ds-size-5)",
        width: "%",
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
            Playground for the <em>RdfDetailsView</em> component.
          </Paragraph>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--ds-size-2)",
          }}
        >
          <Switch
            label="Dark mode"
            checked={colorScheme === "dark"}
            onChange={(event) => {
              setColorScheme(event.currentTarget.checked ? "dark" : "light");
            }}
            position="end"
            value={"dark"}
          />
          <Switch
            label="Emit RDFa"
            description="Annotate the view with RDFa and show the extracted Turtle"
            checked={emitRdfa}
            onChange={(event) => {
              setEmitRdfa(event.currentTarget.checked);
            }}
            position="end"
            value={"rdfa"}
          />
        </div>
      </div>
      <Card style={{ marginTop: "var(--ds-size-6)" }}>
        <CardBlock>
          <div ref={viewerRef}>
            <RdfDetailsView
              {...viewerProps}
              theme={colorScheme}
              emitRdfa={emitRdfa}
            />
          </div>
        </CardBlock>
      </Card>
      {emitRdfa ? (
        <Card style={{ marginTop: "var(--ds-size-5)" }}>
          <CardBlock>
            <Heading level={2} data-size="sm">
              Extracted RDFa (Turtle)
            </Heading>
            <Paragraph data-size="sm" style={{ marginTop: "0.25rem" }}>
              Reconstructed from the RDFa attributes in the rendered markup
              above.
            </Paragraph>
            <pre
              aria-label="Extracted RDFa as Turtle"
              style={{
                marginTop: "var(--ds-size-3)",
                padding: "var(--ds-size-3)",
                borderRadius: "var(--ds-border-radius-md, 8px)",
                background: "var(--ds-color-neutral-surface-tinted, #00000014)",
                overflow: "auto",
                maxHeight: "28rem",
                fontFamily:
                  "var(--ds-font-family-mono, ui-monospace, monospace)",
                fontSize: "0.8125rem",
                whiteSpace: "pre",
              }}
            >
              {turtle || "# No triples extracted from the current view."}
            </pre>
          </CardBlock>
        </Card>
      ) : null}
    </div>
  );
}

const isNamedNode = (quad: RDF.Quad_Object): boolean => quad.termType === 'NamedNode';

const predicateRenderers: Record<string, PredicateRenderer> = {
  // "http://xmlns.com/foaf/0.1/depiction": (quad: Quad, _opts: PredicateRendererOptions) => {
  //   if (isNamedNode(quad.object)) {
  //     return (<img
  //       src={quad.object.value} // Value is Iri which derives from string
  //       alt="Depiction"
  //       style={{ maxWidth: "50px", borderRadius: "8px" }}
  //     />);
  //   } else {
  //     return <span>Invalid depiction value ({quad.object.termType})</span>;
  //   }
  // }
}

const literalRenderers: Record<string, LiteralRenderer> = {
  // "http://www.w3.org/2001/XMLSchema#date": (literal, _quad: Quad, _opts: LiteralRendererOptions) => {
  //   const date = new Date(literal.value);
  //   return <span style={{ fontFamily: 'Ubuntu Mono', color: 'red' }}>{date.toISOString()}</span>;
  // }
};

const viewerProps: RdfDetailsViewProps = {
  data: sampleData,
  preferredLanguages: ["en"],
  vocabularies: ["/vocab"],
  enableNavigation: true,
  predicateRenderers: predicateRenderers,
  literalRenderers: literalRenderers,
  theme: "dark",
  showNamespaces: true,
  format: "trig",
};

const root = createRoot(document.getElementById("app")!);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// if (import.meta.hot) {
//   import.meta.hot.accept();
// }

