import http from "node:http";
import https from "node:https";

const REQUEST_TIMEOUT_MS = 30_000;

export function jsonBody(json: string): PushBody {
  return { buffer: Buffer.from(json, "utf-8"), contentType: "application/json" };
}

export async function executePush(
  url: string,
  certPem: string,
  headers: Record<string, string>,
  body: PushBody | null
): Promise<{ statusCode: number; success: boolean }> {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === "https:";

  const agent = isHttps ? new https.Agent({ ca: certPem, rejectUnauthorized: true }) : undefined;

  const bodyBuffer = body?.buffer ?? Buffer.alloc(0);
  const requestHeaders: Record<string, string | number> = {
    ...headers,
    ...(body ? { "Content-Type": body.contentType } : {}),
    "Content-Length": bodyBuffer.byteLength
  };

  const options: http.RequestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: "POST",
    headers: requestHeaders,
    agent,
    timeout: REQUEST_TIMEOUT_MS
  };

  const transport = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(options, (res) => {
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

export interface PushBody {
  buffer: Buffer;
  contentType: string;
}

export interface PushFiles {
  pdf?: Buffer;
  flatFile?: Buffer;
}
