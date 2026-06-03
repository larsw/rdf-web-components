import index from "./index.html";
import { findVocabularyByRoute } from "@sral/rdf-components-shared";

const port = Number(Bun.env.PORT ?? "3002");
const baseUrl = `http://localhost:${port}`;

console.log(`Starting React components playground on ${baseUrl}`);

// Blueprint's compiled CSS uses oklch() relative-color syntax that Bun's CSS
// bundler can't parse yet, so we serve it as a static stylesheet (the browser
// handles the modern syntax fine) instead of importing it through the bundler.
const blueprintCss: Record<string, string> = {
  "/blueprint.css": Bun.resolveSync(
    "@blueprintjs/core/lib/css/blueprint.css",
    import.meta.dir,
  ),
  "/blueprint-icons.css": Bun.resolveSync(
    "@blueprintjs/icons/lib/css/blueprint-icons.css",
    import.meta.dir,
  ),
};

Bun.serve({
  port,
  routes: {
    "/": index,
  },
  fetch(req) {
    const url = new URL(req.url);
    const cssPath = blueprintCss[url.pathname];
    if (cssPath) {
      return new Response(Bun.file(cssPath), {
        headers: { "Content-Type": "text/css" },
      });
    }
    const vocabDescriptor = findVocabularyByRoute(url.pathname);
    if (vocabDescriptor) {
      return new Response(Bun.file(vocabDescriptor.filePath), {
        headers: buildCorsHeaders(vocabDescriptor.contentType),
      });
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: buildCorsHeaders("text/plain") });
    }

    return new Response("Not Found", { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  },
});

function buildCorsHeaders(contentType: string) {
  return {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// open browser
//Bun.spawn(["open", baseUrl]);
