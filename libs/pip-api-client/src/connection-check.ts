import { discardBody, requestAccessToken, sendOutboundRequest, type TokenRequestConfig } from "@hmcts/third-party-user";

export async function checkPipConnection(url: URL): Promise<PipConnectionResult> {
  const tokenConfig = readTokenConfig();
  if (!tokenConfig) {
    return { kind: "not-configured" };
  }

  const token = await requestAccessToken(tokenConfig);
  if (token.kind !== "token") {
    logFailure(url, "token", token.kind === "http-status" ? `http-status-${token.status}` : token.kind);
    return { kind: "token-failure", reason: token.kind === "http-status" ? { kind: "http-status", status: token.status } : { kind: token.kind } };
  }

  const startedAt = Date.now();
  const result = await sendOutboundRequest(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token.accessToken}`, Accept: "application/json" }
  });
  const durationMs = Date.now() - startedAt;

  if (result.kind === "response") {
    await discardBody(result.response);
    return { kind: "response", status: result.status, durationMs };
  }

  if (result.kind === "network-error") {
    logFailure(url, "request", "network-error", result.code);
    return { kind: "network-error", code: result.code, durationMs };
  }

  logFailure(url, "request", result.kind);
  return result.kind === "timeout" ? { kind: "timeout", durationMs } : { kind: "network-error", durationMs };
}

export function isPipConnectionCheckConfigured(): boolean {
  return readTokenConfig() !== undefined;
}

function readTokenConfig(): TokenRequestConfig | undefined {
  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.CATH_SERVICE_API_CLIENT_ID?.trim();
  const clientSecret = process.env.CATH_SERVICE_API_CLIENT_SECRET?.trim();
  const scope = process.env.CATH_SERVICE_API_CLIENT_SCOPE?.trim();

  if (!tenantId || !clientId || !clientSecret || !scope) {
    return undefined;
  }

  return {
    tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    clientId,
    clientSecret,
    scope
  };
}

function logFailure(url: URL, stage: "token" | "request", reason: string, code?: string): void {
  const codeSuffix = code ? ` code=${code}` : "";
  console.error(`PIP connection check failed: host=${url.hostname} stage=${stage} reason=${reason}${codeSuffix}`);
}

export type TokenFailureReason =
  | { kind: "http-status"; status: number }
  | { kind: "invalid-token-response" }
  | { kind: "network-error" }
  | { kind: "timeout" }
  | { kind: "invalid-url" };

export type PipConnectionResult =
  | { kind: "not-configured" }
  | { kind: "token-failure"; reason: TokenFailureReason }
  | { kind: "response"; status: number; durationMs: number }
  | { kind: "network-error"; code?: string; durationMs: number }
  | { kind: "timeout"; durationMs: number };
