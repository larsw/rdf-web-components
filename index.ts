import index from "./index.html";

console.log("Starting RDF Web Components server...");

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  }
});

console.log("Server running at http://localhost:3000");