import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL(".", import.meta.url).pathname, "..");
const startPort = Number(process.env.PORT ?? 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const target = cleanPath === "/" ? "/index.html" : cleanPath;
  const fullPath = path.normalize(path.join(root, target));
  if (!fullPath.startsWith(root)) return null;
  return fullPath;
}

function makeServer() {
  return createServer(async (request, response) => {
    const filePath = resolvePath(request.url ?? "/");
    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "content-type": mime[path.extname(filePath)] ?? "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  });
}

async function listen(port) {
  const server = makeServer();
  return new Promise((resolve, reject) => {
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") resolve(listen(port + 1));
      else reject(error);
    });
    server.listen(port, "127.0.0.1", () => resolve({ server, port }));
  });
}

const { port } = await listen(startPort);
console.log(`Harris‘s Diablo 4 running at http://127.0.0.1:${port}/`);
