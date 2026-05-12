import crypto from "node:crypto";
import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const REQUEST_TIMEOUT_MS = 30_000;

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".csv": "text/csv",
  ".pdf": "application/pdf"
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPE_MAP[ext] ?? "application/octet-stream";
}

async function buildMultipartBody(boundary: string, jsonBody: string | null, pdfPath: string): Promise<Buffer> {
  const pdfBuffer = await fs.readFile(pdfPath);
  const parts: Buffer[] = [];

  if (jsonBody !== null) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="json"\r\nContent-Type: application/json\r\n\r\n${jsonBody}\r\n`));
  }

  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="pdf"; filename="publication.pdf"\r\nContent-Type: application/pdf\r\n\r\n`));
  parts.push(pdfBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return Buffer.concat(parts);
}

async function buildFlatFileMultipartBody(boundary: string, flatFilePath: string): Promise<Buffer> {
  const fileBuffer = await fs.readFile(flatFilePath);
  const fileName = path.basename(flatFilePath);
  const contentType = getContentType(flatFilePath);
  const parts: Buffer[] = [];

  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  return Buffer.concat(parts);
}

export async function executePush(
  url: string,
  certPem: string,
  headers: Record<string, string>,
  body: string | null,
  pdfPath?: string,
  flatFilePath?: string
): Promise<{ statusCode: number; success: boolean }> {
  const agent = new https.Agent({ ca: certPem, rejectUnauthorized: true });
  const parsedUrl = new URL(url);

  let bodyBuffer: Buffer;
  const requestHeaders: Record<string, string | number> = { ...headers };

  if (flatFilePath) {
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString("hex")}`;
    bodyBuffer = await buildFlatFileMultipartBody(boundary, flatFilePath);
    requestHeaders["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
  } else if (pdfPath) {
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString("hex")}`;
    bodyBuffer = await buildMultipartBody(boundary, body, pdfPath);
    requestHeaders["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
  } else {
    bodyBuffer = body !== null ? Buffer.from(body, "utf-8") : Buffer.alloc(0);
    if (body !== null) {
      requestHeaders["Content-Type"] = "application/json";
    }
  }

  requestHeaders["Content-Length"] = bodyBuffer.byteLength;

  const options: https.RequestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: "POST",
    headers: requestHeaders,
    agent,
    timeout: REQUEST_TIMEOUT_MS
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      // Drain the response body to free the socket
      res.resume();

      res.on("end", () => {
        const statusCode = res.statusCode ?? 0;
        resolve({ statusCode, success: isSuccessStatus(statusCode) });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on("error", reject);

    if (bodyBuffer.byteLength > 0) {
      req.write(bodyBuffer);
    }

    req.end();
  });
}

function isSuccessStatus(statusCode: number): boolean {
  return [200, 201, 202, 204].includes(statusCode);
}
