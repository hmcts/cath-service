// Serves a parity report directory on 127.0.0.1 so screenshots, video and pages load in a browser
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const [rootArg, port = "9500"] = process.argv.slice(2);
const root = path.resolve(rootArg);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".yml": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".jsonl": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon"
};

createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url.replace(/^\/+/, "/"), "http://x").pathname);
  } catch {
    return res.writeHead(400).end("bad request");
  }
  const file = path.join(root, urlPath.endsWith("/") ? `${urlPath}index.html` : urlPath);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    if (!statSync(file).isFile()) throw new Error();
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(Number(port), "127.0.0.1", () => console.log(`serving ${root} on http://localhost:${port}`));
