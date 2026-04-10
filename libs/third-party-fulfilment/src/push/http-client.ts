import https from "node:https";

const REQUEST_TIMEOUT_MS = 30_000;

export async function executePush(
  url: string,
  certPem: string,
  headers: Record<string, string>,
  body: string | null
): Promise<{ statusCode: number; success: boolean }> {
  const agent = new https.Agent({ ca: certPem, rejectUnauthorized: true });

  const bodyBuffer = body !== null ? Buffer.from(body, "utf-8") : Buffer.alloc(0);

  const parsedUrl = new URL(url);

  const requestHeaders: Record<string, string | number> = {
    ...headers,
    "Content-Length": bodyBuffer.byteLength
  };

  if (body !== null) {
    requestHeaders["Content-Type"] = "application/json";
  }

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
