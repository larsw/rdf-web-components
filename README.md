# RDF Web Components

A collection of standards-compliant Web Components for working with RDF (Resource Description Framework) data.

## Features

- **RDF Viewer**: A web component that displays RDF data in a structured, readable format
- **TypeScript Support**: Full TypeScript support with N3.js integration
- **Multiple Formats**: Supports Turtle, N-Triples, N-Quads, and more
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
        show-namespaces="true" 
        theme="light"
        data='@prefix foaf: <http://xmlns.com/foaf/0.1/> .
              <http://example.org/alice> a foaf:Person ;
                  foaf:name "Alice Smith" ;
                  foaf:age 28 .'>
    </rdf-viewer>
</body>
</html>
```

## RDF Viewer Component

### Attributes

- `data`: The RDF data to display (as a string)
- `format`: The RDF format (`turtle`, `n-triples`, `n-quads`, `trig`, `json-ld`)
- `show-namespaces`: Whether to show namespace prefixes (`true`/`false`)
- `expand-uris`: Whether to show full URIs instead of prefixed versions (`true`/`false`)
- `theme`: Visual theme (`light`/`dark`)

### JavaScript API

```javascript
const viewer = document.querySelector('rdf-viewer');

// Set data programmatically
viewer.setData(rdfData, 'turtle');

// Update configuration
viewer.setConfig({
    showNamespaces: false,
    expandURIs: true,
    theme: 'dark'
});

// Get parsed quads
const quads = viewer.getQuads();

// Clear the viewer
viewer.clear();
```

### Styling

The component uses Shadow DOM and comes with built-in styling. It supports both light and dark themes through the `theme` attribute.

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

1. **FOAF Person Data**: Demonstrates displaying person information using FOAF vocabulary
2. **Dublin Core Metadata**: Shows document metadata using Dublin Core terms
3. **Custom RDF Data**: Interactive editor for testing your own RDF data

### Sample RDF Data

#### FOAF Example
```turtle
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix ex: <http://example.org/> .

ex:alice a foaf:Person ;
    foaf:name "Alice Smith" ;
    foaf:age 28 ;
    foaf:mbox <mailto:alice@example.org> ;
    foaf:knows ex:bob .
```

#### Dublin Core Example
```turtle
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix ex: <http://example.org/> .

ex:document1 dc:title "Introduction to RDF" ;
    dc:creator "Jane Doe" ;
    dc:subject "RDF, Semantic Web" ;
    dc:date "2024-01-15" .
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
