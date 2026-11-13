const REQUEST_TIMEOUT_MS = 30_000;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const SAFE_ERROR_CODE = /^[A-Z0-9_]+$/;

export async function sendOutboundRequest(url: string, init: RequestInit): Promise<OutboundResult> {
  const target = parseTarget(url);
  if (!target) {
    return { kind: "invalid-url" };
  }

  try {
    const response = await fetch(target, { ...init, redirect: "manual", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    return { kind: "response", status: response.status, response };
  } catch (error) {
    return toRequestFailure(error);
  }
}

export async function readJsonBody(response: Response): Promise<JsonBodyResult> {
  try {
    return { kind: "json", body: await response.json() };
  } catch (error) {
    return isTimeout(error) ? { kind: "timeout" } : { kind: "invalid-body" };
  }
}

export async function discardBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

function parseTarget(url: string): URL | undefined {
  try {
    const target = new URL(url);
    const hasCredentials = target.username !== "" || target.password !== "";
    return ALLOWED_PROTOCOLS.has(target.protocol) && !hasCredentials ? target : undefined;
  } catch {
    return undefined;
  }
}

function toRequestFailure(error: unknown): RequestFailure {
  if (isTimeout(error)) {
    return { kind: "timeout" };
  }
  return { kind: "network-error", code: extractErrorCode(error) };
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

function extractErrorCode(error: unknown): string | undefined {
  const cause = error instanceof Error ? error.cause : undefined;
  const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
  return typeof code === "string" && SAFE_ERROR_CODE.test(code) ? code : undefined;
}

export type RequestFailure = { kind: "timeout" } | { kind: "invalid-url" } | { kind: "network-error"; code?: string };

export type OutboundResult = { kind: "response"; status: number; response: Response } | RequestFailure;

type JsonBodyResult = { kind: "json"; body: unknown } | { kind: "invalid-body" } | { kind: "timeout" };
