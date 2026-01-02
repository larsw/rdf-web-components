// Dynamically load the web component to avoid bundler edge cases
// and defer heavy work until after DOM is ready

// Comprehensive test data (trimmed to avoid bundler issues); load larger sets on-demand if needed
const comprehensiveTestData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:alice a foaf:Person ;
    foaf:name "Alice Smith"@en ;
    foaf:nick "alice" ;
    foaf:age 28 ;
    foaf:birthday "1996-05-20"^^xsd:date ;
    foaf:mbox <mailto:alice@example.org> ;
    foaf:homepage <https://alice.example.org> ;
    foaf:depiction <https://picsum.photos/200/200?random=1> ;
    foaf:knows ex:bob, ex:charlie .

ex:bob a foaf:Person ;
    foaf:name "Bob Johnson"@en ;
    foaf:nick "bob" ;
    foaf:homepage <https://bobjohnson.dev> ;
    foaf:knows ex:alice .

ex:charlie a foaf:Person ;
    foaf:name "Charlie Brown"@en ;
    foaf:nick "charlie" ;
    foaf:knows ex:alice .
`;

// Small default test data to keep initial load light
const smallTestData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:person1 a foaf:Person ;
    foaf:name "John Doe"@en ;
    foaf:nick "john" ;
    foaf:age 30 ;
    foaf:birthday "1994-03-15"^^xsd:date ;
    foaf:mbox <mailto:john@example.org> ;
    foaf:homepage <https://johndoe.dev> ;
    foaf:depiction <https://via.placeholder.com/120x120.png> ;
    foaf:knows ex:person2 .

ex:person2 a foaf:Person ;
    foaf:name "Jane Smith"@en ;
    foaf:nick "jane" .
`;

// Sample RDF data in Turtle format
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

// Function to set up event listeners for controls
function setupControls() {
  // Viewer 1 controls
  const showNamespaces1 = document.getElementById(
    "show-namespaces-1",
  ) as HTMLInputElement;
  const expandUris1 = document.getElementById(
    "expand-uris-1",
  ) as HTMLInputElement;
  const showImagesInline1 = document.getElementById(
    "show-images-inline-1",
  ) as HTMLInputElement;
  const theme1 = document.getElementById("theme-1") as HTMLSelectElement;
  const viewer1 = document.getElementById("viewer1") as any;

  showNamespaces1.addEventListener("change", () => {
    viewer1.setAttribute("show-namespaces", showNamespaces1.checked.toString());
  });

  expandUris1.addEventListener("change", () => {
    viewer1.setAttribute("expand-uris", expandUris1.checked.toString());
  });

  theme1.addEventListener("change", () => {
    viewer1.setAttribute("theme", theme1.value);
  });

  showImagesInline1.addEventListener("change", () => {
    viewer1.setAttribute(
      "show-images-inline",
      showImagesInline1.checked.toString(),
    );
  });

  // Viewer 2 controls
  const showNamespaces2 = document.getElementById(
    "show-namespaces-2",
  ) as HTMLInputElement;
  const expandUris2 = document.getElementById(
    "expand-uris-2",
  ) as HTMLInputElement;
  const showImagesInline2 = document.getElementById(
    "show-images-inline-2",
  ) as HTMLInputElement;
  const theme2 = document.getElementById("theme-2") as HTMLSelectElement;
  const viewer2 = document.getElementById("viewer2") as any;

  showNamespaces2.addEventListener("change", () => {
    viewer2.setAttribute("show-namespaces", showNamespaces2.checked.toString());
  });

  expandUris2.addEventListener("change", () => {
    viewer2.setAttribute("expand-uris", expandUris2.checked.toString());
  });

  theme2.addEventListener("change", () => {
    viewer2.setAttribute("theme", theme2.value);
  });

  showImagesInline2.addEventListener("change", () => {
    viewer2.setAttribute(
      "show-images-inline",
      showImagesInline2.checked.toString(),
    );
  });

  // Viewer 3 controls
  const showNamespaces3 = document.getElementById(
    "show-namespaces-3",
  ) as HTMLInputElement;
  const expandUris3 = document.getElementById(
    "expand-uris-3",
  ) as HTMLInputElement;
  const showImagesInline3 = document.getElementById(
    "show-images-inline-3",
  ) as HTMLInputElement;
  const theme3 = document.getElementById("theme-3") as HTMLSelectElement;
  const format3 = document.getElementById("format-3") as HTMLSelectElement;
  const viewer3 = document.getElementById("viewer3") as any;

  showNamespaces3.addEventListener("change", () => {
    viewer3.setAttribute("show-namespaces", showNamespaces3.checked.toString());
  });

  expandUris3.addEventListener("change", () => {
    viewer3.setAttribute("expand-uris", expandUris3.checked.toString());
  });

  theme3.addEventListener("change", () => {
    viewer3.setAttribute("theme", theme3.value);
  });

  format3.addEventListener("change", () => {
    viewer3.setAttribute("format", format3.value);
  });

  showImagesInline3.addEventListener("change", () => {
    viewer3.setAttribute(
      "show-images-inline",
      showImagesInline3.checked.toString(),
    );
  });
}

