# RDF Web Components

A collection of standards-compliant Web Components for working with RDF (Resource Description Framework) data.

## Features

- **RDF Viewer**: A web component that displays RDF data in a structured, readable format
- **TypeScript Support**: Full TypeScript support with N3.js integration
- **Multiple Formats**: Supports Turtle, N-Triples, N-Quads, and more
- **Vocabulary Integration**: Load external vocabularies/ontologies for enhanced label display
- **Multilingual Labels**: Support for rdfs:label and SKOS labels with language preferences
- **Flexible Layouts**: Choose between table-like and turtle-like display formats
- **Intelligent Object Rendering**: Automatic detection and display of images, dates, numbers, emails, etc.
- **Customizable**: Configurable themes, namespace display, and URI expansion
- **Standards Compliant**: Built as standard Web Components, works with any framework or vanilla HTML

## Quick Start

### Installation

```bash
bun install
```

### Running the Development Server

```bash
bun --hot ./index.ts
```

This starts a development server at `http://localhost:3000` with hot module reloading and a test page.

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module" src="./rdf-viewer.js"></script>
</head>
<body>
    <rdf-viewer 
        format="turtle" 
        layout="table"
        show-namespaces="true" 
        theme="light"
        preferred-languages="en,de,fr"
        vocabularies="https://www.w3.org/2000/01/rdf-schema,http://www.w3.org/2004/02/skos/core"
        data='@prefix foaf: <http://xmlns.com/foaf/0.1/> .
              <http://example.org/alice> a foaf:Person ;
                  foaf:name "Alice Smith"@en ;
                  foaf:name "Alice Schmidt"@de ;
                  foaf:age 28 ;
                  foaf:depiction <https://example.org/alice.jpg> .'>
    </rdf-viewer>
</body>
</html>
```

## RDF Viewer Component

### Attributes

- `data`: The RDF data to display (as a string)
- `format`: The RDF format (`turtle`, `n-triples`, `n-quads`, `trig`, `json-ld`)
- `layout`: Display layout (`table`, `turtle`) - table layout provides a more structured view
- `show-namespaces`: Whether to show namespace prefixes (`true`/`false`)
- `expand-uris`: Whether to show full URIs instead of prefixed versions (`true`/`false`)
- `theme`: Visual theme (`light`/`dark`)
- `preferred-languages`: Comma-separated list of preferred languages for labels (e.g., `en,de,fr`)
- `vocabularies`: Comma-separated list of vocabulary URLs to load for enhanced labels

### JavaScript API

```javascript
const viewer = document.querySelector('rdf-viewer');

// Set data programmatically
viewer.setData(rdfData, 'turtle');

// Update configuration
viewer.setConfig({
    layout: 'table',
    showNamespaces: false,
    expandURIs: true,
    theme: 'dark',
    preferredLanguages: ['en', 'de'],
    vocabularies: ['https://www.w3.org/2000/01/rdf-schema']
});

// Get parsed quads
const quads = viewer.getQuads();

// Clear the viewer
viewer.clear();

// Add vocabulary dynamically
await viewer.addVocabulary('http://www.w3.org/2004/02/skos/core');

// Remove vocabulary
viewer.removeVocabulary('http://example.org/vocab');
```

### Styling

The component uses Shadow DOM and comes with built-in styling. It supports:

- **Light and Dark Themes**: Switch via the `theme` attribute
- **Table Layout**: Clean, structured table display with property-value pairs
- **Turtle Layout**: Traditional Turtle-like hierarchical display
- **Intelligent Value Rendering**: 
  - Images are displayed inline with thumbnails
  - Numbers are highlighted and formatted
  - Dates show formatted tooltips
  - Email and phone links are clickable
  - URIs are shortened with tooltips showing full URIs
- **Responsive Design**: Adapts to mobile and tablet screens

## Development

### Running Tests

```bash
bun test
```

### Project Structure

```
├── rdf-viewer.ts       # Main RDF Viewer Web Component
├── frontend.ts         # Test page frontend code
├── index.html          # Test page HTML
├── index.ts            # Development server
├── rdf-viewer.test.ts  # Tests
└── README.md           # This file
```

## Examples

The test page includes several examples:

1. **FOAF Person Data**: Demonstrates displaying person information using FOAF vocabulary with multilingual labels
2. **Dublin Core Metadata**: Shows document metadata using Dublin Core terms with images and structured data
3. **Custom RDF Data**: Interactive editor for testing your own RDF data with intelligent value rendering

### Advanced Features

#### Vocabulary Integration
Load external vocabularies to get human-readable labels for properties:

```html
<rdf-viewer 
    vocabularies="https://www.w3.org/2000/01/rdf-schema,http://www.w3.org/2004/02/skos/core"
    preferred-languages="en,de,fr">
</rdf-viewer>
```

The viewer will automatically use `rdfs:label`, `skos:prefLabel`, `skos:altLabel`, and Dublin Core titles from these vocabularies.

#### Intelligent Object Rendering
The viewer automatically detects and renders different data types:

- **Images**: `foaf:depiction <https://example.org/photo.jpg>` → Shows thumbnail
- **Numbers**: `ex:score 95.5` → Highlighted as numeric value
- **Dates**: `foaf:birthday "1990-01-01"^^xsd:date` → Formatted with tooltip
- **Emails**: `foaf:mbox <mailto:user@example.org>` → Clickable mailto link
- **Phone**: `foaf:phone <tel:+1234567890>` → Clickable tel link
- **Booleans**: `ex:verified true` → Highlighted boolean value

### Sample RDF Data

#### FOAF Example with Multilingual Labels
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:alice a foaf:Person ;
    foaf:name "Alice Smith"@en ;
    foaf:name "Alice Schmidt"@de ;
    foaf:age 28 ;
    foaf:birthday "1996-05-20"^^xsd:date ;
    foaf:mbox <mailto:alice@example.org> ;
    foaf:depiction <https://example.org/alice.jpg> ;
    foaf:knows ex:bob .
```

#### Dublin Core Example with Rich Media
```turtle
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:document1 dc:title "Introduction to RDF"@en ;
    dc:title "Einführung in RDF"@de ;
    dc:creator "Jane Doe" ;
    dc:date "2024-01-15"^^xsd:date ;
    ex:pages 256 ;
    ex:cover <https://example.org/book-cover.jpg> ;
    ex:price 29.99 .
```

## Browser Support

This component uses modern Web Standards:
- Custom Elements v1
- Shadow DOM v1
- ES Modules

Supported browsers:
- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## Dependencies

- **N3.js**: RDF parsing and manipulation
- **TypeScript**: For type safety and development experience

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
