import { Readable } from "node:stream";
import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BOUNDARY = "----FormBoundarytest";

const HEADERS = {
  "x-provenance": "MANUAL_UPLOAD",
  "x-source-artefact-id": "artefact-1",
  "x-type": "LIST",
  "x-list-type": "CIVIL_DAILY_CAUSE_LIST",
  "x-content-date": "2026-11-16T00:00",
  "x-sensitivity": "PUBLIC",
  "x-language": "ENGLISH",
  "x-display-from": "2026-11-16T00:00",
  "x-display-to": "2026-11-17T00:00",
  "x-location-name": "Test Court",
  "x-location-jurisdiction": "Civil",
  "x-location-region": "London"
};

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;
let POST: Handler[];

function filePart(name: string, filename?: string, partContentType = "application/octet-stream"): string {
  const disposition = filename ? `form-data; name="${name}"; filename="${filename}"` : `form-data; name="${name}"`;
  return `--${BOUNDARY}\r\nContent-Disposition: ${disposition}\r\nContent-Type: ${partContentType}\r\n\r\ncontent\r\n`;
}

function multipart(...parts: string[]): { body: Buffer; contentType: string } {
  return { body: Buffer.from(`${parts.join("")}--${BOUNDARY}--\r\n`), contentType: `multipart/form-data; boundary=${BOUNDARY}` };
}

function buildRequest(options: {
  headers?: Record<string, string>;
  contentType?: string;
  body?: Buffer;
  parsedBody?: unknown;
  query?: Record<string, string>;
}) {
  const stream = Readable.from(options.body ? [options.body] : []);
  return Object.assign(stream, {
    headers: { ...(options.headers ?? HEADERS), ...(options.contentType ? { "content-type": options.contentType } : {}) },
    query: options.query ?? {},
    body: options.parsedBody
  }) as unknown as Request;
}