// Function to update viewers
(window as any).updateViewer1 = function () {
  const showNamespaces1 = (
    document.getElementById("show-namespaces-1") as HTMLInputElement
  ).checked;
  const expandUris1 = (
    document.getElementById("expand-uris-1") as HTMLInputElement
  ).checked;
  const showImagesInline1 = (
    document.getElementById("show-images-inline-1") as HTMLInputElement
  ).checked;
  const enableNavigation1 = (
    document.getElementById("enable-navigation-1") as HTMLInputElement
  ).checked;
  const theme1 = (document.getElementById("theme-1") as HTMLSelectElement)
    .value;
  const languages1 = (
    document.getElementById("languages-1") as HTMLInputElement
  ).value;
  const vocabularies1 =
    (document.getElementById("vocabularies-1") as HTMLSelectElement)?.value ||
    "";
  const viewer1 = document.getElementById("viewer1") as any;
  const section1 = document.getElementById("section-1") as HTMLElement | null;

  viewer1.setAttribute("show-namespaces", showNamespaces1.toString());
  viewer1.setAttribute("expand-uris", expandUris1.toString());
  viewer1.setAttribute("show-images-inline", showImagesInline1.toString());
  viewer1.setAttribute("enable-navigation", enableNavigation1.toString());
  viewer1.setAttribute("theme", theme1);
  viewer1.setAttribute("preferred-languages", languages1);
  if (section1) {
    section1.dataset.theme = theme1;
  }
  if (vocabularies1) {
    viewer1.setAttribute("vocabularies", vocabularies1);
  }
};

(window as any).updateViewer2 = function () {
  const showNamespaces2 = (
    document.getElementById("show-namespaces-2") as HTMLInputElement
  ).checked;
  const expandUris2 = (
    document.getElementById("expand-uris-2") as HTMLInputElement
  ).checked;
  const showImagesInline2 = (
    document.getElementById("show-images-inline-2") as HTMLInputElement
  ).checked;
  const enableNavigation2 = (
    document.getElementById("enable-navigation-2") as HTMLInputElement
  ).checked;
  const theme2 = (document.getElementById("theme-2") as HTMLSelectElement)
    .value;
  const vocabularies2 =
    (document.getElementById("vocabularies-2") as HTMLSelectElement)?.value ||
    "";
  const viewer2 = document.getElementById("viewer2") as any;
  const section2 = document.getElementById("section-2") as HTMLElement | null;

  viewer2.setAttribute("show-namespaces", showNamespaces2.toString());
  viewer2.setAttribute("expand-uris", expandUris2.toString());
  viewer2.setAttribute("show-images-inline", showImagesInline2.toString());
  viewer2.setAttribute("enable-navigation", enableNavigation2.toString());
  viewer2.setAttribute("theme", theme2);
  if (section2) {
    section2.dataset.theme = theme2;
  }
  if (vocabularies2) {
    viewer2.setAttribute("vocabularies", vocabularies2);
  }
};

