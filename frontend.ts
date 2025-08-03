import './rdf-viewer.ts';

// Sample RDF data in Turtle format
const foafPersonData = `
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:alice a foaf:Person ;
    foaf:name "Alice Smith"@en ;
    foaf:name "Alice Schmidt"@de ;
    foaf:nick "alice" ;
    foaf:age 28 ;
    foaf:birthday "1996-05-20"^^xsd:date ;
    foaf:mbox <mailto:alice@example.org> ;
    foaf:homepage <https://alice.example.org> ;
    foaf:phone <tel:+12345678901> ;
    foaf:knows ex:bob ;
    foaf:depiction <https://picsum.photos/200/200?random=1> ;
    ex:score 87.5 ;
    ex:verified true .

ex:bob a foaf:Person ;
    foaf:name "Bob Johnson"@en ;
    foaf:name "Robert Johnson"@en ;
    foaf:nick "bobby" ;
    foaf:age 32 ;
    foaf:birthday "1992-11-03"^^xsd:date ;
    foaf:mbox <mailto:bob@example.org> ;
    foaf:knows ex:alice ;
    foaf:workplaceHomepage <https://company.example.org/> ;
    foaf:depiction <https://picsum.photos/200/200?random=2> ;
    ex:score 92.3 ;
    ex:verified false .
`;

const dublinCoreData = `
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:document1 dc:title "Introduction to RDF"@en ;
    dc:title "Einführung in RDF"@de ;
    dc:creator "Jane Doe" ;
    dc:subject "RDF, Semantic Web, Linked Data" ;
    dc:description "A comprehensive guide to Resource Description Framework"@en ;
    dc:description "Ein umfassender Leitfaden zum Resource Description Framework"@de ;
    dc:publisher "Example Publishing" ;
    dc:date "2024-01-15"^^xsd:date ;
    dc:type "Book" ;
    dc:format "application/pdf" ;
    dc:language "en" ;
    dc:rights "Copyright 2024 Example Publishing" ;
    ex:pages 256 ;
    ex:cover <https://picsum.photos/300/400?random=book1> ;
    ex:price 29.99 .

ex:document2 dc:title "Advanced SPARQL Queries"@en ;
    dc:creator "John Smith" ;
    dc:subject "SPARQL, Query Language, RDF" ;
    dc:description "Learn advanced techniques for querying RDF data"@en ;
    dc:publisher "Tech Books Inc." ;
    dc:date "2024-02-20"^^xsd:date ;
    dc:type "Tutorial" ;
    dc:format "text/html" ;
    dc:language "en" ;
    ex:pages 180 ;
    ex:cover <https://picsum.photos/300/400?random=book2> ;
    ex:price 19.99 .
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

// Function to update viewers
(window as any).updateViewer1 = function() {
    const layout1 = (document.getElementById('layout-1') as HTMLSelectElement).value;
    const showNamespaces1 = (document.getElementById('show-namespaces-1') as HTMLInputElement).checked;
    const expandUris1 = (document.getElementById('expand-uris-1') as HTMLInputElement).checked;
    const showImagesInline1 = (document.getElementById('show-images-inline-1') as HTMLInputElement).checked;
    const enableNavigation1 = (document.getElementById('enable-navigation-1') as HTMLInputElement).checked;
    const theme1 = (document.getElementById('theme-1') as HTMLSelectElement).value;
    const languages1 = (document.getElementById('languages-1') as HTMLInputElement).value;
    const vocabularies1 = (document.getElementById('vocabularies-1') as HTMLSelectElement)?.value || '';
    const viewer1 = document.getElementById('viewer1') as any;
    
    viewer1.setAttribute('layout', layout1);
    viewer1.setAttribute('show-namespaces', showNamespaces1.toString());
    viewer1.setAttribute('expand-uris', expandUris1.toString());
    viewer1.setAttribute('show-images-inline', showImagesInline1.toString());
    viewer1.setAttribute('enable-navigation', enableNavigation1.toString());
    viewer1.setAttribute('theme', theme1);
    viewer1.setAttribute('preferred-languages', languages1);
    if (vocabularies1) {
        viewer1.setAttribute('vocabularies', vocabularies1);
    }
};

(window as any).updateViewer2 = function() {
    const layout2 = (document.getElementById('layout-2') as HTMLSelectElement).value;
    const showNamespaces2 = (document.getElementById('show-namespaces-2') as HTMLInputElement).checked;
    const expandUris2 = (document.getElementById('expand-uris-2') as HTMLInputElement).checked;
    const showImagesInline2 = (document.getElementById('show-images-inline-2') as HTMLInputElement).checked;
    const enableNavigation2 = (document.getElementById('enable-navigation-2') as HTMLInputElement).checked;
    const theme2 = (document.getElementById('theme-2') as HTMLSelectElement).value;
    const vocabularies2 = (document.getElementById('vocabularies-2') as HTMLSelectElement)?.value || '';
    const viewer2 = document.getElementById('viewer2') as any;
    
    viewer2.setAttribute('layout', layout2);
    viewer2.setAttribute('show-namespaces', showNamespaces2.toString());
    viewer2.setAttribute('expand-uris', expandUris2.toString());
    viewer2.setAttribute('show-images-inline', showImagesInline2.toString());
    viewer2.setAttribute('enable-navigation', enableNavigation2.toString());
    viewer2.setAttribute('theme', theme2);
    if (vocabularies2) {
        viewer2.setAttribute('vocabularies', vocabularies2);
    }
};

// Function to update the custom viewer with user input
(window as any).updateCustomViewer = function() {
    const customData = (document.getElementById('custom-data') as HTMLTextAreaElement).value;
    const format3 = (document.getElementById('format-3') as HTMLSelectElement).value;
    const layout3 = (document.getElementById('layout-3') as HTMLSelectElement).value;
    const showNamespaces3 = (document.getElementById('show-namespaces-3') as HTMLInputElement).checked;
    const expandUris3 = (document.getElementById('expand-uris-3') as HTMLInputElement).checked;
    const theme3 = (document.getElementById('theme-3') as HTMLSelectElement).value;
    const viewer3 = document.getElementById('viewer3') as any;
    
    viewer3.setAttribute('data', customData);
    viewer3.setAttribute('format', format3);
    viewer3.setAttribute('layout', layout3);
    viewer3.setAttribute('show-namespaces', showNamespaces3.toString());
    viewer3.setAttribute('expand-uris', expandUris3.toString());
    viewer3.setAttribute('theme', theme3);
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
