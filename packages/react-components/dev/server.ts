import index from "./index.html";
import { findVocabularyByRoute } from "@rdf-web-components/shared";

const port = Number(Bun.env.PORT ?? "3100");
const baseUrl = `http://localhost:${port}`;

console.log(`Starting React components playground on ${baseUrl}`);

Bun.serve({
  port,
  routes: {
    "/": index,
  },
  fetch(req) {
    const url = new URL(req.url);
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
Bun.spawn(["open", baseUrl]);
