# RDF Web Components

Web components for rendering RDF data in the browser.

## Usage

```html
<script type="module" src="/rdf-viewer.js"></script>

<rdf-viewer
  data="@prefix ex: <http://example.org/> . ex:alice ex:name \"Alice\" ."
  format="turtle"
  layout="table"
  show-namespaces
  enable-navigation
></rdf-viewer>
```

## Screenshots

Light:

![RdfViewer light](../../assets/web-components-light.png)

Dark:

![RdfViewer dark](../../assets/web-components-dark.png)
