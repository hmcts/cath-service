import { validateHeaderValue } from "node:http";
import type { NextFunction, Request, Response } from "express";

// x-display-from and x-display-to are not required: CaTH omits them when a publication has no display dates.
const REQUIRED_HEADERS = [
  "x-provenance",
  "x-source-artefact-id",
  "x-type",
  "x-list-type",
  "x-content-date",
  "x-sensitivity",
  "x-language",
  "x-location-name",
  "x-location-jurisdiction",
  "x-location-region"
];
const PDF_PROVENANCE = "CATH";
const FILE_PART_NAME = "file";
// Legacy sends file parts as a filename-less ByteArrayResource, which Spring writes as octet-stream.
const FILE_PART_CONTENT_TYPE = "application/octet-stream";
const COMBINED_PART_NAMES = ["json", "pdf"];

let requestCount = 0;
const seenRequests = new Set<string>();

export const POST = [collectRawBody, handleCourtelMock];

function collectRawBody(req: Request, res: Response, next: NextFunction) {
  // express.json() on the test-support router has already read JSON bodies, so the stream will not emit again.
  if (req.readableEnded) {
    res.locals.rawBody = Buffer.alloc(0);
    return next();
  }

  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    res.locals.rawBody = Buffer.concat(chunks);
    next();
  });
  req.on("error", next);
}

function handleCourtelMock(req: Request, res: Response) {
  requestCount++;

  const contentType = req.headers["content-type"] ?? "";
  const rawBody: Buffer = res.locals.rawBody ?? Buffer.alloc(0);
  const provenance = headerValue(req, "x-provenance");
  const classification = classifyRequest(req, contentType, rawBody, provenance);

  console.log(
    "[courtel-mock] POST received:",
    JSON.stringify(
      {
        contentType: contentType || "none",
        contentLength: req.headers["content-length"] ?? "0",
        xHeaders: collectXHeaders(req),
        ...classification
      },
      null,
      2
    )
  );

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !req.headers[header]);
  if (missingHeaders.length > 0) {
    console.log("[courtel-mock] Rejected: missing headers:", missingHeaders);
    return res.status(400).json({ error: "Missing required headers", missingHeaders });
  }

  if ("error" in classification) {
    console.log("[courtel-mock] Rejected:", classification.error);
    return res.status(400).json({ error: classification.error });
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

  // A publication's JSON and its PDF are separate requests, so each kind is tracked separately to keep both as creates.
  const requestKey = `${headerValue(req, "x-source-artefact-id")}:${classification.kind}`;
  const isUpdate = seenRequests.has(requestKey);
  seenRequests.add(requestKey);

  const status = isUpdate ? 200 : 201;
  console.log(`[courtel-mock] Responding with ${status} (${classification.kind} ${isUpdate ? "update" : "created"})`);

  return res.status(status).json({ received: true, kind: classification.kind });
}

function headerValue(req: Request, name: string): string {
  const value = req.headers[name];
  return Array.isArray(value) ? value.join(",") : (value ?? "");
}

function classifyRequest(req: Request, contentType: string, rawBody: Buffer, provenance: string): RequestClassification {
  if (contentType.includes("multipart/form-data")) {
    return classifyMultipart(contentType, rawBody, provenance, headerValue(req, "x-source-artefact-id"));
  }

  if (provenance === PDF_PROVENANCE) {
    return { error: `x-provenance ${PDF_PROVENANCE} is only valid on a multipart PDF request` };
  }

  if (contentType.includes("application/json")) {
    const jsonBodyLength = rawBody.length > 0 ? rawBody.length : req.body === undefined ? 0 : JSON.stringify(req.body).length;
    if (jsonBodyLength === 0) {
      return { error: "JSON request has an empty body" };
    }
    return { kind: "json", jsonBodyLength };
  }

  if (!contentType && rawBody.length === 0) {
    return { kind: "delete" };
  }

  return { error: `Unsupported request: content type '${contentType || "none"}' with ${rawBody.length} body bytes` };
}

function classifyMultipart(contentType: string, rawBody: Buffer, provenance: string, sourceArtefactId: string): RequestClassification {
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  if (!boundaryMatch) {
    return { error: "Multipart request has no boundary" };
  }

  const parts = parseMultipartParts(rawBody, boundaryMatch[1]);

  if (parts.some((part) => COMBINED_PART_NAMES.includes(part.name))) {
    return { error: "Combined json/pdf multipart is not the legacy format: send the JSON and the PDF as separate requests", parts };
  }

  if (parts.length !== 1 || parts[0].name !== FILE_PART_NAME) {
    return { error: `Multipart request must have exactly one part named '${FILE_PART_NAME}'`, parts };
  }

  if (parts[0].contentType !== FILE_PART_CONTENT_TYPE) {
    return { error: `File part must have Content-Type ${FILE_PART_CONTENT_TYPE}, got '${parts[0].contentType ?? "none"}'`, parts };
  }

  if (provenance === PDF_PROVENANCE) {
    if (!parts[0].filename?.endsWith(".pdf")) {
      return { error: `x-provenance ${PDF_PROVENANCE} requires a .pdf filename`, parts };
    }
    return { kind: "pdf", parts };
  }

  // CaTH names a flat file with the same value it sends as x-source-artefact-id. The one exception is a file name
  // Node can't send as a header (e.g. "Llŵyd.csv"): the header then carries the artefactId, but the body keeps the name.
  if (parts[0].filename !== sourceArtefactId && isHeaderSafe(parts[0].filename)) {
    return { error: `Flat-file filename '${parts[0].filename ?? "none"}' does not match x-source-artefact-id '${sourceArtefactId}'`, parts };
  }

  return { kind: "file", parts };
}

function isHeaderSafe(value: string | undefined): boolean {
  try {
    validateHeaderValue("x-source-artefact-id", value ?? "");
    return true;
  } catch {
    return false;
  }
}

function parseMultipartParts(body: Buffer, boundary: string): MultipartPart[] {
  const parts: MultipartPart[] = [];
  const sections = body.toString("binary").split(`--${boundary}`).slice(1, -1);

  for (const section of sections) {
    const headerEnd = section.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerBlock = section.slice(0, headerEnd);
    const content = section.slice(headerEnd + 4).replace(/\r\n$/, "");

    parts.push({
      // Anchored on ";" so name= is never matched inside filename=.
      name: headerBlock.match(/;\s*name="([^"]*)"/i)?.[1] ?? "unknown",
      filename: decodeUtf8(headerBlock.match(/;\s*filename="([^"]*)"/i)?.[1]),
      contentType: headerBlock.match(/Content-Type:\s*(.+)/i)?.[1]?.trim(),
      size: Buffer.byteLength(content, "binary")
    });
  }

  return parts;
}

// The body is split as binary so part sizes are byte-accurate, but CaTH writes the filename as UTF-8.
function decodeUtf8(binary: string | undefined): string | undefined {
  return binary === undefined ? undefined : Buffer.from(binary, "binary").toString("utf8");
}

function collectXHeaders(req: Request): Record<string, string> {
  return Object.fromEntries(Object.entries(req.headers).flatMap(([key, value]) => (key.startsWith("x-") ? [[key, String(value)]] : [])));
}

type RequestKind = "json" | "pdf" | "file" | "delete";

type RequestClassification = { kind: RequestKind; parts?: MultipartPart[]; jsonBodyLength?: number } | { error: string; parts?: MultipartPart[] };

interface MultipartPart {
  name: string;
  filename?: string;
  contentType?: string;
  size: number;
}
