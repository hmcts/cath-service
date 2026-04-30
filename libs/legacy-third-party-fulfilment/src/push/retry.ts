import { executePush } from "./http-client.js";

const MAX_ATTEMPTS = 3;
const BACKOFF_DELAYS_MS = [1000, 2000];
const SUCCESS_STATUSES = [200, 201, 202, 204];

function shouldRetry(statusCode: number): boolean {
  // Retry on network errors (statusCode 0), 5xx, and 429
  if (statusCode === 429) return true;
  if (statusCode >= 500) return true;
  if (statusCode === 0) return true;
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pushWithRetry(
  url: string,
  certPem: string,
  headers: Record<string, string>,
  body: string | null,
  logPrefix = "[ThirdParty]",
  pdfPath?: string,
  flatFilePath?: string
): Promise<{ statusCode: number; success: boolean }> {
  let lastResult = { statusCode: 0, success: false };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delayMs = BACKOFF_DELAYS_MS[attempt - 1];
      console.warn(`${logPrefix} Push attempt ${attempt}/${MAX_ATTEMPTS} failed (status ${lastResult.statusCode}) — retrying in ${delayMs}ms`);
      await delay(delayMs);
    }

    try {
      lastResult = await executePush(url, certPem, headers, body, pdfPath, flatFilePath);
    } catch {
      // Network-level error — treat as statusCode 0 and retry
      lastResult = { statusCode: 0, success: false };
    }

    if (SUCCESS_STATUSES.includes(lastResult.statusCode)) {
      return lastResult;
    }

    if (!shouldRetry(lastResult.statusCode)) {
      return lastResult;
    }
  }

  console.error(`${logPrefix} Push failed after ${MAX_ATTEMPTS} attempts (last status ${lastResult.statusCode})`);
  return lastResult;
}
