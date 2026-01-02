# RDF Web Components

Web components for rendering RDF data in the browser.

## Usage

```html
<script type="module" src="/rdf-details-view.js"></script>

<rdf-details-view
  data="@prefix ex: <http://example.org/> . ex:alice ex:name \"Alice\" ."
  format="turtle"
  layout="table"
  show-namespaces
  enable-navigation
></rdf-details-view>
```

## Screenshots

Light:

![RdfDetailsView light](../../assets/web-components-light.png)

Dark:

![RdfDetailsView dark](../../assets/web-components-dark.png)
