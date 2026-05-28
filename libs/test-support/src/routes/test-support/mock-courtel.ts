import type { NextFunction, Request, Response } from "express";

let requestCount = 0;
const seenArtefacts = new Set<string>();

const REQUIRED_HEADERS = [
  "x-provenance",
  "x-source-artefact-id",
  "x-type",
  "x-list-type",
  "x-content-date",
  "x-sensitivity",
  "x-language",
  "x-display-from",
  "x-display-to",
  "x-location-name",
  "x-location-jurisdiction",
  "x-location-region"
];

function parseMultipartParts(body: Buffer, boundary: string) {
  const parts: { name: string; filename?: string; contentType?: string; size: number }[] = [];
  const bodyStr = body.toString("binary");
  const boundaryStr = `--${boundary}`;

  const sections = bodyStr.split(boundaryStr).slice(1, -1);

  for (const section of sections) {
    const headerEnd = section.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerBlock = section.slice(0, headerEnd);
    const content = section.slice(headerEnd + 4).replace(/\r\n$/, "");

    const nameMatch = headerBlock.match(/name="([^"]+)"/);
    const filenameMatch = headerBlock.match(/filename="([^"]+)"/);
    const ctMatch = headerBlock.match(/Content-Type:\s*(.+)/i);

    parts.push({
      name: nameMatch?.[1] ?? "unknown",
      filename: filenameMatch?.[1],
      contentType: ctMatch?.[1]?.trim(),
      size: Buffer.byteLength(content, "binary")
    });
  }

  return parts;
}

function collectRawBody(req: Request, _res: Response, next: NextFunction) {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    (req as any).rawBody = Buffer.concat(chunks);
    next();
  });
}

function handleCourtelMock(req: Request, res: Response) {
  requestCount++;

  const missingHeaders = REQUIRED_HEADERS.filter((h) => !req.headers[h]);

  const xHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.startsWith("x-")) {
      xHeaders[key] = String(value);
    }
  }

  const contentType = req.headers["content-type"] ?? "unknown";
  const contentLength = req.headers["content-length"] ?? "0";

  const logEntry: Record<string, unknown> = {
    contentType,
    contentLength,
    xHeaders
  };

  const rawBody: Buffer = (req as any).rawBody ?? Buffer.alloc(0);

  if (contentType.includes("multipart/form-data")) {
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (boundaryMatch) {
      const parts = parseMultipartParts(rawBody, boundaryMatch[1]);
      logEntry.parts = parts;
    }
  } else if (contentType.includes("application/json")) {
    // express.json() may have already consumed the stream, so use req.body as fallback
    const jsonSize = rawBody.length > 0 ? rawBody.length : JSON.stringify(req.body).length;
    logEntry.jsonBodyLength = jsonSize;
  }

  console.log("[courtel-mock] POST received:", JSON.stringify(logEntry, null, 2));

  if (missingHeaders.length > 0) {
    console.log("[courtel-mock] Rejected: missing headers:", missingHeaders);
    return res.status(400).json({ error: "Missing required headers", missingHeaders });
  }

  // ?failCount=N makes the first N requests return 503, then succeeds
  const failCount = Number.parseInt(req.query.failCount as string, 10) || 0;
  if (failCount > 0 && requestCount <= failCount) {
    console.log(`[courtel-mock] Simulating failure (request ${requestCount}/${failCount})`);
    return res.status(503).json({ error: "Simulated failure", attempt: requestCount, failCount });
  }

  // ?status=N overrides the response status (for testing error paths)
  const statusOverride = Number.parseInt(req.query.status as string, 10) || 0;
  if (statusOverride) {
    console.log("[courtel-mock] Responding with override status:", statusOverride);
    return res.status(statusOverride).json({ received: true });
  }

  // 201 for new artefacts, 200 for updates (matches real Courtel behaviour)
  const artefactId = req.headers["x-source-artefact-id"] as string;
  const isUpdate = seenArtefacts.has(artefactId);
  seenArtefacts.add(artefactId);

  const status = isUpdate ? 200 : 201;
  console.log(`[courtel-mock] Responding with ${status} (${isUpdate ? "update" : "created"})`);

  return res.status(status).json({ received: true });
}

export const POST = [collectRawBody, handleCourtelMock];
