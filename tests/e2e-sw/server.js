import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.env.PLAYWRIGHT_SW_ROOT || ".");
const contentTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};

// Bumped via /__sw-bump so tests can publish a byte-different worker (an update).
let workerBuild = 0;

// Both mounts serve real files: worker-owned requests cannot be mocked by page.route.
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1:4002");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/colorverse/")) {
      pathname = pathname.slice("/colorverse".length);
    }
    if (pathname === "/__sw-bump") {
      workerBuild += 1;
      response.writeHead(204, { "Cache-Control": "no-store" }).end();
      return;
    }
    if (pathname === "/sw-smoke.html") {
      response.writeHead(200, { "Content-Type": "text/html" });
      // Do not execute the application or load third-party assets/APIs.
      response.end(
        '<!doctype html><title>SW smoke</title><script src="./service-worker-register.js"></script>'
      );
      return;
    }
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) {
      file = resolve(file, "index.html");
    }
    let body = await readFile(file);
    if (pathname === "/service-worker.js" && workerBuild > 0) {
      body = Buffer.concat([body, Buffer.from(`\n// test build ${workerBuild}\n`)]);
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4002, "127.0.0.1");
