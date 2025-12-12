import index from "./index.html";
import { findVocabularyByRoute } from "@rdf-web-components/shared";

console.log("Starting RDF Web Components server...");

Bun.serve({
  port: 3002,
  routes: {
    "/": index,
  },
  fetch(req, server) {
    const url = new URL(req.url);
    
    const vocabDescriptor = findVocabularyByRoute(url.pathname);
    if (vocabDescriptor) {
      const vocabFile = Bun.file(vocabDescriptor.filePath);
      return new Response(vocabFile, {
        headers: buildCorsHeaders(vocabDescriptor.contentType)
      });
    }
    
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: buildCorsHeaders("text/plain")
      });
    }
    
    // Default handling for other routes
    return new Response("Not Found", { status: 404 });
  },
  development: {
    hmr: true,
    console: true,
  }
});

console.log("Server running at http://localhost:3002");

function buildCorsHeaders(contentType: string) {
  return {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}