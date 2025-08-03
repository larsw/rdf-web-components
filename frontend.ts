import './rdf-viewer.ts';

// Sample RDF data in Turtle format
const foafPersonData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:alice a foaf:Person ;
    foaf:name "Alice Smith" ;
    foaf:nick "alice" ;
    foaf:age 28 ;
    foaf:mbox <mailto:alice@example.org> ;
    foaf:homepage <https://alice.example.org> ;
    foaf:knows ex:bob ;
    foaf:depiction <https://example.org/photos/alice.jpg> .

ex:bob a foaf:Person ;
    foaf:name "Bob Johnson" ;
    foaf:nick "bobby" ;
    foaf:age 32 ;
    foaf:mbox <mailto:bob@example.org> ;
    foaf:knows ex:alice ;
    foaf:workplaceHomepage <https://company.example.org> .
`;

const dublinCoreData = `
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:document1 dc:title "Introduction to RDF" ;
    dc:creator "Jane Doe" ;
    dc:subject "RDF, Semantic Web, Linked Data" ;
    dc:description "A comprehensive guide to Resource Description Framework" ;
    dc:publisher "Example Publishing" ;
    dc:date "2024-01-15"^^xsd:date ;
    dc:type "Book" ;
    dc:format "application/pdf" ;
    dc:language "en" ;
    dc:rights "Copyright 2024 Example Publishing" .

ex:document2 dc:title "Advanced SPARQL Queries" ;
    dc:creator "John Smith" ;
    dc:subject "SPARQL, Query Language, RDF" ;
    dc:description "Learn advanced techniques for querying RDF data" ;
    dc:publisher "Tech Books Inc." ;
    dc:date "2024-02-20"^^xsd:date ;
    dc:type "Tutorial" ;
    dc:format "text/html" ;
    dc:language "en" .
`;

// Function to set up event listeners for controls
function setupControls() {
    // Viewer 1 controls
    const showNamespaces1 = document.getElementById('show-namespaces-1') as HTMLInputElement;
    const expandUris1 = document.getElementById('expand-uris-1') as HTMLInputElement;
    const theme1 = document.getElementById('theme-1') as HTMLSelectElement;
    const viewer1 = document.getElementById('viewer1') as any;

    showNamespaces1.addEventListener('change', () => {
        viewer1.setAttribute('show-namespaces', showNamespaces1.checked.toString());
    });

    expandUris1.addEventListener('change', () => {
        viewer1.setAttribute('expand-uris', expandUris1.checked.toString());
    });

    theme1.addEventListener('change', () => {
        viewer1.setAttribute('theme', theme1.value);
    });

    // Viewer 2 controls
    const showNamespaces2 = document.getElementById('show-namespaces-2') as HTMLInputElement;
    const expandUris2 = document.getElementById('expand-uris-2') as HTMLInputElement;
    const theme2 = document.getElementById('theme-2') as HTMLSelectElement;
    const viewer2 = document.getElementById('viewer2') as any;

    showNamespaces2.addEventListener('change', () => {
        viewer2.setAttribute('show-namespaces', showNamespaces2.checked.toString());
    });

    expandUris2.addEventListener('change', () => {
        viewer2.setAttribute('expand-uris', expandUris2.checked.toString());
    });

    theme2.addEventListener('change', () => {
        viewer2.setAttribute('theme', theme2.value);
    });

    // Viewer 3 controls
    const showNamespaces3 = document.getElementById('show-namespaces-3') as HTMLInputElement;
    const expandUris3 = document.getElementById('expand-uris-3') as HTMLInputElement;
    const theme3 = document.getElementById('theme-3') as HTMLSelectElement;
    const format3 = document.getElementById('format-3') as HTMLSelectElement;
    const viewer3 = document.getElementById('viewer3') as any;

    showNamespaces3.addEventListener('change', () => {
        viewer3.setAttribute('show-namespaces', showNamespaces3.checked.toString());
    });

    expandUris3.addEventListener('change', () => {
        viewer3.setAttribute('expand-uris', expandUris3.checked.toString());
    });

    theme3.addEventListener('change', () => {
        viewer3.setAttribute('theme', theme3.value);
    });

    format3.addEventListener('change', () => {
        viewer3.setAttribute('format', format3.value);
    });
}

// Function to update the custom viewer with user input
(window as any).updateCustomViewer = function() {
    const customData = (document.getElementById('custom-data') as HTMLTextAreaElement).value;
    const format3 = (document.getElementById('format-3') as HTMLSelectElement).value;
    const viewer3 = document.getElementById('viewer3') as any;
    
    viewer3.setAttribute('data', customData);
    viewer3.setAttribute('format', format3);
};

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up the sample data for viewers
    const viewer1 = document.getElementById('viewer1') as any;
    const viewer2 = document.getElementById('viewer2') as any;
    const viewer3 = document.getElementById('viewer3') as any;

    // Load sample data
    viewer1.setAttribute('data', foafPersonData);
    viewer2.setAttribute('data', dublinCoreData);
    
    // Load initial custom data
    const customData = (document.getElementById('custom-data') as HTMLTextAreaElement).value;
    viewer3.setAttribute('data', customData);

    // Set up event listeners
    setupControls();

    console.log('RDF Viewer test page initialized');
});

// Export for debugging
(window as any).sampleData = {
    foafPersonData,
    dublinCoreData
};