// Function to update the custom viewer with user input
(window as any).updateCustomViewer = function () {
  const customData = (
    document.getElementById("custom-data") as HTMLTextAreaElement
  ).value;
  const format3 = (document.getElementById("format-3") as HTMLSelectElement)
    .value;
  const showNamespaces3 = (
    document.getElementById("show-namespaces-3") as HTMLInputElement
  ).checked;
  const expandUris3 = (
    document.getElementById("expand-uris-3") as HTMLInputElement
  ).checked;
  const showImagesInline3 = (
    document.getElementById("show-images-inline-3") as HTMLInputElement
  ).checked;
  const theme3 = (document.getElementById("theme-3") as HTMLSelectElement)
    .value;
  const viewer3 = document.getElementById("viewer3") as any;
  const section3 = document.getElementById("section-3") as HTMLElement | null;

  viewer3.setAttribute("data", customData);
  viewer3.setAttribute("format", format3);
  viewer3.setAttribute("show-namespaces", showNamespaces3.toString());
  viewer3.setAttribute("expand-uris", expandUris3.toString());
  viewer3.setAttribute("show-images-inline", showImagesInline3.toString());
  viewer3.setAttribute("theme", theme3);
  if (section3) {
    section3.dataset.theme = theme3;
  }
};

// Initialize the page when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  await import("./rdf-details-view.ts");
  // Set up the sample data for viewers
  const viewer1 = document.getElementById("viewer1") as any;
  const viewer2 = document.getElementById("viewer2") as any;
  const viewer3 = document.getElementById("viewer3") as any;

  // Load sample data
  viewer1.setAttribute("data", foafPersonData);
  viewer2.setAttribute("data", dublinCoreData);

  // Load small test data by default into viewer3 (lighter initial load)
  viewer3.setAttribute("data", smallTestData);

  // Update the textarea with comprehensive test data
  const customDataTextarea = document.getElementById(
    "custom-data",
  ) as HTMLTextAreaElement;
  if (customDataTextarea) {
    customDataTextarea.value = smallTestData;
  }

  // Set up event listeners
  setupControls();

  console.log(
    "RDF Details View test page initialized (small test data by default)",
  );
});

// Export for debugging
(window as any).sampleData = {
  foafPersonData,
  dublinCoreData,
  comprehensiveTestData,
  smallTestData,
};

// Function to load comprehensive test data into a viewer
(window as any).loadComprehensiveTest = function (
  viewerId: string = "viewer3",
) {
  const viewer = document.getElementById(viewerId) as any;
  if (viewer) {
    viewer.setAttribute("data", comprehensiveTestData);
    console.log("Comprehensive test data loaded into", viewerId);
  }
};

// Function to test edge cases that might cause prefix issues
(window as any).testEdgeCases = function () {
  const edgeCaseData = `
@prefix ex: <http://example.org/> .

# These URIs should NOT generate invalid prefixes
ex:test1 ex:validUri <https://valid.example.org/resource> .
ex:test2 ex:shortDomain <https://a.co/path> .
ex:test3 ex:longDomain <https://very-long-domain-name-for-testing.international/resource> .
ex:test4 ex:subdomain <https://sub.sub.example.org/path> .
ex:test5 ex:withPort <https://example.org:8080/resource> .
ex:test6 ex:withQuery <https://example.org/path?param=value> .
ex:test7 ex:withFragment <https://example.org/path#section> .

# Test potential problem cases (these should be handled gracefully)
ex:test8 ex:emptyPath <https://example.org/> .
ex:test9 ex:rootPath <https://example.org> .
    `;

  const viewer = document.getElementById("viewer3") as any;
  if (viewer) {
    viewer.setAttribute("data", edgeCaseData);
    console.log("Edge case test data loaded");
  }
};
