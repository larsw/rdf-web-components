import index from "./index.html";

console.log("Starting RDF Web Components server...");

Bun.serve({
  port: 3002,
  routes: {
    "/": index,
  },
  fetch(req, server) {
    const url = new URL(req.url);
    
    // Serve vocabulary files
    if (url.pathname === "/vocab") {
      // Serve the custom vocabulary file
      const vocabFile = Bun.file("./example-vocab.ttl");
      return new Response(vocabFile, {
        headers: {
          "Content-Type": "text/turtle",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    if (url.pathname === "/vocab/foaf") {
      const vocabFile = Bun.file("./vocabularies/foaf.ttl");
      return new Response(vocabFile, {
        headers: {
          "Content-Type": "text/turtle",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    if (url.pathname === "/vocab/dcterms") {
      const vocabFile = Bun.file("./vocabularies/dcterms.ttl");
      return new Response(vocabFile, {
        headers: {
          "Content-Type": "text/turtle",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    if (url.pathname === "/vocab/dcelements") {
      const vocabFile = Bun.file("./vocabularies/dcelements.ttl");
      return new Response(vocabFile, {
        headers: {
          "Content-Type": "text/turtle",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    if (url.pathname === "/vocab/rdfs") {
      const vocabFile = Bun.file("./vocabularies/rdfs.ttl");
      return new Response(vocabFile, {
        headers: {
          "Content-Type": "text/turtle",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    if (url.pathname === "/vocab/schema") {
      const vocabFile = Bun.file("./vocabularies/schema.jsonld");
      return new Response(vocabFile, {
        headers: {
          "Content-Type": "application/ld+json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
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