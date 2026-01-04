import index from "./index.html";

const port = Number(Bun.env.PORT ?? "3003");
const baseUrl = `http://localhost:${port}`;

console.log(`RDFa components playground running at ${baseUrl}`);

Bun.serve({
  port,
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

Bun.spawn(["open", baseUrl]);
