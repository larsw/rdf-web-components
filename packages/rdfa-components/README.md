# @sral/rdfa-components

Early scaffold for RDFa utilities and components. This package currently exports a minimal API; expand as needed.

## Install

```bash
bun add @sral/rdfa-components
```

## Usage (placeholder)

```ts
import { renderRdfa } from "@sral/rdfa-components";

const html = renderRdfa({
  subject: "http://example.org/resource",
  properties: [{ predicate: "http://purl.org/dc/terms/title", value: "Example" }],
});

console.log(html);
```

## Development

```bash
bun install
bun run --filter @sral/rdfa-components build
```

## Status

This is a placeholder package scaffolded for future RDFa-focused utilities. Fill in real rendering and parsing logic before publishing.
