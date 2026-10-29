import { mkdir } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type Browser, chromium } from "playwright";
import { type CaptureSettings, type CaptureTarget, captureTarget } from "./capture-target.js";

// Lets any harness, in any language, ask for captures over HTTP. Every capture goes through this
// one browser, so source and target output always comes from the same Playwright version.
// Bound to loopback only: it is unauthenticated and drives a browser.
export async function startCaptureServer(options: CaptureServerOptions): Promise<CaptureServer> {
  const browser = await chromium.launch();
  await mkdir(options.outDir, { recursive: true });

  const server = createServer((req, res) => {
    handle(req, res, browser, options).catch((error: Error) => sendJson(res, 500, { error: error.message }));
  });
  await new Promise<void>((resolve) => server.listen(options.port, "127.0.0.1", resolve));

  return {
    port: options.port,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await browser.close();
    }
  };
}

async function handle(req: IncomingMessage, res: ServerResponse, browser: Browser, options: CaptureServerOptions): Promise<void> {
  if (req.method === "GET" && req.url === "/health") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST" || req.url !== "/capture") return sendJson(res, 404, { error: "not found" });

  const target = JSON.parse(await readBody(req)) as CaptureTarget;
  const results = await captureTarget(browser, target, options);
  sendJson(res, results.every((result) => result.ok) ? 200 : 500, { results });
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

export interface CaptureServerOptions extends CaptureSettings {
  port: number;
}

export interface CaptureServer {
  port: number;
  close: () => Promise<void>;
}