function buildResponse() {
  return { locals: {}, status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as unknown as Response;
}

async function send(req: Request) {
  const res = buildResponse();
  const [collectRawBody, handle] = POST;
  await new Promise<void>((resolve, reject) => {
    collectRawBody(req, res, (error?: unknown) => (error ? reject(error) : resolve()));
  });
  handle(req, res, vi.fn());
  return res;
}

function jsonRequest(headers = HEADERS) {
  return buildRequest({ headers, contentType: "application/json", parsedBody: { courtLists: [] } });
}

function pdfRequest(filename = "artefact-1.pdf") {
  const { body, contentType } = multipart(filePart("file", filename));
  return buildRequest({ headers: { ...HEADERS, "x-provenance": "CATH" }, contentType, body });
}

beforeEach(async () => {
  vi.resetModules();
  vi.spyOn(console, "log").mockImplementation(() => {});
  ({ POST } = (await import("./mock-courtel.js")) as unknown as { POST: Handler[] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mock Courtel POST", () => {
  describe("accepted request shapes", () => {
    it("should accept a JSON request already parsed by express.json", async () => {
      // Arrange
      const req = jsonRequest();

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ received: true, kind: "json" });
    });

    it("should not wait for the stream when express.json has already consumed it", async () => {
      // Arrange
      const req = jsonRequest();
      req.resume();
      await new Promise((resolve) => req.on("end", resolve));

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should accept a JSON request whose body is read from the stream", async () => {
      // Arrange
      const req = buildRequest({ contentType: "application/json", body: Buffer.from('{"courtLists":[]}') });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should accept a single-file multipart PDF with CATH provenance", async () => {
      // Act
      const res = await send(pdfRequest());

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ received: true, kind: "pdf" });
    });

    it("should accept a single-file multipart flat file with the source provenance", async () => {
      // Arrange
      const { body, contentType } = multipart(filePart("file", "hearing-list.xlsx"));
      const req = buildRequest({ headers: { ...HEADERS, "x-source-artefact-id": "hearing-list.xlsx" }, contentType, body });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ received: true, kind: "file" });
    });

    it("should accept an empty-body deletion request", async () => {
      // Arrange
      const req = buildRequest({});

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ received: true, kind: "delete" });
    });

    it("should accept a request without display date headers", async () => {
      // Arrange
      const { "x-display-from": _from, "x-display-to": _to, ...headers } = HEADERS;

      // Act
      const res = await send(jsonRequest(headers));

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("rejected request shapes", () => {
    it("should reject the old combined json/pdf multipart", async () => {
      // Arrange
      const { body, contentType } = multipart(filePart("json"), filePart("pdf", "publication.pdf"));
      const req = buildRequest({ contentType, body });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("Combined json/pdf multipart") }));
    });

    it("should reject a multipart with more than one part", async () => {
      // Arrange
      const { body, contentType } = multipart(filePart("file", "a.xlsx"), filePart("file", "b.xlsx"));
      const req = buildRequest({ contentType, body });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Multipart request must have exactly one part named 'file'" }));
    });

    it("should reject a multipart with no boundary", async () => {
      // Arrange
      const req = buildRequest({ contentType: "multipart/form-data", body: Buffer.from("x") });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Multipart request has no boundary" });
    });

    it("should reject a CATH request whose filename does not end in .pdf", async () => {
      // Act
      const res = await send(pdfRequest("artefact-1.xlsx"));

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "x-provenance CATH requires a .pdf filename" }));
    });

    it("should reject a file part that is not application/octet-stream", async () => {
      // Arrange
      const { body, contentType } = multipart(filePart("file", "artefact-1.pdf", "application/pdf"));
      const req = buildRequest({ headers: { ...HEADERS, "x-provenance": "CATH" }, contentType, body });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "File part must have Content-Type application/octet-stream, got 'application/pdf'" })
      );
    });

    it("should reject a flat file whose filename does not match x-source-artefact-id", async () => {
      // Arrange
      const { body, contentType } = multipart(filePart("file", "hearing-list.xlsx"));
      const req = buildRequest({ contentType, body });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Flat-file filename 'hearing-list.xlsx' does not match x-source-artefact-id 'artefact-1'" })
      );
    });

    it("should accept a flat file whose name cannot be sent as a header, with the artefactId in x-source-artefact-id", async () => {
      // Arrange
      const { body, contentType } = multipart(filePart("file", "Llŵyd-list.csv"));
      const req = buildRequest({ contentType, body });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ received: true, kind: "file" });
    });

    it("should read the part name from name= and not from inside filename=", async () => {
      // Arrange
      const part = `--${BOUNDARY}\r\nContent-Disposition: form-data; filename="artefact-1"; name="file"\r\nContent-Type: application/octet-stream\r\n\r\ncontent\r\n`;
      const { body, contentType } = multipart(part);
      const req = buildRequest({ contentType, body });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ received: true, kind: "file" });
    });

    it("should reject a JSON request with CATH provenance", async () => {
      // Act
      const res = await send(jsonRequest({ ...HEADERS, "x-provenance": "CATH" }));

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "x-provenance CATH is only valid on a multipart PDF request" });
    });

    it("should reject a JSON request with an empty body", async () => {
      // Arrange
      const req = buildRequest({ contentType: "application/json" });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "JSON request has an empty body" });
    });

    it("should reject a body with an unsupported content type", async () => {
      // Arrange
      const req = buildRequest({ contentType: "text/plain", body: Buffer.from("hello") });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Unsupported request: content type 'text/plain' with 5 body bytes" });
    });

    it("should reject a request missing a required header", async () => {
      // Arrange
      const { "x-type": _type, ...headers } = HEADERS;

      // Act
      const res = await send(jsonRequest(headers));

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Missing required headers", missingHeaders: ["x-type"] });
    });
  });

  describe("create and update statuses", () => {
    it("should return 201 for a JSON request and its PDF, and 200 for a repeat JSON request", async () => {
      // Act
      const first = await send(jsonRequest());
      const pdf = await send(pdfRequest());
      const repeat = await send(jsonRequest());

      // Assert
      expect(first.status).toHaveBeenCalledWith(201);
      expect(pdf.status).toHaveBeenCalledWith(201);
      expect(repeat.status).toHaveBeenCalledWith(200);
    });

    it("should treat a different artefact as a new create", async () => {
      // Act
      await send(jsonRequest());
      const other = await send(jsonRequest({ ...HEADERS, "x-source-artefact-id": "artefact-2" }));

      // Assert
      expect(other.status).toHaveBeenCalledWith(201);
    });
  });

  describe("query overrides", () => {
    it("should return 503 for the first failCount requests and then succeed", async () => {
      // Act
      const first = await send(buildRequest({ contentType: "application/json", parsedBody: {}, query: { failCount: "1" } }));
      const second = await send(buildRequest({ contentType: "application/json", parsedBody: {}, query: { failCount: "1" } }));

      // Assert
      expect(first.status).toHaveBeenCalledWith(503);
      expect(second.status).toHaveBeenCalledWith(201);
    });

    it("should respond with the status override", async () => {
      // Arrange
      const req = buildRequest({ contentType: "application/json", parsedBody: {}, query: { status: "418" } });

      // Act
      const res = await send(req);

      // Assert
      expect(res.status).toHaveBeenCalledWith(418);
    });
  });
});
