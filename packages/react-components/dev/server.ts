import index from "./index.html";

console.log("Starting React components playground on http://localhost:3100");

Bun.serve({
  port: 3100,
  routes: {
    "/": index
  },
  development: {
    hmr: true,
    console: true
  }
});
